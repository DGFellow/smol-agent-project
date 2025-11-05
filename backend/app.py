# backend/app.py
from flask import Flask, request, jsonify, g, Response
from flask_cors import CORS
from dotenv import load_dotenv
import os
import time
import json
from werkzeug.utils import secure_filename
from pathlib import Path

# -------- LangChain integration ----------
from src.langchain_integration.chains import qwen_lc
from src.langchain_integration.agent import initialize_agent, get_router
from src.langchain_integration.rag import get_rag_system, initialize_rag

# -------- Project imports ----------
from src.models.model_loader import ModelLoader
from src.agents.code_agent import CodeAgent
from src.agents.chat_agent import ChatAgent
from src.agents.router_agent import RouterAgent, LanguageDetectorAgent
from src.utils.text_processor import TextProcessor
from src.utils.logger import AgentLogger
from src.utils.memory import ConversationMemory
from src.utils.title_generator import generate_title_from_message

# -------- Database imports ----------
from src.database.db import Database
from src.database.user import User
from src.database.conversation import Conversation

# -------- Auth imports ----------
from src.routes.auth import auth_bp
from src.routes.chat_streaming import chat_bp
from src.routes.files import files_bp
from src.middleware.auth import token_required

# -------- Config import ----------
from config import Config  # Added for shared config

## Temporary compatibility for file access after removing legacy upload config
FILES_DIR = Path('data/documents')
FILES_DIR.mkdir(parents=True, exist_ok=True)

load_dotenv()

app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {
        "origins": [os.getenv("FRONTEND_URL", "http://localhost:3000")],
        "methods": ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
    }},
    supports_credentials=True,
)

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(chat_bp, url_prefix='/api/chat')

app.register_blueprint(files_bp, url_prefix='/api/files')
# -------- Initialize database ----------
db_manager = Database()
db = db_manager.connect()
app.config["DB"] = db

# -------- Initialize database models ----------
user_model = User(db)
conversation_model = Conversation(db)

# -------- Registries / Globals ----------
models = {}
agents = {}
sessions = {}

# Utilities
logger = AgentLogger()
memory = ConversationMemory()

# Perf stats
request_count = 0
total_response_time = 0.0

# 🔥 CRITICAL FIX: Add initialization flag
models_initialized = False


@app.before_request
def _start_timer():
    g._start_time = time.time()

@app.after_request
def _record_timing(response):
    global request_count, total_response_time
    start = getattr(g, "_start_time", None)
    if start is not None:
        total_response_time += (time.time() - start)
        request_count += 1
    return response

@app.before_request
def _attach_db():
    g.db = app.config.get("DB", None)


def initialize_models():
    """Load AI models and construct agents/chains - ONLY ONCE"""
    global models, agents, models_initialized
    
    # 🔥 FIX: Check if already initialized
    if models_initialized:
        print("✅ Models already initialized, skipping...")
        return
    
    print("Initializing AI models...")

    if Config.USE_LANGCHAIN:  # Updated to use Config
        print("🔗 Using LangChain integration...")
        try:
            qwen_lc.initialize()
            
            print("🔍 Initializing RAG system...")
            rag_system = initialize_rag(shared_llm=qwen_lc.instruct_llm)
            print("✅ RAG system initialized!")

            initialize_agent(qwen_lc.instruct_llm, qwen_lc.chat_chain, rag_system=rag_system)

            print("✅ LangChain system ready!")
            print(f"💾 Memory optimization: Using 2 models instead of 3 (saved ~3GB VRAM)")
            
            # 🔥 FIX: Mark as initialized
            models_initialized = True
        except Exception as e:
            import traceback
            print(f"❌ LangChain initialization failed: ")
            traceback.print_exc()
            print("Falling back to legacy system...")
            initialize_legacy_models()
    else:
        initialize_legacy_models()


def initialize_legacy_models():
    """Legacy model initialization (fallback)"""
    global models_initialized
    # Load models
    loader = ModelLoader()
    models['instruct'] = loader.load_qwen_instruct()
    models['coder'] = loader.load_qwen_coder()
    models['detector'] = loader.load_language_detector()

    # Initialize agents
    agents['chat'] = ChatAgent(*models['instruct'])
    agents['code'] = CodeAgent(*models['coder'])
    agents['language'] = LanguageDetectorAgent(*models['detector'])
    agents['router'] = RouterAgent(agents['language'], agents['chat'], agents['code'])
    agents['text_processor'] = TextProcessor()

    print("✅ Legacy models loaded!")
    models_initialized = True

