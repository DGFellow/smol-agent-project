// Session ID
const SESSION_ID = 'session_' + Date.now();

// DOM Elements
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const chatMessages = document.getElementById('chat-messages');
const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-indicator');

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

// Status management - simpler now
function setStatus(text, type = 'ready') {
  statusText.textContent = text;
  statusDot.className = 'status-dot';

  if (type === 'loading') {
    statusDot.classList.add('loading');
  } else if (type === 'error') {
    statusDot.classList.add('error');
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

// Format code blocks with better styling
function formatCodeBlocks(text) {
  // Handle code blocks with language specification
  text = text.replace(/```(\w+)\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || 'code';
    return `<div class="code-block">
      <div class="code-header">
        <span class="code-lang">${language}</span>
        <button class="copy-btn" onclick="copyCode(this)" title="Copy code">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </div>
      <pre><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>
    </div>`;
  });
  
  // Handle inline code
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // Convert newlines to breaks
  text = text.replace(/\n/g, '<br>');
  
  return text;
}

// Add copy code function
window.copyCode = function(button) {
  const codeBlock = button.closest('.code-block');
  const code = codeBlock.querySelector('code').textContent;
  
  navigator.clipboard.writeText(code).then(() => {
    button.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
    setTimeout(() => {
      button.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
      </svg>`;
    }, 2000);
  });
};

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Simplified send message (remove updateModelIndicator calls)
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  addMessage(message, 'user');
  messageInput.value = '';
  sendBtn.disabled = true;
  setStatus('Thinking...', 'loading');  // Changed from 'Processing...'

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
      
      if (data.needs_language) {
        setStatus('Specify language', 'ready');
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

// Simplified clear conversation
async function clearConversation() {
  if (!confirm('Clear entire conversation?')) return;

  try {
    await fetch('/api/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: SESSION_ID }),
    });

    chatMessages.innerHTML = '';
    setStatus('Ready');

    setTimeout(() => {
      addMessage(TIP_HTML, 'assistant', { html: true });
    }, 300);
  } catch (error) {
    setStatus('Error', 'error');
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