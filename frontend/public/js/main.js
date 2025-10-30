// Generate simple session ID
let SESSION_ID = 'session_' + Date.now();

/* =========================
   Markdown render helpers
   ========================= */
function renderMarkdown(text) {
  if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
    return formatCodeBlocks(text);
  }
  const html = marked.parse(text || "");
  const safe = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  return safe;
}

function enhanceCodeBlocksIn(root) {
  const codeBlocks = root.querySelectorAll('pre > code');
  codeBlocks.forEach(code => {
    const pre = code.parentElement;
    const lang = (code.className.match(/language-([\w-]+)/) || [, 'code'])[1];
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
      setTimeout(() => (btn.textContent = 'Copy'), 1200);
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
      <pre><code class="language-${language}">${escapeHtml((code || '').trim())}</code></pre>
    </div>`;
  });
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  text = text.replace(/\n/g, '<br>');
  return text;
}

window.copyCode = function (button) {
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
const messageInput  = document.getElementById('message-input'); // (will exist after move)
const sendBtn       = document.getElementById('send-btn');       // (created when moved, we’ll add listeners)
const clearBtn      = document.getElementById('clear-btn');
const chatMessages  = document.getElementById('chat-messages');
const statusText    = document.getElementById('status-text');
const statusDot     = document.getElementById('status-indicator');
const headerTitle   = document.getElementById('header-title');

// Hero / empty-state
const hero          = document.getElementById('empty-hero');
const heroInput     = document.getElementById('hero-input');
const heroSend      = document.getElementById('hero-send');
const unifiedComposer = document.getElementById('unified-composer');
const chatUI        = document.getElementById('chat-ui');
const inputArea     = document.getElementById('input-area');

// Sidebar / layout
const sidebar       = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarClose  = document.getElementById('sidebar-close');
const sidebarOverlay= document.getElementById('sidebar-overlay');
const appShell      = document.getElementById('app-shell');
const container     = document.getElementById('main-wrapper');

// Rail actions
const railNewChat   = document.getElementById('rail-new-chat');
const railSearch    = document.getElementById('rail-search');

// Conversations UI
const conversationList = document.getElementById('conversation-list');
const newChatBtn    = document.getElementById('new-chat-btn');
const clearAllBtn   = document.getElementById('clear-all-btn');

/* =========================
   State
   ========================= */
let currentConversationId = SESSION_ID;
let conversations = [];
let composerMoved = false;

/* =========================
   View helpers
   ========================= */
function setHeaderTitle(text) {
  const el = headerTitle;
  if (!el) return;
  const t = (text || '').trim();
  el.textContent = t;
  el.style.visibility = t ? 'visible' : 'hidden';
}

function setMode(mode /* 'hero' | 'chat' */) {
  document.body.dataset.mode = mode;
}

function showHero() {
  setMode('hero');
  if (hero) {
    hero.removeAttribute('hidden');
    hero.setAttribute('aria-hidden', 'false');
  }
  if (chatUI) chatUI.hidden = true;
  if (heroInput) {
    heroInput.value = '';
    autoSizeToCap(heroInput);
    heroInput.focus();
  }
}

function showChat() {
  setMode('chat');
  if (hero) {
    hero.setAttribute('aria-hidden', 'true');
    hero.setAttribute('hidden', '');
  }
  if (chatUI) chatUI.hidden = false;

  requestAnimationFrame(() => {
    const bottomTextarea = document.querySelector('#input-area textarea') || document.getElementById('message-input');
    if (bottomTextarea) {
      autoSizeToCap(bottomTextarea);
      bottomTextarea.focus();
    }
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });
}

/** Move the single composer from hero to bottom input area (do once) */
function moveComposerToBottom() {
  if (composerMoved || !unifiedComposer || !inputArea) return;

  // Adapt IDs so bottom bindings work
  const textarea = unifiedComposer.querySelector('textarea');
  const send     = unifiedComposer.querySelector('#hero-send');

  if (textarea) {
    textarea.id = 'message-input';         // now the bottom composer textarea
    textarea.placeholder = 'Ask anything…';
  }
  if (send) {
    send.id = 'send-btn';
  }

  inputArea.appendChild(unifiedComposer);
  composerMoved = true;

  // Rebind events now that IDs changed
  const newSendBtn   = document.getElementById('send-btn');
  const newMsgInput  = document.getElementById('message-input');

  newSendBtn && newSendBtn.addEventListener('click', sendMessage);
  newMsgInput && newMsgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  newMsgInput && newMsgInput.addEventListener('input', function () { autoSizeToCap(this); });
}

/* =========================
   Sidebar controls (unchanged)
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

    const active = conversations.find(c => String(c.id) === String(currentConversationId));
    setHeaderTitle(active && active.title ? active.title : '');
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
    const date = new Date(conv.updated_at || Date.now());
    const dateStr = formatDate(date);
    const isActive = String(conv.id) === String(currentConversationId);
    return `
      <div class="conversation-item ${isActive ? 'active' : ''}" data-id="${conv.id}">
        <div class="conversation-item-header">
          <span class="conversation-title">${escapeHtml(conv.title || 'Untitled')}</span>
          <span class="conversation-date">${dateStr}</span>
        </div>
        <div class="conversation-preview">${escapeHtml(conv.preview || '')}</div>
        <div class="conversation-actions">
          <button class="conversation-export" title="Export" aria-label="Export conversation" data-id="${conv.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v10M12 5l-4 4M12 5l4 4M4 19h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="conversation-delete" title="Delete" aria-label="Delete conversation" data-id="${conv.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', e => {
      if (!e.target.closest('.conversation-actions')) {
        loadConversation(item.dataset.id);
      }
    });
  });

  document.querySelectorAll('.conversation-delete').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      await deleteConversation(btn.dataset.id);
    });
  });

  document.querySelectorAll('.conversation-export').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      exportConversation(btn.dataset.id);
    });
  });
}

