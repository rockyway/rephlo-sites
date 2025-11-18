# Tier Credit Management Feature

**Date**: 2025-11-17
**Status**: Planning → Implementation
**Priority**: High
**Related**: Plan 189 (Pricing Tier Restructure)

---

## Executive Summary

Implement an admin-facing **Tier Credit Management** system that allows administrators to dynamically update tier credit allocations without code changes. The system ensures safe credit transitions for existing users while immediately applying changes to new subscriptions.

### Key Features
- ✅ Admin UI for viewing and updating tier credit values
- ✅ Safe credit upgrade logic for existing users
- ✅ Immediate provisioning for new subscribers
- ✅ Audit trail for all tier modifications
- ✅ Validation to prevent accidental downgrades

---

## User Stories

### Story 1: Admin Updates Tier Credits
**As an** administrator,
**I want to** update tier credit allocations through a UI,
**So that** I can respond to pricing changes without deploying code.

**Acceptance Criteria:**
- ✅ Admin can view all tiers with current credit allocations
- ✅ Admin can edit credit values for any tier
- ✅ Changes are validated (minimum values, business rules)
- ✅ Confirmation dialog shows impact (how many users affected)
- ✅ Audit log records who made changes and when

### Story 2: New Subscriber Gets Updated Credits
**As a** new subscriber,
**I want to** receive the latest tier credit allocation,
**So that** I get the current value for my subscription.

**Acceptance Criteria:**
- ✅ New subscriptions use latest tier configuration
- ✅ Credit allocation happens immediately on subscription creation
- ✅ Correct credits show in user dashboard immediately

### Story 3: Existing User Credit Upgrade
**As an** existing subscriber,
**I want to** automatically receive credit increases when tier allocations improve,
**So that** I benefit from pricing improvements.

**Acceptance Criteria:**
- ✅ When tier credits increase, existing users get upgrade at next billing cycle
- ✅ When tier credits decrease, existing users keep current allocation
- ✅ User receives notification of credit increase
- ✅ Credit history shows upgrade source

---

## Architecture Design

### Database Schema Changes

#### New Table: `tier_config_history`
```prisma
model tier_config_history {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tier_config_id        String   @db.Uuid
  tier_name             String   // Reference to subscription tier enum

  // Historical values
  previous_credits      Int
  new_credits           Int
  previous_price_usd    Decimal  @db.Decimal(10, 2)
  new_price_usd         Decimal  @db.Decimal(10, 2)

  // Change metadata
  change_reason         String
  change_type           String   // 'credit_increase', 'credit_decrease', 'price_change'
  affected_users_count  Int      @default(0)

  // Audit fields
  changed_by            String   @db.Uuid
  changed_at            DateTime @default(now())
  applied_at            DateTime?

  @@index([tier_name, changed_at])
  @@map("tier_config_history")
}
```

#### Modify `subscription_tier_config`
```prisma
model subscription_tier_config {
  // Existing fields...
  monthly_credit_allocation Int

  // NEW: Version tracking
  config_version            Int      @default(1)
  last_modified_by          String?  @db.Uuid
  last_modified_at          DateTime @default(now())

  // NEW: Rollout control
  apply_to_existing_users   Boolean  @default(false)
  rollout_start_date        DateTime?
}
```

### Backend Services

#### 1. TierConfigService
**Location**: `backend/src/services/tier-config.service.ts`

```typescript
class TierConfigService {
  // View operations
  async getAllTierConfigs(): Promise<TierConfig[]>
  async getTierConfigByName(tierName: string): Promise<TierConfig>
  async getTierConfigHistory(tierName: string): Promise<TierConfigHistory[]>

  // Update operations
  async updateTierCredits(
    tierName: string,
    newCredits: number,
    reason: string,
    adminUserId: string
  ): Promise<TierConfig>

  async updateTierPrice(
    tierName: string,
    newPriceUsd: number,
    reason: string,
    adminUserId: string
  ): Promise<TierConfig>

  // Preview and validation
  async previewCreditUpdate(
    tierName: string,
    newCredits: number
  ): Promise<UpdateImpact>

  async validateTierUpdate(
    tierName: string,
    updates: Partial<TierConfig>
  ): Promise<ValidationResult>
}

interface UpdateImpact {
  tierName: string;
  currentCredits: number;
  newCredits: number;
  changeType: 'increase' | 'decrease' | 'no_change';
  affectedUsers: {
    total: number;
    willUpgrade: number;
    willRemainSame: number;
  };
  estimatedCostImpact: number; // USD difference
}
```

