// Generate simple session ID
const SESSION_ID = 'session_' + Date.now();

// DOM Elements
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const chatMessages = document.getElementById('chat-messages');
const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-indicator');
const currentAgentBadge = document.getElementById('current-agent');
const currentModelName = document.getElementById('current-model');

// Status management
function setStatus(text, type = 'ready') {
    statusText.textContent = text;
    statusDot.className = 'status-dot';
    
    if (type === 'loading') {
        statusDot.classList.add('loading');
    } else if (type === 'error') {
        statusDot.classList.add('error');
    }
}

// Update agent indicator
function updateAgentIndicator(agentType, model) {
    const agentNames = {
        'chat': '💬 Chat Mode',
        'code': '💻 Code Mode'
    };
    
    currentAgentBadge.textContent = agentNames[agentType] || 'Ready';
    currentModelName.textContent = model || '';
}

// Add message to chat
function addMessage(text, sender, agentType = 'chat') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender} ${agentType}`;
    
    const label = document.createElement('div');
    label.className = 'message-label';
    
    if (sender === 'user') {
        label.textContent = 'You';
    } else {
        const agentEmoji = agentType === 'code' ? '💻' : '💬';
        label.textContent = `${agentEmoji} Assistant`;
    }
    
    const content = document.createElement('div');
    
    // Check if response contains code blocks
    if (text.includes('```')) {
        content.innerHTML = formatCodeBlocks(text);
    } else {
        content.textContent = text;
    }
    
    messageDiv.appendChild(label);
    messageDiv.appendChild(content);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Format code blocks in response
function formatCodeBlocks(text) {
    // Simple code block formatting
    return text
        .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'code';
            return `<pre><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>`;
        })
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Send message
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Add user message
    addMessage(message, 'user');
    messageInput.value = '';
    sendBtn.disabled = true;
    setStatus('Processing...', 'loading');
    
    try {
        const response = await fetch('/api/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: message,
                session_id: SESSION_ID
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            addMessage(data.response, 'assistant', data.agent_used);
            updateAgentIndicator(data.agent_used, data.model);
            
            if (data.needs_language) {
                setStatus('Waiting for language specification...', 'ready');
            } else {
                setStatus('Ready');
            }
        } else {
            addMessage(`Error: ${data.error}`, 'assistant');
            setStatus('Error', 'error');
        }
    } catch (error) {
        addMessage(`Error: ${error.message}`, 'assistant');
        setStatus('Error', 'error');
    } finally {
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// Clear conversation
async function clearConversation() {
    if (!confirm('Clear entire conversation history?')) return;
    
    try {
        await fetch('/api/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: SESSION_ID })
        });
        
        chatMessages.innerHTML = '';
        updateAgentIndicator('', '');
        setStatus('History cleared');
        
        // Add welcome message
        setTimeout(() => {
            addMessage(
                "Hi! I'm your AI assistant. I can help with general questions or write code for you. Just ask naturally, and I'll figure out what you need!",
                'assistant',
                'chat'
            );
        }, 300);
    } catch (error) {
        setStatus('Error clearing history', 'error');
    }
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);
clearBtn.addEventListener('click', clearConversation);

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-resize textarea
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Initialize
setStatus('Ready');
addMessage(
    "Hi! I'm your AI assistant. I can help with general questions or write code for you. Just ask naturally, and I'll figure out what you need!",
    'assistant',
    'chat'
);