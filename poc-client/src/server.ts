/**
 * POC Client Server
 *
 * Simulates Desktop App OAuth workflow:
 * 1. Login initiates OAuth flow
 * 2. Callback receives auth code
 * 3. Exchange code for JWT token
 * 4. Use token to call Resource API endpoints
 */

import express, { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import path from 'path';
import cookieParser from 'cookie-parser';
import chatRoutes from './routes/chat';
import { getDatabase, closeDatabase } from './db/database';

const app = express();
const PORT = 8080;

// Configuration
// Updated to use seeded OAuth credentials for testing
const IDENTITY_PROVIDER_URL = 'http://localhost:7151';
const RESOURCE_API_URL = 'http://localhost:7150';
const CLIENT_ID = 'poc-client-test';  // Matches seeded OAuth client
const CLIENT_SECRET = 'test-secret-poc-client-67890';  // Seeded client secret
const CLIENT_REDIRECT_URI = 'http://localhost:8080/oauth/callback';  // Matches seeded redirect URI

// In-memory session store (for demo purposes)
const sessions = new Map<string, {
  codeVerifier: string;
  token?: string;
  tokenPayload?: any;
}>();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize database on startup
getDatabase();

// Register chat routes
app.use('/api/chat', chatRoutes);

/**
 * Helper: Generate PKCE code challenge
 */
function generatePKCE() {
  const codeVerifier = crypto
    .randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return { codeVerifier, codeChallenge };
}

/**
 * Helper: Decode JWT without verification (for display purposes)
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
 * Step 1: Initiate OAuth flow
 * GET /oauth/login
 */
app.get('/oauth/login', (req: Request, res: Response) => {
  const sessionId = crypto.randomBytes(16).toString('hex');
  const { codeVerifier, codeChallenge } = generatePKCE();

  sessions.set(sessionId, { codeVerifier });

  const authorizationUrl = new URL('/oauth/authorize', IDENTITY_PROVIDER_URL);
  authorizationUrl.searchParams.set('client_id', CLIENT_ID);
  authorizationUrl.searchParams.set('redirect_uri', CLIENT_REDIRECT_URI);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('scope', 'openid email profile offline_access llm.inference models.read user.info credits.read');
  authorizationUrl.searchParams.set('code_challenge', codeChallenge);
  authorizationUrl.searchParams.set('code_challenge_method', 'S256');
  authorizationUrl.searchParams.set('state', sessionId);
  // Force login prompt to bypass grant checking issues
  authorizationUrl.searchParams.set('prompt', 'login');
  // RFC 8707: Resource indicator to request JWT tokens instead of opaque reference tokens
  authorizationUrl.searchParams.set('resource', 'https://api.textassistant.local');

  res.cookie('poc_session_id', sessionId, { httpOnly: true, maxAge: 3600000 });
  res.redirect(authorizationUrl.toString());
});

/**
 * Step 2: OAuth callback
 * GET /callback?code=...&state=...
 * Also handles /oauth/callback for seeded client configuration
 */
app.get(['/callback', '/oauth/callback'], async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: error,
        error_description: error_description,
      });
    }

    if (!code || !state) {
      return res.status(400).json({ success: false, error: 'Missing code or state' });
    }

    const sessionId = state as string;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(400).json({ success: false, error: 'Invalid session' });
    }

    // Step 3: Exchange code for token
    // RFC 8707: Include resource parameter to request JWT tokens
    const tokenData = new URLSearchParams();
    tokenData.append('grant_type', 'authorization_code');
    tokenData.append('code', String(code));
    tokenData.append('client_id', CLIENT_ID);
    tokenData.append('redirect_uri', CLIENT_REDIRECT_URI);
    tokenData.append('code_verifier', session.codeVerifier);
    tokenData.append('resource', 'https://api.textassistant.local');

    const tokenResponse = await axios.post(
      `${IDENTITY_PROVIDER_URL}/oauth/token`,
      tokenData,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    // Log full token response to verify refresh_token issuance
    console.log('\n=== TOKEN RESPONSE ===');
    console.log(JSON.stringify(tokenResponse.data, null, 2));
    console.log('=====================\n');

    const token = tokenResponse.data.access_token;
    const tokenPayload = decodeJWT(token);

    // Store token and refresh token in session
    session.token = token;
    session.tokenPayload = tokenPayload;
    if (tokenResponse.data.refresh_token) {
      (session as any).refreshToken = tokenResponse.data.refresh_token;
    }

    res.redirect(`/?token=${token}&session=${sessionId}`);
  } catch (error: any) {
    console.error('Token exchange error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Token exchange failed',
      details: error.response?.data || error.message,
    });
  }
});