#### 2. CreditUpgradeService
**Location**: `backend/src/services/credit-upgrade.service.ts`

```typescript
class CreditUpgradeService {
  // Process credit upgrades for existing users
  async processTierCreditUpgrade(
    tierName: string,
    oldCredits: number,
    newCredits: number
  ): Promise<UpgradeResult>

  // Check if user is eligible for upgrade
  async isEligibleForUpgrade(
    userId: string,
    tierName: string,
    newCredits: number
  ): Promise<boolean>

  // Apply upgrade to specific user
  async applyUpgradeToUser(
    userId: string,
    additionalCredits: number,
    reason: string
  ): Promise<void>

  // Batch process upgrades (cron job)
  async processPendingUpgrades(): Promise<BatchUpgradeResult>
}

interface UpgradeResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}
```

### Type Transformation Layer

**Critical Architecture Component**: This project follows a strict naming convention pattern that requires transformation between database and API layers.

#### Naming Convention Standards

| Context | Convention | Example |
|---------|-----------|---------|
| Database (Prisma) | `snake_case` | `monthly_credit_allocation`, `last_modified_by` |
| API Responses (JSON) | `camelCase` | `monthlyCreditAllocation`, `lastModifiedBy` |
| TypeScript Interfaces | `camelCase` | `interface TierConfig { monthlyCreditAllocation: number }` |

#### Shared Types Package

**Location**: `shared-types/src/tier-config.types.ts`

All TypeScript interfaces are defined in the shared-types package to ensure consistency between backend and frontend:

```typescript
// ✅ CORRECT - API/Service types in camelCase
export interface TierConfig {
  id: string;
  tierName: SubscriptionTier;
  monthlyPriceUsd: number;
  annualPriceUsd: number;
  monthlyCreditAllocation: number;
  maxCreditRollover: number;
  features: Record<string, any>;
  isActive: boolean;
  configVersion: number;
  lastModifiedBy: string | null;
  lastModifiedAt: string; // ISO 8601
  applyToExistingUsers: boolean;
  rolloutStartDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TierConfigHistory {
  id: string;
  tierConfigId: string;
  tierName: string;
  previousCredits: number;
  newCredits: number;
  previousPriceUsd: number;
  newPriceUsd: number;
  changeReason: string;
  changeType: TierChangeType;
  affectedUsersCount: number;
  changedBy: string;
  changedAt: string;
  appliedAt: string | null;
}

export enum TierChangeType {
  CREDIT_INCREASE = 'credit_increase',
  CREDIT_DECREASE = 'credit_decrease',
  PRICE_CHANGE = 'price_change',
  FEATURE_UPDATE = 'feature_update',
  ROLLOVER_CHANGE = 'rollover_change',
}
```

#### Type Mapper Functions

**Location**: `backend/src/utils/typeMappers.ts`

All database-to-API transformations MUST use centralized mapper functions:

```typescript
/**
 * Map database subscription_tier_config to API TierConfig type
 * Transforms snake_case database fields to camelCase API fields
 */
export function mapTierConfigToApiType(
  dbConfig: Prisma.subscription_tier_configGetPayload<{}>
): TierConfig {
  return {
    id: dbConfig.id,
    tierName: dbConfig.tier_name as any,
    monthlyPriceUsd: decimalToNumber(dbConfig.monthly_price_usd),
    annualPriceUsd: decimalToNumber(dbConfig.annual_price_usd),
    monthlyCreditAllocation: dbConfig.monthly_credit_allocation,
    maxCreditRollover: dbConfig.max_credit_rollover,
    features: dbConfig.features as Record<string, any>,
    isActive: dbConfig.is_active,
    configVersion: dbConfig.config_version,
    lastModifiedBy: dbConfig.last_modified_by,
    lastModifiedAt: dbConfig.last_modified_at.toISOString(),
    applyToExistingUsers: dbConfig.apply_to_existing_users,
    rolloutStartDate: dateToIsoString(dbConfig.rollout_start_date),
    createdAt: dbConfig.created_at.toISOString(),
    updatedAt: dbConfig.updated_at.toISOString(),
  };
}

/**
 * Map database tier_config_history to API TierConfigHistory type
 */
export function mapTierConfigHistoryToApiType(
  dbHistory: Prisma.tier_config_historyGetPayload<{}>
): TierConfigHistory {
  return {
    id: dbHistory.id,
    tierConfigId: dbHistory.tier_config_id,
    tierName: dbHistory.tier_name,
    previousCredits: dbHistory.previous_credits,
    newCredits: dbHistory.new_credits,
    previousPriceUsd: decimalToNumber(dbHistory.previous_price_usd),
    newPriceUsd: decimalToNumber(dbHistory.new_price_usd),
    changeReason: dbHistory.change_reason,
    changeType: dbHistory.change_type as any,
    affectedUsersCount: dbHistory.affected_users_count,
    changedBy: dbHistory.changed_by,
    changedAt: dbHistory.changed_at.toISOString(),
    appliedAt: dateToIsoString(dbHistory.applied_at),
  };
}
```