async function loadConversation(conversationId) {
  try {
    const response = await fetch(`/api/conversations/${conversationId}`);
    const data = await response.json();

    if (response.ok && data.conversation) {
      currentConversationId = conversationId;
      SESSION_ID = conversationId;

      chatMessages.innerHTML = '';
      const messages = data.conversation.messages || [];
      messages.forEach(msg => addMessage(msg.content, msg.role));

      setHeaderTitle(data.conversation.title || '');
      setStatus('Ready');
      renderConversations();
      closeSidebar();

      // Ensure chat mode + composer at bottom when loading an existing convo
      if (!composerMoved) moveComposerToBottom();
      showChat();
    }
  } catch (error) {
    console.error('Error loading conversation:', error);
    setStatus('Error loading conversation', 'error');
  }
}

async function deleteConversation(conversationId) {
  if (!confirm('Delete this conversation?')) return;

  try {
    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      conversations = conversations.filter(c => String(c.id) !== String(conversationId));
      renderConversations();

      if (String(conversationId) === String(currentConversationId)) {
        startNewChat();
      }
    }
  } catch (error) {
    console.error('Error deleting conversation:', error);
  }
}

function exportConversation(conversationId) {
  alert('Export conversation\n\nFormats:\n• Markdown\n• JSON\n• PDF (coming soon)');
}

