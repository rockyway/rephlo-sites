# Model Tier Access Control - Architecture & Implementation Plan

**Document ID**: 108
**Created**: 2025-11-08
**Status**: Planning
**Priority**: P0 (High)
**Target Version**: v1.1.0

## Executive Summary

This document outlines the architecture and implementation plan for adding tier-based access control to LLM models in the Rephlo API backend. The feature enables administrators to control which subscription tiers (FREE, PRO, ENTERPRISE) can access specific models, while ensuring the `/v1/models` API always returns the full model catalog with tier eligibility metadata.

## Requirements Overview

### P0 - Backend Model Access Control (Critical)
- Add tier-based access metadata to Model entities
- Modify `/v1/models` endpoint to include tier eligibility in responses
- Implement tier validation in inference endpoints (chat/text completions)
- Ensure backward compatibility with existing subscriptions
- Return standardized 403 errors for tier-restricted model access

### P1 - Admin Management Interface
- Build admin UI for model tier configuration
- Support search/filter by model, tier, provider
- Provide audit tracking for tier changes
- Enable bulk tier assignment operations

### P2 - Multi-Tier Enforcement & Consistency
- Centralized tier-to-model mapping in database
- Real-time cache invalidation on tier changes
- Consistent enforcement across all API endpoints
- Graceful handling of expired subscriptions

## Current System Architecture

### Existing Components

**Database Schema (Prisma)**:
```typescript
model Model {
  id                         String            @id @db.VarChar(100)
  name                       String            @db.VarChar(255)
  displayName                String            @map("display_name")
  provider                   String            @db.VarChar(100)
  capabilities               ModelCapability[]
  contextLength              Int
  maxOutputTokens            Int?
  creditsPer1kTokens         Int
  isAvailable                Boolean           @default(true)
  isDeprecated               Boolean           @default(false)
  // Relations
  usageHistory               UsageHistory[]
  userPreferences            UserPreference[]
}

enum SubscriptionTier {
  free
  pro
  enterprise
}
```

**Service Layer**:
- `ModelService` (backend/src/services/model.service.ts) - Model CRUD, caching, availability checks
- `ModelsController` (backend/src/controllers/models.controller.ts) - HTTP endpoints for models

**API Endpoints**:
- `GET /v1/models` - List models with filters (line 65-100)
- `GET /v1/models/:modelId` - Get model details (line 109-131)
- `POST /v1/chat/completions` - Chat inference (line 268-364)
- `POST /v1/completions` - Text completion (line 153-246)

## Proposed Architecture

### 1. Database Schema Changes

**Add to Model table**:
```prisma
model Model {
  // ... existing fields ...

  // NEW FIELDS for Tier Access Control
  requiredTier         SubscriptionTier  @default(free) @map("required_tier")
    // Minimum tier required to access this model
  tierRestrictionMode  String            @default("minimum") @map("tier_restriction_mode") @db.VarChar(20)
    // "minimum" = tier >= requiredTier, "exact" = tier == requiredTier, "whitelist" = use allowedTiers
  allowedTiers         SubscriptionTier[] @default([free, pro, enterprise]) @map("allowed_tiers")
    // Explicit whitelist of allowed tiers (used when mode = "whitelist")

  @@index([requiredTier])
  @@index([isAvailable, requiredTier])
}
```

**Migration Strategy**:
- Default all existing models to `requiredTier = free` (backward compatible)
- Set `allowedTiers = [free, pro, enterprise]` by default (all tiers allowed)
- Use `tierRestrictionMode = "minimum"` as default (most common use case)

### 2. API Response Schema Changes

**Enhanced ModelListResponse**:
```typescript
interface ModelListResponse {
  models: Array<{
    id: string;
    name: string;
    provider: string;
    description: string;
    capabilities: ModelCapability[];
    context_length: number;
    max_output_tokens: number;
    credits_per_1k_tokens: number;
    is_available: boolean;
    version: string;

    // NEW FIELDS
    required_tier: "free" | "pro" | "enterprise";
    allowed_tiers: Array<"free" | "pro" | "enterprise">;
    tier_restriction_mode: "minimum" | "exact" | "whitelist";
    access_status: "allowed" | "restricted" | "upgrade_required"; // Based on user's tier
  }>;
  total: number;
  user_tier?: "free" | "pro" | "enterprise"; // Current user's tier
}
```

