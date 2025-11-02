# backend/app.py
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from dotenv import load_dotenv
import os
import time
from werkzeug.utils import secure_filename
from pathlib import Path

# -------- LangChain integration (NEW) ----------
# Safe to import even if you keep legacy only; guarded by try/except in initialize_models()
from src.langchain_integration.chains import qwen_lc
from src.langchain_integration.agent import initialize_agent, get_router
from src.langchain_integration.rag import get_rag_system, initialize_rag

# -------- Project imports - Legacy models (KEEP) ----------
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
from src.routes.auth import auth_bp  # Blueprint with /check-username, /check-email, etc.
from src.middleware.auth import token_required

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

# -------- Register Blueprints ----------
# This mounts all auth endpoints under /api/auth/...
# e.g. /api/auth/check-username, /api/auth/check-email, etc.
app.register_blueprint(auth_bp, url_prefix="/api/auth")

# File upload configuration
UPLOAD_FOLDER = Path('data/documents')
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx', 'md', 'csv', 'json'}
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# -------- Initialize database ----------
db_manager = Database()
db = db_manager.connect()
# Make DB reachable from blueprint helpers via app.config and g
app.config["DB"] = db

# -------- Initialize database models ----------
user_model = User(db)
conversation_model = Conversation(db)

# -------- Registries / Globals ----------
models = {}
agents = {}
sessions = {}

# LangChain toggle
use_langchain = True  # set False to force legacy path

# Utilities
logger = AgentLogger()
memory = ConversationMemory()

# Perf stats
request_count = 0
total_response_time = 0.0


# ============================================
# Request timing hooks (for health stats)
# ============================================
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
    # expose DB handle to request context
    g.db = app.config.get("DB", None)


def initialize_models():
    """Load AI models and construct agents/chains"""
    print("Initializing AI models...")
    global models, agents, use_langchain

    if models and agents:
        return

    # Choose initialization path
    if use_langchain:
        print("🔗 Using LangChain integration...")
        try:
            # 1. Initialize LangChain wrapper (models)
            qwen_lc.initialize()
            
            # 2. Initialize RAG system FIRST (only once!)
            print("🔍 Initializing RAG system...")
            rag_system = initialize_rag()
            print("✅ RAG system initialized!")

            # 3. Initialize agent with tools (pass RAG system to avoid re-initialization)
            initialize_agent(qwen_lc.instruct_llm, qwen_lc.chat_chain, rag_system=rag_system)

            print("✅ LangChain system ready!")
        except Exception as e:
            import traceback
            print(f"❌ LangChain initialization failed: ")
            print("******")
            traceback.print_exc()
            print("******")
            print("Falling back to legacy system...")
            use_langchain = False
            initialize_legacy_models()
    else:
        initialize_legacy_models()


def initialize_legacy_models():
    """Legacy model initialization (fallback)"""
    print("Using legacy model system…")
    loader = ModelLoader()

    # Load Qwen Instruct (chat/routing)
    instruct_model, instruct_tokenizer = loader.load_qwen_instruct()
    models['instruct'] = (instruct_model, instruct_tokenizer)

    # Create agents
    agents['router'] = RouterAgent(instruct_model, instruct_tokenizer)
    agents['language_detector'] = LanguageDetectorAgent(instruct_model, instruct_tokenizer)
    agents['chat'] = ChatAgent(instruct_model, instruct_tokenizer)

    # Load Qwen Coder
    coder_model, coder_tokenizer = loader.load_qwen_coder()
    models['coder'] = (coder_model, coder_tokenizer)
    agents['code'] = CodeAgent(coder_model, coder_tokenizer)

    print("Legacy models initialized successfully!")


# Eager load at startup
try:
    initialize_models()
except Exception as e:
    app.logger.exception("Model initialization failed: %s", e)


# ============================================
# HEALTH CHECK
# ============================================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check with stats"""
    avg_response_time = (total_response_time / request_count) if request_count > 0 else 0.0
    return jsonify({
        "status": "healthy",
        "langchain_enabled": use_langchain,
        "models": list(models.keys()) if not use_langchain else ["langchain"],
        "agents": list(agents.keys()) if not use_langchain else ["langchain_agent"],
        "stats": {
            "total_requests": request_count,
            "avg_response_time_ms": round(avg_response_time * 1000, 2)
        }
    })


# ============================================
# UNIFIED MESSAGE ENDPOINT (LC + Legacy)
# ============================================