# ============================================
# HEALTH CHECK ENDPOINT
# ============================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """System health check"""
    try:
        status = {
            'status': 'healthy',
            'version': '1.0.0',
            'database': 'connected' if db else 'disconnected',
            'models_loaded': models_initialized,
            'use_langchain': Config.USE_LANGCHAIN,  # Updated to use Config
            'average_response_time': (
                total_response_time / request_count if request_count > 0 else 0
            ),
            'request_count': request_count,
        }
        return jsonify(status), 200
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500

# ============================================
# UNIFIED MESSAGE ENDPOINT (non-streaming)
# ============================================

@app.route('/api/message', methods=['POST'])
@token_required
def unified_message():
    """Handle message with unified agent"""
    user_id = request.user_id
    data = request.json or {}
    message = data.get('message', '')
    conversation_id = data.get('conversation_id')
    files = data.get('files', [])  # Optional file IDs

    if not message:
        return jsonify({"error": "No message provided"}), 400

    try:
        # Handle file attachments if present
        attached_content = ""
        if files:
            # Process files (e.g., extract text from documents)
            for file_id in files:
                file_path = FILES_DIR / secure_filename(file_id)
                if file_path.exists():
                    with open(file_path, 'r') as f:
                        attached_content += f"\nAttached file content: {f.read()[:1000]}..."  # Truncate long content

        full_message = message + attached_content

        # Create or get conversation
        if not conversation_id:
            conv = conversation_model.create_conversation(user_id)
            conversation_id = conv['id']

        # Add user message
        conversation_model.add_message(
            conversation_id, 'user', full_message
        )

        # Get history
        history = conversation_model.get_messages(conversation_id)

        if Config.USE_LANGCHAIN:  # Updated to use Config
            response_text = handle_langchain_request(full_message, conversation_id)
            agent_type = "langchain"
            model_used = "Qwen2.5-3B-Instruct (LangChain)"
        else:
            response_text, agent_type, model_used, _ = handle_legacy_request(
                full_message, user_id, conversation_id, history
            )

        # Save response
        conversation_model.add_message(
            conversation_id, 'assistant', response_text,
            agent=agent_type, model=model_used
        )

        # Generate title if new conversation
        if len(history) <= 1:  # Only user message
            title = generate_title_from_message(message)
            conversation_model.update_title(conversation_id, user_id, title)

        return jsonify({
            "response": response_text,
            "conversation_id": conversation_id,
            "agent_used": agent_type,
            "model": model_used,
            "langchain_enabled": Config.USE_LANGCHAIN  # Updated to use Config
        })

    except Exception as e:
        logger.log_error(str(e), f"user_{user_id}")
        return jsonify({"error": str(e)}), 500

def handle_langchain_request(message: str, conversation_id: int) -> str:
    """Handle request with LangChain"""
    # Get conversation history for context
    messages = conversation_model.get_messages(conversation_id)
    history = [{"role": m['role'], "content": m['content']} for m in messages[:-1]]  # Exclude current user message

    # Route to appropriate chain/agent
    router = get_router()
    result = router.invoke({
        "input": message,
        "chat_history": history
    })

    return result['output']

def handle_legacy_request(message: str, user_id: int, conversation_id: int, history: list = None) -> tuple:
    """Handle request with legacy agents"""
    if history is None:
        history = []

    # Detect language/type
    detection = agents['router'].detect(message)

    if detection['type'] == 'code':
        agent = agents['code']
        agent_type = "code"
        model_used = "Qwen2.5-Coder-3B-Instruct"
    else:
        agent = agents['chat']
        agent_type = "chat"
        model_used = "Qwen2.5-3B-Instruct"

    # Process with memory
    session_key = f"user_{user_id}_conv_{conversation_id}"
    if session_key not in sessions:
        sessions[session_key] = memory.initialize_session()

    response = agent.process(message, history, sessions[session_key])

    # Update memory
    memory.update_session(sessions[session_key], message, response)

    # Log usage
    logger.log_interaction(user_id, message, response, agent_type)

    return response, agent_type, model_used, detection