#### Usage Pattern in Services

**✅ CORRECT Pattern:**
```typescript
class TierConfigService {
  async getTierConfigByName(tierName: string): Promise<TierConfig> {
    // 1. Query database (snake_case fields)
    const dbConfig = await this.prisma.subscription_tier_config.findUnique({
      where: { tier_name: tierName }
    });

    if (!dbConfig) {
      throw new Error(`Tier config not found: ${tierName}`);
    }

    // 2. Transform to API type (camelCase fields)
    return mapTierConfigToApiType(dbConfig);
  }

  async getAllTierConfigs(): Promise<TierConfig[]> {
    const dbConfigs = await this.prisma.subscription_tier_config.findMany();

    // Transform array of database results
    return dbConfigs.map(mapTierConfigToApiType);
  }
}
```

**❌ WRONG Pattern (Direct Prisma Return):**
```typescript
// DON'T DO THIS - Exposes snake_case to API
async getTierConfigByName(tierName: string) {
  return await this.prisma.subscription_tier_config.findUnique({
    where: { tier_name: tierName }
  });
  // Returns: { monthly_credit_allocation: 1500 } ❌
}
```

#### Key Transformation Helpers

Located in `backend/src/utils/typeMappers.ts`:

- **`decimalToNumber()`** - Converts Prisma Decimal to JavaScript number
- **`dateToIsoString()`** - Converts Date | null to string | null (ISO 8601)
- **`mapTierConfigToApiType()`** - Transforms subscription_tier_config
- **`mapTierConfigHistoryToApiType()`** - Transforms tier_config_history

#### References

For complete API development standards including response formats, error handling, and testing requirements:

- 📖 **[API Development Standards](docs/reference/156-api-standards.md)**
- 📖 **[DTO Pattern Guide](docs/reference/155-dto-pattern-guide.md)**
- 📖 **[camelCase Standardization Report](docs/progress/161-camelcase-standardization-completion-report.md)**

---

### API Endpoints

#### Admin Tier Management API
**Base**: `/api/admin/tier-config`

```typescript
// GET /api/admin/tier-config
// List all tier configurations with current allocations
router.get('/', authenticate(), requireScopes(['admin']), tierConfigController.listAll);

// GET /api/admin/tier-config/:tierName
// Get specific tier configuration with history
router.get('/:tierName', authenticate(), requireScopes(['admin']), tierConfigController.getByName);

// GET /api/admin/tier-config/:tierName/history
// Get tier modification history
router.get('/:tierName/history', authenticate(), requireScopes(['admin']), tierConfigController.getHistory);

// POST /api/admin/tier-config/:tierName/preview-update
// Preview impact of credit/price change (dry-run)
router.post('/:tierName/preview-update', authenticate(), requireScopes(['admin']), tierConfigController.previewUpdate);

// PATCH /api/admin/tier-config/:tierName/credits
// Update tier credit allocation
router.patch('/:tierName/credits', authenticate(), requireScopes(['admin']), tierConfigController.updateCredits);

// PATCH /api/admin/tier-config/:tierName/price
// Update tier pricing
router.patch('/:tierName/price', authenticate(), requireScopes(['admin']), tierConfigController.updatePrice);

// POST /api/admin/tier-config/:tierName/apply-upgrades
// Manually trigger credit upgrade rollout
router.post('/:tierName/apply-upgrades', authenticate(), requireScopes(['admin']), tierConfigController.applyUpgrades);
```

**Request/Response Examples:**

