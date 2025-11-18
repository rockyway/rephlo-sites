#!/usr/bin/env ts-node
/**
 * Get access token from OIDC provider using password grant
 * For testing purposes only - NOT for production use
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const OIDC_URL = 'http://localhost:7151';
const CLIENT_ID = 'desktop-app-test';
const USERNAME = 'admin.test@rephlo.ai';
const PASSWORD = 'AdminPassword123!';

async function getAccessToken() {
  try {
    console.log('🔑 Requesting access token from OIDC provider...');
    console.log('   OIDC URL:', OIDC_URL);
    console.log('   Client ID:', CLIENT_ID);
    console.log('   Username:', USERNAME);

    // Try password grant (if enabled)
    try {
      const response = await axios.post(`${OIDC_URL}/oauth/token`,
        new URLSearchParams({
          grant_type: 'password',
          username: USERNAME,
          password: PASSWORD,
          client_id: CLIENT_ID,
          scope: 'openid email profile llm.inference models.read user.info credits.read'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const accessToken = response.data.access_token;
      const refreshToken = response.data.refresh_token;

      // Save tokens
      const accessTokenPath = path.join(__dirname, '../../temp_token.txt');
      const refreshTokenPath = path.join(__dirname, '../../temp_refreshtoken.txt');

      fs.writeFileSync(accessTokenPath, accessToken);
      fs.writeFileSync(refreshTokenPath, refreshToken);

      console.log('✅ Access token obtained successfully');
      console.log('   Token saved to: temp_token.txt');
      console.log('   Refresh token saved to: temp_refreshtoken.txt');
      console.log('   Expires in:', response.data.expires_in, 'seconds');
      console.log('\n📋 Access Token (first 50 chars):', accessToken.substring(0, 50) + '...');

      return accessToken;
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('⚠️  Password grant not supported by OIDC provider');
        console.log('');
        console.log('Please obtain a token manually:');
        console.log('1. Start identity provider: cd identity-provider && npm run dev');
        console.log('2. Use OAuth flow or admin panel to get token');
        console.log('3. Save token to temp_token.txt');
      } else {
        throw error;
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

getAccessToken();
