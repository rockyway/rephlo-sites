# Webhook System Implementation Documentation

**Version**: 1.0.0
**Agent**: Webhook System Agent
**Created**: 2025-11-05
**Status**: In Progress

## Overview

This document details the implementation of the outgoing webhook system for event notifications. The system sends HTTP POST requests to user-configured webhook URLs when important events occur (subscription created/cancelled, credits depleted).

## Reference Documents

- `docs/plan/073-dedicated-api-backend-specification.md` - API specification (Webhooks section)
- `docs/plan/074-agents-backend-api.md` - Agent specifications (Agent 7)
- `docs/plan/075-database-schema-implementation.md` - Database schema
- `docs/plan/079-subscription-management-implementation.md` - Subscription events

## Implementation Summary

### Components to Implement

1. **Database Schema** (Prisma schema update)
   - `WebhookConfig` model - Store user webhook configurations
   - `WebhookLog` model - Track delivery attempts and responses

2. **Signature Utilities** (`backend/src/utils/signature.ts`)
   - Generate HMAC-SHA256 signatures
   - Signature verification utilities (for testing)

3. **Webhook Service** (`backend/src/services/webhook.service.ts`)
   - Send webhook HTTP POST requests
   - Generate HMAC signatures
   - Log delivery attempts
   - Handle HTTP errors

4. **Webhook Queue Worker** (`backend/src/workers/webhook.worker.ts`)
   - BullMQ worker to process webhook jobs
   - Retry logic with exponential backoff (1s, 4s, 16s)
   - Update delivery logs

5. **Webhooks Controller** (`backend/src/controllers/webhooks.controller.ts`)
   - `GET /v1/webhooks/config` - Get user's webhook configuration
   - `POST /v1/webhooks/config` - Set webhook URL and secret
   - `DELETE /v1/webhooks/config` - Remove webhook configuration
   - `POST /v1/webhooks/test` - Test webhook endpoint

6. **Validation Schemas** (`backend/src/types/webhook-validation.ts`)
   - Webhook configuration validation
   - Test webhook validation

7. **Routes Integration**
   - Add webhook routes to `backend/src/routes/v1.routes.ts`

8. **Service Integration**
   - Integrate with subscription service for subscription events
   - Integrate with credit service for credit depletion events

## Architecture

### Event Flow

```
Event Trigger → Queue Webhook Job → BullMQ Queue → Worker → HTTP POST → Webhook URL
                                                      ↓
                                                  Log Attempt
```

### Webhook Delivery Flow

```
User Action → Service Layer → Event Emitter → Webhook Service → Queue Job
                                                                     ↓
                                                               BullMQ Queue
                                                                     ↓
                                                            Webhook Worker
                                                                     ↓
                                                            HTTP POST Request
                                                            (with HMAC signature)
                                                                     ↓
                                                             Log Response
                                                            (success/failure)
                                                                     ↓
                                                            Retry on Failure
                                                            (exponential backoff)
```

## Database Schema

### WebhookConfig Model

```prisma
model WebhookConfig {
  id            String    @id @default(uuid()) @db.Uuid
  userId        String    @map("user_id") @db.Uuid
  webhookUrl    String    @map("webhook_url") @db.VarChar(2048)
  webhookSecret String    @map("webhook_secret") @db.VarChar(255)
  isActive      Boolean   @default(true) @map("is_active")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  logs WebhookLog[]

  @@unique([userId]) // One webhook config per user
  @@index([userId])
  @@index([isActive])
  @@map("webhook_configs")
}
```

### WebhookLog Model

