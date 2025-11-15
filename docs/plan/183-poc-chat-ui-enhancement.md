# Plan 183: POC Client - ChatGPT-like UI Enhancement

**Created:** 2025-11-14
**Status:** Implementation
**Priority:** Medium

## Overview

Enhance the POC client with a ChatGPT-like chat interface that supports:
- Streaming responses via Server-Sent Events (SSE)
- Continuous conversations with context
- Persistent chat history stored in SQLite database
- Modern chat UI with message bubbles and auto-scrolling

## Current State

The POC client (`poc-client/`) currently:
- Demonstrates OAuth 2.0 authentication flow
- Has basic API testing buttons
- Shows token information
- Uses Express.js server with in-memory sessions
- Serves static HTML/CSS/JS frontend

## Proposed Architecture

### 1. Database Layer (SQLite)

**Schema Design:**

```sql
-- Conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,              -- UUID
  user_id TEXT NOT NULL,            -- From JWT sub claim
  title TEXT,                       -- Auto-generated from first message
  created_at INTEGER NOT NULL,      -- Unix timestamp
  updated_at INTEGER NOT NULL,      -- Unix timestamp
  session_id TEXT NOT NULL          -- POC session ID
);

-- Messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,              -- UUID
  conversation_id TEXT NOT NULL,    -- FK to conversations
  role TEXT NOT NULL,               -- 'user' or 'assistant'
  content TEXT NOT NULL,            -- Message content
  model TEXT,                       -- Model used for assistant messages
  tokens_used INTEGER,              -- Token count (from API response)
  credits_used INTEGER,             -- Credits charged
  created_at INTEGER NOT NULL,      -- Unix timestamp
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

**Database Location:** `poc-client/data/chat-history.db`

### 2. Backend API Endpoints

#### Conversation Management

```typescript
// Create new conversation
POST /api/chat/conversations
Headers: Authorization: Bearer {token}
Response: { conversationId: string, createdAt: number }

// List user conversations
GET /api/chat/conversations
Headers: Authorization: Bearer {token}
Query: ?limit=20&offset=0
Response: { conversations: Array<{ id, title, createdAt, updatedAt, messageCount }> }

// Get conversation with messages
GET /api/chat/conversations/:id
Headers: Authorization: Bearer {token}
Response: { conversation: {...}, messages: Array<{id, role, content, createdAt}> }

// Delete conversation
DELETE /api/chat/conversations/:id
Headers: Authorization: Bearer {token}
Response: { success: true }
```

#### Chat Completion

```typescript
// Send message with streaming response
POST /api/chat/completions
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json
  Accept: text/event-stream
Body: {
  conversationId?: string,  // Optional: create new if omitted
  message: string,
  model?: string,           // Default: 'gpt-4o-mini'
  stream: boolean           // true for SSE, false for single response
}

// SSE Response Format (when stream=true):
event: message
data: {"chunk": "Hello", "done": false}

event: message
data: {"chunk": " world", "done": false}

event: done
data: {"conversationId": "...", "messageId": "...", "tokensUsed": 150, "creditsUsed": 15}

// JSON Response Format (when stream=false):
{
  conversationId: string,
  messageId: string,
  content: string,
  tokensUsed: number,
  creditsUsed: number
}
```

### 3. Frontend UI Components

#### Main Chat Interface Layout

```
┌─────────────────────────────────────────────────┐
│  Rephlo Chat POC               [Logout] [New +] │ ← Header
├───────────┬─────────────────────────────────────┤
│           │                                     │
│ Sidebar   │  Chat Messages Area                │
│           │  ┌───────────────────────────────┐ │
│ [New Chat]│  │ User: Hello                   │ │
│           │  └───────────────────────────────┘ │
│ Recent:   │  ┌───────────────────────────────┐ │
│ • Conv 1  │  │ Assistant: Hi! How can I...   │ │
│ • Conv 2  │  └───────────────────────────────┘ │
│ • Conv 3  │                                     │
│           │  [Auto-scroll to bottom]            │
│           │                                     │
│           ├─────────────────────────────────────┤
│           │ [Type your message...]       [Send]│ ← Input
└───────────┴─────────────────────────────────────┘
```

#### UI Features

1. **Message List Component**
   - User messages: Right-aligned, blue background
   - Assistant messages: Left-aligned, gray background
   - Streaming indicator: Animated typing dots
   - Auto-scroll to bottom on new messages
   - Timestamp display on hover

2. **Input Component**
   - Textarea with auto-resize (max 5 lines)
   - Submit on Enter (Shift+Enter for newline)
   - Disabled during streaming
   - Character/token counter

3. **Sidebar Component**
   - "New Chat" button
   - Conversation list (last 20)
   - Active conversation highlight
   - Delete conversation button (with confirmation)

4. **Streaming Visualization**
   - Show chunks as they arrive
   - Animated cursor/typing indicator
   - Token/credit usage display after completion

### 4. Implementation Flow

#### Chat Message Flow

```
User submits message
    ↓
Frontend: Create/update UI message bubble (user)
    ↓
Frontend: Show typing indicator
    ↓
POST /api/chat/completions (with stream=true)
    ↓
Backend: Validate auth token (extract userId)
    ↓
Backend: Create/load conversation from SQLite
    ↓
Backend: Save user message to SQLite
    ↓
Backend: Build context (last 10 messages from conversation)
    ↓