```typescript
// PATCH /api/admin/tier-config/pro/credits
// Request Body:
{
  "newCredits": 2000,
  "reason": "Promotion: Extra 500 credits for Q1 2025",
  "applyToExistingUsers": true,
  "scheduledRolloutDate": "2025-01-01T00:00:00Z" // Optional
}

// Response:
{
  "success": true,
  "data": {
    "tierName": "pro",
    "previousCredits": 1500,
    "newCredits": 2000,
    "configVersion": 2,
    "impact": {
      "affectedUsers": 450,
      "willUpgrade": 450,
      "estimatedCostImpact": 225.00  // $0.50 per user
    },
    "rolloutScheduled": true,
    "rolloutDate": "2025-01-01T00:00:00Z"
  }
}
```

---

## Business Logic Rules

### Credit Update Rules

#### Rule 1: New Subscriptions Always Use Latest Config
```typescript
// When user subscribes to a tier
async createSubscription(userId: string, tierName: string) {
  const latestConfig = await getTierConfig(tierName); // Always fetches latest

  const subscription = await prisma.subscription_monetization.create({
    data: {
      user_id: userId,
      tier: tierName,
      monthly_credit_allocation: latestConfig.monthly_credit_allocation, // Latest value
      config_version: latestConfig.config_version,
      // ... other fields
    }
  });

  // Allocate credits immediately
  await allocateCredits(userId, latestConfig.monthly_credit_allocation);
}
```

#### Rule 2: Existing Users - Upgrade Only Logic
```typescript
async processCreditUpgradeForTier(tierName: string, newCredits: number) {
  const subscriptions = await prisma.subscription_monetization.findMany({
    where: {
      tier: tierName,
      status: 'active',
      monthly_credit_allocation: { lt: newCredits } // Only users with LESS credits
    }
  });

  for (const sub of subscriptions) {
    const creditDifference = newCredits - sub.monthly_credit_allocation;

    // Update subscription config version
    await prisma.subscription_monetization.update({
      where: { id: sub.id },
      data: {
        monthly_credit_allocation: newCredits,
        config_version: { increment: 1 }
      }
    });

    // Grant additional credits immediately (pro-rated)
    await grantBonusCredits(sub.user_id, creditDifference, 'tier_upgrade');

    // Send notification
    await notifyUser(sub.user_id, 'credit_upgrade', { amount: creditDifference });
  }
}
```

#### Rule 3: Credit Decrease - No Action
```typescript
async handleCreditDecrease(tierName: string, newCredits: number) {
  // DO NOTHING for existing users
  // Only new subscriptions will get the reduced amount

  console.log(`Tier ${tierName} credits reduced to ${newCredits}`);
  console.log('Existing users retain their current allocation.');

  // Log in audit trail
  await logTierChange({
    tierName,
    changeType: 'credit_decrease',
    affectedUsers: 0, // Existing users unaffected
    note: 'Only applies to new subscriptions'
  });
}
```

### Timing and Rollout

#### Immediate Rollout (Default)
```typescript
async updateTierCreditsImmediate(tierName: string, newCredits: number) {
  // 1. Update tier config
  const updatedConfig = await updateTierConfig(tierName, {
    monthly_credit_allocation: newCredits
  });

  // 2. Process existing users immediately
  if (newCredits > updatedConfig.previous_credits) {
    await processCreditUpgradeForTier(tierName, newCredits);
  }

  // 3. New subscriptions automatically use new config
  return updatedConfig;
}
```

#### Scheduled Rollout (Optional)
```typescript
async scheduleTierCreditUpgrade(
  tierName: string,
  newCredits: number,
  rolloutDate: Date
) {
  // 1. Update tier config with scheduled date
  await updateTierConfig(tierName, {
    monthly_credit_allocation: newCredits,
    rollout_start_date: rolloutDate,
    apply_to_existing_users: false // Wait until rollout date
  });

  // 2. Schedule cron job to execute on rollout date
  await scheduleJob(`tier-upgrade-${tierName}`, rolloutDate, async () => {
    await processCreditUpgradeForTier(tierName, newCredits);
  });
}
```

---

## Frontend UI Design

### Admin Tier Management Page
**Route**: `/admin/tier-management`

#### UI Components

