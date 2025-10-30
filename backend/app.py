from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import time

# Project imports - AI Models
from src.models.model_loader import ModelLoader
from src.agents.code_agent import CodeAgent
from src.agents.chat_agent import ChatAgent
from src.agents.router_agent import RouterAgent, LanguageDetectorAgent
from src.utils.text_processor import TextProcessor
from src.utils.logger import AgentLogger
from src.utils.memory import ConversationMemory
from src.utils.title_generator import generate_title_from_message, generate_title_with_llm

# Database imports
from src.database.db import Database
from src.database.user import User
from src.database.conversation import Conversation

# Auth imports
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

# Initialize database
db_manager = Database()
db = db_manager.connect()

# Initialize database models
user_model = User(db)
conversation_model = Conversation(db)

# Registries
models = {}
agents = {}
sessions = {}

# Utilities
logger = AgentLogger()
memory = ConversationMemory()

# Performance tracking
request_count = 0
total_response_time = 0

def initialize_models():
    """Load AI models and construct agents"""
    print("Initializing AI models...")
    global models, agents
    if models and agents:
        return

    loader = ModelLoader()
    
    # Load Qwen Instruct
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
    
    print("AI models initialized successfully!")

# Eager load
try:
    initialize_models()
except Exception as e:
    app.logger.exception("Model initialization failed: %s", e)

# ============================================
# AUTH ROUTES
# ============================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register new user"""
    return auth.register(db)

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    return auth.login(db)

@app.route('/api/auth/verify', methods=['GET'])
def verify():
    """Verify JWT token"""
    return auth.verify_token()

# ============================================
# HEALTH CHECK
# ============================================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check with stats"""
    avg_response_time = (total_response_time / request_count) if request_count > 0 else 0
    
    return jsonify({
        "status": "healthy",
        "models": list(models.keys()),
        "agents": list(agents.keys()),
        "stats": {
            "total_requests": request_count,
            "avg_response_time_ms": round(avg_response_time * 1000, 2)
        }
    })

# ============================================
# PROTECTED MESSAGE ENDPOINT
# ============================================

@app.route('/api/message', methods=['POST'])
@token_required
def unified_message():
    """Unified message endpoint with authentication and auto-generated titles"""
    global request_count, total_response_time
    start_time = time.time()
    
    user_id = request.user_id
    data = request.json
    message = data.get('message', '').strip()
    conversation_id = data.get('conversation_id')
    
    if not message:
        return jsonify({"error": "No message provided"}), 400
    
    # Sanitize input
    message = TextProcessor.sanitize_input(message)
    
    # Check token count
    token_count = TextProcessor.count_tokens_estimate(message)
    if token_count > 2000:
        return jsonify({"error": "Message too long"}), 400
    
    try:
        # Get or create conversation with auto-generated title
        is_new_conversation = False
        conversation_title = None
        
        if not conversation_id:
            # Generate title from first message
            title = generate_title_from_message(message)
            # OR use LLM (more sophisticated but slower):
            # title = generate_title_with_llm(models['instruct'][0], models['instruct'][1], message)
            
            conv = conversation_model.create_conversation(user_id, title=title)
            conversation_id = conv['id']
            conversation_title = title
            is_new_conversation = True
        else:
            # Verify conversation ownership
            conv = conversation_model.get_by_id(conversation_id)
            if not conv or conv['user_id'] != user_id:
                return jsonify({"error": "Unauthorized"}), 403
            conversation_title = conv['title']
        
        # Save user message to database
        conversation_model.add_message(conversation_id, 'user', message)
        
        # Session management for stateful operations
        session_key = f"{user_id}_{conversation_id}"
        if session_key not in sessions:
            sessions[session_key] = {
                'waiting_for_language': False,
                'pending_task': None
            }
        
        session = sessions[session_key]
        
        # Log request
        logger.log_request(message, "routing", f"user_{user_id}")
        
        # Initialize response variables
        result = None
        agent_type = None
        model_used = None
        
        # Handle language specification for code
        if session.get('waiting_for_language'):
            code_agent = agents['code']
            result = code_agent.handle_language_response(message)
            session['waiting_for_language'] = False
            model_used = "Qwen2.5-Coder-3B-Instruct"
            agent_type = 'code'
            
            logger.log_response(result['response'], "code", f"user_{user_id}")
        else:
            # Route message
            router = agents['router']
            agent_type = router.route_request(message)
            
            if agent_type == 'code':
                # Detect language
                language_detector = agents['language_detector']
                detected_language = language_detector.detect_language(message)
                code_agent = agents['code']
                
                if detected_language != 'UNCLEAR':
                    result = code_agent.generate_code(message, detected_language)
                    model_used = "Qwen2.5-Coder-3B-Instruct"
                    
                    logger.log_response(result['response'], "code", f"user_{user_id}")
                else:
                    result = code_agent.generate_code(message, None)
                    model_used = "Qwen2.5-Coder-3B-Instruct"
                    if result.get('needs_language'):
                        session['waiting_for_language'] = True
            else:  # Chat
                chat_agent = agents['chat']
                result = chat_agent.chat(message)
                model_used = "Qwen2.5-3B-Instruct"
                
                logger.log_response(result['response'], "chat", f"user_{user_id}")
        
        # Save assistant response to database
        conversation_model.add_message(
            conversation_id, 
            'assistant', 
            result['response'],
            agent=agent_type,
            model=model_used
        )
        
        # Track performance
        elapsed = time.time() - start_time
        request_count += 1
        total_response_time += elapsed
        logger.logger.info(f"Request completed in {elapsed:.2f}s")
        
        return jsonify({
            "response": result['response'],
            "conversation_id": conversation_id,
            "is_new_conversation": is_new_conversation,
            "conversation_title": conversation_title,
            "agent_used": agent_type,
            "model": model_used,
            "needs_language": result.get('needs_language', False)
        })
    
    except Exception as e:
        logger.log_error(str(e), f"user_{user_id}")
        return jsonify({"error": str(e)}), 500

