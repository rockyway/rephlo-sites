/**
 * Chat UI Client-Side Logic
 *
 * Handles:
 * - Authentication state
 * - Conversation management
 * - Message rendering with streaming
 * - SSE (Server-Sent Events) for real-time responses
 */

// Global state
let currentToken = null;
let currentUserId = null;
let currentUserEmail = null;
let currentConversationId = null;
let isStreaming = false;
let selectedModel = 'gpt-4o-mini'; // Default model
let availableModels = [];

// DOM Elements
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const conversationsList = document.getElementById('conversationsList');
const logoutBtn = document.getElementById('logoutBtn');
const errorMessage = document.getElementById('errorMessage');
const emptyState = document.getElementById('emptyState');
const chatTitle = document.getElementById('chatTitle');
const headerUserInfo = document.getElementById('headerUserInfo');
const sidebarUserInfo = document.getElementById('sidebarUserInfo');
const modelSelect = document.getElementById('modelSelect');

/**
 * Initialize app on page load
 */
window.addEventListener('load', async () => {
  // Check authentication
  const token = localStorage.getItem('poc_token');

  if (!token) {
    // Redirect to login page
    window.location.href = '/';
    return;
  }

  // Decode token to get user info
  const payload = decodeJWT(token);

  if (!payload || !payload.sub) {
    showError('Invalid token. Please login again.');
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
    return;
  }

  // Check token expiration
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    showError('Token expired. Please login again.');
    setTimeout(() => {
      localStorage.removeItem('poc_token');
      localStorage.removeItem('poc_session');
      window.location.href = '/';
    }, 2000);
    return;
  }

  currentToken = token;
  currentUserId = payload.sub;
  currentUserEmail = payload.email || payload.sub;

  // Update UI with user info
  headerUserInfo.textContent = currentUserEmail;
  sidebarUserInfo.textContent = `Logged in as ${currentUserEmail}`;

  // Load available models
  await loadModels();

  // Load conversations
  await loadConversations();

  // Set up event listeners
  setupEventListeners();
});

/**
 * Decode JWT token
 */
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  } catch (e) {
    return null;
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Send message on button click
  sendBtn.addEventListener('click', sendMessage);

  // Send message on Enter key (Shift+Enter for newline)
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
  });

  // New chat button
  newChatBtn.addEventListener('click', createNewChat);

  // Logout button
  logoutBtn.addEventListener('click', logout);

  // Model selection change
  modelSelect.addEventListener('change', (e) => {
    selectedModel = e.target.value;
    console.log('Selected model:', selectedModel);
  });
}

/**
 * Load available models from backend API
 */
async function loadModels() {
  try {
    const RESOURCE_API_URL = 'http://localhost:7150';
    const response = await fetch(`${RESOURCE_API_URL}/v1/models`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load models');
    }

    availableModels = data.models || [];

    // Populate model selector
    modelSelect.innerHTML = '';

    if (availableModels.length === 0) {
      modelSelect.innerHTML = '<option value="gpt-4o-mini">gpt-4o-mini (default)</option>';
      return;
    }

    // Filter only available models and sort by name
    const usableModels = availableModels
      .filter(m => m.is_available && !m.is_deprecated)
      .sort((a, b) => a.name.localeCompare(b.name));

    usableModels.forEach((model) => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = `${model.display_name || model.name} (${model.provider})`;

      // Set default selection to gpt-4o-mini
      if (model.id === 'gpt-4o-mini') {
        option.selected = true;
        selectedModel = model.id;
      }

      modelSelect.appendChild(option);
    });

    console.log(`Loaded ${usableModels.length} available models`);
  } catch (error) {
    console.error('Load models error:', error);
    showError('Failed to load models: ' + error.message);

    // Fallback to default model
    modelSelect.innerHTML = '<option value="gpt-4o-mini">gpt-4o-mini (default)</option>';
  }
}

/**
 * Load conversations from API
 */
async function loadConversations() {
  try {
    const response = await fetch('/api/chat/conversations?limit=50', {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load conversations');
    }

    renderConversationsList(data.conversations);
  } catch (error) {
    console.error('Load conversations error:', error);
    showError('Failed to load conversations: ' + error.message);
  }
}

/**
 * Render conversations list in sidebar
 */
function renderConversationsList(conversations) {
  if (!conversations || conversations.length === 0) {
    conversationsList.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #8e8ea0; font-size: 13px;">
        No conversations yet
      </div>
    `;
    return;
  }

  conversationsList.innerHTML = conversations
    .map(
      (conv) => `
      <div
        class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}"
        data-id="${conv.id}"
        onclick="loadConversation('${conv.id}')"
      >
        <span class="conversation-title">${escapeHtml(conv.title || 'Untitled Chat')}</span>
        <button
          class="delete-conversation-btn"
          onclick="event.stopPropagation(); deleteConversation('${conv.id}')"
          title="Delete conversation"
        >
          🗑️
        </button>
      </div>
    `
    )
    .join('');
}

/**
 * Create new chat
 */
function createNewChat() {
  currentConversationId = null;
  messagesContainer.innerHTML = '';
  emptyState.style.display = 'flex';
  chatTitle.textContent = 'New Chat';
  messageInput.value = '';
  messageInput.focus();

  // Clear active state from conversations
  document.querySelectorAll('.conversation-item').forEach((item) => {
    item.classList.remove('active');
  });
}

/**
 * Load conversation and messages
 */
async function loadConversation(conversationId) {
  try {
    const response = await fetch(`/api/chat/conversations/${conversationId}`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load conversation');
    }

    currentConversationId = conversationId;
    chatTitle.textContent = data.conversation.title || 'Untitled Chat';

    // Render messages
    messagesContainer.innerHTML = '';
    emptyState.style.display = 'none';

    data.messages.forEach((msg) => {
      renderMessage(msg.role, msg.content, msg.tokensUsed, msg.creditsUsed);
    });

    // Scroll to bottom
    scrollToBottom();

    // Update active state in sidebar
    document.querySelectorAll('.conversation-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.id === conversationId);
    });

    messageInput.focus();
  } catch (error) {
    console.error('Load conversation error:', error);
    showError('Failed to load conversation: ' + error.message);
  }
}

/**
 * Delete conversation
 */
async function deleteConversation(conversationId) {
  if (!confirm('Are you sure you want to delete this conversation?')) {
    return;
  }

  try {
    const response = await fetch(`/api/chat/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete conversation');
    }

    // Reload conversations
    await loadConversations();

    // If the deleted conversation was active, create new chat
    if (conversationId === currentConversationId) {
      createNewChat();
    }
  } catch (error) {
    console.error('Delete conversation error:', error);
    showError('Failed to delete conversation: ' + error.message);
  }
}

