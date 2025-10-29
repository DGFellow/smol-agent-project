// Generate simple session ID
let SESSION_ID = 'session_' + Date.now();


function renderMarkdown(text) {
    if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
        // Fallback: basic formatting
        return formatCodeBlocks(text);
    }
    const html = marked.parse(text || "");
    const safe = DOMPurify.sanitize(html, {USE_PROFILES: {html: true}});
    return safe;
}

function enhanceCodeBlocksIn(root) {
    const codeBlocks = root.querySelectorAll('pre > code');
    codeBlocks.forEach(code => {
        const pre = code.parentElement;
        const lang = (code.className.match(/language-([\w-]+)/) || [,'code'])[1];
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block';
        const header = document.createElement('div');
        header.className = 'code-header';
        const langSpan = document.createElement('span');
        langSpan.className = 'code-lang';
        langSpan.textContent = lang;
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.title = 'Copy code';
        btn.textContent = 'Copy';
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(code.innerText);
            btn.textContent = 'Copied';
            setTimeout(()=> btn.textContent='Copy', 1200);
        });
        header.appendChild(langSpan);
        header.appendChild(btn);
        pre.replaceWith(wrapper);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
    });
}
// DOM Elements
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const chatMessages = document.getElementById('chat-messages');
const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-indicator');

// Sidebar Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarClose = document.getElementById('sidebar-close');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const container = document.querySelector('.container');
const conversationList = document.getElementById('conversation-list');
const newChatBtn = document.getElementById('new-chat-btn');
const clearAllBtn = document.getElementById('clear-all-btn');

// State
let currentConversationId = SESSION_ID;
let conversations = [];

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

// =====================================================
// SIDEBAR FUNCTIONS
// =====================================================

function toggleSidebar() {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
    
    // On desktop, push content
    if (window.innerWidth > 768) {
        container.classList.toggle('sidebar-open');
    }
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    container.classList.remove('sidebar-open');
}

async function loadConversations() {
    try {
        const response = await fetch('/api/conversations');
        const data = await response.json();
        conversations = data.conversations || [];
        renderConversations();
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

function renderConversations() {
    if (conversations.length === 0) {
        conversationList.innerHTML = `
            <div class="conversation-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="2"/>
                </svg>
                <p>No saved conversations yet</p>
            </div>
        `;
        return;
    }

    conversationList.innerHTML = conversations.map(conv => {
        const date = new Date(conv.created_at);
        const dateStr = formatDate(date);
        const isActive = conv.session_id === currentConversationId;
        
        return `
            <div class="conversation-item ${isActive ? 'active' : ''}" data-id="${conv.session_id}">
                <div class="conversation-item-header">
                    <span class="conversation-title">Chat ${conv.session_id.slice(-8)}</span>
                    <span class="conversation-date">${dateStr}</span>
                </div>
                <div class="conversation-preview">${conv.message_count} messages</div>
                <button class="conversation-delete" data-id="${conv.session_id}">×</button>
            </div>
        `;
    }).join('');

    // Add click handlers
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('conversation-delete')) {
                loadConversation(item.dataset.id);
            }
        });
    });

    document.querySelectorAll('.conversation-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteConversation(btn.dataset.id);
        });
    });
}

function formatDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

async function loadConversation(sessionId) {
    // TODO: Implement loading conversation from backend
    currentConversationId = sessionId;
    SESSION_ID = sessionId;
    
    // Clear current messages
    chatMessages.innerHTML = '';
    
    // Load conversation history would go here
    setStatus('Loaded conversation');
    renderConversations();
    closeSidebar();
}

async function deleteConversation(sessionId) {
    if (!confirm('Delete this conversation?')) return;

    try {
        // TODO: Add delete endpoint to backend
        conversations = conversations.filter(c => c.session_id !== sessionId);
        renderConversations();
        
        if (sessionId === currentConversationId) {
            startNewChat();
        }
    } catch (error) {
        console.error('Error deleting conversation:', error);
    }
}

function startNewChat() {
    SESSION_ID = 'session_' + Date.now();
    currentConversationId = SESSION_ID;
    chatMessages.innerHTML = '';
    setStatus('Ready');
    addMessage(TIP_HTML, 'assistant', { html: true });
    renderConversations();
    closeSidebar();
}

// =====================================================
// CHAT FUNCTIONS
// =====================================================

function setStatus(text, type = 'ready') {
    statusText.textContent = text;
    statusDot.className = 'status-dot';

    if (type === 'loading') {
        statusDot.classList.add('loading');
    } else if (type === 'error') {
        statusDot.classList.add('error');
    }
}

function addMessage(text, sender, options = {}) {
    const { html = false } = options;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = sender === 'user' ? 'You' : '🤖 Assistant';

    const content = document.createElement('div');

    if (html) { content.innerHTML = text; } else { content.innerHTML = renderMarkdown(text); }

    messageDiv.appendChild(label);
    messageDiv.appendChild(content);
    chatMessages.appendChild(messageDiv);
    enhanceCodeBlocksIn(content);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    enhanceCodeBlocksIn(content);

    return messageDiv;
}

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

function replaceAssistantMessage(node, text) {
    if (!node) return;
    node.classList.remove('thinking');
    
    const content = node.children[1];
    content.innerHTML = renderMarkdown(text);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
    enhanceCodeBlocksIn(content);
}

function formatCodeBlocks(text) {
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
    
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    messageInput.value = '';
    sendBtn.disabled = true;
    setStatus('Thinking...', 'loading');

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

            // Auto-save conversation after each message
            await autoSaveConversation();
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

async function autoSaveConversation() {
    try {
        await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: SESSION_ID })
        });
        await loadConversations();
    } catch (error) {
        console.error('Auto-save failed:', error);
    }
}

async function clearConversation() {
    if (!confirm('Clear this conversation?')) return;

    try {
        await fetch('/api/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                session_id: SESSION_ID,
                save: false 
            }),
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

async function clearAllConversations() {
    if (!confirm('Delete ALL conversations? This cannot be undone.')) return;

    try {
        // Delete all conversations
        for (const conv of conversations) {
            await fetch('/api/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: conv.session_id })
            });
        }

        conversations = [];
        renderConversations();
        startNewChat();
    } catch (error) {
        console.error('Error clearing all:', error);
    }
}

// =====================================================
// EVENT LISTENERS
// =====================================================

sidebarToggle.addEventListener('click', toggleSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);
newChatBtn.addEventListener('click', startNewChat);
clearAllBtn.addEventListener('click', clearAllConversations);

sendBtn.addEventListener('click', sendMessage);
clearBtn.addEventListener('click', clearConversation);

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

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

// =====================================================
// INITIALIZATION
// =====================================================

setStatus('Ready');
addMessage(TIP_HTML, 'assistant', { html: true });
loadConversations();