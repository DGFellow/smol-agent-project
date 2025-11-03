from flask import Blueprint, Response, request, stream_with_context, g, jsonify
import json
from src.middleware.auth import token_required
from src.models.model_loader import ModelLoader
from src.agents.chat_agent import ChatAgent
from src.agents.thinking_agent import ThinkingAgent
from config import Config

# LangChain-specific imports (only if enabled)
if Config.USE_LANGCHAIN:
    from langchain_core.messages import HumanMessage, AIMessage
    from src.langchain_integration.chains import qwen_lc
    from src.langchain_integration.agent import get_router

chat_bp = Blueprint('chat', __name__)

# Load legacy models at module level (only once, if not using LangChain)
if not Config.USE_LANGCHAIN:
    loader = ModelLoader()
    model, tokenizer = loader.load_qwen_instruct()

@chat_bp.route('/stream', methods=['POST'])
@token_required
def stream_chat():
    """
    Stream chat response with thinking process
   
    Request body:
    {
        "message": "user message",
        "conversation_id": "optional_id",
        "files": []
    }
   
    Response: Server-Sent Events (SSE) stream
    """
    user_id = request.user_id

    data = request.json
    message = data.get('message', '')
    conversation_id = data.get('conversation_id')
    files = data.get('files', [])

    def generate():
        """Generate SSE stream"""
        nonlocal conversation_id
        new_created = False
        response_content = ''

        try:
            db = g.db

            # Create new conversation if none provided
            if not conversation_id:
                title = "New Conversation"
                cursor = db.cursor()
                cursor.execute(
                    "INSERT INTO conversations (user_id, title, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))",
                    (user_id, title)
                )
                db.commit()
                conversation_id = cursor.lastrowid
                new_created = True

            # Add user message
            cursor = db.cursor()
            cursor.execute(
                "INSERT INTO messages (conversation_id, role, content, created_at, updated_at) VALUES (?, 'user', ?, datetime('now'), datetime('now'))",
                (conversation_id, message)
            )
            db.commit()

            # Yield metadata if new conversation
            if new_created:
                yield f"data: {json.dumps({'type': 'metadata', 'conversation_id': conversation_id})}\n\n"

            # Get history for agent (including the new user message)
            cursor = db.cursor()
            cursor.execute(
                "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at",
                (conversation_id,)
            )
            history = [{'role': row[0], 'content': row[1]} for row in cursor.fetchall()]

            if Config.USE_LANGCHAIN:
                # Convert history to LangChain format (exclude current user message for context)
                lc_history = []
                for msg in history[:-1]:  # Exclude the message we just added
                    if msg['role'] == 'user':
                        lc_history.append(HumanMessage(content=msg['content']))
                    else:
                        lc_history.append(AIMessage(content=msg['content']))

                # Stream using LangChain
                try:
                    for chunk in qwen_lc.chat_chain.stream({"input": message, "chat_history": lc_history}):
                        if chunk:  # Only send non-empty chunks
                            response_content += chunk
                            yield f"data: {json.dumps({'type': 'response', 'content': chunk})}\n\n"
                except Exception as e:
                    print(f"Streaming error: {e}")
                    # Fallback to invoke if streaming fails
                    result = qwen_lc.chat_chain.invoke({"input": message, "chat_history": lc_history})
                    response_content = result.get("text", "")
                    yield f"data: {json.dumps({'type': 'response', 'content': response_content})}\n\n"
            else:
                # Legacy processing
                base_agent = ChatAgent(model, tokenizer)
                thinking_agent = ThinkingAgent(base_agent)
                
                # Process with thinking agent
                for event in thinking_agent.process_with_thinking(history):
                    if event['type'] == 'response':
                        response_content += event.get('content', '')
                    # Format as Server-Sent Event
                    yield f"data: {json.dumps(event)}\n\n"

            # Save assistant message after streaming complete
            if response_content:
                cursor = db.cursor()
                cursor.execute(
                    "INSERT INTO messages (conversation_id, role, content, created_at, updated_at) VALUES (?, 'assistant', ?, datetime('now'), datetime('now'))",
                    (conversation_id, response_content)
                )
                db.commit()

        except Exception as e:
            print(f"Stream error: {e}")
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