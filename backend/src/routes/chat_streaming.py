# backend/src/routes/chat_streaming.py - FIXED VERSION

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

if not Config.USE_LANGCHAIN:
    loader = ModelLoader()
    model, tokenizer = loader.load_qwen_instruct()


def clean_llm_response(text: str) -> str:
    """Clean LLM response"""
    text = re.sub(r'^\s*Assistant:\s*', '', text, flags=re.IGNORECASE | re.MULTILINE)
    
    clarification_patterns = [
        r'^To be more specific[,:]?\s*',
        r'^Let me clarify[,:]?\s*',
        r'^In other words[,:]?\s*',
    ]
    for pattern in clarification_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    human_match = re.search(r'\bHuman:\s*', text, flags=re.IGNORECASE)
    if human_match:
        text = text[:human_match.start()].strip()
    
    text = re.sub(r'\bAssistant:\s*', '', text, flags=re.IGNORECASE)
    
    sentences = [s.strip() for s in re.split(r'([.!?]+\s+)', text) if s.strip()]
    seen = set()
    cleaned_sentences = []
    for sentence in sentences:
        normalized = re.sub(r'[^\w\s]', '', sentence.lower())
        if normalized and normalized not in seen:
            seen.add(normalized)
            cleaned_sentences.append(sentence)
    
    return ' '.join(cleaned_sentences).strip()


def _generate_thinking_steps(message: str) -> list:
    """Generate contextual thinking steps"""
    msg_lower = message.lower()
    
    if any(word in msg_lower for word in ['code', 'function', 'script', 'program']):
        return [
            "Analyzing code requirements",
            "Planning implementation approach",
            "Preparing solution"
        ]
    elif any(word in msg_lower for word in ['calculate', 'compute', 'math']):
        return [
            "Analyzing mathematical problem",
            "Calculating solution"
        ]
    elif any(word in msg_lower for word in ['explain', 'what is', 'how does']):
        return [
            "Understanding the question",
            "Gathering information",
            "Structuring explanation"
        ]
    elif len(message) > 100:
        return [
            "Analyzing query",
            "Organizing information",
            "Preparing response"
        ]
    else:
        return [
            "Processing question",
            "Formulating response"
        ]


@chat_bp.route('/stream', methods=['POST'])
@token_required
def stream_chat():
    """
    FIXED: Show thinking IMMEDIATELY, generate response in background,
    then stream word-by-word
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

            # ✅ 1. EMIT THINKING_START IMMEDIATELY
            thinking_start_time = time.time()
            yield f"data: {json.dumps({'type': 'thinking_start', 'timestamp': thinking_start_time})}\n\n"
            
            # Generate contextual thinking steps
            thinking_steps = _generate_thinking_steps(message)
            
            # ✅ 2. Show first step immediately (gives instant feedback)
            if len(thinking_steps) > 0:
                yield f"data: {json.dumps({'type': 'thinking_step', 'content': thinking_steps[0], 'step': 1, 'timestamp': time.time()})}\n\n"
            
            # ✅ 3. Generate response (this is the slow part - happens in background)
            full_response = ''
            
            if Config.USE_LANGCHAIN:
                lc_history = []
                for msg in history[:-1]:
                    if msg['role'] == 'user':
                        lc_history.append(HumanMessage(content=msg['content']))
                    else:
                        lc_history.append(AIMessage(content=msg['content']))

                result = qwen_lc.chat_chain.invoke({"input": message, "chat_history": lc_history})
                full_response = result.get("text", "")
            else:
                base_agent = ChatAgent(model, tokenizer)
                thinking_agent = ThinkingAgent(base_agent)
                
                for event in thinking_agent.process_with_thinking(history):
                    if event['type'] == 'response':
                        full_response += event.get('content', '')
            
            # ✅ 4. Show remaining thinking steps quickly
            for i, step in enumerate(thinking_steps[1:], 2):
                yield f"data: {json.dumps({'type': 'thinking_step', 'content': step, 'step': i, 'timestamp': time.time()})}\n\n"
                time.sleep(0.2)  # Quick succession

            full_response = clean_llm_response(full_response)

            # ✅ 5. Complete thinking
            thinking_duration = time.time() - thinking_start_time
            yield f"data: {json.dumps({'type': 'thinking_complete', 'duration': thinking_duration, 'timestamp': time.time()})}\n\n"

            # ✅ 6. STREAM RESPONSE - Word by word
            words = full_response.split()
            for word in words:
                response_content += word + ' '
                yield f"data: {json.dumps({'type': 'response', 'content': word + ' '})}\n\n"
                time.sleep(0.05)  # 50ms per word = natural reading speed

            # Save assistant response
            if response_content.strip():
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