# ============================================
# STREAMING MESSAGE ENDPOINT
# ============================================

@app.route('/api/message/stream', methods=['POST'])
@token_required
def streaming_message():
    """Streaming version of message handler"""
    user_id = request.user_id
    data = request.json or {}
    message = data.get('message', '')
    conversation_id = data.get('conversation_id')

    if not message:
        return jsonify({"error": "No message provided"}), 400

    def generate_stream():
        try:
            # Create/get conversation (streaming metadata)
            is_new = False
            if not conversation_id:
                conv = conversation_model.create_conversation(user_id)
                conversation_id = conv['id']
                is_new = True

            # Add user message
            conversation_model.add_message(conversation_id, 'user', message)

            # Get history
            history = conversation_model.get_messages(conversation_id)

            if Config.USE_LANGCHAIN:  # Updated to use Config
                # LangChain streaming
                router = get_router()
                stream = router.stream({
                    "input": message,
                    "chat_history": history[:-1]  # Exclude current
                })

                response_text = ""
                for chunk in stream:
                    if 'output' in chunk:
                        token = chunk['output']
                        response_text += token
                        yield json.dumps({'type': 'token', 'content': token}) + '\n'

                agent_type = "langchain"
                model_used = "Qwen2.5-3B-Instruct (LangChain)"

            else:
                # Legacy streaming simulation
                response_text, agent_type, model_used, _ = handle_legacy_request(
                    message, user_id, conversation_id, history[:-1]
                )

                # Simulate streaming by sending words
                words = response_text.split()
                for word in words:
                    yield json.dumps({'type': 'token', 'content': word + ' '}) + '\n'
                    time.sleep(0.01)  # Small delay for smooth streaming effect

            # Save full response
            conversation_model.add_message(
                conversation_id, 'assistant', response_text,
                agent=agent_type, model=model_used
            )

            # Metadata
            metadata = {
                'conversation_id': conversation_id,
                'is_new_conversation': is_new,
                'agent_used': agent_type,
                'model': model_used,
                'langchain_enabled': Config.USE_LANGCHAIN  # Updated to use Config
            }
            if is_new:
                title = generate_title_from_message(message)
                conversation_model.update_title(conversation_id, user_id, title)
                metadata['conversation_title'] = title

            yield json.dumps({'type': 'metadata', **metadata}) + '\n'
            yield '[DONE]'

        except Exception as e:
            yield json.dumps({'error': str(e)}) + '\n'

    return Response(generate_stream(), mimetype='application/x-ndjson')

# ============================================
# CONVERSATIONS ENDPOINT
# ============================================

@app.route('/api/conversations', methods=['GET'])
@token_required
def get_conversations():
    """Get user conversations"""
    user_id = request.user_id
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)

    conversations = conversation_model.get_user_conversations(
        user_id, limit=limit, offset=offset
    )
    total = conversation_model.get_conversation_count(user_id)

    return jsonify({
        'conversations': conversations,
        'total': total,
        'limit': limit,
        'offset': offset
    })

@app.route('/api/conversations/<int:conv_id>', methods=['GET'])
@token_required
def get_conversation(conv_id):
    """Get single conversation with messages"""
    user_id = request.user_id
    conv = conversation_model.get_by_id(conv_id)

    if not conv or conv['user_id'] != user_id:
        return jsonify({"error": "Conversation not found"}), 404

    messages = conversation_model.get_messages(conv_id)

    return jsonify({
        'conversation': {
            'id': conv['id'],
            'title': conv['title'],
            'created_at': conv['created_at'],
            'updated_at': conv['updated_at'],
            'messages': messages
        }
    })

@app.route('/api/conversations/<int:conv_id>/title', methods=['PUT'])
@token_required
def update_conversation_title(conv_id):
    """Update conversation title"""
    user_id = request.user_id
    data = request.json or {}
    title = data.get('title')

    if not title:
        return jsonify({"error": "No title provided"}), 400

    if conversation_model.update_title(conv_id, user_id, title):
        return jsonify({"message": "Title updated", "title": title})
    else:
        return jsonify({"error": "Unauthorized or not found"}), 403