Backend: Call Resource API /v1/chat/completions (streaming)
    ↓
Backend: Stream chunks via SSE to frontend
    │
    ├─ Frontend: Append chunks to assistant message bubble
    ↓
Backend: On completion, save assistant message to SQLite
    ↓
Backend: Send 'done' event with metadata
    ↓
Frontend: Hide typing indicator, show token/credit usage
```

#### New Conversation Creation

```
Option 1: User clicks "New Chat"
    ↓
Frontend: POST /api/chat/conversations
    ↓
Backend: Create conversation record (no title yet)
    ↓
Backend: Return conversationId
    ↓
Frontend: Update UI with new conversation

Option 2: User sends message without conversationId
    ↓
Frontend: POST /api/chat/completions (no conversationId)
    ↓
Backend: Auto-create conversation
    ↓
Backend: Generate title from first message (e.g., "Chat about X")
    ↓
Backend: Proceed with message processing
```

### 5. Technology Stack

**Dependencies to Add:**

```json
{
  "dependencies": {
    "better-sqlite3": "^9.2.2",      // SQLite driver
    "uuid": "^9.0.1",                 // UUID generation
    "eventsource-parser": "^1.1.1"   // For parsing SSE from backend API
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "@types/uuid": "^9.0.7"
  }
}
```

**Key Technologies:**
- **SQLite** via `better-sqlite3` (synchronous, fast, embedded)
- **SSE (Server-Sent Events)** for streaming
- **Vanilla JS** with modern ES6+ features
- **CSS Grid/Flexbox** for responsive layout

### 6. API Integration Points

#### Resource API Endpoint

```typescript
// Call backend API for chat completion
const response = await axios.post(
  `${RESOURCE_API_URL}/v1/chat/completions`,
  {
    model: selectedModel,
    messages: conversationContext,  // Array of {role, content}
    stream: true
  },
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'text/event-stream'
    },
    responseType: 'stream'
  }
);
```

#### Context Management

For continuous conversation, we need to:
1. Load last N messages from SQLite (e.g., last 10 messages)
2. Format as OpenAI-compatible message array
3. Include system prompt if needed
4. Send to Resource API

```typescript
// Example context building
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi! How can I help?' },
  { role: 'user', content: 'What is Node.js?' }
];
```

### 7. Error Handling

**Frontend:**
- Network errors: Show retry button
- Token expiration: Auto-refresh token, retry request
- Stream interruption: Show partial response with error indicator

**Backend:**
- Database errors: Log and return 500
- API errors: Forward error message to frontend
- Auth errors: Return 401, trigger token refresh on frontend

### 8. Security Considerations

1. **Authentication:**
   - All endpoints require valid JWT token
   - Extract userId from token, don't trust client-provided IDs
   - Validate conversation ownership before access

2. **Data Isolation:**
   - Users can only access their own conversations
   - Filter conversations by userId from JWT

3. **Input Validation:**
   - Sanitize message content (prevent XSS)
   - Limit message length (e.g., 4000 characters)
   - Rate limiting on message submission

### 9. Performance Optimizations

1. **Database:**
   - Use indexes on foreign keys
   - Limit conversation history to last 10 messages for context
   - Paginate conversation list

2. **Streaming:**
   - Use chunked transfer encoding
   - Buffer size optimization
   - Connection timeout handling

3. **Frontend:**
   - Virtual scrolling for long conversations (future enhancement)
   - Debounce input changes
   - Lazy load old conversations

## Implementation Phases

### Phase 1: Database Setup
- [ ] Install better-sqlite3 and uuid
- [ ] Create SQLite schema and migrations
- [ ] Write database utility functions (init, CRUD)

### Phase 2: Backend API
- [ ] Implement conversation management endpoints
- [ ] Implement chat completion endpoint with SSE
- [ ] Add authentication middleware
- [ ] Test streaming with mock data

### Phase 3: Frontend UI
- [ ] Design new HTML structure (sidebar + chat area)
- [ ] Implement message list component
- [ ] Implement input component with auto-resize
- [ ] Add streaming message rendering

### Phase 4: Integration
- [ ] Connect frontend to backend endpoints
- [ ] Implement SSE parsing and message streaming
- [ ] Add conversation switching
- [ ] Add new chat creation

### Phase 5: Polish & Testing
- [ ] Add error handling and retry logic
- [ ] Add loading states and animations
- [ ] Test token refresh during long conversations
- [ ] Add conversation deletion
- [ ] Build and test production bundle

## Success Criteria

- ✅ User can send messages and receive streaming responses
- ✅ Conversations are persisted across sessions
- ✅ Multiple conversations can be managed (create, switch, delete)
- ✅ UI resembles ChatGPT with message bubbles and auto-scroll
- ✅ Token usage and credit deduction are tracked
- ✅ Authentication is properly enforced
- ✅ Build completes without errors

## Open Questions

1. **Context window management:** How many previous messages to include? (Proposal: Last 10 messages or 4K tokens)
2. **Conversation title generation:** Auto-generate from first message or allow user to edit?
3. **Model selection:** Allow user to choose model per message or per conversation?
4. **Export feature:** Should users be able to export conversation history?

## Future Enhancements (Out of Scope)

- Markdown rendering for code blocks
- File attachments
- Conversation search
- Conversation sharing
- Multi-modal support (images)
- Voice input
