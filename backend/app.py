from flask import Flask, request, jsonify, stream_with_context, Response
from flask_cors import CORS
from src.models.model_loader import ModelLoader
from src.agents.base_agent import BaseAgent
from src.agents.code_agent import CodeAgent
import json
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Global model storage
models = {}
agents = {}

def initialize_models():
    """Load models on startup"""
    print("Initializing models...")
    loader = ModelLoader()
    
    # Load Qwen Instruct
    instruct_model, instruct_tokenizer = loader.load_qwen_instruct()
    models['instruct'] = (instruct_model, instruct_tokenizer)
    agents['chat'] = BaseAgent(instruct_model, instruct_tokenizer)
    
    # Load Qwen Coder
    coder_model, coder_tokenizer = loader.load_qwen_coder()
    models['coder'] = (coder_model, coder_tokenizer)
    agents['code'] = CodeAgent(coder_model, coder_tokenizer)
    
    print("Models initialized successfully!")

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "models_loaded": list(models.keys())
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """Chat endpoint for general conversation"""
    data = request.json
    prompt = data.get('prompt', '')
    
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400
    
    try:
        agent = agents['chat']
        response = agent.generate_response(prompt)
        return jsonify({
            "response": response,
            "model": "Qwen2.5-3B-Instruct"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/code', methods=['POST'])
def code():
    """Code generation endpoint"""
    data = request.json
    task = data.get('task', '')
    language = data.get('language', 'python')
    
    if not task:
        return jsonify({"error": "No task provided"}), 400
    
    try:
        agent = agents['code']
        response = agent.generate_code(task, language)
        return jsonify({
            "response": response,
            "model": "Qwen2.5-Coder-3B-Instruct"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/clear', methods=['POST'])
def clear_history():
    """Clear conversation history"""
    agent_type = request.json.get('agent_type', 'chat')
    
    if agent_type in agents:
        agents[agent_type].clear_history()
        return jsonify({"status": "success", "message": "History cleared"})
    
    return jsonify({"error": "Invalid agent type"}), 400

if __name__ == '__main__':
    initialize_models()
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)