**1. Tier Configuration Table**
```tsx
interface TierRow {
  tierName: string;
  displayName: string;
  currentCredits: number;
  currentPrice: number;
  activeUsers: number;
  lastModified: Date;
  actions: Action[];
}

<TierManagementTable>
  <TierRow
    tierName="free"
    displayName="Free"
    currentCredits={200}
    currentPrice={0}
    activeUsers={1250}
    lastModified="2025-11-15"
    actions={['Edit', 'View History']}
  />
  <TierRow
    tierName="pro"
    displayName="Pro"
    currentCredits={1500}
    currentPrice={15}
    activeUsers={450}
    lastModified="2025-11-15"
    actions={['Edit', 'View History']}
  />
  {/* ... more tiers */}
</TierManagementTable>
```

**2. Edit Tier Credits Modal**
```tsx
<EditTierModal tierName="pro">
  <form onSubmit={handleUpdateCredits}>
    <FormField label="Current Credits" value="1,500" disabled />
    <FormField
      label="New Credits"
      type="number"
      min={currentCredits}
      value={newCredits}
      onChange={setNewCredits}
      hint="Must be equal or greater than current allocation"
    />

    <FormField
      label="Reason for Change"
      type="textarea"
      value={reason}
      required
      placeholder="e.g., Q1 2025 Promotion - 500 extra credits"
    />

    <Checkbox
      label="Apply to existing users immediately"
      checked={applyToExisting}
      onChange={setApplyToExisting}
    />

    {applyToExisting && (
      <DatePicker
        label="Scheduled Rollout Date (optional)"
        value={rolloutDate}
        onChange={setRolloutDate}
        minDate={new Date()}
      />
    )}

    {/* Impact Preview */}
    <ImpactSummary>
      <InfoRow label="Users Affected" value={impactData.affectedUsers} />
      <InfoRow label="Will Receive Upgrade" value={impactData.willUpgrade} />
      <InfoRow label="Estimated Cost Impact" value={`$${impactData.costImpact}`} />
      <InfoRow
        label="Credit Increase per User"
        value={`+${newCredits - currentCredits} credits`}
        highlight
      />
    </ImpactSummary>

    <ButtonGroup>
      <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button variant="primary" type="submit">
        {applyToExisting ? 'Update & Apply' : 'Update for New Users Only'}
      </Button>
    </ButtonGroup>
  </form>
</EditTierModal>
```

**3. Tier History Timeline**
```tsx
<TierHistoryTimeline tierName="pro">
  <HistoryEvent
    date="2025-11-17"
    type="credit_increase"
    actor="admin.test@rephlo.ai"
    change="1,500 → 2,000 credits"
    reason="Q1 2025 Promotion"
    affectedUsers={450}
  />
  <HistoryEvent
    date="2025-11-15"
    type="credit_increase"
    actor="admin.test@rephlo.ai"
    change="1,000 → 1,500 credits"
    reason="New pricing structure (Plan 189)"
    affectedUsers={420}
  />
  <HistoryEvent
    date="2025-10-01"
    type="price_change"
    actor="admin.test@rephlo.ai"
    change="$19 → $15"
    reason="Competitive pricing adjustment"
    affectedUsers={380}
  />
</TierHistoryTimeline>
```

---

## Implementation Plan

### Phase 1: Backend Foundation (Day 1-2)

**1.1 Database Migration**
```bash
# Create migration for tier_config_history and modify subscription_tier_config
npx prisma migrate dev --name add_tier_config_management
```

**Files to create:**
- `backend/prisma/migrations/XXX_add_tier_config_management.sql`

**1.2 Service Layer**
```bash
# Create service files
backend/src/services/tier-config.service.ts
backend/src/services/credit-upgrade.service.ts
backend/src/interfaces/services/tier-config.interface.ts
```

**1.3 Controller & Routes**
```bash
# Create API controller and routes
backend/src/controllers/admin/tier-config.controller.ts
backend/src/api/admin/tier-config.routes.ts
```

### Phase 2: Business Logic Implementation (Day 2-3)

**2.1 Tier Config Service Methods**
- ✅ `getAllTierConfigs()` - List all tier configs
- ✅ `getTierConfigByName()` - Get single tier config
- ✅ `updateTierCredits()` - Update credit allocation
- ✅ `previewCreditUpdate()` - Calculate impact before applying
- ✅ `validateTierUpdate()` - Validate business rules

**2.2 Credit Upgrade Service Methods**
- ✅ `processTierCreditUpgrade()` - Process existing user upgrades
- ✅ `isEligibleForUpgrade()` - Check user eligibility
- ✅ `applyUpgradeToUser()` - Apply upgrade to single user
- ✅ `processPendingUpgrades()` - Batch process scheduled upgrades