function startNewChat() {
  SESSION_ID = null;
  currentConversationId = null;
  chatMessages.innerHTML = '';
  setHeaderTitle('');
  setStatus('Ready');

  // Move the composer back to hero for new chats
  if (composerMoved && unifiedComposer && hero) {
    hero.insertBefore(unifiedComposer, hero.querySelector('.hero-chips'));
    // restore IDs so hero handlers work
    const textarea = unifiedComposer.querySelector('textarea');
    const send     = unifiedComposer.querySelector('#send-btn');
    if (textarea) { textarea.id = 'hero-input'; }
    if (send)     { send.id = 'hero-send'; }
    composerMoved = false;
  }

  showHero();
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

/** Unified sender usable from hero (before move) and bottom (after move) */
async function sendMessageWith(raw) {
  const message = (raw || '').trim();
  if (!message) return;

  // If this is the first send, switch UI and move composer
  if (!composerMoved) {
    moveComposerToBottom();
  }
  showChat();

  addMessage(message, 'user');

  // clear whichever input is active
  const activeInput = document.getElementById('message-input') || document.getElementById('hero-input');
  if (activeInput) activeInput.value = '';

  setStatus('Thinking...', 'loading');
  const thinkingNode = addThinkingMessage();

  try {
    const response = await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversation_id: currentConversationId
      })
    });

    let data = {};
    try { data = await response.json(); } catch (_) {}

    if (response.ok) {
      const reply = (data && (data.response ?? data.text)) ?? '';
      replaceAssistantMessage(thinkingNode, reply);

      if (data.conversation_id) {
        currentConversationId = data.conversation_id;
        SESSION_ID = data.conversation_id;
      }

      await loadConversations();
      const active = conversations.find(c => String(c.id) === String(currentConversationId));
      setHeaderTitle(active && active.title ? active.title : '');
      setStatus('Ready');
    } else {
      const err = (data && (data.error || data.message)) || 'Request failed';
      replaceAssistantMessage(thinkingNode, `Error: ${err}`);
      setStatus('Error', 'error');
    }
  } catch (error) {
    replaceAssistantMessage(thinkingNode, `Error: ${error.message}`);
    setStatus('Error', 'error');
  } finally {
    const bottomTextarea = document.getElementById('message-input') || document.getElementById('hero-input');
    if (bottomTextarea) {
      bottomTextarea.focus();
      autoSizeToCap(bottomTextarea);
    }
  }
}

async function sendMessage() { 
  const bottom = document.getElementById('message-input');
  return sendMessageWith(bottom && bottom.value);
}
async function sendHero() { 
  const top = document.getElementById('hero-input');
  return sendMessageWith(top && top.value);
}

async function clearConversation() {
  if (!confirm('Clear this conversation?')) return;
  try {
    await fetch('/api/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: SESSION_ID, save: false })
    });
    chatMessages.innerHTML = '';
    setHeaderTitle('');
    setStatus('Ready');
    startNewChat();
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
   Account Popup Menu (unchanged)
   ========================= */
const accountTrigger = document.getElementById('account-trigger');
const accountPopup = document.getElementById('account-popup');
const accountFooterToggle = accountPopup ? accountPopup.querySelector('.account-popup-footer-toggle') : null;

if (accountTrigger && accountPopup) {
  accountTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = accountTrigger.getAttribute('aria-expanded') === 'true';
    if (isExpanded) closeAccountPopup(); else openAccountPopup();
  });

  if (accountFooterToggle) {
    accountFooterToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAccountPopup();
    });
  }

  document.addEventListener('click', (e) => {
    if (!accountPopup.contains(e.target) && !accountTrigger.contains(e.target)) {
      closeAccountPopup();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && accountTrigger.getAttribute('aria-expanded') === 'true') {
      closeAccountPopup();
      accountTrigger.focus();
    }
  });

  accountPopup.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && e.target.getAttribute('href') === '/logout') return;
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

/* =========================
   Events
   ========================= */
sidebarToggle && sidebarToggle.addEventListener('click', toggleSidebar);
sidebarClose  && sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay&& sidebarOverlay.addEventListener('click', closeSidebar);

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

newChatBtn  && newChatBtn.addEventListener('click', startNewChat);
clearAllBtn && clearAllBtn.addEventListener('click', clearAllConversations);

// Hero composer events (before move)
heroSend   && heroSend.addEventListener('click', sendHero);
heroInput  && heroInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendHero();
  }
});
heroInput  && heroInput.addEventListener('input', function () { autoSizeToCap(this); });

// Clear button
clearBtn && clearBtn.addEventListener('click', clearConversation);

function autoSizeToCap(el) {
  if (!el) return;
  el.style.height = 'auto';
  const computed = getComputedStyle(el);
  const maxH = parseFloat(computed.maxHeight);
  const newHeight = Math.min(el.scrollHeight, isNaN(maxH) ? el.scrollHeight : maxH);
  el.style.height = newHeight + 'px';
}

/* =========================
   Utils
   ========================= */
function formatDate(date) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/* =========================
   Init
   ========================= */
reflectAriaExpanded(false);
setStatus('Ready');
setHeaderTitle('');
showHero();
loadConversations();
