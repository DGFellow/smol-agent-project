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
│   │   │   └── model_loader.py      # GPU model loading
│   │   ├── agents/
│   │   │   ├── init.py
│   │   │   ├── base_agent.py        # Base agent class
│   │   │   ├── chat_agent.py        # Conversation agent
│   │   │   ├── code_agent.py        # Code generation agent
│   │   │   └── router_agent.py      # Request routing
│   │   ├── tools/
│   │   │   ├── init.py
│   │   │   ├── calculator.py        # Math expression evaluator
│   │   │   ├── web_search.py        # Web search (requires API)
│   │   │   └── code_executor.py     # Code executionequiresDocker)
│   │   ├── utils/
│   │   │   ├── init.py
│   │   │   ├── text_processor.py    # Text/code processing
│   │   │   ├── logger.py            # Activity logging
│   │   │   └── memory.py            # Conversation persistence
│   │   └── prompts.py               # Centralized prompt templates
│   ├── data/                        # Conversation │
│   ├── logs/                        # Application logs 
│   ├── model_cache/                 # Downloaded models 
│   ├── app.py                       # Flask application
│   ├── config.py                    # Configuration
│   ├── requirements.txt             # Python dependencies
│   └── .env                         # Environment variables
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

### Agent System Flow
User Input
↓
[Router Agent] ← Analyzes intent
↓
├─→ Chat Request → [Chat Agent] → Natural response
│
└─→ Code Request → [Language Detector]
↓
[Code Agent] → Explanation + Code

### Available Tools

- **Calculator**: Safe evaluation of mathematical expressions
- **Web Search**: Search the web (requires API key configuration)
- **Code Executor**: Run code safely (requires Docker setup)

### Utilities

- **Text Processor**: Extract code blocks, sanitize input, count tokens
- **Logger**: Track all requests, responses, and errors
- **Memory**: Save and load conversation history

## 🔧 Configuration

### Environment Variables

Create `backend/.env`:
```env
# Server Configuration
PORT=5001

# Model Configuration
MODEL_CACHE_DIR=./model_cache

# Logging
LOG_LEVEL=INFO

# Tool Configuration (optional)
ENABLE_CALCULATOR=true
ENABLE_WEB_SEARCH=false
ENABLE_CODE_EXECUTION=false

# API Keys (if using external tools)
BRAVE_API_KEY=
DUCKDUCKGO_API_KEY=
```

## 📊 Monitoring and Logs

### View Application Logs

Logs are automatically created in `backend/logs/`:
```bash
# View today's log
cat backend/logs/agent_20241028.log

# Follow live logs (Linux/Mac)
tail -f backend/logs/agent_20241028.log

# Follow live logs (Windows PowerShell)
Get-Content backend/logs/agent_20241028.log -Wait -Tail 50

# Search for errors
findstr "ERROR" backend\logs\*.log
```

### Log Format
2024-10-28 14:30:45 - smolagent - INFO - [session_12345] Request to routing: Write a Python function...
2024-10-28 14:30:47 - smolagent - INFO - [session_12345] Response from code: 543 chars
2024-10-28 14:30:50 - smolagent - ERROR - [session_12345] Error: Connection timeout

