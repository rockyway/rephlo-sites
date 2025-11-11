import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { app } from '../../src/app';
import { getTestDatabase, cleanDatabase, seedTestData } from '../setup/database';
import { mockOpenAICompletion, mockStripeCustomerCreate, mockStripeSubscriptionCreate } from '../helpers/mocks';

describe('End-to-End: Complete User Journey', () => {
  let prisma: PrismaClient;
  let userEmail: string;
  let userId: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    prisma = getTestDatabase();
    await cleanDatabase();
    await seedTestData();
    userEmail = `e2e-test-${Date.now()}@example.com`;
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  it('Complete Flow: Registration → OAuth → Subscription → Inference → Credits', async () => {
    // Step 1: User Registration (via OIDC)
    console.log('Step 1: User Registration');
    const registerResponse = await request(app)
      .post('/oauth/register')
      .send({
        email: userEmail,
        password: 'SecurePassword123!',
        firstName: 'E2E',
        lastName: 'Test',
      })
      .expect(201);

    expect(registerResponse.body.user).toBeDefined();
    expect(registerResponse.body.user.email).toBe(userEmail);
    userId = registerResponse.body.user.id;

    // Step 2: OAuth Authorization & Token Exchange
    console.log('Step 2: OAuth Authentication');
    const authResponse = await request(app)
      .post('/oauth/token')
      .send({
        grant_type: 'password',
        username: userEmail,
        password: 'SecurePassword123!',
        client_id: 'textassistant-desktop',
        scope: 'openid email profile llm.inference models.read user.info credits.read',
      })
      .expect(200);

    expect(authResponse.body.access_token).toBeDefined();
    expect(authResponse.body.refresh_token).toBeDefined();
    expect(authResponse.body.token_type).toBe('Bearer');
    expect(authResponse.body.expires_in).toBe(3600);

    accessToken = authResponse.body.access_token;
    refreshToken = authResponse.body.refresh_token;

    // Step 3: Get User Profile
    console.log('Step 3: Get User Profile');
    const profileResponse = await request(app)
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(profileResponse.body.email).toBe(userEmail);
    expect(profileResponse.body.firstName).toBe('E2E');
    expect(profileResponse.body.lastName).toBe('Test');

    // Step 4: Check Initial Credits (should be free tier)
    console.log('Step 4: Check Initial Credits');
    const initialCreditsResponse = await request(app)
      .get('/v1/credits/me')
      .set('Authorization', `Bearer ${accessToken}`);

    // New user might not have credits yet
    if (initialCreditsResponse.status === 200) {
      expect(initialCreditsResponse.body.totalCredits).toBeGreaterThan(0);
    }

    // Step 5: List Available Models
    console.log('Step 5: List Available Models');
    const modelsResponse = await request(app)
      .get('/v1/models')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(modelsResponse.body.models.length).toBeGreaterThan(0);
    const gpt5Model = modelsResponse.body.models.find((m: any) => m.id === 'gpt-5');
    expect(gpt5Model).toBeDefined();

    // Step 6: Set Default Model Preference
    console.log('Step 6: Set Default Model');
    await request(app)
      .post('/v1/users/me/preferences/model')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ modelId: 'gpt-5' })
      .expect(200);

    // Step 7: Create Pro Subscription
    console.log('Step 7: Create Subscription');
    mockStripeCustomerCreate();
    mockStripeSubscriptionCreate();

    const subscriptionResponse = await request(app)
      .post('/v1/subscriptions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        planId: 'pro',
        billingInterval: 'monthly',
        paymentMethodId: 'pm_test_123',
      })
      .expect(201);

    expect(subscriptionResponse.body.tier).toBe('pro');
    expect(subscriptionResponse.body.status).toBe('active');
    expect(subscriptionResponse.body.creditsPerMonth).toBe(100000);

    // Step 8: Verify Updated Credits
    console.log('Step 8: Verify Pro Credits');
    const creditsResponse = await request(app)
      .get('/v1/credits/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(creditsResponse.body.totalCredits).toBe(100000);
    expect(creditsResponse.body.usedCredits).toBe(0);
    expect(creditsResponse.body.remainingCredits).toBe(100000);

    const initialRemainingCredits = creditsResponse.body.remainingCredits;

    // Step 9: Make Inference Request (Chat Completion)
    console.log('Step 9: Make Inference Request');
    mockOpenAICompletion({
      content: 'Paris is the capital of France.',
      promptTokens: 25,
      completionTokens: 10,
    });

    const completionResponse = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'What is the capital of France?' },
        ],
        maxTokens: 100,
        temperature: 0.7,
      })
      .expect(200);

    expect(completionResponse.body.choices[0].message.content).toBeDefined();
    expect(completionResponse.body.usage.creditsUsed).toBeGreaterThan(0);

    const creditsUsed = completionResponse.body.usage.creditsUsed;

    // Step 10: Verify Credits Were Deducted
    console.log('Step 10: Verify Credits Deducted');
    const updatedCreditsResponse = await request(app)
      .get('/v1/credits/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(updatedCreditsResponse.body.usedCredits).toBe(creditsUsed);
    expect(updatedCreditsResponse.body.remainingCredits).toBe(
      initialRemainingCredits - creditsUsed
    );

    // Step 11: Check Usage History
    console.log('Step 11: Check Usage History');
    const usageResponse = await request(app)
      .get('/v1/usage')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(usageResponse.body.usage.length).toBeGreaterThan(0);
    const usageRecord = usageResponse.body.usage[0];
    expect(usageRecord.modelId).toBe('gpt-5');
    expect(usageRecord.operation).toBe('chat');
    expect(usageRecord.creditsUsed).toBe(creditsUsed);

    // Step 12: Get Usage Statistics
    console.log('Step 12: Get Usage Statistics');
    const statsResponse = await request(app)
      .get('/v1/usage/stats')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(statsResponse.body.total.creditsUsed).toBe(creditsUsed);
    expect(statsResponse.body.total.requestsCount).toBeGreaterThan(0);

    // Step 13: Update User Profile
    console.log('Step 13: Update User Profile');
    const updateProfileResponse = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        firstName: 'Updated',
        lastName: 'Name',
      })
      .expect(200);

    expect(updateProfileResponse.body.firstName).toBe('Updated');
    expect(updateProfileResponse.body.lastName).toBe('Name');

    // Step 14: Refresh Access Token
    console.log('Step 14: Refresh Access Token');
    const refreshResponse = await request(app)
      .post('/oauth/token')
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: 'textassistant-desktop',
      })
      .expect(200);

    expect(refreshResponse.body.access_token).toBeDefined();
    expect(refreshResponse.body.access_token).not.toBe(accessToken);

    const newAccessToken = refreshResponse.body.access_token;

    // Step 15: Verify New Token Works
    console.log('Step 15: Verify New Token');
    await request(app)
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(200);

    // Step 16: Cancel Subscription
    console.log('Step 16: Cancel Subscription');
    const cancelResponse = await request(app)
      .post('/v1/subscriptions/me/cancel')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .send({
        reason: 'Testing complete',
        cancelAtPeriodEnd: true,
      })
      .expect(200);

    expect(cancelResponse.body.cancelledAt).toBeDefined();
    expect(cancelResponse.body.cancelAtPeriodEnd).toBe(true);

    // Step 17: Verify Subscription Status
    console.log('Step 17: Verify Subscription Status');
    const finalSubscriptionResponse = await request(app)
      .get('/v1/subscriptions/me')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(200);

    expect(finalSubscriptionResponse.body.cancelledAt).toBeDefined();

    console.log('✅ Complete E2E Flow Successful!');
  });
});