@app.route('/api/message', methods=['POST'])
@token_required
def unified_message():
    """
    Unified message endpoint with authentication, LC routing, and auto titles.
    """
    user_id = request.user_id
    data = request.json or {}
    message = (data.get('message') or '').strip()
    conversation_id = data.get('conversation_id')

    if not message:
        return jsonify({"error": "No message provided"}), 400

    # Sanitize & guardrails
    message = TextProcessor.sanitize_input(message)
    token_count = TextProcessor.count_tokens_estimate(message)
    if token_count > 2000:
        return jsonify({"error": "Message too long"}), 400

    try:
        # Create or attach to conversation
        is_new_conversation = False
        conversation_title = None

        if not conversation_id or conversation_id == 'null':
            title = generate_title_from_message(message)
            conv = conversation_model.create_conversation(user_id, title=title)
            conversation_id = conv['id']
            conversation_title = title
            is_new_conversation = True
            print(f"✓ Created new conversation {conversation_id} for user {user_id}")
        else:
            print(f"Checking ownership of conversation {conversation_id} for user {user_id}")
            conv = conversation_model.get_by_id(conversation_id)
            if not conv:
                return jsonify({"error": "Conversation not found"}), 404
            if conv['user_id'] != user_id:
                return jsonify({"error": "Unauthorized"}), 403
            conversation_title = conv['title']
            print(f"✓ Using existing conversation {conversation_id}")

        # Persist user message
        conversation_model.add_message(conversation_id, 'user', message)

        # Ensure models loaded (in case of lazy import failures after start)
        initialize_models()

        logger.log_request(message, "langchain" if use_langchain else "routing", f"user_{user_id}")

        # --- Generate response
        if use_langchain:
            response_text = handle_langchain_request(message, conversation_id)
            agent_type = "langchain"
            model_used = "Qwen2.5-3B-Instruct (LangChain)"
            needs_language = False
        else:
            response_text, agent_type, model_used, needs_language = handle_legacy_request(
                message, user_id, conversation_id
            )

        # Save assistant message
        conversation_model.add_message(
            conversation_id,
            'assistant',
            response_text,
            agent=agent_type,
            model=model_used
        )

        logger.logger.info("Request served")

        return jsonify({
            "response": response_text,
            "conversation_id": conversation_id,
            "is_new_conversation": is_new_conversation,
            "conversation_title": conversation_title,
            "agent_used": agent_type,
            "model": model_used,
            "langchain_enabled": use_langchain,
            "needs_language": needs_language
        })

    except Exception as e:
        logger.log_error(str(e), f"user_{user_id}")
        return jsonify({"error": str(e)}), 500


def handle_langchain_request(message: str, conversation_id: int) -> str:
    """Handle request using LangChain system"""
    try:
        router = get_router()
        if router:
            result = router.route(message)
            return result.get('response', '')
        # Simple chat fallback if router is absent
        return qwen_lc.chat(message)
    except Exception as e:
        print(f"❌ LangChain error: {e}")
        return f"I encountered an error: {str(e)}"


def handle_legacy_request(message: str, user_id: int, conversation_id: int):
    """Handle request using legacy system (fallback)"""
    session_key = f"{user_id}_{conversation_id}"
    if session_key not in sessions:
        sessions[session_key] = {'waiting_for_language': False, 'pending_task': None}
    session = sessions[session_key]

    if session.get('waiting_for_language'):
        code_agent = agents['code']
        result = code_agent.handle_language_response(message)
        session['waiting_for_language'] = False
        logger.log_response(result['response'], "code", f"user_{user_id}")
        return result['response'], 'code', "Qwen2.5-Coder-3B-Instruct", False

    router = agents['router']
    agent_type = router.route_request(message)

    if agent_type == 'code':
        language_detector = agents['language_detector']
        detected_language = language_detector.detect_language(message)
        code_agent = agents['code']

        if detected_language != 'UNCLEAR':
            result = code_agent.generate_code(message, detected_language)
            logger.log_response(result['response'], "code", f"user_{user_id}")
            return result['response'], 'code', "Qwen2.5-Coder-3B-Instruct", False
        else:
            result = code_agent.generate_code(message, None)
            needs_language = bool(result.get('needs_language'))
            if needs_language:
                session['waiting_for_language'] = True
            logger.log_response(result['response'], "code", f"user_{user_id}")
            return result['response'], 'code', "Qwen2.5-Coder-3B-Instruct", needs_language

    # Chat
    chat_agent = agents['chat']
    result = chat_agent.chat(message)
    logger.log_response(result['response'], "chat", f"user_{user_id}")
    return result['response'], 'chat', "Qwen2.5-3B-Instruct", False


# ============================================
# CONVERSATION MANAGEMENT
# ============================================

@app.route('/api/conversations', methods=['GET'])
@token_required
def list_conversations():
    user_id = request.user_id
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)

    conversations = conversation_model.get_user_conversations(user_id, limit, offset)
    total = conversation_model.get_conversation_count(user_id)

    return jsonify({
        "conversations": conversations,
        "total": total,
        "limit": limit,
        "offset": offset
    })

@app.route('/api/conversations/<int:conversation_id>', methods=['GET'])
@token_required
def get_conversation(conversation_id):
    user_id = request.user_id
    conv = conversation_model.get_by_id(conversation_id)
    if not conv or conv['user_id'] != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    messages = conversation_model.get_messages(conversation_id)
    conv['messages'] = messages
    return jsonify({"conversation": conv})