**Enhanced ModelDetailsResponse**:
```typescript
interface ModelDetailsResponse {
  // ... existing fields ...

  // NEW FIELDS
  required_tier: "free" | "pro" | "enterprise";
  allowed_tiers: Array<"free" | "pro" | "enterprise">;
  tier_restriction_mode: "minimum" | "exact" | "whitelist";
  access_status: "allowed" | "restricted" | "upgrade_required";
  upgrade_info?: {
    required_tier: string;
    upgrade_url: string;
  };
}
```

### 3. Service Layer Enhancements

**ModelService Extensions**:

```typescript
class ModelService {
  // New method: Check if user's tier can access model
  async canUserAccessModel(
    modelId: string,
    userTier: SubscriptionTier
  ): Promise<{
    allowed: boolean;
    reason?: string;
    requiredTier?: SubscriptionTier;
  }> {
    // Implementation logic
  }

  // Enhanced: Include tier access status in list
  async listModelsWithTierAccess(
    filters: ModelFilters,
    userTier: SubscriptionTier
  ): Promise<ModelListResponse> {
    // Implementation logic
  }

  // Enhanced: Include tier access status in details
  async getModelDetailsWithTierAccess(
    modelId: string,
    userTier: SubscriptionTier
  ): Promise<ModelDetailsResponse> {
    // Implementation logic
  }
}
```

**Tier Access Logic**:

```typescript
function checkTierAccess(
  model: Model,
  userTier: SubscriptionTier
): { allowed: boolean; reason?: string } {
  const tierHierarchy = { free: 0, pro: 1, enterprise: 2 };

  switch (model.tierRestrictionMode) {
    case "minimum":
      // User tier must be >= required tier
      const allowed = tierHierarchy[userTier] >= tierHierarchy[model.requiredTier];
      return {
        allowed,
        reason: allowed ? undefined : `Requires ${model.requiredTier} tier or higher`,
      };

    case "exact":
      // User tier must exactly match required tier
      const exactMatch = userTier === model.requiredTier;
      return {
        allowed: exactMatch,
        reason: exactMatch ? undefined : `Only available for ${model.requiredTier} tier`,
      };

    case "whitelist":
      // User tier must be in allowed tiers list
      const inWhitelist = model.allowedTiers.includes(userTier);
      return {
        allowed: inWhitelist,
        reason: inWhitelist
          ? undefined
          : `Available for: ${model.allowedTiers.join(", ")}`,
      };

    default:
      return { allowed: false, reason: "Invalid tier restriction mode" };
  }
}
```

### 4. Controller Layer Changes

**ModelsController Enhancements**:

```typescript
class ModelsController {
  // Enhanced: List models with user tier context
  async listModels(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const userTier = await this.getUserTier(userId); // Get from subscription

    const result = await this.modelService.listModelsWithTierAccess(
      filters,
      userTier
    );

    res.status(200).json(result);
  }

  // Enhanced: Validate tier before inference
  async chatCompletion(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const userTier = await this.getUserTier(userId);

    const modelInfo = await this.modelService.getModelForInference(request.model);

    // NEW: Tier access validation
    const accessCheck = await this.modelService.canUserAccessModel(
      request.model,
      userTier
    );

    if (!accessCheck.allowed) {
      throw createApiError(
        `Model access restricted: ${accessCheck.reason}. Please upgrade to ${accessCheck.requiredTier} tier.`,
        403,
        "model_access_restricted",
        {
          model_id: request.model,
          user_tier: userTier,
          required_tier: accessCheck.requiredTier,
          upgrade_url: `/subscriptions/upgrade`,
        }
      );
    }

    // Continue with existing completion logic...
  }
}
```

### 5. Error Response Format

**403 Model Access Restricted**:
```json
{
  "status": "error",
  "code": "model_access_restricted",
  "message": "Model access restricted: Requires pro tier or higher. Please upgrade to pro tier.",
  "details": {
    "model_id": "gpt-4",
    "user_tier": "free",
    "required_tier": "pro",
    "upgrade_url": "/subscriptions/upgrade"
  },
  "timestamp": "2025-11-08T12:00:00Z"
}
```

## Implementation Phases

### Phase 1: Database Schema & Migration (P0)
**Estimated Time**: 1 day
**Deliverables**:
- [ ] Create Prisma migration adding tier fields to Model table
- [ ] Update seed.ts with tier assignments for existing models
- [ ] Run migration on development database
- [ ] Verify backward compatibility with existing data