**2.3 Integration with Existing Services**
- Modify `SubscriptionManagementService.createSubscription()` to use latest tier config
- Modify `CreditManagementService.allocateSubscriptionCredits()` to respect config version

### Phase 3: Frontend UI (Day 4-5)

**3.1 Admin Components**
```bash
# Create React components
frontend/src/pages/admin/TierManagement.tsx
frontend/src/components/admin/TierConfigTable.tsx
frontend/src/components/admin/EditTierModal.tsx
frontend/src/components/admin/TierHistoryTimeline.tsx
```

**3.2 API Client Integration**
```typescript
// frontend/src/api/tierConfigApi.ts
export const tierConfigApi = {
  listAllTiers: () => get('/api/admin/tier-config'),
  getTierConfig: (tierName: string) => get(`/api/admin/tier-config/${tierName}`),
  updateCredits: (tierName: string, data: UpdateCreditsRequest) =>
    patch(`/api/admin/tier-config/${tierName}/credits`, data),
  previewUpdate: (tierName: string, data: PreviewRequest) =>
    post(`/api/admin/tier-config/${tierName}/preview-update`, data),
  getTierHistory: (tierName: string) =>
    get(`/api/admin/tier-config/${tierName}/history`),
};
```

**3.3 State Management**
```typescript
// frontend/src/store/tierConfigStore.ts
interface TierConfigState {
  tiers: TierConfig[];
  selectedTier: TierConfig | null;
  updateImpact: UpdateImpact | null;
  loading: boolean;
  error: string | null;
}

export const useTierConfigStore = create<TierConfigState>((set) => ({
  // ... Zustand store implementation
}));
```

### Phase 4: Testing & Validation (Day 5-6)

**4.1 Backend Tests**
```bash
# Unit tests
backend/tests/unit/services/tier-config.service.test.ts
backend/tests/unit/services/credit-upgrade.service.test.ts

# Integration tests
backend/tests/integration/admin/tier-config.test.ts
```

**Test Scenarios:**
- ✅ Admin can update tier credits
- ✅ Credit increase triggers upgrade for existing users
- ✅ Credit decrease does NOT affect existing users
- ✅ New subscriptions use latest config
- ✅ Validation prevents invalid values
- ✅ Audit trail captures all changes

**4.2 Frontend Tests**
```bash
# Component tests
frontend/tests/components/TierConfigTable.test.tsx
frontend/tests/components/EditTierModal.test.tsx
```

**4.3 E2E Tests**
```typescript
// Test full workflow
describe('Tier Credit Management E2E', () => {
  test('Admin updates Pro tier credits from 1500 to 2000', async () => {
    // 1. Login as admin
    // 2. Navigate to tier management
    // 3. Edit Pro tier
    // 4. Increase credits to 2000
    // 5. Verify impact preview shows 450 affected users
    // 6. Confirm update
    // 7. Verify all Pro users received 500 bonus credits
  });
});
```

### Phase 5: Documentation & Deployment (Day 6-7)

**5.1 API Documentation**
- Update `docs/reference/api-documentation.md` with new endpoints
- Create Swagger/OpenAPI spec for tier config endpoints

**5.2 User Guides**
- Create admin guide: `docs/guides/admin-tier-management.md`
- Update changelog: `docs/CHANGELOG.md`

**5.3 Deployment Checklist**
- ✅ Run database migration on staging
- ✅ Test with production-like data volume
- ✅ Monitor performance (bulk credit upgrades)
- ✅ Deploy backend services
- ✅ Deploy frontend UI
- ✅ Verify monitoring and alerts
- ✅ Announce feature to admin team

---

## Success Metrics

### Operational Metrics
- ✅ Tier config update response time < 2 seconds
- ✅ Bulk credit upgrade processing rate > 100 users/second
- ✅ Zero credit allocation errors
- ✅ 100% audit trail coverage

### Business Metrics
- ✅ Admin time to update pricing: < 5 minutes (vs. 2 hours with code deploy)
- ✅ Faster response to competitive pricing changes
- ✅ Improved customer satisfaction from credit upgrades
- ✅ Reduced engineering time spent on pricing adjustments

---

## Risk Mitigation

### Risk 1: Credit Allocation Errors
**Mitigation:**
- Atomic database transactions for credit updates
- Dry-run preview before applying changes
- Rollback capability with config versioning
- Monitoring and alerts for unusual credit spikes

