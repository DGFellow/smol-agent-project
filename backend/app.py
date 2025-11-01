from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import time

# -------- LangChain integration (NEW) ----------
# Safe to import even if you keep legacy only; guarded by try/except in initialize_models()
from src.langchain_integration.chains import qwen_lc
from src.langchain_integration.agent import initialize_agent, get_router

# -------- Project imports - Legacy models (KEEP) ----------
from src.models.model_loader import ModelLoader
from src.agents.code_agent import CodeAgent
from src.agents.chat_agent import ChatAgent
from src.agents.router_agent import RouterAgent, LanguageDetectorAgent
from src.utils.text_processor import TextProcessor
from src.utils.logger import AgentLogger
from src.utils.memory import ConversationMemory
from src.utils.title_generator import generate_title_from_message, generate_title_with_llm

# -------- Database imports ----------
from src.database.db import Database
from src.database.user import User
from src.database.conversation import Conversation

# -------- Auth imports ----------
from src.routes import auth
from src.middleware.auth import token_required

load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": [os.getenv("FRONTEND_URL", "http://localhost:3000")],
        "methods": ["GET", "POST", "DELETE", "PUT"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# -------- Initialize database ----------
db_manager = Database()
db = db_manager.connect()

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
total_response_time = 0


def initialize_models():
    """
    Load AI models and construct agents/chains.
    Priority: LangChain -> fallback to legacy models.
    """
    print("Initializing AI models...")
    global models, agents, use_langchain

    if models and agents and (use_langchain or 'router' in agents):
        return

    if use_langchain:
        print("🔗 Using LangChain integration...")
        try:
            # Boot LC wrappers
            qwen_lc.initialize()
            # Build LC agent + tools
            initialize_agent(qwen_lc.instruct_llm, qwen_lc.chat_chain)
            print("✅ LangChain system ready!")
            # Register a sentinel so /api/health exposes something non-empty
            models['langchain'] = ("Qwen2.5-3B-Instruct", None)
            agents['langchain_agent'] = object()
            return
        except Exception as e:
            print(f"❌ LangChain initialization failed: {e}")
            print("Falling back to legacy system…")
            use_langchain = False

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
# AUTH ROUTES (keep your full surface area)
# ============================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    return auth.register(db)

@app.route('/api/auth/login', methods=['POST'])
def login():
    return auth.login(db)

@app.route('/api/auth/verify', methods=['GET'])
def verify():
    return auth.verify_token()

@app.route('/api/auth/check-username', methods=['POST'])
def check_username():
    return auth.check_username(db)

@app.route('/api/auth/check-email', methods=['POST'])
def check_email():
    return auth.check_email(db)

@app.route('/api/auth/verify-email/<token>', methods=['GET'])
def verify_email(token):
    return auth.verify_email(db, token)

@app.route('/api/auth/resend-verification', methods=['POST'])
@token_required
def resend_verification():
    return auth.resend_verification(db, {'user_id': request.user_id})

@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    return auth.forgot_password(db)

@app.route('/api/auth/reset-password/<token>', methods=['POST'])
def reset_password(token):
    return auth.reset_password(db, token)

@app.route('/api/auth/enable-2fa', methods=['POST'])
@token_required
def enable_2fa():
    return auth.enable_2fa(db, {'user_id': request.user_id})

@app.route('/api/auth/disable-2fa', methods=['POST'])
@token_required
def disable_2fa():
    return auth.disable_2fa(db, {'user_id': request.user_id})


# ============================================
# HEALTH CHECK
# ============================================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check with stats"""
    avg_response_time = (total_response_time / request_count) if request_count > 0 else 0
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
    global request_count, total_response_time
    start_time = time.time()

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
            response_text, agent_type, model_used, needs_language = handle_legacy_request(message, user_id, conversation_id)

        # Save assistant message
        conversation_model.add_message(
            conversation_id,
            'assistant',
            response_text,
            agent=agent_type,
            model=model_used
        )

        # Perf
        elapsed = time.time() - start_time
        request_count += 1
        total_response_time += elapsed
        logger.logger.info(f"Request completed in {elapsed:.2f}s")

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
        sessions[session_key] = {
            'waiting_for_language': False,
            'pending_task': None
        }

    session = sessions[session_key]

    # If we previously asked user to specify language for code
    if session.get('waiting_for_language'):
        code_agent = agents['code']
        result = code_agent.handle_language_response(message)
        session['waiting_for_language'] = False
        logger.log_response(result['response'], "code", f"user_{user_id}")
        return result['response'], 'code', "Qwen2.5-Coder-3B-Instruct", False

    # Route fresh message
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
    avg_response_time = (total_response_time / request_count) if request_count > 0 else 0
    return jsonify({
        "total_requests": request_count,
        "avg_response_time_seconds": round(avg_response_time, 3),
        "avg_response_time_ms": round(avg_response_time * 1000, 2),
        "active_sessions": len(sessions),
        "models_loaded": list(models.keys())
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
