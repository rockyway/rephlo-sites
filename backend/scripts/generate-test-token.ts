#!/usr/bin/env ts-node
/**
 * Generate a test JWT access token for API testing
 * This creates a valid JWT that mimics the OIDC provider's tokens
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// User ID for admin.test@rephlo.ai
const ADMIN_USER_ID = '8da94cb8-6de6-4859-abf8-7e6fed14d9c0';

// JWT Header
const header = {
  alg: 'RS256',
  typ: 'at+jwt',
  kid: 'test-key-id'
};

// JWT Payload
const now = Math.floor(Date.now() / 1000);
const payload = {
  jti: crypto.randomBytes(32).toString('hex'),
  sub: ADMIN_USER_ID,
  iat: now,
  exp: now + (24 * 60 * 60), // 24 hours
  scope: 'openid email profile llm.inference models.read user.info credits.read',
  client_id: 'desktop-app-test',
  iss: 'http://localhost:7151',
  aud: 'https://api.textassistant.local'
};

// Base64URL encode
function base64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Create unsigned JWT (for testing only - backend will validate via introspection)
const headerEncoded = base64urlEncode(JSON.stringify(header));
const payloadEncoded = base64urlEncode(JSON.stringify(payload));
const signature = base64urlEncode('test-signature-' + crypto.randomBytes(32).toString('hex'));

const token = `${headerEncoded}.${payloadEncoded}.${signature}`;

// Save to temp_token.txt
const tokenPath = path.join(__dirname, '../../temp_token.txt');
fs.writeFileSync(tokenPath, token);

console.log('✅ Generated test access token');
console.log('Token saved to: temp_token.txt');
console.log('User ID:', ADMIN_USER_ID);
console.log('Expires:', new Date((now + 24 * 60 * 60) * 1000).toISOString());
console.log('\nToken:', token);