@app.route('/api/conversations/<int:conv_id>', methods=['DELETE'])
@token_required
def delete_conversation(conv_id):
    """Delete conversation"""
    user_id = request.user_id

    if conversation_model.delete_conversation(conv_id, user_id):
        return jsonify({"message": "Conversation deleted"})
    else:
        return jsonify({"error": "Unauthorized or not found"}), 403

# ============================================
# CLEAR CONVERSATION ENDPOINT
# ============================================

@app.route('/api/clear', methods=['POST'])
@token_required
def clear_conversation():
    """Clear messages in conversation"""
    user_id = request.user_id
    data = request.json or {}
    conversation_id = data.get('conversation_id')

    if not conversation_id:
        return jsonify({"error": "Conversation ID required"}), 400

    conv = conversation_model.get_by_id(conversation_id)
    if not conv or conv['user_id'] != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    db.execute(
        'DELETE FROM messages WHERE conversation_id = ?',
        (conversation_id,)
    )
    db.commit()

    return jsonify({"status": "Conversation cleared"})

# ============================================
# MESSAGE REACTIONS ENDPOINT
# ============================================

@app.route('/api/message/<int:message_id>/reaction', methods=['POST'])
@token_required
def message_reaction(message_id):
    """Add or update reaction to a message"""
    user_id = request.user_id
    data = request.json or {}
    reaction = data.get('reaction')  # 'like', 'dislike', or None

    if reaction not in ['like', 'dislike', None]:
        return jsonify({"error": "Invalid reaction"}), 400

    try:
        # Verify message ownership through conversation
        cursor = db.execute('''
            SELECT m.conversation_id, c.user_id 
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE m.id = ?
        ''', (message_id,))
        
        result = cursor.fetchone()
        if not result:
            return jsonify({"error": "Message not found"}), 404
        
        conv_user_id = result[1]
        if conv_user_id != user_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Update reaction
        db.execute('''
            UPDATE messages 
            SET reaction = ?
            WHERE id = ?
        ''', (reaction, message_id))
        
        db.commit()

        return jsonify({
            "success": True,
            "message_id": message_id,
            "reaction": reaction
        })

    except Exception as e:
        logger.log_error(str(e), f"user_{user_id}")
        return jsonify({"error": str(e)}), 500


# ============================================
# MESSAGE REGENERATE ENDPOINT
# ============================================

@app.route('/api/message/regenerate', methods=['POST'])
@token_required
def regenerate_message():
    """Regenerate the last assistant message"""
    user_id = request.user_id
    data = request.json or {}
    conversation_id = data.get('conversation_id')
    message_id = data.get('message_id')

    if not conversation_id:
        return jsonify({"error": "Conversation ID required"}), 400

    try:
        # Verify ownership
        conv = conversation_model.get_by_id(conversation_id)
        if not conv or conv['user_id'] != user_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Get the user message before the assistant message
        cursor = db.execute('''
            SELECT content FROM messages
            WHERE conversation_id = ? AND id < ? AND role = 'user'
            ORDER BY created_at DESC
            LIMIT 1
        ''', (conversation_id, message_id))
        
        user_message = cursor.fetchone()
        if not user_message:
            return jsonify({"error": "No user message found"}), 404

        user_content = user_message[0]

        # Delete the old assistant message
        db.execute('DELETE FROM messages WHERE id = ?', (message_id,))
        db.commit()

        # Generate new response
        if Config.USE_LANGCHAIN:  # Updated to use Config
            response_text = handle_langchain_request(user_content, conversation_id)
            agent_type = "langchain"
            model_used = "Qwen2.5-3B-Instruct (LangChain)"
        else:
            response_text, agent_type, model_used, _ = handle_legacy_request(
                user_content, user_id, conversation_id
            )

        # Save new message
        conversation_model.add_message(
            conversation_id,
            'assistant',
            response_text,
            agent=agent_type,
            model=model_used
        )

        return jsonify({
            "response": response_text,
            "conversation_id": conversation_id,
            "agent_used": agent_type,
            "model": model_used,
        })

    except Exception as e:
        logger.log_error(str(e), f"user_{user_id}")
        return jsonify({"error": str(e)}), 500

# Legacy endpoints omitted for brevity - keep your existing ones

initialize_models()  # Added: Initialize models at startup

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
