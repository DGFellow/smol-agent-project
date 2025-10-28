# 🤖 Smolagent Framework

A local AI agent framework powered by Qwen 2.5 models, featuring a Python backend with Flask and a modern Node.js frontend.

## 🌟 Features

- **Dual Agent System**: Chat agent for conversations, Code agent for programming tasks
- **Local Deployment**: Runs entirely on your hardware (RTX 4090)
- **GPU Accelerated**: Uses CUDA for fast inference
- **Modern UI**: Clean, responsive interface with real-time updates
- **Conversation History**: Maintains context across interactions
- **Multi-Language Support**: Generate code in Python, JavaScript, Java, C++, Rust

## 🚀 Models Used

- **Qwen/Qwen2.5-3B-Instruct**: General conversation and task completion
- **Qwen/Qwen2.5-Coder-3B-Instruct**: Code generation and programming assistance

## 📋 Prerequisites

- NVIDIA RTX 4090 (or similar GPU with 24GB+ VRAM)
- Python 3.10+
- Node.js 18+
- CUDA Toolkit 12.1+
- 50GB+ free disk space (for models)

## 🛠️ Installation

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup
```bash
cd frontend
npm install
```

## 🎯 Usage

### Start Backend Server
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python app.py
```

Backend will be available at: `http://localhost:5000`

### Start Frontend Server
```bash
cd frontend
npm run dev
```

Frontend will be available at: `http://localhost:3000`

## 🏗️ Project Structure
```
smol-agent-project/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── init.py
│   │   │   └── model_loader.py
│   │   ├── agents/
│   │   │   ├── init.py
│   │   │   ├── base_agent.py
│   │   │   ├── chat_agent.py
│   │   │   ├── code_agent.py
│   │   │   └──router_agent.py
│   │   ├── tools/
│   │   └── utils/
│   ├── prompts.py
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── views/
│   │   ├── index.ejs
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── public/
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       └── main.js
│   ├── server.js
│   ├── package.json
│   └── .env
└── README.md
```
