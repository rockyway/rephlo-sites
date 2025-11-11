/**
 * JWKS Key Generation Script
 *
 * Generates RS256 key pair for OIDC provider JWT signing.
 * Run this once to generate keys, then store in environment variables.
 *
 * Usage:
 *   ts-node scripts/generate-jwks.ts
 *
 * Output:
 *   - Private key (JWK format) - Store in OIDC_JWKS_PRIVATE_KEY
 *   - Public JWKS - Served at /oauth/jwks endpoint
 */

import { generateKeyPair, exportJWK } from 'jose';

async function generateJWKS() {
  console.log('🔐 Generating RS256 key pair for OIDC provider...\n');

  // Generate RS256 key pair (2048-bit RSA)
  const { privateKey, publicKey } = await generateKeyPair('RS256', {
    modulusLength: 2048,
  });

  // Export keys to JWK format
  const privateJwk = await exportJWK(privateKey);
  const publicJwk = await exportJWK(publicKey);

  // Add key ID and algorithm
  const kid = generateKeyId();
  privateJwk.kid = kid;
  privateJwk.alg = 'RS256';
  privateJwk.use = 'sig';

  publicJwk.kid = kid;
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';

  console.log('✅ Keys generated successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 PRIVATE KEY (Add to .env as OIDC_JWKS_PRIVATE_KEY)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(JSON.stringify(privateJwk, null, 2));
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 PUBLIC JWKS (For reference - automatically served by OIDC provider)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(JSON.stringify({ keys: [publicJwk] }, null, 2));
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  IMPORTANT: Store the private key securely!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('1. Copy the PRIVATE KEY JSON above');
  console.log('2. Add to backend/.env:');
  console.log('   OIDC_JWKS_PRIVATE_KEY=\'<paste-private-key-json-here>\'');
  console.log('3. Never commit the private key to version control');
  console.log('4. Use different keys for dev/staging/production\n');
}

/**
 * Generate a random key ID (kid)
 */
function generateKeyId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

// Run the script
generateJWKS().catch((error) => {
  console.error('❌ Error generating keys:', error);
  process.exit(1);
});