@app.route('/api/conversations/<int:conversation_id>', methods=['DELETE'])
@token_required
def delete_conversation(conversation_id):
    user_id = request.user_id
    success = conversation_model.delete_conversation(conversation_id, user_id)
    if success:
        session_key = f"{user_id}_{conversation_id}"
        if session_key in sessions:
            del sessions[session_key]
        return jsonify({"message": "Conversation deleted"})
    return jsonify({"error": "Not found or unauthorized"}), 404

@app.route('/api/conversations/<int:conversation_id>/title', methods=['PUT'])
@token_required
def update_conversation_title(conversation_id):
    user_id = request.user_id
    data = request.json or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({"error": "Title required"}), 400
    success = conversation_model.update_title(conversation_id, user_id, title)
    if success:
        return jsonify({"message": "Title updated", "title": title})
    return jsonify({"error": "Not found or unauthorized"}), 404


# ============================================
# LEGACY/BACKWARD COMPATIBILITY ENDPOINTS
# ============================================

@app.route('/api/clear', methods=['POST'])
@token_required
def clear_history():
    user_id = request.user_id
    data = request.json or {}
    conversation_id = data.get('conversation_id')
    if conversation_id:
        success = conversation_model.delete_conversation(conversation_id, user_id)
        if success:
            session_key = f"{user_id}_{conversation_id}"
            if session_key in sessions:
                del sessions[session_key]
            return jsonify({"status": "success", "message": "Conversation cleared"})
    return jsonify({"error": "Conversation not found"}), 404

@app.route('/api/save', methods=['POST'])
@token_required
def save_conversation():
    return jsonify({
        "status": "success",
        "message": "Conversations are now automatically saved"
    })

@app.route('/api/conversation/<session_id>', methods=['DELETE'])
def delete_legacy_conversation(session_id):
    try:
        success = memory.delete_conversation(session_id)
        if success:
            return jsonify({
                "status": "success",
                "message": "Legacy conversation deleted"
            })
        return jsonify({"error": "Conversation not found"}), 404
    except Exception as e:
        logger.log_error(str(e), session_id)
        return jsonify({"error": str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    avg_response_time = (total_response_time / request_count) if request_count > 0 else 0.0
    return jsonify({
        "total_requests": request_count,
        "avg_response_time_seconds": round(avg_response_time, 3),
        "avg_response_time_ms": round(avg_response_time * 1000, 2),
        "active_sessions": len(sessions),
        "models_loaded": list(models.keys()) if models else (["langchain"] if use_langchain else []),
    })


# ============================================
# FILE UPLOAD & RAG MANAGEMENT
# ============================================

@app.route('/api/upload', methods=['POST'])
@token_required
def upload_file():
    """Upload and index a document"""
    user_id = request.user_id

    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "error": f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        }), 400

    try:
        # Secure filename
        filename = secure_filename(file.filename)

        # Save file
        file_path = UPLOAD_FOLDER / filename
        file.save(str(file_path))

        print(f"📁 Saved file: {file_path}")

        # Index document
        rag = get_rag_system()
        result = rag.index_documents([str(file_path)])

        if result['success']:
            logger.logger.info(f"User {user_id} uploaded and indexed: {filename}")
            return jsonify({
                "success": True,
                "message": "File uploaded and indexed successfully",
                "filename": filename,
                "indexed": result['indexed']
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get('message', 'Indexing failed')
            }), 500

    except Exception as e:
        logger.log_error(str(e), f"user_{user_id}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/documents', methods=['GET'])
@token_required
def list_documents():
    """List uploaded documents"""
    try:
        documents = []
        for file_path in UPLOAD_FOLDER.glob('*'):
            if file_path.is_file():
                stat = file_path.stat()
                documents.append({
                    "name": file_path.name,
                    "size": stat.st_size,
                    "created": stat.st_ctime
                })

        return jsonify({
            "documents": documents,
            "total": len(documents)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/documents/<filename>', methods=['DELETE'])
@token_required
def delete_document(filename):
    """Delete an uploaded document"""
    try:
        filename = secure_filename(filename)
        file_path = UPLOAD_FOLDER / filename

        if not file_path.exists():
            return jsonify({"error": "File not found"}), 404

        file_path.unlink()

        # Note: Vector store cleanup would need document ID tracking.
        return jsonify({
            "success": True,
            "message": f"Deleted {filename}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/rag/stats', methods=['GET'])
@token_required
def rag_stats():
    """Get RAG system statistics"""
    try:
        rag = get_rag_system()
        stats = rag.get_stats()
        return jsonify(stats)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/rag/reindex', methods=['POST'])
@token_required
def rag_reindex():
    """Reindex all documents"""
    try:
        rag = get_rag_system()
        result = rag.index_documents()  # Index all files in directory
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
