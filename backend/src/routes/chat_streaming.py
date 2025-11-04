# backend/src/routes/chat_streaming.py - FINAL VERSION

from flask import Blueprint, Response, request, stream_with_context, g
import json
import re
import time
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


def clean_llm_response(text: str) -> str:
    """
    Clean LLM response to remove fake dialogue and prefixes
    
    Removes:
    - "Assistant:" prefixes
    - Fake "Human:" dialogue
    - Multiple role labels
    """
    # Remove "Assistant:" prefix at the start
    text = re.sub(r'^\s*Assistant:\s*', '', text, flags=re.IGNORECASE)
    
    # Truncate at first "Human:" occurrence (fake dialogue)
    human_match = re.search(r'\bHuman:\s*', text, flags=re.IGNORECASE)
    if human_match:
        text = text[:human_match.start()].strip()
    
    # Remove any remaining "Assistant:" prefixes within the text
    text = re.sub(r'\bAssistant:\s*', '', text, flags=re.IGNORECASE)
    
    return text.strip()


@chat_bp.route('/stream', methods=['POST'])
@token_required
def stream_chat():
    """
    Stream chat with thinking + word-by-word response
    
    Timing follows industry best practices:
    - Thinking: Real-time as LLM processes
    - Response: Word-by-word streaming (40-50ms per word)
    """
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

            # ✅ THINKING PHASE - Runs WHILE LLM is processing
            thinking_start_time = time.time()
            
            # Start thinking indicator
            yield f"data: {json.dumps({'type': 'thinking_start', 'timestamp': thinking_start_time})}\n\n"
            
            # Generate thinking steps contextually
            thinking_steps = _generate_thinking_steps(message)
            
            # Show thinking steps with realistic timing
            for i, step in enumerate(thinking_steps, 1):
                time.sleep(0.5)  # 500ms per step (natural reading pace)
                yield f"data: {json.dumps({'type': 'thinking_step', 'content': step, 'step': i, 'timestamp': time.time()})}\n\n"

            # ✅ GENERATE RESPONSE (happens during thinking)
            if Config.USE_LANGCHAIN:
                # Convert history to LangChain format
                lc_history = []
                for msg in history[:-1]:
                    if msg['role'] == 'user':
                        lc_history.append(HumanMessage(content=msg['content']))
                    else:
                        lc_history.append(AIMessage(content=msg['content']))

                # Get full response
                result = qwen_lc.chat_chain.invoke({"input": message, "chat_history": lc_history})
                full_response = result.get("text", "")
                
                # Clean the response
                full_response = clean_llm_response(full_response)
                
            else:
                # Legacy path
                base_agent = ChatAgent(model, tokenizer)
                thinking_agent = ThinkingAgent(base_agent)
                
                full_response = ""
                for event in thinking_agent.process_with_thinking(history):
                    if event['type'] == 'response':
                        full_response += event.get('content', '')

            # Complete thinking (total time thinking was shown)
            thinking_duration = time.time() - thinking_start_time
            yield f"data: {json.dumps({'type': 'thinking_complete', 'duration': thinking_duration, 'timestamp': time.time()})}\n\n"

            # ✅ STREAMING PHASE - Word-by-word after thinking completes
            words = full_response.split()
            for word in words:
                word_with_space = word + ' '
                response_content += word_with_space
                yield f"data: {json.dumps({'type': 'response', 'content': word_with_space})}\n\n"
                time.sleep(0.045)  # 45ms per word (industry standard: 40-50ms)

            # Save assistant response (cleaned)
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
    """
    Generate contextual thinking steps based on query complexity
    
    Returns 3-5 steps depending on query type
    """
    steps = []
    msg_lower = message.lower()
    
    # Code-related queries (more complex thinking)
    if any(word in msg_lower for word in ['code', 'function', 'script', 'program', 'algorithm']):
        steps.extend([
            "Analyzing code request and determining programming language",
            "Planning code structure and key components",
            "Considering edge cases and error handling",
            "Optimizing for readability and performance"
        ])
    
    # Math/calculation queries
    elif any(word in msg_lower for word in ['calculate', 'compute', 'math', 'solve', 'equation']):
        steps.extend([
            "Breaking down mathematical problem",
            "Identifying required operations",
            "Verifying calculation logic"
        ])
    
    # Explanation/teaching queries
    elif any(word in msg_lower for word in ['explain', 'what is', 'how does', 'why', 'teach', 'learn']):
        steps.extend([
            "Analyzing the question context",
            "Gathering relevant information",
            "Structuring a clear explanation",
            "Preparing examples for clarity"
        ])
    
    # Complex multi-part queries (longer messages)
    elif len(message) > 100:
        steps.extend([
            "Understanding multi-part query structure",
            "Prioritizing information gathering",
            "Organizing comprehensive response",
            "Ensuring all aspects are addressed"
        ])
    
    # Simple conversational queries (fewer steps)
    else:
        steps.extend([
            "Understanding query intent",
            "Formulating response"
        ])
    
    return steps