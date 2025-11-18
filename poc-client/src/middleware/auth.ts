/**
 * Authentication Middleware
 *
 * Extracts and validates JWT token from Authorization header.
 * Decodes token payload and attaches userId to request object.
 */

import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        email?: string;
        [key: string]: any;
      };
    }
  }
}

/**
 * Decode JWT without verification (for POC purposes)
 * In production, you should verify signature with JWKS
 */
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = Buffer.from(parts[1], 'base64').toString();
    return JSON.parse(payload);
  } catch (e) {
    return null;
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'No authorization token provided',
    });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = decodeJWT(token);

  if (!payload || !payload.sub) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
    return;
  }

  // Check token expiration
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    res.status(401).json({
      success: false,
      error: 'Token expired',
    });
    return;
  }

  // Attach user info to request
  req.user = payload;
  next();
}