**Tasks**:
1. Add new fields to schema.prisma
2. Create migration: `npx prisma migrate dev --name add-model-tier-access`
3. Update seed script with default tier assignments
4. Test migration rollback safety

### Phase 2: Service Layer Implementation (P0)
**Estimated Time**: 2 days
**Deliverables**:
- [ ] Implement tier access validation logic
- [ ] Enhance ModelService with tier-aware methods
- [ ] Add tier retrieval helper in AuthMiddleware
- [ ] Update model cache to include tier metadata
- [ ] Write unit tests for tier access logic

**Tasks**:
1. Implement `checkTierAccess()` function with all three modes
2. Add `canUserAccessModel()` to ModelService
3. Update `listModels()` to include tier access status
4. Update `getModelDetails()` to include tier metadata
5. Create `getUserTier()` helper in auth middleware
6. Clear cache on tier changes

### Phase 3: Controller & API Updates (P0)
**Estimated Time**: 2 days
**Deliverables**:
- [ ] Update ModelsController.listModels with tier context
- [ ] Add tier validation to chatCompletion endpoint
- [ ] Add tier validation to textCompletion endpoint
- [ ] Update API response types
- [ ] Create standardized 403 error responses
- [ ] Write integration tests

**Tasks**:
1. Modify listModels controller method
2. Add tier checks to both completion endpoints
3. Update response type definitions
4. Add error handling for tier restrictions
5. Test with different tier users

### Phase 4: Admin UI Implementation (P1)
**Estimated Time**: 3 days
**Deliverables**:
- [ ] Create admin model management page
- [ ] Implement tier assignment UI (dropdowns/checkboxes)
- [ ] Add search/filter functionality
- [ ] Implement bulk tier assignment
- [ ] Add audit logging for tier changes
- [ ] Create admin API endpoints

**Tasks**:
1. Design admin UI mockups
2. Create `/admin/models` page component
3. Build tier assignment form controls
4. Implement search/filter logic
5. Add bulk operations support
6. Create audit log table and service
7. Protect admin routes with role-based access

### Phase 5: Testing & Documentation (P0)
**Estimated Time**: 2 days
**Deliverables**:
- [ ] Comprehensive unit tests (>90% coverage)
- [ ] Integration tests for all tier scenarios
- [ ] End-to-end tests with different user tiers
- [ ] API documentation updates
- [ ] Admin user guide
- [ ] Migration guide for existing deployments

**Tasks**:
1. Write unit tests for tier logic
2. Create integration tests for API endpoints
3. Test edge cases (expired subs, no tier, etc.)
4. Update OpenAPI/Swagger docs
5. Write admin documentation
6. Create deployment migration checklist

## Edge Cases & Handling

### 1. User with No Subscription
**Scenario**: User account exists but has no active subscription
**Handling**: Default to FREE tier access level
**Implementation**:
```typescript
async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: 'active' },
    orderBy: { currentPeriodEnd: 'desc' },
  });

  // Default to free tier if no active subscription
  return subscription?.tier || SubscriptionTier.free;
}
```

### 2. Expired Subscription
**Scenario**: User's subscription expired mid-request
**Handling**: Gracefully downgrade to FREE tier
**Implementation**:
- Check subscription status on every API request
- Cache tier for short duration (30 seconds)
- Log tier downgrades for audit

### 3. Model with No Tier Set
**Scenario**: Admin forgets to set tier for new model
**Handling**: Default to most restrictive (ENTERPRISE) for safety
**Alternative**: Default to FREE if model.isAvailable === false
**Implementation**:
```typescript
// In migration default value
requiredTier: SubscriptionTier.free  // Start permissive

// In admin UI validation
if (!model.requiredTier) {
  model.requiredTier = SubscriptionTier.enterprise; // Be restrictive
  logger.warn('Model missing tier, defaulting to enterprise');
}
```

### 4. Concurrent Tier Changes
**Scenario**: Admin changes tier while user is making inference request
**Handling**: Use transaction isolation and cache invalidation
**Implementation**:
- Invalidate model cache on tier updates
- Use database read consistency
- Accept eventual consistency (max 5 min cache TTL)

### 5. Upgrade During Active Request
**Scenario**: User upgrades subscription while streaming inference
**Handling**: Allow request to complete, apply new tier to next request
**Implementation**:
- Snapshot tier at request start
- Don't re-check mid-stream
- Apply new tier on next API call

## Security Considerations

### 1. Authorization
- Admin tier management requires `admin` role
- Audit log all tier changes with user ID and timestamp
- Prevent privilege escalation via tier manipulation