### Risk 2: Performance Degradation (Bulk Upgrades)
**Mitigation:**
- Batch processing with rate limiting (100 users/batch)
- Background job queue for large upgrades
- Database indexing on `tier` and `monthly_credit_allocation`
- Scheduled rollout option to avoid peak hours

### Risk 3: Accidental Downgrades
**Mitigation:**
- Hardcoded business rule: only upgrades allowed for existing users
- Warning modal for credit decreases
- Confirmation step with admin password
- Separate permission level for credit decreases

### Risk 4: Audit Trail Gaps
**Mitigation:**
- Database triggers to log all tier config changes
- Immutable history table (no deletes allowed)
- Integration with centralized audit log (Plan 109)
- Quarterly audit reviews

---

## Future Enhancements (Post-MVP)

### v2 Features
- 🔮 **A/B Testing for Pricing** - Test different credit allocations per cohort
- 🔮 **Granular Rollout** - Roll out credit increases by user segment
- 🔮 **Credit Schedules** - Auto-adjust credits based on seasonal demand
- 🔮 **Predictive Analysis** - AI-powered recommendations for optimal pricing
- 🔮 **Multi-Region Pricing** - Different credit allocations per geographic region

### Integration Opportunities
- Integrate with Stripe for automatic subscription price updates
- Real-time dashboard with live credit usage vs. allocation
- Customer-facing notifications for credit increases
- Self-service tier upgrades from user dashboard

---

## Appendix A: Technical Specifications

### Database Indexes
```sql
-- Improve tier config query performance
CREATE INDEX idx_subscription_tier_config_tier_name ON subscription_tier_config(tier_name);
CREATE INDEX idx_tier_config_history_tier_changed ON tier_config_history(tier_name, changed_at DESC);

-- Improve bulk upgrade queries
CREATE INDEX idx_subscription_tier_credits ON subscription_monetization(tier, monthly_credit_allocation);
CREATE INDEX idx_subscription_active_tier ON subscription_monetization(tier, status) WHERE status = 'active';
```

### Validation Rules
```typescript
const tierCreditValidation = z.object({
  newCredits: z.number()
    .min(100, 'Minimum 100 credits required')
    .max(1000000, 'Maximum 1,000,000 credits allowed')
    .multipleOf(100, 'Credits must be in increments of 100'),

  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be less than 500 characters'),

  applyToExistingUsers: z.boolean(),

  scheduledRolloutDate: z.date()
    .min(new Date(), 'Rollout date must be in the future')
    .optional(),
});
```

### Performance Benchmarks
```typescript
// Target performance metrics
const performanceTargets = {
  tierConfigUpdate: '< 2 seconds',
  bulkCreditUpgrade: '> 100 users/second',
  previewCalculation: '< 1 second',
  historyQuery: '< 500ms',
  apiLatency: {
    p50: '< 200ms',
    p95: '< 1000ms',
    p99: '< 2000ms',
  },
};
```

---

## Appendix B: API Contract Examples

### Example 1: Preview Credit Update
```http
POST /api/admin/tier-config/pro/preview-update
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "newCredits": 2000,
  "applyToExistingUsers": true
}

---

HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "tierName": "pro",
    "currentCredits": 1500,
    "newCredits": 2000,
    "changeType": "increase",
    "affectedUsers": {
      "total": 450,
      "willUpgrade": 450,
      "willRemainSame": 0
    },
    "estimatedCostImpact": 225.00,
    "breakdown": {
      "costPerUser": 0.50,
      "totalCreditsAdded": 225000,
      "dollarValueAdded": 2250.00
    }
  }
}
```

### Example 2: Apply Credit Update
```http
PATCH /api/admin/tier-config/pro/credits
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "newCredits": 2000,
  "reason": "Q1 2025 Promotion - Extra 500 credits for Pro users",
  "applyToExistingUsers": true
}

---

HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Tier credits updated successfully. 450 users upgraded.",
  "data": {
    "tierName": "pro",
    "previousCredits": 1500,
    "newCredits": 2000,
    "configVersion": 3,
    "appliedAt": "2025-11-17T14:30:00Z",
    "upgradeResults": {
      "totalProcessed": 450,
      "successful": 450,
      "failed": 0
    }
  }
}
```

---

**Estimated Total Implementation Time**: 6-7 days
**Team**: 1 Backend Dev, 1 Frontend Dev
**Deployment Risk**: Low (feature-flagged, admin-only access)
**Rollback Complexity**: Low (config versioning allows rollback)
