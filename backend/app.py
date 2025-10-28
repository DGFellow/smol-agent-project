from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Project imports (matching your structure)
from src.models.model_loader import ModelLoader
from src.agents.base_agent import BaseAgent
from src.agents.code_agent import CodeAgent
from src.agents.chat_agent import ChatAgent
from src.agents.router_agent import RouterAgent, LanguageDetectorAgent

load_dotenv()

app = Flask(__name__)
# Allow frontend at 3000 in dev; tighten as needed
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000"]}})

# Registries
models = {}
agents = {}

# Session storage for tracking conversation state
sessions = {}

def initialize_models():
    """Load models and construct agents. Idempotent."""
    print("Initializing models...")
    global models, agents
    if models and agents:
        return

    loader = ModelLoader()
    
    # Load Qwen Instruct
    instruct_model, instruct_tokenizer = loader.load_qwen_instruct()
    models['instruct'] = (instruct_model, instruct_tokenizer)
    
    # Create all agents with instruct model
    agents['router'] = RouterAgent(instruct_model, instruct_tokenizer)
    agents['language_detector'] = LanguageDetectorAgent(instruct_model, instruct_tokenizer)
    agents['chat'] = ChatAgent(instruct_model, instruct_tokenizer)
    
    # Load Qwen Coder for code agent
    coder_model, coder_tokenizer = loader.load_qwen_coder()
    models['coder'] = (coder_model, coder_tokenizer)
    agents['code'] = CodeAgent(coder_model, coder_tokenizer)
    
    print("Models initialized successfully!")

# --- Eager load on import so it works with any runner (python/flask/gunicorn) ---
try:
    initialize_models()
except Exception as e:
    app.logger.exception("Model initialization failed at import: %s", e)

@app.route('/api/message', methods=['POST'])
def unified_message():
    """
    Unified message endpoint that routes to appropriate agent
    """
    data = request.json
    message = data.get('message', '').strip()
    session_id = data.get('session_id', 'default')
    
    if not message:
        return jsonify({"error": "No message provided"}), 400
    
    try:
        # Initialize session if needed
        if session_id not in sessions:
            sessions[session_id] = {
                'current_agent': None,
                'waiting_for_language': False
            }
        
        session = sessions[session_id]
        
        # Check if we're waiting for language specification
        if session.get('waiting_for_language'):
            # User is responding with a language
            code_agent = agents['code']
            result = code_agent.handle_language_response(message)
            session['waiting_for_language'] = False
            session['current_agent'] = 'code'
            
            return jsonify({
                "response": result['response'],
                "agent_used": "code",
                "model": "Qwen2.5-Coder-3B-Instruct"
            })
        
        # Route the message to appropriate agent
        router = agents['router']
        agent_type = router.route_request(message)
        
        if agent_type == 'code':
            # Detect language from message
            language_detector = agents['language_detector']
            detected_language = language_detector.detect_language(message)
            
            code_agent = agents['code']
            
            if detected_language != 'UNCLEAR':
                # Language detected, generate code
                result = code_agent.generate_code(message, detected_language)
            else:
                # Need to ask for language
                result = code_agent.generate_code(message, None)
                if result.get('needs_language'):
                    session['waiting_for_language'] = True
            
            session['current_agent'] = 'code'
            
            return jsonify({
                "response": result['response'],
                "agent_used": "code",
                "model": "Qwen2.5-Coder-3B-Instruct",
                "needs_language": result.get('needs_language', False)
            })
        
        else:  # general chat
            chat_agent = agents['chat']
            result = chat_agent.chat(message)
            session['current_agent'] = 'chat'
            
            return jsonify({
                "response": result['response'],
                "agent_used": "chat",
                "model": "Qwen2.5-3B-Instruct"
            })
    
    except Exception as e:
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
    
    return jsonify({"status": "success", "message": "All history cleared"})

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=False)
