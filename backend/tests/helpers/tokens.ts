import * as jose from 'jose';
import { User } from '@prisma/client';

/**
 * Generate a test JWT access token
 */
export const generateTestAccessToken = async (
  user: User,
  scopes: string[] = ['openid', 'email', 'profile', 'llm.inference', 'models.read', 'user.info', 'credits.read']
): Promise<string> => {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test-jwt-secret');

  const token = await new jose.SignJWT({
    sub: user.id,
    email: user.email,
    scope: scopes.join(' '),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(process.env.OIDC_ISSUER || 'http://localhost:3000')
    .setAudience('textassistant-desktop')
    .setExpirationTime('1h')
    .sign(secret);

  return token;
};

/**
 * Generate a test refresh token
 */
export const generateTestRefreshToken = async (user: User): Promise<string> => {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test-jwt-secret');

  const token = await new jose.SignJWT({
    sub: user.id,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(process.env.OIDC_ISSUER || 'http://localhost:3000')
    .setExpirationTime('30d')
    .sign(secret);

  return token;
};

/**
 * Verify and decode test token
 */
export const verifyTestToken = async (token: string): Promise<jose.JWTPayload> => {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test-jwt-secret');

  const { payload } = await jose.jwtVerify(token, secret, {
    issuer: process.env.OIDC_ISSUER || 'http://localhost:3000',
  });

  return payload;
};

/**
 * Create authorization header with bearer token
 */
export const createAuthHeader = (token: string): { Authorization: string } => {
  return { Authorization: `Bearer ${token}` };
};

/**
 * Simple sync token generator for tests (legacy support)
 */
export const generateToken = (user: User): string => {
  // For backwards compatibility - returns a simple token
  // In actual tests, use generateTestAccessToken for proper JWT
  return `test-token-${user.id}`;
};
