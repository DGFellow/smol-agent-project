// Generate simple session ID
let SESSION_ID = 'session_' + Date.now();

/* =========================
   Markdown render helpers
   ========================= */
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

function formatCodeBlocks(text) {
    text = (text || '');
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
            <pre><code class="language-${language}">${escapeHtml((code||'').trim())}</code></pre>
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

/* =========================
   DOM Elements
   ========================= */
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const chatMessages = document.getElementById('chat-messages');
const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-indicator');

// Sidebar / layout
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarClose = document.getElementById('sidebar-close');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const appShell = document.getElementById('app-shell');
const container = document.getElementById('main-wrapper');

// Rail actions
const railNewChat = document.getElementById('rail-new-chat');
const railSearch = document.getElementById('rail-search');

// Conversations UI
const conversationList = document.getElementById('conversation-list');
const newChatBtn = document.getElementById('new-chat-btn');
const clearAllBtn = document.getElementById('clear-all-btn');

/* =========================
   State & Welcome
   ========================= */
let currentConversationId = SESSION_ID;
let conversations = [];

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

/* =========================
   Sidebar: desktop rail vs mobile overlay
   ========================= */
function reflectAriaExpanded(isExpanded) {
    if (!sidebarToggle) return;
    sidebarToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    sidebarToggle.setAttribute('aria-pressed', isExpanded ? 'true' : 'false');
}

function openSidebar() {
    if (window.innerWidth <= 768) {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
        container && container.classList.add('sidebar-open');
        reflectAriaExpanded(true);
        return;
    }
    appShell && appShell.classList.add('expanded');
    reflectAriaExpanded(true);
}

function closeSidebar() {
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
        container && container.classList.remove('sidebar-open');
        reflectAriaExpanded(false);
        return;
    }
    appShell && appShell.classList.remove('expanded');
    reflectAriaExpanded(false);
}

function toggleSidebar() {
    if (window.innerWidth <= 768) {
        const isOpen = sidebar.classList.contains('open');
        return isOpen ? closeSidebar() : openSidebar();
    }
    const isExpanded = appShell && appShell.classList.contains('expanded');
    return isExpanded ? closeSidebar() : openSidebar();
}

/* =========================
   Conversations
   ========================= */
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
    if (!conversationList) return;
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
    currentConversationId = sessionId;
    SESSION_ID = sessionId;
    chatMessages.innerHTML = '';
    setStatus('Loaded conversation');
    renderConversations();
    closeSidebar();
}

async function deleteConversation(sessionId) {
    if (!confirm('Delete this conversation?')) return;
    try {
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

/* =========================
   Chat functions
   ========================= */
function setStatus(text, type = 'ready') {
    if (!statusText || !statusDot) return;
    statusText.textContent = text;
    statusDot.className = 'status-dot';
    if (type === 'loading') statusDot.classList.add('loading');
    else if (type === 'error') statusDot.classList.add('error');
}

function addMessage(text, sender, options = {}) {
    const { html = false } = options;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = sender === 'user' ? 'You' : '🤖 Assistant';

    const content = document.createElement('div');
    content.innerHTML = html ? text : renderMarkdown(text);

    messageDiv.appendChild(label);
    messageDiv.appendChild(content);
    chatMessages.appendChild(messageDiv);
    enhanceCodeBlocksIn(content);
    chatMessages.scrollTop = chatMessages.scrollHeight;

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
    enhanceCodeBlocksIn(content);
    chatMessages.scrollTop = chatMessages.scrollHeight;
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

        let data = {};
        try {
            data = await response.json();
        } catch (_) {
            data = {};
        }

        if (response.ok) {
            const reply = (data && (data.response ?? data.text)) ?? '';
            replaceAssistantMessage(thinkingNode, reply);
            if (data.needs_language) setStatus('Specify language', 'ready');
            else setStatus('Ready');

            await autoSaveConversation();
        } else {
            const err = (data && (data.error || data.message)) || 'Request failed';
            replaceAssistantMessage(thinkingNode, `Error: ${err}`);
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

/* =========================
   Account Popup Menu
   ========================= */
const accountTrigger = document.getElementById('account-trigger');
const accountPopup = document.getElementById('account-popup');
const accountFooterToggle = accountPopup ? accountPopup.querySelector('.account-popup-footer-toggle') : null;

if (accountTrigger && accountPopup) {
    // Toggle popup
    accountTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = accountTrigger.getAttribute('aria-expanded') === 'true';
        
        if (isExpanded) {
            closeAccountPopup();
        } else {
            openAccountPopup();
        }
    });
    
    // Footer toggle button
    if (accountFooterToggle) {
        accountFooterToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAccountPopup();
        });
    }
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!accountPopup.contains(e.target) && !accountTrigger.contains(e.target)) {
            closeAccountPopup();
        }
    });
    
    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && accountTrigger.getAttribute('aria-expanded') === 'true') {
            closeAccountPopup();
            accountTrigger.focus();
        }
    });
    
    // Prevent popup from closing when clicking inside it
    accountPopup.addEventListener('click', (e) => {
        // Allow logout link to work
        if (e.target.tagName === 'A' && e.target.getAttribute('href') === '/logout') {
            return;
        }
        e.stopPropagation();
    });
}

