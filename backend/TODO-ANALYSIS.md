# TODO Analysis - Backend Implementation

**Total TODOs Found**: 20

## Critical (Must Implement for Production) - 13 items

### 1. Credit Balance Checking (2 items)
- `controllers/models.controller.ts:194` - Check credits before text completion
- `controllers/models.controller.ts:316` - Check credits before chat completion
**Action**: Integrate with credit.middleware.ts (already implemented)

### 2. Usage Recording (4 items)
- `services/llm.service.ts:129` - Record usage after OpenAI completion
- `services/llm.service.ts:202` - Record usage after Anthropic completion
- `services/llm.service.ts:278` - Record usage after Google completion
- `services/llm.service.ts:351` - Record usage after streaming completion
**Action**: Call usageService.recordUsage() after each inference

### 3. Credit Allocation (3 items)
- `services/subscription.service.ts:186` - Allocate credits on subscription creation
- `services/subscription.service.ts:277` - Adjust credits on plan change
- `services/stripe.service.ts:470` - Allocate credits on invoice payment
**Action**: Call creditService.allocateCredits()

### 4. Stripe Webhook Database Sync (4 items)
- `services/stripe.service.ts:432` - Sync on subscription.created
- `services/stripe.service.ts:445` - Sync on subscription.updated
- `services/stripe.service.ts:457` - Sync on subscription.deleted
- `services/stripe.service.ts:483` - Handle payment failure
**Action**: Call subscriptionService methods to update database

## Medium Priority (Should Implement) - 4 items

### 5. Infrastructure (3 items)
- `routes/index.ts:110` - Database connectivity health check
- `routes/index.ts:111` - Redis connectivity health check
- `server.ts:44` - Initialize Redis connection
**Action**: Implement health checks and Redis initialization

### 6. Admin Security (1 item)
- `api/admin.ts:45` - Add authentication check
**Action**: Add auth middleware to admin routes

## Low Priority (Can Defer) - 3 items

### 7. Rate Limiting (2 items)
- `middleware/ratelimit.middleware.ts:229` - Remove bypass secret in production (NOTE)
- `middleware/ratelimit.middleware.ts:412` - Fetch actual usage from Redis (FUTURE)
**Action**: Document for production deployment

### 8. File Storage (1 item)
- `api/diagnostics.ts:93` - Upload to S3 (STRETCH GOAL)
**Action**: Defer to future phase

## Implementation Plan

1. **Phase 1**: Implement credit integration (items 1-3) - CRITICAL
2. **Phase 2**: Implement Stripe sync (item 4) - CRITICAL
3. **Phase 3**: Implement infrastructure (item 5) - MEDIUM
4. **Phase 4**: Implement admin security (item 6) - MEDIUM
5. **Phase 5**: Document deferred items (items 7-8) - LOW

**Total to Implement**: 17 items
**Can Defer**: 3 items