```prisma
model WebhookLog {
  id              String    @id @default(uuid()) @db.Uuid
  webhookConfigId String    @map("webhook_config_id") @db.Uuid
  eventType       String    @map("event_type") @db.VarChar(100)
  payload         Json
  status          String    @db.VarChar(20) // "success", "failed", "pending"
  statusCode      Int?      @map("status_code")
  responseBody    String?   @map("response_body") @db.Text
  errorMessage    String?   @map("error_message") @db.Text
  attempts        Int       @default(1)
  createdAt       DateTime  @default(now()) @map("created_at")
  completedAt     DateTime? @map("completed_at")

  // Relations
  webhookConfig WebhookConfig @relation(fields: [webhookConfigId], references: [id], onDelete: Cascade)

  @@index([webhookConfigId])
  @@index([eventType])
  @@index([status])
  @@index([createdAt])
  @@map("webhook_logs")
}
```

## Webhook Event Types

The system supports the following event types:

```typescript
type WebhookEvent =
  | 'subscription.created'
  | 'subscription.cancelled'
  | 'subscription.updated'
  | 'credits.depleted'
  | 'credits.low';
```

### Event Payload Formats

**subscription.created**:
```json
{
  "event": "subscription.created",
  "timestamp": "2025-11-05T10:30:00Z",
  "data": {
    "subscription_id": "sub_123abc",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "tier": "pro",
    "status": "active",
    "credits_per_month": 100000
  }
}
```

**subscription.cancelled**:
```json
{
  "event": "subscription.cancelled",
  "timestamp": "2025-11-05T10:30:00Z",
  "data": {
    "subscription_id": "sub_123abc",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "cancelled_at": "2025-11-05T10:30:00Z",
    "cancel_at_period_end": true
  }
}
```

**subscription.updated**:
```json
{
  "event": "subscription.updated",
  "timestamp": "2025-11-05T10:30:00Z",
  "data": {
    "subscription_id": "sub_123abc",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "tier": "enterprise",
    "previous_tier": "pro"
  }
}
```

**credits.depleted**:
```json
{
  "event": "credits.depleted",
  "timestamp": "2025-11-05T10:30:00Z",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "remaining_credits": 0,
    "total_credits": 100000
  }
}
```

**credits.low**:
```json
{
  "event": "credits.low",
  "timestamp": "2025-11-05T10:30:00Z",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "remaining_credits": 5000,
    "total_credits": 100000,
    "threshold_percentage": 5
  }
}
```

## HMAC Signature Security

### Signature Generation

Webhooks include an HMAC-SHA256 signature in the `X-Webhook-Signature` header:

```typescript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

### Headers Sent

```
Content-Type: application/json
X-Webhook-Signature: sha256=<hmac-signature>
X-Webhook-Timestamp: <unix-timestamp>
X-Webhook-Event: <event-type>
```

### Signature Verification (for webhook consumers)

```typescript
// Example verification code for webhook consumers
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === `sha256=${expectedSignature}`;
}
```

## BullMQ Queue Configuration

### Queue Setup

```typescript
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL);

export const webhookQueue = new Queue('webhook-delivery', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // Start at 1s, then 4s, then 16s
    },
    removeOnComplete: {
      age: 86400 * 7, // Keep completed jobs for 7 days
    },
    removeOnFail: {
      age: 86400 * 30, // Keep failed jobs for 30 days
    },
  },
});
```

### Job Payload

```typescript
interface WebhookJobData {
  webhookConfigId: string;
  eventType: string;
  payload: any;
  userId: string;
}
```

### Retry Strategy

| Attempt | Delay | Total Time |
|---------|-------|------------|
| 1       | 0s    | 0s         |
| 2       | 1s    | 1s         |
| 3       | 4s    | 5s         |

After 3 failed attempts, the webhook is marked as "failed" and no further retries are attempted.

## API Endpoints

### Protected Endpoints (Authentication Required)

#### `GET /v1/webhooks/config`
Get current user's webhook configuration.

**Response 200**:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "webhook_url": "https://example.com/webhook",
  "is_active": true,
  "created_at": "2025-11-05T10:30:00Z",
  "updated_at": "2025-11-05T10:30:00Z"
}
```

**Response 404**:
```json
{
  "error": {
    "code": "not_found",
    "message": "Webhook configuration not found"
  }
}
```

#### `POST /v1/webhooks/config`
Set webhook URL and secret.