# ============================================
# CONVERSATION MANAGEMENT
# ============================================

@app.route('/api/conversations', methods=['GET'])
@token_required
def list_conversations():
    """List user's conversations"""
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
    """Get conversation with messages"""
    user_id = request.user_id
    
    # Verify ownership
    conv = conversation_model.get_by_id(conversation_id)
    if not conv or conv['user_id'] != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    messages = conversation_model.get_messages(conversation_id)
    conv['messages'] = messages
    
    return jsonify({"conversation": conv})

@app.route('/api/conversations/<int:conversation_id>', methods=['DELETE'])
@token_required
def delete_conversation(conversation_id):
    """Delete conversation"""
    user_id = request.user_id
    success = conversation_model.delete_conversation(conversation_id, user_id)
    
    if success:
        # Clean up session if exists
        session_key = f"{user_id}_{conversation_id}"
        if session_key in sessions:
            del sessions[session_key]
        
        return jsonify({"message": "Conversation deleted"})
    
    return jsonify({"error": "Not found or unauthorized"}), 404

@app.route('/api/conversations/<int:conversation_id>/title', methods=['PUT'])
@token_required
def update_conversation_title(conversation_id):
    """Update conversation title"""
    user_id = request.user_id
    data = request.json
    title = data.get('title', '').strip()
    
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
    """Clear conversation (deprecated - use DELETE /api/conversations/<id>)"""
    user_id = request.user_id
    data = request.json
    conversation_id = data.get('conversation_id')
    
    if conversation_id:
        success = conversation_model.delete_conversation(conversation_id, user_id)
        if success:
            # Clear session
            session_key = f"{user_id}_{conversation_id}"
            if session_key in sessions:
                del sessions[session_key]
            
            return jsonify({"status": "success", "message": "Conversation cleared"})
    
    return jsonify({"error": "Conversation not found"}), 404

@app.route('/api/save', methods=['POST'])
@token_required
def save_conversation():
    """Save conversation (deprecated - now auto-saved)"""
    return jsonify({
        "status": "success",
        "message": "Conversations are now automatically saved"
    })

@app.route('/api/conversation/<session_id>', methods=['DELETE'])
def delete_legacy_conversation(session_id):
    """Delete legacy file-based conversation (backward compatibility)"""
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
    """Get performance statistics"""
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