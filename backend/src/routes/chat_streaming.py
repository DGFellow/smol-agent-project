# backend/src/routes/chat_streaming.py - TRUE STREAMING VERSION

from flask import Blueprint, Response, request, stream_with_context, g
import json
import time
from src.middleware.auth import token_required
from config import Config

if Config.USE_LANGCHAIN:
    from langchain_core.messages import HumanMessage, AIMessage
    from src.langchain_integration.chains import qwen_lc
    from src.langchain_integration.agent import get_router
else:
    from src.models.model_loader import ModelLoader
    from src.agents.chat_agent import ChatAgent
    from src.agents.thinking_agent import ThinkingAgent

chat_bp = Blueprint('chat', __name__)

if not Config.USE_LANGCHAIN:
    loader = ModelLoader()
    model, tokenizer = loader.load_qwen_instruct()


def _generate_thinking_steps(message: str) -> list:
    """Generate contextual thinking steps based on message"""
    msg_lower = message.lower()
    
    if any(word in msg_lower for word in ['code', 'function', 'script', 'program']):
        return ["Analyzing requirements", "Planning solution"]
    elif any(word in msg_lower for word in ['calculate', 'math', 'compute']):
        return ["Processing calculation"]
    elif len(message) > 100:
        return ["Understanding query", "Preparing response"]
    else:
        return ["Processing"]


@chat_bp.route('/stream', methods=['POST'])
@token_required
def stream_chat():
    """
    ✅ FIXED: TRUE streaming with instant thinking feedback
    """
    user_id = request.user_id
    data = request.json
    message = data.get('message', '')
    conversation_id = data.get('conversation_id')

    def generate():
        nonlocal conversation_id
        response_content = ''

        try:
            db = g.db

            # Create conversation if needed
            if not conversation_id:
                cursor = db.cursor()
                cursor.execute(
                    "INSERT INTO conversations (user_id, title, created_at, updated_at) "
                    "VALUES (?, 'New Conversation', datetime('now'), datetime('now'))",
                    (user_id,)
                )
                db.commit()
                conversation_id = cursor.lastrowid
                yield f"data: {json.dumps({'type': 'metadata', 'conversation_id': conversation_id})}\n\n"

            # Add user message
            cursor = db.cursor()
            cursor.execute(
                "INSERT INTO messages (conversation_id, role, content, created_at, updated_at) "
                "VALUES (?, 'user', ?, datetime('now'), datetime('now'))",
                (conversation_id, message)
            )
            db.commit()

            # Get history
            cursor.execute(
                "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at",
                (conversation_id,)
            )
            history = [{'role': row[0], 'content': row[1]} for row in cursor.fetchall()]

            # ✅ 1. EMIT THINKING_START IMMEDIATELY (instant feedback)
            yield f"data: {json.dumps({'type': 'thinking_start', 'timestamp': time.time()})}\n\n"
            
            # Generate thinking steps
            thinking_steps = _generate_thinking_steps(message)
            
            # ✅ 2. Show thinking steps with small delays (feels responsive)
            for i, step in enumerate(thinking_steps, 1):
                yield f"data: {json.dumps({'type': 'thinking_step', 'content': step, 'step': i, 'timestamp': time.time()})}\n\n"
                time.sleep(0.3)  # Small delay between steps

            thinking_start = time.time()

            # ✅ 3. REAL STREAMING - Generate and stream tokens as they come
            if Config.USE_LANGCHAIN:
                # Convert history to LangChain format
                lc_history = []
                for msg in history[:-1]:  # Exclude current user message
                    if msg['role'] == 'user':
                        lc_history.append(HumanMessage(content=msg['content']))
                    else:
                        lc_history.append(AIMessage(content=msg['content']))

                # Check if query needs tools
                router = get_router()
                needs_tools = any(keyword in message.lower() for keyword in [
                    'calculate', 'search', 'find', 'compute', 'math', 'look up',
                    'execute', 'run', 'code', 'document', 'file'
                ])

                if needs_tools and router:
                    # ✅ Route through agent for tool use
                    # Note: Agent doesn't stream yet, so we get full response
                    result = router.route(message)
                    full_response = result.get('response', '')
                    
                    # Complete thinking
                    thinking_duration = time.time() - thinking_start
                    yield f"data: {json.dumps({'type': 'thinking_complete', 'duration': thinking_duration, 'timestamp': time.time()})}\n\n"
                    
                    # Stream the response word by word (since we have it all)
                    words = full_response.split()
                    for word in words:
                        response_content += word + ' '
                        yield f"data: {json.dumps({'type': 'response', 'content': word + ' '})}\n\n"
                        time.sleep(0.03)  # Fast but smooth
                else:
                    # ✅ TRUE STREAMING - Stream tokens as model generates them
                    first_token = True
                    for chunk in qwen_lc.chat_chain.stream({
                        "input": message,
                        "chat_history": lc_history
                    }):
                        if first_token:
                            # Complete thinking on first real token
                            thinking_duration = time.time() - thinking_start
                            yield f"data: {json.dumps({'type': 'thinking_complete', 'duration': thinking_duration, 'timestamp': time.time()})}\n\n"
                            first_token = False
                        
                        if chunk:
                            response_content += chunk
                            yield f"data: {json.dumps({'type': 'response', 'content': chunk})}\n\n"
            
            else:
                # ✅ Legacy mode - use thinking agent
                base_agent = ChatAgent(model, tokenizer)
                thinking_agent = ThinkingAgent(base_agent)
                
                thinking_duration = time.time() - thinking_start
                yield f"data: {json.dumps({'type': 'thinking_complete', 'duration': thinking_duration, 'timestamp': time.time()})}\n\n"
                
                for event in thinking_agent.process_with_thinking(history):
                    if event['type'] == 'response':
                        content = event.get('content', '')
                        response_content += content
                        yield f"data: {json.dumps({'type': 'response', 'content': content})}\n\n"

            # ✅ 4. Save complete response (no duplicates - backend is source of truth)
            if response_content.strip():
                cursor.execute(
                    "INSERT INTO messages (conversation_id, role, content, created_at, updated_at) "
                    "VALUES (?, 'assistant', ?, datetime('now'), datetime('now'))",
                    (conversation_id, response_content.strip())
                )
                db.commit()

            # ✅ 5. Send completion metadata
            yield f"data: {json.dumps({'type': 'complete', 'conversation_id': conversation_id})}\n\n"

        except Exception as e:
            print(f"❌ Stream error: {e}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
)