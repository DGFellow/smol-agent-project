from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Project imports
from src.models.model_loader import ModelLoader
from src.agents.code_agent import CodeAgent
from src.agents.chat_agent import ChatAgent
from src.agents.router_agent import RouterAgent, LanguageDetectorAgent
from src.utils.text_processor import TextProcessor
from src.utils.logger import AgentLogger

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000"]}})

# Registries
models = {}
agents = {}
sessions = {}

# Logger
logger = AgentLogger()

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
    """Health check"""
    return jsonify({
        "status": "healthy",
        "models": list(models.keys()),
        "agents": list(agents.keys())
    })

@app.route('/api/message', methods=['POST'])
def unified_message():
    """Unified message endpoint - seamless agent routing"""
    data = request.json
    message = data.get('message', '').strip()
    session_id = data.get('session_id', 'default')
    
    if not message:
        return jsonify({"error": "No message provided"}), 400
    
    # Sanitize input
    message = TextProcessor.sanitize_input(message)
    
    try:
        # Initialize session
        if session_id not in sessions:
            sessions[session_id] = {
                'waiting_for_language': False,
                'pending_task': None
            }
        
        session = sessions[session_id]
        
        # Log request
        logger.log_request(message, "routing", session_id)
        
        # Handle language specification
        if session.get('waiting_for_language'):
            code_agent = agents['code']
            result = code_agent.handle_language_response(message)
            session['waiting_for_language'] = False
            
            logger.log_response(result['response'], "code", session_id)
            
            return jsonify({
                "response": result['response'],
                "agent_used": "code",
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
                
                logger.log_response(result['response'], "code", session_id)
                
                return jsonify({
                    "response": result['response'],
                    "agent_used": "seamless",  # Don't show mode to user
                    "model": "Qwen2.5-Coder-3B-Instruct"
                })
            else:
                # Ask for language
                result = code_agent.generate_code(message, None)
                if result.get('needs_language'):
                    session['waiting_for_language'] = True
                    session['pending_task'] = message
                
                return jsonify({
                    "response": result['response'],
                    "agent_used": "seamless",
                    "model": "Qwen2.5-Coder-3B-Instruct",
                    "needs_language": True
                })
        
        else:  # Chat
            chat_agent = agents['chat']
            result = chat_agent.chat(message)
            
            logger.log_response(result['response'], "chat", session_id)
            
            return jsonify({
                "response": result['response'],
                "agent_used": "seamless",  # Don't show mode to user
                "model": "Qwen2.5-3B-Instruct"
            })
    
    except Exception as e:
        logger.log_error(str(e), session_id)
        return jsonify({"error": str(e)}), 500

@app.route('/api/clear', methods=['POST'])
def clear_history():
    """Clear conversation history"""
    data = request.json
    session_id = data.get('session_id', 'default')
    
    # Clear all agents
    for agent in agents.values():
        if hasattr(agent, 'clear_history'):
            agent.clear_history()
    
    # Clear session
    if session_id in sessions:
        del sessions[session_id]
    
    logger.logger.info(f"Cleared history for session {session_id}")
    
    return jsonify({"status": "success", "message": "History cleared"})

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=False)