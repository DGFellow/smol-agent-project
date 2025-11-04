# backend/src/routes/chat_streaming.py - FIXED VERSION

from flask import Blueprint, Response, request, stream_with_context, g
import json
from src.middleware.auth import token_required
from config import Config

if Config.USE_LANGCHAIN:
    from langchain_core.messages import HumanMessage, AIMessage
    from src.langchain_integration.chains import qwen_lc
else:
    from src.models.model_loader import ModelLoader
    from src.agents.chat_agent import ChatAgent
    from src.agents.thinking_agent import ThinkingAgent

chat_bp = Blueprint('chat', __name__)

# Legacy model loading
if not Config.USE_LANGCHAIN:
    loader = ModelLoader()
    model, tokenizer = loader.load_qwen_instruct()


@chat_bp.route('/stream', methods=['POST'])
@token_required
def stream_chat():
    """Stream chat with thinking + word-by-word response"""
    user_id = request.user_id
    data = request.json
    message = data.get('message', '')
    conversation_id = data.get('conversation_id')

    def generate():
        nonlocal conversation_id
        new_created = False
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
                new_created = True
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

            # 🔥 FIX: ALWAYS show thinking process
            import time
            
            # Thinking start
            yield f"data: {json.dumps({'type': 'thinking_start', 'timestamp': time.time()})}\n\n"
            
            # Simulated thinking steps
            thinking_steps = _generate_thinking_steps(message)
            for i, step in enumerate(thinking_steps, 1):
                time.sleep(0.15)  # Realistic delay
                yield f"data: {json.dumps({'type': 'thinking_step', 'content': step, 'step': i, 'timestamp': time.time()})}\n\n"
            
            # Thinking complete
            thinking_duration = len(thinking_steps) * 0.15
            yield f"data: {json.dumps({'type': 'thinking_complete', 'duration': thinking_duration, 'timestamp': time.time()})}\n\n"

            # 🔥 FIX: Generate response with WORD-BY-WORD streaming
            if Config.USE_LANGCHAIN:
                # Convert history to LangChain format
                lc_history = []
                for msg in history[:-1]:
                    if msg['role'] == 'user':
                        lc_history.append(HumanMessage(content=msg['content']))
                    else:
                        lc_history.append(AIMessage(content=msg['content']))

                # Get full response first (LangChain streaming is unreliable)
                result = qwen_lc.chat_chain.invoke({"input": message, "chat_history": lc_history})
                full_response = result.get("text", "")
                
                # 🔥 SIMULATE WORD-BY-WORD STREAMING
                words = full_response.split()
                for word in words:
                    word_with_space = word + ' '
                    response_content += word_with_space
                    yield f"data: {json.dumps({'type': 'response', 'content': word_with_space})}\n\n"
                    time.sleep(0.05)  # Adjust speed: 0.03 = faster, 0.08 = slower

            else:
                # Legacy path with thinking agent
                base_agent = ChatAgent(model, tokenizer)
                thinking_agent = ThinkingAgent(base_agent)
                
                for event in thinking_agent.process_with_thinking(history):
                    if event['type'] == 'response':
                        response_content += event.get('content', '')
                    yield f"data: {json.dumps(event)}\n\n"

            # Save assistant response
            if response_content:
                cursor.execute(
                    "INSERT INTO messages (conversation_id, role, content, created_at, updated_at) "
                    "VALUES (?, 'assistant', ?, datetime('now'), datetime('now'))",
                    (conversation_id, response_content.strip())
                )
                db.commit()

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
            'X-Accel-Buffering': 'no'
        }
    )


def _generate_thinking_steps(message: str) -> list:
    """Generate contextual thinking steps"""
    steps = []
    
    msg_lower = message.lower()
    
    if any(word in msg_lower for word in ['code', 'function', 'script', 'program']):
        steps.extend([
            "Analyzing code request and determining programming language",
            "Planning code structure and key components",
            "Considering edge cases and error handling"
        ])
    elif any(word in msg_lower for word in ['calculate', 'compute', 'math', 'solve']):
        steps.extend([
            "Breaking down mathematical problem",
            "Identifying required operations",
            "Verifying calculation logic"
        ])
    elif any(word in msg_lower for word in ['explain', 'what is', 'how does', 'why']):
        steps.extend([
            "Analyzing the question context",
            "Gathering relevant information",
            "Structuring a clear explanation"
        ])
    else:
        steps.extend([
            "Understanding query intent",
            "Gathering relevant context",
            "Formulating comprehensive response"
        ])
    
    return steps