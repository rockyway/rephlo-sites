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

const app = express();
const PORT = 8080;

// Configuration
const IDENTITY_PROVIDER_URL = 'http://localhost:7151';
const RESOURCE_API_URL = 'http://localhost:7150';
const CLIENT_ID = 'textassistant-desktop';
const CLIENT_REDIRECT_URI = 'http://localhost:8080/callback';

// In-memory session store (for demo purposes)
const sessions = new Map<string, {
  codeVerifier: string;
  token?: string;
  tokenPayload?: any;
}>();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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
  authorizationUrl.searchParams.set('scope', 'openid email profile llm.inference models.read user.info credits.read');
  authorizationUrl.searchParams.set('code_challenge', codeChallenge);
  authorizationUrl.searchParams.set('code_challenge_method', 'S256');
  authorizationUrl.searchParams.set('state', sessionId);
  // RFC 8707: Resource indicator to request JWT tokens instead of opaque reference tokens
  authorizationUrl.searchParams.set('resource', 'https://api.textassistant.local');

  res.cookie('poc_session_id', sessionId, { httpOnly: true, maxAge: 3600000 });
  res.redirect(authorizationUrl.toString());
});

/**
 * Step 2: OAuth callback
 * GET /callback?code=...&state=...
 */
app.get('/callback', async (req: Request, res: Response) => {
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
    const tokenResponse = await axios.post(
      `${IDENTITY_PROVIDER_URL}/oauth/token`,
      {
        grant_type: 'authorization_code',
        code: code,
        client_id: CLIENT_ID,
        redirect_uri: CLIENT_REDIRECT_URI,
        code_verifier: session.codeVerifier,
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const token = tokenResponse.data.access_token;
    const tokenPayload = decodeJWT(token);

    // Store token in session
    session.token = token;
    session.tokenPayload = tokenPayload;

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
  });
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

    const response = await axios.get(`${RESOURCE_API_URL}/v1/credits`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    res.json({
      success: true,
      endpoint: '/v1/credits',
      statusCode: response.status,
      data: response.data,
    });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      success: false,
      endpoint: '/v1/credits',
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
    const response = await axios.get(`${RESOURCE_API_URL}/v1/health`);

    res.json({
      success: true,
      endpoint: '/v1/health',
      statusCode: response.status,
      data: response.data,
    });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      success: false,
      endpoint: '/v1/health',
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`\n✅ POC Client running on http://localhost:${PORT}`);
  console.log(`\nOAuth Flow:`);
  console.log(`  1. Click "Login" button to start OAuth flow`);
  console.log(`  2. You will be redirected to Identity Provider (http://localhost:7151)`);
  console.log(`  3. Login with test account`);
  console.log(`  4. You will be redirected back with an auth code`);
  console.log(`  5. Token will be exchanged automatically`);
  console.log(`  6. Use the token to call API endpoints`);
  console.log(`\nIdentity Provider: ${IDENTITY_PROVIDER_URL}`);
  console.log(`Resource API: ${RESOURCE_API_URL}`);
});