function openAccountPopup() {
    if (!accountTrigger || !accountPopup) return;
    accountTrigger.setAttribute('aria-expanded', 'true');
    accountPopup.setAttribute('aria-hidden', 'false');
}

function closeAccountPopup() {
    if (!accountTrigger || !accountPopup) return;
    accountTrigger.setAttribute('aria-expanded', 'false');
    accountPopup.setAttribute('aria-hidden', 'true');
}

// Menu item handlers
const menuSettings = document.getElementById('menu-settings');
const menuLanguage = document.getElementById('menu-language');
const menuHelp = document.getElementById('menu-help');
const menuUpgrade = document.getElementById('menu-upgrade');
const menuLearn = document.getElementById('menu-learn');

if (menuSettings) {
    menuSettings.addEventListener('click', (e) => {
        e.preventDefault();
        closeAccountPopup();
        alert('Settings\n\nConfigure your preferences:\n• Profile settings\n• API keys\n• Appearance\n• Privacy');
    });
}

if (menuLanguage) {
    menuLanguage.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Language\n\nSelect your preferred language:\n• English\n• Español\n• Français\n• Deutsch');
    });
}

if (menuHelp) {
    menuHelp.addEventListener('click', (e) => {
        e.preventDefault();
        closeAccountPopup();
        alert('Get Help\n\n• Documentation\n• Support center\n• Community forum');
    });
}

if (menuUpgrade) {
    menuUpgrade.addEventListener('click', (e) => {
        e.preventDefault();
        closeAccountPopup();
        alert('Upgrade Plan\n\nUnlock premium features:\n• Unlimited conversations\n• Priority support\n• Advanced AI models');
    });
}

if (menuLearn) {
    menuLearn.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Learn More\n\n• Product updates\n• Tutorials\n• Best practices');
    });
}

/* =========================
   Events
   ========================= */
sidebarToggle && sidebarToggle.addEventListener('click', toggleSidebar);
sidebarClose && sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay && sidebarOverlay.addEventListener('click', closeSidebar);

// Rail actions
railNewChat && railNewChat.addEventListener('click', () => {
    newChatBtn ? newChatBtn.click() : startNewChat();
    if (window.innerWidth <= 768) closeSidebar();
});

railSearch && railSearch.addEventListener('click', () => {
    const input = document.getElementById('conversation-search');
    if (input) { input.focus(); input.select?.(); }
    if (window.innerWidth > 768 && appShell && !appShell.classList.contains('expanded')) {
        openSidebar();
    }
});

newChatBtn && newChatBtn.addEventListener('click', startNewChat);
clearAllBtn && clearAllBtn.addEventListener('click', clearAllConversations);

sendBtn && sendBtn.addEventListener('click', sendMessage);
clearBtn && clearBtn.addEventListener('click', clearConversation);

messageInput && messageInput.addEventListener('keydown', (e) => {
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

messageInput && messageInput.addEventListener('input', function () {
    autoSizeToCap(this);
});

/* =========================
   Init
   ========================= */
reflectAriaExpanded(false);
setStatus('Ready');
addMessage(TIP_HTML, 'assistant', { html: true });
loadConversations();