/**
 * Get current session info
 * GET /api/session/:sessionId
 */
app.get('/api/session/:sessionId', (req: Request, res: Response) => {
  const session = sessions.get(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  res.json({
    success: true,
    hasToken: !!session.token,
    tokenPayload: session.tokenPayload,
    hasRefreshToken: !!(session as any).refreshToken,
  });
});

/**
 * Refresh access token using refresh token
 * POST /api/refresh-token
 * Body: { sessionId: string }
 */
app.post('/api/refresh-token', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Session ID is required' });
    }

    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const refreshToken = (session as any).refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'No refresh token available' });
    }

    // Exchange refresh token for new access token
    // For public clients with PKCE, we only send client_id (no authentication)
    const tokenData = new URLSearchParams();
    tokenData.append('grant_type', 'refresh_token');
    tokenData.append('client_id', CLIENT_ID);
    tokenData.append('refresh_token', refreshToken);
    // Include resource parameter to ensure JWT format
    tokenData.append('resource', 'https://api.textassistant.local');

    console.log('\n=== REFRESH TOKEN REQUEST ===');
    console.log('Refresh Token:', refreshToken);
    console.log('Client ID:', CLIENT_ID);
    console.log('Using Basic Auth: No (public client with PKCE)');
    console.log('============================\n');

    const tokenResponse = await axios.post(
      `${IDENTITY_PROVIDER_URL}/oauth/token`,
      tokenData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    console.log('\n=== REFRESHED TOKEN RESPONSE ===');
    console.log(JSON.stringify(tokenResponse.data, null, 2));
    console.log('================================\n');

    const newAccessToken = tokenResponse.data.access_token;
    const newTokenPayload = decodeJWT(newAccessToken);

    // Update session with new tokens
    session.token = newAccessToken;
    session.tokenPayload = newTokenPayload;

    // Update refresh token if a new one was issued (rotation)
    if (tokenResponse.data.refresh_token) {
      (session as any).refreshToken = tokenResponse.data.refresh_token;
    }

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      access_token: newAccessToken,
      tokenPayload: newTokenPayload,
      expires_in: tokenResponse.data.expires_in,
      token_type: tokenResponse.data.token_type,
    });
  } catch (error: any) {
    console.error('Token refresh error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Token refresh failed',
      details: error.response?.data || error.message,
    });
  }
});

/**
 * Logout endpoint
 * POST /api/logout
 * Invalidates session and clears token storage
 */
app.post('/api/logout', (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.poc_session_id;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'No session found' });
    }

    const session = sessions.get(sessionId);
    if (session) {
      // Clear token and session data
      session.token = undefined;
      session.tokenPayload = undefined;
      // Remove session from store
      sessions.delete(sessionId);
    }

    // Clear session cookie
    res.clearCookie('poc_session_id');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      details: error.message,
    });
  }
});

/**
 * Test endpoint: Get user profile
 * GET /api/test/users/me
 */
