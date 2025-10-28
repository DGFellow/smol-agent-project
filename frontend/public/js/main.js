// Session ID
const SESSION_ID = 'session_' + Date.now();

// DOM Elements
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const chatMessages = document.getElementById('chat-messages');
const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-indicator');
const currentModelName = document.getElementById('current-model');

// Welcome message
const TIP_HTML = `
  <p><strong>Hi!</strong> I'm your AI assistant. I can help with general questions or write code for you. Just ask naturally!</p>
  <div class="tip-inline">
    <p>💡 <strong>Tip:</strong> I'll automatically understand what you need:</p>
    <ul class="tip-list">
      <li>→ <em>"Write a Python function to calculate fibonacci"</em></li>
      <li>→ <em>"Explain how neural networks work"</em></li>
      <li>→ <em>"Create a REST API endpoint in Express"</em></li>
    </ul>
  </div>
`;

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

// Update model indicator only
function updateModelIndicator(model) {
  if (model) {
    currentModelName.textContent = model;
  }
}

// Add message
function addMessage(text, sender, options = {}) {
  const { html = false } = options;

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;

  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = sender === 'user' ? 'You' : '🤖 Assistant';

  const content = document.createElement('div');

  if (html) {
    content.innerHTML = text;
  } else if (typeof text === 'string' && text.includes('```')) {
    content.innerHTML = formatCodeBlocks(text);
  } else {
    content.textContent = text;
  }

  messageDiv.appendChild(label);
  messageDiv.appendChild(content);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return messageDiv;
}

// Thinking indicator
function addThinkingMessage() {
  const thinkingHTML = `
    <div class="thinking-indicator">
      <span>Thinking</span>
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    </div>
  `;
  const node = addMessage(thinkingHTML, 'assistant', { html: true });
  node.classList.add('thinking');
  return node;
}

// Replace thinking with response
function replaceAssistantMessage(node, text) {
  if (!node) return;
  node.classList.remove('thinking');
  
  const content = node.children[1];
  if (typeof text === 'string' && text.includes('```')) {
    content.innerHTML = formatCodeBlocks(text);
  } else {
    content.textContent = text;
  }
  
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Format code blocks
function formatCodeBlocks(text) {
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

  addMessage(message, 'user');
  messageInput.value = '';
  sendBtn.disabled = true;
  setStatus('Processing...', 'loading');

  const thinkingNode = addThinkingMessage();

  try {
    const response = await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        session_id: SESSION_ID,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      replaceAssistantMessage(thinkingNode, data.response);
      updateModelIndicator(data.model);

      if (data.needs_language) {
        setStatus('Specify language...', 'ready');
      } else {
        setStatus('Ready');
      }
    } else {
      replaceAssistantMessage(thinkingNode, `Error: ${data.error}`);
      setStatus('Error', 'error');
    }
  } catch (error) {
    replaceAssistantMessage(thinkingNode, `Error: ${error.message}`);
    setStatus('Error', 'error');
  } finally {
    sendBtn.disabled = false;
    messageInput.focus();
    autoSizeToCap(messageInput);
  }
}

// Clear conversation
async function clearConversation() {
  if (!confirm('Clear entire conversation?')) return;

  try {
    await fetch('/api/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: SESSION_ID }),
    });

    chatMessages.innerHTML = '';
    currentModelName.textContent = '';
    setStatus('Ready');

    setTimeout(() => {
      addMessage(TIP_HTML, 'assistant', { html: true });
    }, 300);
  } catch (error) {
    setStatus('Error clearing', 'error');
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
function autoSizeToCap(el) {
  el.style.height = 'auto';
  const computed = getComputedStyle(el);
  const maxH = parseFloat(computed.maxHeight);
  const newHeight = Math.min(el.scrollHeight, isNaN(maxH) ? el.scrollHeight : maxH);
  el.style.height = newHeight + 'px';
}

messageInput.addEventListener('input', function () {
  autoSizeToCap(this);
});

// Initialize
setStatus('Ready');
addMessage(TIP_HTML, 'assistant', { html: true });