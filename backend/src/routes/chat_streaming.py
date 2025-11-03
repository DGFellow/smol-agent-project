from flask import Blueprint, Response, request, stream_with_context, g, jsonify
import json
from src.middleware.auth import token_required  # Import to use the decorator
from src.models.model_loader import ModelLoader  # Updated import: use the class instead of non-existent functions
from src.agents.chat_agent import ChatAgent
from src.agents.thinking_agent import ThinkingAgent
from config import Config  # Import shared config

# LangChain-specific imports (only if enabled)
if Config.USE_LANGCHAIN:
    from langchain_core.messages import HumanMessage, AIMessage
    from src.langchain_integration.chains import qwen_lc
    from src.langchain_integration.agent import get_router

chat_bp = Blueprint('chat', __name__)  # Changed name to 'chat_bp' to match import in app.py

# Load legacy models at module level (only once, if not using LangChain)
if not Config.USE_LANGCHAIN:
    loader = ModelLoader()
    model, tokenizer = loader.load_qwen_instruct()

@chat_bp.route('/stream', methods=['POST'])  # Relative route; with url_prefix='/api/chat', becomes /api/chat/stream
@token_required  # Add decorator for consistency with other endpoints
def stream_chat():
    """
    Stream chat response with thinking process
   
    Request body:
    {
        "message": "user message",
        "conversation_id": "optional_id",
        "files": []  # Optional array of file IDs; currently ignored but can be processed if needed
    }
   
    Response: Server-Sent Events (SSE) stream
    """
    user_id = request.user_id  # Aligned with @token_required in app.py (assumes it sets g.user_id)

    data = request.json
    message = data.get('message', '')
    conversation_id = data.get('conversation_id')
    files = data.get('files', [])  # Handle files if present; currently unused, but can add logic (e.g., for RAG)

    # Note: If files need processing, add here (e.g., load documents)
   
    def generate():
        """Generate SSE stream"""
        nonlocal conversation_id
        new_created = False
        response_content = ''

        try:
            db = g.db  # Use attached db from app.py's _attach_db

            # Create new conversation if none provided
            if not conversation_id:
                title = "New Conversation"  # Can use generate_title_from_message if imported
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
                # Convert history to LangChain format
                lc_history = []
                for msg in history:
                    if msg['role'] == 'user':
                        lc_history.append(HumanMessage(content=msg['content']))
                    else:
                        lc_history.append(AIMessage(content=msg['content']))

                # Use LangChain chain or agent for streaming (assumes chat_chain supports .stream; swap to router.astream_events if agent-based)
                # For thinking steps, use astream_events if using agent
                router = get_router()  # Assuming this returns the runnable agent/chain
                # Simple chain stream example; for full agent with thinking, use: for event in router.astream_events({"input": message, "chat_history": lc_history}, version="v1"):
                # Then parse event['event'] for 'on_chain_start' (thinking), 'on_llm_stream' (response tokens), etc.
                for chunk in qwen_lc.chat_chain.stream({"messages": lc_history}):
                    token = chunk.content if hasattr(chunk, 'content') else str(chunk)  # Adjust based on chain output format
                    response_content += token
                    yield f"data: {json.dumps({'type': 'response', 'content': token})}\n\n"
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