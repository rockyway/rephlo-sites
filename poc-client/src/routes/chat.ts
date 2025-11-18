/**
 * Chat API Routes
 *
 * Provides endpoints for:
 * - Conversation management (create, list, get, delete)
 * - Chat completion with streaming support (SSE)
 */

import express, { Request, Response } from 'express';
import axios from 'axios';
import { requireAuth } from '../middleware/auth';
import {
  createConversation,
  listConversations,
  getConversation,
  deleteConversation,
  createMessage,
  getMessages,
  getRecentMessages,
  updateConversation,
  generateConversationTitle,
} from '../db/database';

const router = express.Router();
const RESOURCE_API_URL = process.env.RESOURCE_API_URL || 'http://localhost:7150';

/**
 * Create new conversation
 * POST /api/chat/conversations
 */
router.post('/conversations', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = req.user!.sub;
    const sessionId = req.body.sessionId || req.user!.session_id || 'unknown';
    const title = req.body.title;

    const conversation = createConversation(userId, sessionId, title);

    res.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation',
      details: error.message,
    });
  }
});

/**
 * List user conversations
 * GET /api/chat/conversations?limit=20&offset=0
 */
router.get('/conversations', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = req.user!.sub;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const conversations = listConversations(userId, limit, offset);

    res.json({
      success: true,
      conversations: conversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messageCount: conv.messageCount,
      })),
    });
  } catch (error: any) {
    console.error('List conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list conversations',
      details: error.message,
    });
  }
});

/**
 * Get conversation with messages
 * GET /api/chat/conversations/:id
 */
router.get('/conversations/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = req.user!.sub;
    const conversationId = req.params.id;

    const conversation = getConversation(conversationId, userId);

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    const messages = getMessages(conversationId);

    res.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        model: msg.model,
        tokensUsed: msg.tokensUsed,
        creditsUsed: msg.creditsUsed,
        createdAt: msg.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation',
      details: error.message,
    });
  }
});

/**
 * Update conversation title
 * PUT /api/chat/conversations/:id
 */
router.put('/conversations/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = req.user!.sub;
    const conversationId = req.params.id;
    const { title } = req.body;

    if (!title) {
      res.status(400).json({
        success: false,
        error: 'Title is required',
      });
      return;
    }

    const success = updateConversation(conversationId, userId, title);

    if (!success) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Conversation title updated',
    });
  } catch (error: any) {
    console.error('Update conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update conversation',
      details: error.message,
    });
  }
});

/**
 * Delete conversation
 * DELETE /api/chat/conversations/:id
 */
router.delete('/conversations/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = req.user!.sub;
    const conversationId = req.params.id;

    const success = deleteConversation(conversationId, userId);

    if (!success) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Conversation deleted',
    });
  } catch (error: any) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete conversation',
      details: error.message,
    });
  }
});

/**
 * Chat completion with streaming
 * POST /api/chat/completions
 *
 * Body:
 * {
 *   conversationId?: string,  // Optional: create new if omitted
 *   message: string,
 *   model?: string,           // Default: 'gpt-4o-mini'
 *   stream?: boolean          // Default: true
 * }
 */
router.post('/completions', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.sub;
    const sessionId = req.user!.session_id || 'unknown';
    let { conversationId, message, model, stream } = req.body;

    // Validate input
    if (!message || typeof message !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Message is required',
      });
      return;
    }

    // Limit message length
    if (message.length > 4000) {
      res.status(400).json({
        success: false,
        error: 'Message too long (max 4000 characters)',
      });
      return;
    }

    model = model || 'gpt-4o-mini';
    stream = stream !== false; // Default to true

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = getConversation(conversationId, userId);
      if (!conversation) {
        res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
        return;
      }
    } else {
      // Create new conversation with title from first message
      const title = generateConversationTitle(message);
      conversation = createConversation(userId, sessionId, title);
      conversationId = conversation.id;
    }

    // Save user message
    const userMessage = createMessage(conversationId, 'user', message);

    // Build context from recent messages (last 10 messages)
    const recentMessages = getRecentMessages(conversationId, 10);
    const context = recentMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Get auth token from request
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    if (!authToken) {
      res.status(401).json({
        success: false,
        error: 'No authorization token',
      });
      return;
    }

    // Call Resource API
    if (stream) {
      // SSE Streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let assistantContent = '';
      let tokensUsed = 0;
      let creditsUsed = 0;

      try {
        const apiResponse = await axios.post(
          `${RESOURCE_API_URL}/v1/chat/completions`,
          {
            model,
            messages: context,
            stream: true,
          },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              Accept: 'text/event-stream',
            },
            responseType: 'stream',
          }
        );

        // Stream data to client
        apiResponse.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();

              if (data === '[DONE]') {
                continue;
              }

              try {
                const parsed = JSON.parse(data);

                // Extract content chunk
                const contentChunk = parsed.choices?.[0]?.delta?.content;
                if (contentChunk) {
                  assistantContent += contentChunk;

                  // Send SSE event to client
                  res.write(`event: message\n`);
                  res.write(`data: ${JSON.stringify({ chunk: contentChunk, done: false })}\n\n`);
                }

                // Extract usage info (sent at end of stream)
                if (parsed.usage) {
                  tokensUsed = parsed.usage.total_tokens || 0;
                  creditsUsed = parsed.usage.credits_used || 0;
                }
              } catch (e) {
                // Ignore parse errors for malformed chunks
              }
            }
          }
        });

        apiResponse.data.on('end', () => {
          // Save assistant message
          const assistantMessage = createMessage(
            conversationId,
            'assistant',
            assistantContent,
            model,
            tokensUsed,
            creditsUsed
          );

          // Send completion event
          res.write(`event: done\n`);
          res.write(
            `data: ${JSON.stringify({
              conversationId,
              messageId: assistantMessage.id,
              tokensUsed,
              creditsUsed,
            })}\n\n`
          );

          res.end();
        });

        apiResponse.data.on('error', (err: Error) => {
          console.error('Stream error:', err);
          res.write(`event: error\n`);
          res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
          res.end();
        });
      } catch (error: any) {
        console.error('API call error:', error.response?.data || error.message);
        res.write(`event: error\n`);
        res.write(
          `data: ${JSON.stringify({
            error: error.response?.data?.message || error.message,
          })}\n\n`
        );
        res.end();
      }
    } else {
      // Non-streaming response
      try {
        const apiResponse = await axios.post(
          `${RESOURCE_API_URL}/v1/chat/completions`,
          {
            model,
            messages: context,
            stream: false,
          },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        const assistantContent = apiResponse.data.choices[0].message.content;
        const tokensUsed = apiResponse.data.usage?.total_tokens || 0;
        const creditsUsed = apiResponse.data.usage?.credits_used || 0;

        // Save assistant message
        const assistantMessage = createMessage(
          conversationId,
          'assistant',
          assistantContent,
          model,
          tokensUsed,
          creditsUsed
        );

        res.json({
          success: true,
          conversationId,
          messageId: assistantMessage.id,
          content: assistantContent,
          tokensUsed,
          creditsUsed,
        });
      } catch (error: any) {
        console.error('API call error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
          success: false,
          error: error.response?.data?.message || error.message,
        });
      }
    }
  } catch (error: any) {
    console.error('Chat completion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat completion',
      details: error.message,
    });
  }
});

export default router;
