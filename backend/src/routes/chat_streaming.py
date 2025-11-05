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

# Legacy model loading
if not Config.USE_LANGCHAIN:
    loader = ModelLoader()
    model, tokenizer = loader.load_qwen_instruct()


def clean_llm_response(text: str) -> str:
    """
    Clean LLM response to remove fake dialogue, prefixes, and clarifications
    
    ✅ IMPROVED: More aggressive cleaning for conversational responses
    """
    # Remove "Assistant:" prefix at the start
    text = re.sub(r'^\s*Assistant:\s*', '', text, flags=re.IGNORECASE | re.MULTILINE)
    
    # Remove common clarification/thinking patterns at the start
    clarification_patterns = [
        r'^To be more specific[,:]?\s*',
        r'^Let me clarify[,:]?\s*',
        r'^In other words[,:]?\s*',
        r'^More specifically[,:]?\s*',
        r'^What I mean is[,:]?\s*',
    ]
    for pattern in clarification_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    # Remove fake question/answer patterns at the start
    # Example: "what skills can you assist with? Certainly!"
    text = re.sub(r'^[^.!?]+\?\s*(?:Certainly|Yes|Sure|Of course)[!,]?\s*', '', text, flags=re.IGNORECASE)
    
    # Truncate at first "Human:" occurrence (fake dialogue)
    human_match = re.search(r'\bHuman:\s*', text, flags=re.IGNORECASE)
    if human_match:
        text = text[:human_match.start()].strip()
    
    # Remove any remaining "Assistant:" prefixes within the text
    text = re.sub(r'\bAssistant:\s*', '', text, flags=re.IGNORECASE)
    
    # Remove duplicate sentences (LLM sometimes repeats)
    sentences = [s.strip() for s in re.split(r'([.!?]+\s+)', text) if s.strip()]
    seen = set()
    cleaned_sentences = []
    for sentence in sentences:
        # Normalize for comparison (lowercase, no punctuation)
        normalized = re.sub(r'[^\w\s]', '', sentence.lower())
        if normalized and normalized not in seen:
            seen.add(normalized)
            cleaned_sentences.append(sentence)
    
    text = ' '.join(cleaned_sentences)
    
    return text.strip()


@chat_bp.route('/stream', methods=['POST'])
@token_required
def stream_chat():
    """
    Stream chat with thinking + word-by-word response
    
    ✅ FIXED: Better timing and smoother streaming
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

            # ✅ GENERATE RESPONSE FIRST (before showing thinking)
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
                
            else:
                # Legacy path
                base_agent = ChatAgent(model, tokenizer)
                thinking_agent = ThinkingAgent(base_agent)
                
                full_response = ""
                for event in thinking_agent.process_with_thinking(history):
                    if event['type'] == 'response':
                        full_response += event.get('content', '')

            # ✅ CLEAN THE RESPONSE AGGRESSIVELY
            full_response = clean_llm_response(full_response)
            
            # ✅ THINKING PHASE - Show AFTER we have the response
            thinking_start_time = time.time()
            
            # Start thinking indicator (immediate, no delay)
            yield f"data: {json.dumps({'type': 'thinking_start', 'timestamp': thinking_start_time})}\n\n"
            
            # Generate thinking steps contextually
            thinking_steps = _generate_thinking_steps(message)
            
            # Show thinking steps with realistic timing
            for i, step in enumerate(thinking_steps, 1):
                time.sleep(0.4)  # 400ms per step (faster pacing)
                yield f"data: {json.dumps({'type': 'thinking_step', 'content': step, 'step': i, 'timestamp': time.time()})}\n\n"

            # Complete thinking
            thinking_duration = time.time() - thinking_start_time
            yield f"data: {json.dumps({'type': 'thinking_complete', 'duration': thinking_duration, 'timestamp': time.time()})}\n\n"

            # ✅ STREAMING PHASE - Character-by-character for smoother effect
            # Stream character by character instead of word by word
            for i, char in enumerate(full_response):
                response_content += char
                yield f"data: {json.dumps({'type': 'response', 'content': char})}\n\n"
                
                # Variable delay based on character type
                if char in '.!?':
                    time.sleep(0.15)  # Pause at sentence ends
                elif char in ',;:':
                    time.sleep(0.08)  # Pause at commas
                elif char == ' ':
                    time.sleep(0.03)  # Quick pause at spaces
                else:
                    time.sleep(0.02)  # 20ms per character (50 chars/sec)

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
    
    ✅ REDUCED: Fewer steps for faster UX
    """
    steps = []
    msg_lower = message.lower()
    
    # Code-related queries (3 steps)
    if any(word in msg_lower for word in ['code', 'function', 'script', 'program', 'algorithm']):
        steps.extend([
            "Analyzing code requirements",
            "Planning implementation approach",
            "Preparing code solution"
        ])
    
    # Math/calculation queries (2 steps)
    elif any(word in msg_lower for word in ['calculate', 'compute', 'math', 'solve', 'equation']):
        steps.extend([
            "Analyzing mathematical problem",
            "Calculating solution"
        ])
    
    # Explanation/teaching queries (3 steps)
    elif any(word in msg_lower for word in ['explain', 'what is', 'how does', 'why', 'teach', 'learn']):
        steps.extend([
            "Understanding the question",
            "Gathering relevant information",
            "Structuring explanation"
        ])
    
    # Complex multi-part queries (3 steps)
    elif len(message) > 100:
        steps.extend([
            "Analyzing query components",
            "Organizing information",
            "Preparing comprehensive response"
        ])
    
    # Simple conversational queries (2 steps only)
    else:
        steps.extend([
            "Processing your question",
            "Formulating response"
        ])
    
    return steps