**Request Body**:
```json
{
  "webhook_url": "https://example.com/webhook",
  "webhook_secret": "my-secret-key"
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "webhook_url": "https://example.com/webhook",
  "is_active": true,
  "created_at": "2025-11-05T10:30:00Z"
}
```

**Validation Errors**:
- `webhook_url` must be a valid HTTPS URL (in production)
- `webhook_secret` must be at least 16 characters

#### `DELETE /v1/webhooks/config`
Remove webhook configuration.

**Response 200**:
```json
{
  "success": true,
  "message": "Webhook configuration deleted"
}
```

#### `POST /v1/webhooks/test`
Send a test webhook.

**Request Body**:
```json
{
  "event_type": "subscription.created"
}
```

**Response 200**:
```json
{
  "success": true,
  "message": "Test webhook queued for delivery",
  "webhook_log_id": "uuid"
}
```

**Response 404**:
```json
{
  "error": {
    "code": "not_found",
    "message": "Webhook configuration not found"
  }
}
```

## Error Handling

### HTTP Error Codes

| Status Code | Retry? | Reason |
|-------------|--------|--------|
| 2xx         | No     | Success |
| 400-499     | No     | Client error (except 429) |
| 429         | Yes    | Rate limited |
| 500-599     | Yes    | Server error |
| Timeout     | Yes    | Network timeout |
| Network     | Yes    | Connection failed |

### Error Logging

All webhook attempts are logged in the `webhook_logs` table:

```typescript
{
  eventType: 'subscription.created',
  status: 'failed',
  statusCode: 500,
  errorMessage: 'Internal Server Error',
  attempts: 3,
  responseBody: '{"error": "Internal server error"}'
}
```

## Integration Points

### Subscription Service Integration

Add webhook calls after subscription events:

```typescript
// After creating subscription
await queueWebhook(userId, 'subscription.created', {
  subscription_id: subscription.id,
  user_id: userId,
  tier: subscription.tier,
  status: subscription.status,
  credits_per_month: subscription.creditsPerMonth,
});

// After cancelling subscription
await queueWebhook(userId, 'subscription.cancelled', {
  subscription_id: subscription.id,
  user_id: userId,
  cancelled_at: subscription.cancelledAt,
  cancel_at_period_end: true,
});

// After updating subscription
await queueWebhook(userId, 'subscription.updated', {
  subscription_id: subscription.id,
  user_id: userId,
  tier: updatedSubscription.tier,
  previous_tier: previousTier,
});
```

### Credit Service Integration

Add webhook calls when credits are low or depleted:

```typescript
// When credits depleted (remaining = 0)
if (credit.remainingCredits === 0) {
  await queueWebhook(userId, 'credits.depleted', {
    user_id: userId,
    remaining_credits: 0,
    total_credits: credit.totalCredits,
  });
}

// When credits low (< 10%)
const threshold = credit.totalCredits * 0.1;
if (credit.remainingCredits < threshold && credit.remainingCredits > 0) {
  await queueWebhook(userId, 'credits.low', {
    user_id: userId,
    remaining_credits: credit.remainingCredits,
    total_credits: credit.totalCredits,
    threshold_percentage: 10,
  });
}
```

## Configuration

### Environment Variables

```env
# Redis Configuration (for BullMQ)
REDIS_URL=redis://localhost:6379

# Webhook Configuration
WEBHOOK_TIMEOUT_MS=5000
WEBHOOK_MAX_RETRIES=3
```

### Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "bullmq": "^5.1.0",
    "ioredis": "^5.3.2"
  }
}
```

## Testing

### Manual Testing Steps

1. **Configure Webhook**:
   ```bash
   curl -X POST http://localhost:3001/v1/webhooks/config \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "webhook_url": "https://webhook.site/unique-id",
       "webhook_secret": "my-secret-key-123"
     }'
   ```

2. **Test Webhook**:
   ```bash
   curl -X POST http://localhost:3001/v1/webhooks/test \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "event_type": "subscription.created"
     }'
   ```

3. **Trigger Real Event**:
   - Create a subscription (triggers `subscription.created`)
   - Cancel a subscription (triggers `subscription.cancelled`)
   - Use credits until depleted (triggers `credits.depleted`)

4. **Verify Delivery**:
   - Check webhook.site for received webhooks
   - Verify HMAC signature matches
   - Check webhook logs in database

### Testing Tools

- **webhook.site** - Free webhook testing service
- **RequestBin** - Alternative webhook testing
- **ngrok** - Tunnel to local webhook server

## Security Considerations

1. **HTTPS Only**: Production webhooks must use HTTPS URLs
2. **HMAC Signatures**: All webhooks include HMAC-SHA256 signature
3. **Timestamp**: Includes timestamp to prevent replay attacks
4. **Secret Storage**: Webhook secrets stored securely in database
5. **URL Validation**: Webhook URLs are validated (no private IPs)
6. **Rate Limiting**: Consider limiting webhook delivery rate per user

## Known Limitations

1. **Single Webhook URL**: Users can only configure one webhook URL
2. **No Event Filtering**: All events are sent (no selective subscription)
3. **Fixed Retry Strategy**: Cannot customize retry attempts
4. **No Webhook History API**: No endpoint to retrieve delivery logs
5. **No Secret Rotation**: Cannot rotate webhook secret without reconfiguring

## Future Enhancements

1. **Multiple Webhook URLs**: Support multiple webhook endpoints per user
2. **Event Filtering**: Allow users to subscribe to specific events
3. **Webhook History API**: Add endpoint to retrieve delivery logs
4. **Secret Rotation**: Support webhook secret rotation
5. **Webhook Replay**: Allow manual replay of failed webhooks
6. **Custom Retry Strategy**: Allow users to configure retry behavior
7. **Webhook Templates**: Pre-configured webhook templates for popular services
8. **Webhook Analytics**: Dashboard showing delivery success rates

## Logging

Comprehensive logging for debugging:

```typescript
logger.info('Queuing webhook', { userId, eventType });
logger.info('Sending webhook', { webhookConfigId, eventType, attempt });
logger.info('Webhook delivered successfully', { webhookConfigId, statusCode });
logger.error('Webhook delivery failed', { webhookConfigId, error, attempt });
```

## Monitoring

Key metrics to track:
- Webhook delivery success rate
- Average delivery time
- Failed delivery count by error type
- Queue depth and processing lag
- Retry rate

## Troubleshooting

### Issue: Webhooks not being delivered
**Solution**: Check Redis connection, verify worker is running

### Issue: Signature verification fails
**Solution**: Ensure webhook secret matches, verify payload is not modified

### Issue: Queue not processing
**Solution**: Restart webhook worker, check Redis connection

### Issue: Webhooks timing out
**Solution**: Increase `WEBHOOK_TIMEOUT_MS`, check target endpoint performance

## Deployment Checklist

- [ ] Redis server is running and accessible
- [ ] Environment variables are set (REDIS_URL)
- [ ] BullMQ dependency is installed
- [ ] Database migration is applied (webhook tables)
- [ ] Webhook worker is deployed and running
- [ ] Monitoring is configured
- [ ] Production uses HTTPS webhook URLs only

## Worker Process

The webhook worker runs as a separate process:

```bash
# Start webhook worker
npm run worker:webhook
```

Add to `package.json`:
```json
{
  "scripts": {
    "worker:webhook": "ts-node src/workers/webhook.worker.ts"
  }
}
```

## Conclusion

The webhook system provides reliable, secure event notifications to user-configured endpoints. It uses BullMQ for reliable job processing, HMAC signatures for security, and exponential backoff for retry logic.

**Next Steps**:
1. Implement database schema updates
2. Create signature utilities
3. Implement webhook service and worker
4. Integrate with subscription and credit services
5. Test with real webhook endpoints
6. Deploy webhook worker to production