app.get('/api/test/users/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(400).json({ success: false, error: 'No token provided' });
    }

    const response = await axios.get(`${RESOURCE_API_URL}/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    res.json({
      success: true,
      endpoint: '/v1/users/me',
      statusCode: response.status,
      data: response.data,
    });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      success: false,
      endpoint: '/v1/users/me',
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * Test endpoint: Get available models
 * GET /api/test/models
 */
app.get('/api/test/models', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(400).json({ success: false, error: 'No token provided' });
    }

    const response = await axios.get(`${RESOURCE_API_URL}/v1/models`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    res.json({
      success: true,
      endpoint: '/v1/models',
      statusCode: response.status,
      data: response.data,
    });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      success: false,
      endpoint: '/v1/models',
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * Test endpoint: Get user credits
 * GET /api/test/credits
 */
app.get('/api/test/credits', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(400).json({ success: false, error: 'No token provided' });
    }

    const response = await axios.get(`${RESOURCE_API_URL}/v1/credits/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    res.json({
      success: true,
      endpoint: '/v1/credits/me',
      statusCode: response.status,
      data: response.data,
    });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      success: false,
      endpoint: '/v1/credits/me',
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * Test endpoint: Get health
 * GET /api/test/health
 */
app.get('/api/test/health', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${RESOURCE_API_URL}/health`);

    res.json({
      success: true,
      endpoint: '/health',
      statusCode: response.status,
      data: response.data,
    });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      success: false,
      endpoint: '/health',
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * Test endpoint: Get user subscription
 * GET /api/test/subscriptions
 */
app.get('/api/test/subscriptions', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(400).json({ success: false, error: 'No token provided' });
    }

    const response = await axios.get(`${RESOURCE_API_URL}/v1/subscriptions/current`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    res.json({
      success: true,
      endpoint: '/v1/subscriptions/current',
      statusCode: response.status,
      data: response.data,
    });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      success: false,
      endpoint: '/v1/subscriptions/current',
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * Test endpoint: Get MFA status
 * GET /api/test/mfa/status
 */
app.get('/api/test/mfa/status', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(400).json({ success: false, error: 'No token provided' });
    }

    const response = await axios.get(`${RESOURCE_API_URL}/v1/auth/mfa/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    res.json({
      success: true,
      endpoint: '/v1/auth/mfa/status',
      statusCode: response.status,
      data: response.data,
    });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      success: false,
      endpoint: '/v1/auth/mfa/status',
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * Test endpoint: Execute inference (test LLM call)
 * POST /api/test/inference
 * Body: { prompt: string, model?: string }
 */
app.post('/api/test/inference', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(400).json({ success: false, error: 'No token provided' });
    }

    const { prompt, model } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const response = await axios.post(
      `${RESOURCE_API_URL}/v1/inference/generate`,
      {
        prompt,
        model: model || 'gpt-4',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    res.json({
      success: true,
      endpoint: '/v1/inference/generate',
      statusCode: response.status,
      data: response.data,
    });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      success: false,
      endpoint: '/v1/inference/generate',
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * Start server
 */
const server = app.listen(PORT, () => {
  console.log(`\n✅ POC Client running on http://localhost:${PORT}`);
  console.log(`\nOAuth Flow:`);
  console.log(`  1. Click "Login" button to start OAuth flow`);
  console.log(`  2. You will be redirected to Identity Provider (http://localhost:7151)`);
  console.log(`  3. Login with test account`);
  console.log(`  4. You will be redirected back with an auth code`);
  console.log(`  5. Token will be exchanged automatically`);
  console.log(`  6. Use the token to call API endpoints`);
  console.log(`\nChat UI:`);
  console.log(`  - Navigate to /chat.html for ChatGPT-like interface`);
  console.log(`  - Supports streaming responses and conversation history`);
  console.log(`\nIdentity Provider: ${IDENTITY_PROVIDER_URL}`);
  console.log(`Resource API: ${RESOURCE_API_URL}`);
});

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    closeDatabase();
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    closeDatabase();
    console.log('✅ Server closed');
    process.exit(0);
  });
});
