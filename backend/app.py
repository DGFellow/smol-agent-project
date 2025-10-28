from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Project imports (matching your structure)
from src.models.model_loader import ModelLoader
from src.agents.base_agent import BaseAgent
from src.agents.code_agent import CodeAgent

load_dotenv()

app = Flask(__name__)
# Allow frontend at 3000 in dev; tighten as needed
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000"]}})

# Registries
models = {}
agents = {}

def initialize_models():
    """Load models and construct agents. Idempotent."""
    global models, agents
    if models and agents:
        return

    loader = ModelLoader()

    # Load models
    instruct_model, instruct_tok = loader.load_qwen_instruct()
    coder_model, coder_tok = loader.load_qwen_coder()

    # Register models if you want visibility in /health
    models["instruct"] = (instruct_model, instruct_tok)
    models["coder"] = (coder_model, coder_tok)

    # Build agents
    agents["chat"] = BaseAgent(instruct_model, instruct_tok)   # :contentReference[oaicite:3]{index=3}
    agents["code"] = CodeAgent(coder_model, coder_tok)          # :contentReference[oaicite:4]{index=4}

# --- Eager load on import so it works with any runner (python/flask/gunicorn) ---
try:
    initialize_models()
except Exception as e:
    app.logger.exception("Model initialization failed at import: %s", e)

@app.get("/api/health")
def health():
    ok = bool(agents) and bool(models)
    return jsonify({
        "status": "healthy" if ok else "degraded",
        "models_loaded": list(models.keys()),
        "agents_ready": list(agents.keys()),
    }), (200 if ok else 503)

@app.post("/api/chat")
def chat():
    data = request.get_json(silent=True) or {}
    prompt = (data.get("prompt") or "").strip()
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    agent = agents.get("chat")
    if agent is None:
        return jsonify({"error": "Models not initialized"}), 503

    try:
        reply = agent.generate_response(prompt)  # uses tokenizer.apply_chat_template + generate  # :contentReference[oaicite:5]{index=5}
        return jsonify({"response": reply, "model": "Qwen2.5-3B-Instruct"}), 200
    except Exception as e:
        app.logger.exception("chat failed: %s", e)
        return jsonify({"error": str(e)}), 500

@app.post("/api/code")
def code():
    data = request.get_json(silent=True) or {}
    task = (data.get("task") or "").strip()
    language = (data.get("language") or "python").strip() or "python"
    if not task:
        return jsonify({"error": "No task provided"}), 400

    agent = agents.get("code")
    if agent is None:
        return jsonify({"error": "Models not initialized"}), 503

    try:
        code_txt = agent.generate_code(task, language=language)  # :contentReference[oaicite:6]{index=6}
        return jsonify({"code": code_txt, "language": language}), 200
    except Exception as e:
        app.logger.exception("code failed: %s", e)
        return jsonify({"error": str(e)}), 500

@app.post("/api/clear")
def clear_history():
    data = request.get_json(silent=True) or {}
    agent_type = (data.get("agent_type") or "chat").strip() or "chat"

    agent = agents.get(agent_type)
    if agent is None:
        return jsonify({"error": "Invalid agent type"}), 400

    try:
        clear_fn = getattr(agent, "clear_history", None)
        if callable(clear_fn):
            clear_fn()
        return jsonify({"status": "success", "message": "History cleared"}), 200
    except Exception as e:
        app.logger.exception("clear failed: %s", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=False)
