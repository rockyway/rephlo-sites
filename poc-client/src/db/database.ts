/**
 * SQLite Database for Chat History
 *
 * This module provides persistent storage for chat conversations and messages.
 * Uses better-sqlite3 for synchronous, high-performance SQLite access.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Database file location
const DB_PATH = path.join(__dirname, '../../data/chat-history.db');

// Database instance (singleton)
let db: Database.Database | null = null;

/**
 * Get database instance (singleton pattern)
 */
export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { verbose: console.log });
    initializeSchema();
    console.log(`✅ SQLite database initialized at ${DB_PATH}`);
  }
  return db;
}

/**
 * Initialize database schema
 */
function initializeSchema(): void {
  if (!db) throw new Error('Database not initialized');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create conversations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      session_id TEXT NOT NULL
    );
  `);

  // Create messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      model TEXT,
      tokens_used INTEGER,
      credits_used INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_conversations_user_id
    ON conversations(user_id);

    CREATE INDEX IF NOT EXISTS idx_conversations_session_id
    ON conversations(session_id);

    CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
    ON conversations(updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
    ON messages(conversation_id);

    CREATE INDEX IF NOT EXISTS idx_messages_created_at
    ON messages(created_at);
  `);

  console.log('✅ Database schema initialized');
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('✅ Database connection closed');
  }
}

// Types
export interface Conversation {
  id: string;
  userId: string;
  title: string | null;
  createdAt: number;
  updatedAt: number;
  sessionId: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string | null;
  tokensUsed?: number | null;
  creditsUsed?: number | null;
  createdAt: number;
}

export interface ConversationWithMessageCount extends Conversation {
  messageCount: number;
}

/**
 * Create a new conversation
 */
export function createConversation(
  userId: string,
  sessionId: string,
  title?: string
): Conversation {
  const database = getDatabase();
  const id = uuidv4();
  const now = Date.now();

  const stmt = database.prepare(`
    INSERT INTO conversations (id, user_id, title, created_at, updated_at, session_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, userId, title || null, now, now, sessionId);

  return {
    id,
    userId,
    title: title || null,
    createdAt: now,
    updatedAt: now,
    sessionId,
  };
}

/**
 * Get conversation by ID
 */
export function getConversation(id: string, userId: string): Conversation | null {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT
      id,
      user_id as userId,
      title,
      created_at as createdAt,
      updated_at as updatedAt,
      session_id as sessionId
    FROM conversations
    WHERE id = ? AND user_id = ?
  `);

  return stmt.get(id, userId) as Conversation | null;
}

/**
 * List conversations for a user
 */
export function listConversations(
  userId: string,
  limit = 20,
  offset = 0
): ConversationWithMessageCount[] {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT
      c.id,
      c.user_id as userId,
      c.title,
      c.created_at as createdAt,
      c.updated_at as updatedAt,
      c.session_id as sessionId,
      COUNT(m.id) as messageCount
    FROM conversations c
    LEFT JOIN messages m ON c.id = m.conversation_id
    WHERE c.user_id = ?
    GROUP BY c.id
    ORDER BY c.updated_at DESC
    LIMIT ? OFFSET ?
  `);

  return stmt.all(userId, limit, offset) as ConversationWithMessageCount[];
}

/**
 * Update conversation title and updated_at timestamp
 */
export function updateConversation(
  id: string,
  userId: string,
  title: string
): boolean {
  const database = getDatabase();
  const stmt = database.prepare(`
    UPDATE conversations
    SET title = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `);

  const result = stmt.run(title, Date.now(), id, userId);
  return result.changes > 0;
}

/**
 * Touch conversation (update updated_at timestamp)
 */
export function touchConversation(id: string): void {
  const database = getDatabase();
  const stmt = database.prepare(`
    UPDATE conversations
    SET updated_at = ?
    WHERE id = ?
  `);

  stmt.run(Date.now(), id);
}

/**
 * Delete conversation and all its messages (cascade)
 */
export function deleteConversation(id: string, userId: string): boolean {
  const database = getDatabase();
  const stmt = database.prepare(`
    DELETE FROM conversations
    WHERE id = ? AND user_id = ?
  `);

  const result = stmt.run(id, userId);
  return result.changes > 0;
}

/**
 * Create a new message
 */
export function createMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  model?: string,
  tokensUsed?: number,
  creditsUsed?: number
): Message {
  const database = getDatabase();
  const id = uuidv4();
  const now = Date.now();

  const stmt = database.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, model, tokens_used, credits_used, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    conversationId,
    role,
    content,
    model || null,
    tokensUsed || null,
    creditsUsed || null,
    now
  );

  // Touch conversation to update its updated_at timestamp
  touchConversation(conversationId);

  return {
    id,
    conversationId,
    role,
    content,
    model: model || null,
    tokensUsed: tokensUsed || null,
    creditsUsed: creditsUsed || null,
    createdAt: now,
  };
}

/**
 * Get messages for a conversation
 */
export function getMessages(
  conversationId: string,
  limit?: number,
  offset = 0
): Message[] {
  const database = getDatabase();

  let query = `
    SELECT
      id,
      conversation_id as conversationId,
      role,
      content,
      model,
      tokens_used as tokensUsed,
      credits_used as creditsUsed,
      created_at as createdAt
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `;

  if (limit) {
    query += ` LIMIT ? OFFSET ?`;
  }

  const stmt = database.prepare(query);
  const params = limit ? [conversationId, limit, offset] : [conversationId];

  return stmt.all(...params) as Message[];
}

/**
 * Get last N messages for conversation context
 */
export function getRecentMessages(
  conversationId: string,
  limit = 10
): Message[] {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT
      id,
      conversation_id as conversationId,
      role,
      content,
      model,
      tokens_used as tokensUsed,
      credits_used as creditsUsed,
      created_at as createdAt
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  // Get last N messages and reverse to chronological order
  const messages = stmt.all(conversationId, limit) as Message[];
  return messages.reverse();
}

/**
 * Get message count for conversation
 */
export function getMessageCount(conversationId: string): number {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT COUNT(*) as count
    FROM messages
    WHERE conversation_id = ?
  `);

  const result = stmt.get(conversationId) as { count: number };
  return result.count;
}

/**
 * Generate conversation title from first user message
 */
export function generateConversationTitle(firstMessage: string): string {
  // Take first 50 characters and add ellipsis if truncated
  const maxLength = 50;
  const trimmed = firstMessage.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  // Try to cut at word boundary
  const truncated = trimmed.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}
