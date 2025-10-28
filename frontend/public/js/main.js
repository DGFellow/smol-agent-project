// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
    });
});

// Status management
function setStatus(text, type = 'ready') {
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-indicator');
    
    statusText.textContent = text;
    statusDot.className = 'status-dot';
    
    if (type === 'loading') {
        statusDot.classList.add('loading');
    } else if (type === 'error') {
        statusDot.classList.add('error');
    }
}

// Chat Agent
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatClear = document.getElementById('chat-clear');

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = sender === 'user' ? 'You' : 'Assistant';
    
    const content = document.createElement('div');
    content.textContent = text;
    
    messageDiv.appendChild(label);
    messageDiv.appendChild(content);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatSend.addEventListener('click', async () => {
    const prompt = chatInput.value.trim();
    if (!prompt) return;
    
    addMessage(prompt, 'user');
    chatInput.value = '';
    chatSend.disabled = true;
    setStatus('Thinking...', 'loading');
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            addMessage(data.response, 'assistant');
            setStatus('Ready');
        } else {
            addMessage(`Error: ${data.error}`, 'assistant');
            setStatus('Error', 'error');
        }
    } catch (error) {
        addMessage(`Error: ${error.message}`, 'assistant');
        setStatus('Error', 'error');
    } finally {
        chatSend.disabled = false;
    }
});

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatSend.click();
    }
});

chatClear.addEventListener('click', async () => {
    try {
        await fetch('/api/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent_type: 'chat' })
        });
        chatMessages.innerHTML = '';
        setStatus('History cleared');
    } catch (error) {
        setStatus('Error clearing history', 'error');
    }
});

// Code Agent
const codeOutput = document.getElementById('code-output');
const codeInput = document.getElementById('code-input');
const codeSend = document.getElementById('code-send');
const codeClear = document.getElementById('code-clear');
const codeLanguage = document.getElementById('code-language');

function addCodeOutput(code) {
    const outputDiv = document.createElement('div');
    outputDiv.className = 'message assistant';
    
    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = 'Generated Code';
    
    const pre = document.createElement('pre');
    const codeElement = document.createElement('code');
    codeElement.textContent = code;
    pre.appendChild(codeElement);
    
    outputDiv.appendChild(label);
    outputDiv.appendChild(pre);
    codeOutput.appendChild(outputDiv);
    codeOutput.scrollTop = codeOutput.scrollHeight;
}

codeSend.addEventListener('click', async () => {
    const task = codeInput.value.trim();
    const language = codeLanguage.value;
    
    if (!task) return;
    
    codeInput.value = '';
    codeSend.disabled = true;
    setStatus('Generating code...', 'loading');
    
    try {
        const response = await fetch('/api/code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task, language })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            addCodeOutput(data.response);
            setStatus('Ready');
        } else {
            addCodeOutput(`Error: ${data.error}`);
            setStatus('Error', 'error');
        }
    } catch (error) {
        addCodeOutput(`Error: ${error.message}`);
        setStatus('Error', 'error');
    } finally {
        codeSend.disabled = false;
    }
});

codeClear.addEventListener('click', async () => {
    try {
        await fetch('/api/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent_type: 'code' })
        });
        codeOutput.innerHTML = '';
        setStatus('History cleared');
    } catch (error) {
        setStatus('Error clearing history', 'error');
    }
});

// Initialize
setStatus('Ready');