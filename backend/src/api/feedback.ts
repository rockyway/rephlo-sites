/**
 * Feedback Submission API Handler
 *
 * Handles POST /api/feedback requests.
 * Stores user feedback with optional email and userId.
 */

import { Request, Response } from 'express';
import { prisma } from '../db';
import { feedbackSchema } from '../types/validation';
import { sendSuccess, sendError, sendServerError } from '../utils/responses';

/**
 * POST /api/feedback
 *
 * Request Body:
 * {
 *   "message": "string (1-1000 chars)",
 *   "email": "optional email",
 *   "userId": "optional user ID"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "feedbackId": "clx..."
 *   }
 * }
 */
export async function submitFeedback(req: Request, res: Response): Promise<Response> {
  try {
    // Validate request body
    const validationResult = feedbackSchema.safeParse(req.body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message);
      return sendError(res, `Validation failed: ${errors.join(', ')}`, 400);
    }

    const { message, email, userId } = validationResult.data;

    // Store feedback in database
    const feedback = await prisma.feedback.create({
      data: {
        message,
        email,
        userId,
      },
    });

    // Log for debugging
    console.log(`[Feedback] ID: ${feedback.id}, UserID: ${userId || 'anonymous'}, Email: ${email || 'none'}`);

    return sendSuccess(res, {
      feedbackId: feedback.id,
    }, 201);

  } catch (error) {
    console.error('[Feedback] Error:', error);
    return sendServerError(res, error as Error);
  }
}
