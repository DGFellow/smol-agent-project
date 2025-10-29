from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import time

# Project imports
from src.models.model_loader import ModelLoader
from src.agents.code_agent import CodeAgent
from src.agents.chat_agent import ChatAgent
from src.agents.router_agent import RouterAgent, LanguageDetectorAgent
from src.utils.text_processor import TextProcessor
from src.utils.logger import AgentLogger
from src.utils.memory import ConversationMemory

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000"]}})

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
    """Load models and construct agents."""
    print("Initializing models...")
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
    
    print("Models initialized successfully!")

# Eager load
try:
    initialize_models()
except Exception as e:
    app.logger.exception("Model initialization failed: %s", e)

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

@app.route('/api/message', methods=['POST'])
def unified_message():
    """Unified message endpoint - seamless agent routing"""
    global request_count, total_response_time
    start_time = time.time()
    
    # Robust JSON handling
    data = request.get_json(silent=True) or {}
    raw_message = data.get('message', '')
    session_id = data.get('session_id', 'default')

    # Type guard before .strip()
    if not isinstance(raw_message, str):
        raw_message = ''
    message = raw_message.strip()
    
    if not message:
        return jsonify({"error": "No message provided"}), 400
    
    # Sanitize input (now safe even if upstream ever passes None)
    message = TextProcessor.sanitize_input(message)
    
    # Check token count
    token_count = TextProcessor.count_tokens_estimate(message)
    if token_count > 2000:
        return jsonify({"error": "Message too long. Please shorten your request."}), 400
    
    try:
        # Initialize session
        if session_id not in sessions:
            sessions[session_id] = {
                'waiting_for_language': False,
                'pending_task': None,
                'message_history': []
            }
        
        session = sessions[session_id]
        
        # Log request
        logger.log_request(message, "routing", session_id)
        
        # Handle language specification
        if session.get('waiting_for_language'):
            code_agent = agents['code']
            result = code_agent.handle_language_response(message)
            session['waiting_for_language'] = False
            
            # Add to history
            session['message_history'].append({
                "role": "user",
                "content": message,
                "timestamp": time.time()
            })
            session['message_history'].append({
                "role": "assistant",
                "content": result['response'],
                "timestamp": time.time()
            })
            
            logger.log_response(result['response'], "code", session_id)
            
            # Track performance
            elapsed = time.time() - start_time
            request_count += 1
            total_response_time += elapsed
            logger.logger.info(f"Request completed in {elapsed:.2f}s")
            
            return jsonify({
                "response": result['response'],
                "agent_used": "seamless",
                "model": "Qwen2.5-Coder-3B-Instruct"
            })
        
        # Route message
        router = agents['router']
        agent_type = router.route_request(message)
        
        if agent_type == 'code':
            # Detect language
            language_detector = agents['language_detector']
            detected_language = language_detector.detect_language(message)
            
            code_agent = agents['code']
            
            if detected_language != 'UNCLEAR':
                # Generate code with explanation
                result = code_agent.generate_code(message, detected_language)
                
                # Add to history
                session['message_history'].append({
                    "role": "user",
                    "content": message,
                    "timestamp": time.time()
                })
                session['message_history'].append({
                    "role": "assistant",
                    "content": result['response'],
                    "agent": "code",
                    "timestamp": time.time()
                })
                
                logger.log_response(result['response'], "code", session_id)
                
                # Track performance
                elapsed = time.time() - start_time
                request_count += 1
                total_response_time += elapsed
                logger.logger.info(f"Request completed in {elapsed:.2f}s")
                
                return jsonify({
                    "response": result['response'],
                    "agent_used": "seamless",
                    "model": "Qwen2.5-Coder-3B-Instruct"
                })
            else:
                # Ask for language
                result = code_agent.generate_code(message, None)
                if result.get('needs_language'):
                    session['waiting_for_language'] = True
                    session['pending_task'] = message
                
                # Track performance
                elapsed = time.time() - start_time
                request_count += 1
                total_response_time += elapsed
                
                return jsonify({
                    "response": result['response'],
                    "agent_used": "seamless",
                    "model": "Qwen2.5-Coder-3B-Instruct",
                    "needs_language": True
                })
        
        else:  # Chat
            chat_agent = agents['chat']
            result = chat_agent.chat(message)
            
            # Add to history
            session['message_history'].append({
                "role": "user",
                "content": message,
                "timestamp": time.time()
            })
            session['message_history'].append({
                "role": "assistant",
                "content": result['response'],
                "agent": "chat",
                "timestamp": time.time()
            })
            
            logger.log_response(result['response'], "chat", session_id)
            
            # Track performance
            elapsed = time.time() - start_time
            request_count += 1
            total_response_time += elapsed
            logger.logger.info(f"Request completed in {elapsed:.2f}s")
            
            return jsonify({
                "response": result['response'],
                "agent_used": "seamless",
                "model": "Qwen2.5-3B-Instruct"
            })
    
    except Exception as e:
        logger.log_error(str(e), session_id)
        return jsonify({"error": str(e)}), 500

@app.route('/api/clear', methods=['POST'])
def clear_history():
    """Clear conversation history"""
    data = request.get_json(silent=True) or {}
    session_id = data.get('session_id', 'default')
    save_before_clear = data.get('save', False)
    
    # Optionally save before clearing
    if save_before_clear and session_id in sessions:
        history = sessions[session_id].get('message_history', [])
        if history:
            memory.save_conversation(session_id, history)
    
    # Clear all agents
    for agent in agents.values():
        if hasattr(agent, 'clear_history'):
            agent.clear_history()
    
    # Clear session
    if session_id in sessions:
        del sessions[session_id]
    
    logger.logger.info(f"Cleared history for session {session_id}")
    
    return jsonify({"status": "success", "message": "History cleared"})

@app.route('/api/save', methods=['POST'])
def save_conversation():
    """Save current conversation"""
    data = request.get_json(silent=True) or {}
    session_id = data.get('session_id', 'default')
    
    if session_id in sessions:
        history = sessions[session_id].get('message_history', [])
        if history:
            success = memory.save_conversation(session_id, history)
            if success:
                return jsonify({
                    "status": "success",
                    "message": "Conversation saved",
                    "session_id": session_id
                })
    
    return jsonify({"error": "No conversation to save"}), 400

@app.route('/api/conversations', methods=['GET'])
def list_conversations():
    """List all saved conversations"""
    conversations = memory.list_conversations()
    return jsonify({
        "conversations": conversations,
        "count": len(conversations)
    })

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

@app.route('/api/conversation/<session_id>', methods=['DELETE'])
def delete_conversation(session_id):
    """Delete a specific conversation"""
    try:
        success = memory.delete_conversation(session_id)
        if success:
            return jsonify({
                "status": "success",
                "message": "Conversation deleted"
            })
        return jsonify({"error": "Conversation not found"}), 404
    except Exception as e:
        logger.log_error(str(e), session_id)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