### 2. Rate Limiting
- Tier checks should not bypass rate limiting
- Consider different rate limits per tier
- Prevent tier check abuse (cache results)

### 3. Data Privacy
- Don't expose other users' tier information
- Log tier denials without sensitive user data
- GDPR compliance for audit logs

## Performance Optimization

### 1. Caching Strategy
```typescript
class TierAccessCache {
  private cache = new Map<string, { tier: SubscriptionTier; expires: number }>();
  private TTL = 30 * 1000; // 30 seconds

  async getUserTier(userId: string): Promise<SubscriptionTier> {
    const cached = this.cache.get(userId);
    if (cached && cached.expires > Date.now()) {
      return cached.tier;
    }

    const tier = await this.fetchUserTier(userId);
    this.cache.set(userId, { tier, expires: Date.now() + this.TTL });
    return tier;
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
  }
}
```

### 2. Database Indexing
```sql
-- Index for efficient tier lookups
CREATE INDEX idx_models_available_tier ON models(is_available, required_tier);
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status, current_period_end);
```

### 3. Query Optimization
- Join user + subscription + model in single query
- Pre-load tier data in auth middleware
- Avoid N+1 queries in model listing

## Monitoring & Observability

### 1. Metrics to Track
- Tier restriction denials per model per tier
- Average tier check latency
- Cache hit/miss rates
- Subscription tier distribution
- Model usage by tier

### 2. Logging
```typescript
logger.info('Model access denied', {
  userId,
  modelId,
  userTier,
  requiredTier,
  restrictionMode,
});

logger.info('Tier check completed', {
  userId,
  modelId,
  allowed: true,
  checkDurationMs: 5,
});
```

### 3. Alerting
- Alert on high tier denial rates (possible config error)
- Alert on tier check failures (DB issues)
- Alert on cache invalidation storms

## Rollback Plan

### If Issues Arise
1. **Database Rollback**: Revert migration, restore from backup
2. **Code Rollback**: Deploy previous version, feature flag disable
3. **Data Fix**: Run script to reset all tiers to FREE
4. **Emergency Bypass**: Add feature flag to skip tier checks

### Feature Flag Implementation
```typescript
const TIER_ENFORCEMENT_ENABLED = process.env.ENABLE_TIER_ENFORCEMENT === 'true';

if (TIER_ENFORCEMENT_ENABLED) {
  // Check tier access
} else {
  // Skip tier check, allow all
}
```

## Success Metrics

### P0 Criteria
- ✅ `/v1/models` returns all models with tier metadata
- ✅ Inference endpoints enforce tier restrictions
- ✅ 403 errors include upgrade information
- ✅ No performance degradation (< 10ms overhead)
- ✅ 100% backward compatibility

### P1 Criteria
- ✅ Admin can assign tiers via UI
- ✅ Tier changes reflected within 5 minutes
- ✅ Audit log captures all changes
- ✅ Search/filter works correctly

### P2 Criteria
- ✅ Expired subscriptions handled gracefully
- ✅ Cache invalidation works correctly
- ✅ Multi-tier restrictions enforced
- ✅ No data inconsistencies

## Dependencies

### External Libraries
- None (use existing Prisma, TypeScript, Express)

### Internal Services
- Auth middleware (tier retrieval)
- Subscription service (tier status)
- Model service (existing)

### Database
- PostgreSQL with Prisma ORM
- Migration tooling

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Schema | 1 day | Day 1 | Day 1 |
| Phase 2: Service | 2 days | Day 2 | Day 3 |
| Phase 3: API | 2 days | Day 4 | Day 5 |
| Phase 4: Admin UI | 3 days | Day 6 | Day 8 |
| Phase 5: Testing | 2 days | Day 9 | Day 10 |
| **Total** | **10 days** | | |

## References

- [Prisma Schema](../../backend/prisma/schema.prisma)
- [Model Service](../../backend/src/services/model.service.ts)
- [Models Controller](../../backend/src/controllers/models.controller.ts)
- [Dedicated API Spec](./073-dedicated-api-backend-specification.md)
- [Subscription Types](../../backend/src/types/subscription.types.ts)

## Approval & Sign-off

- [ ] Architecture approved by lead engineer
- [ ] Database schema reviewed by DBA
- [ ] Security review completed
- [ ] Performance impact assessed
- [ ] Ready for implementation

---

**Next Steps**: Delegate to specialized agents for implementation after approval.