/**
 * Send message
 */
async function sendMessage() {
  const message = messageInput.value.trim();

  if (!message || isStreaming) {
    return;
  }

  // Clear input and disable send button
  messageInput.value = '';
  messageInput.style.height = 'auto';
  isStreaming = true;
  sendBtn.disabled = true;

  // Hide empty state
  emptyState.style.display = 'none';

  // Render user message
  renderMessage('user', message);

  // Scroll to bottom
  scrollToBottom();

  // Create assistant message placeholder with typing indicator
  const assistantMessageId = 'msg-' + Date.now();
  const assistantMessageDiv = document.createElement('div');
  assistantMessageDiv.className = 'message assistant';
  assistantMessageDiv.id = assistantMessageId;
  assistantMessageDiv.innerHTML = `
    <div class="message-avatar">AI</div>
    <div class="message-content">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  messagesContainer.appendChild(assistantMessageDiv);
  scrollToBottom();

  try {
    // Call streaming API
    await streamChatCompletion(message, assistantMessageId);
  } catch (error) {
    console.error('Send message error:', error);
    showError('Failed to send message: ' + error.message);

    // Remove assistant message placeholder
    document.getElementById(assistantMessageId)?.remove();
  } finally {
    isStreaming = false;
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

/**
 * Stream chat completion using SSE
 */
async function streamChatCompletion(message, assistantMessageId) {
  return new Promise((resolve, reject) => {
    const requestBody = {
      message,
      conversationId: currentConversationId,
      model: selectedModel,
      stream: true,
    };

    fetch('/api/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(requestBody),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Stream request failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantContent = '';

        function processStream() {
          reader.read().then(({ done, value }) => {
            if (done) {
              resolve();
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                const eventType = line.slice(7).trim();

                if (eventType === 'message') {
                  // Next line should be data
                  continue;
                } else if (eventType === 'done') {
                  // Stream complete
                  continue;
                } else if (eventType === 'error') {
                  // Error occurred
                  continue;
                }
              } else if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.chunk) {
                    // Append chunk to assistant message
                    assistantContent += parsed.chunk;
                    updateAssistantMessage(assistantMessageId, assistantContent);
                  } else if (parsed.conversationId) {
                    // Stream complete with metadata
                    currentConversationId = parsed.conversationId;

                    // Add metadata to message
                    const meta = [];
                    if (parsed.tokensUsed) {
                      meta.push(`${parsed.tokensUsed} tokens`);
                    }
                    if (parsed.creditsUsed) {
                      meta.push(`${parsed.creditsUsed} credits`);
                    }

                    if (meta.length > 0) {
                      const messageDiv = document.getElementById(assistantMessageId);
                      const contentDiv = messageDiv?.querySelector('.message-content');
                      if (contentDiv) {
                        const metaDiv = document.createElement('div');
                        metaDiv.className = 'message-meta';
                        metaDiv.textContent = meta.join(' • ');
                        contentDiv.appendChild(metaDiv);
                      }
                    }

                    // Reload conversations to update list
                    loadConversations();
                  } else if (parsed.error) {
                    showError('Error: ' + parsed.error);
                    reject(new Error(parsed.error));
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }

            processStream();
          });
        }

        processStream();
      })
      .catch((error) => {
        console.error('Stream error:', error);
        reject(error);
      });
  });
}

/**
 * Update assistant message content during streaming
 */
function updateAssistantMessage(messageId, content) {
  const messageDiv = document.getElementById(messageId);
  if (!messageDiv) return;

  const contentDiv = messageDiv.querySelector('.message-content');
  if (!contentDiv) return;

  contentDiv.textContent = content;
  scrollToBottom();
}

/**
 * Render a message in the chat
 */
function renderMessage(role, content, tokensUsed, creditsUsed) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const avatar = role === 'user' ? 'You' : 'AI';
  const meta = [];

  if (tokensUsed) {
    meta.push(`${tokensUsed} tokens`);
  }
  if (creditsUsed) {
    meta.push(`${creditsUsed} credits`);
  }

  messageDiv.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      ${escapeHtml(content)}
      ${meta.length > 0 ? `<div class="message-meta">${meta.join(' • ')}</div>` : ''}
    </div>
  `;

  messagesContainer.appendChild(messageDiv);
  scrollToBottom();
}

/**
 * Scroll messages container to bottom
 */
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Show error message
 */
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');

  setTimeout(() => {
    errorMessage.classList.remove('show');
  }, 5000);
}

/**
 * Logout
 */
async function logout() {
  try {
    await fetch('/api/logout', {
      method: 'POST',
    });
  } catch (e) {
    // Ignore logout errors
  }

  localStorage.removeItem('poc_token');
  localStorage.removeItem('poc_session');
  window.location.href = '/';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
