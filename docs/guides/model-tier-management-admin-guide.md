# Model Tier Management - Administrator Guide

**Document Type**: User Guide
**Target Audience**: System Administrators
**Created**: 2025-11-08
**Last Updated**: 2025-11-08

## Table of Contents

1. [Introduction](#introduction)
2. [Understanding Tier-Based Access Control](#understanding-tier-based-access-control)
3. [Model Tier Configuration](#model-tier-configuration)
4. [Best Practices](#best-practices)
5. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is Tier-Based Access Control?

Tier-based access control restricts access to LLM models based on user subscription tiers. This allows you to:

- **Monetize premium models** - Reserve high-cost models for paying customers
- **Control infrastructure costs** - Limit expensive model usage to appropriate tiers
- **Create tiered service offerings** - Differentiate subscription plans by model access
- **Manage resource allocation** - Ensure fair distribution of computational resources

### Subscription Tiers

Rephlo supports three subscription tiers:

| Tier | Description | Typical Use Case |
|------|-------------|------------------|
| **Free** | Entry-level access | Individual users, hobbyists, evaluation |
| **Pro** | Professional access | Small teams, professionals, startups |
| **Enterprise** | Full access | Large organizations, high-volume usage |

---

## Understanding Tier-Based Access Control

### Tier Restriction Modes

Rephlo supports three restriction modes for fine-grained access control:

#### 1. Minimum Mode (Hierarchical) - **RECOMMENDED**

**How it works**: User tier must be greater than or equal to the required tier.

**Tier Hierarchy**: `Free < Pro < Enterprise`

**Use case**: Most common scenario - models get more expensive/capable at higher tiers.

**Example**:
```
Model: Claude 3.5 Sonnet
Required Tier: Pro
Restriction Mode: minimum

Access Results:
- Free user:       DENIED (needs Pro or higher)
- Pro user:        ALLOWED
- Enterprise user: ALLOWED
```

**When to use**:
- General purpose models with progressive pricing
- Models where higher tiers should include all lower-tier capabilities
- Standard tiered service offerings

---

#### 2. Exact Mode (Tier-Specific)

**How it works**: User tier must exactly match the required tier.

**Use case**: Reserve specific models for specific subscription tiers only.

**Example**:
```
Model: Specialized Pro-Only Model
Required Tier: Pro
Restriction Mode: exact

Access Results:
- Free user:       DENIED (Pro tier only)
- Pro user:        ALLOWED
- Enterprise user: DENIED (Pro tier only)
```

**When to use**:
- Promotional models exclusive to a specific tier
- Beta features for mid-tier subscribers
- Special incentives for specific subscription levels

---

#### 3. Whitelist Mode (Custom Access)

**How it works**: User tier must be in the allowed tiers list.

**Use case**: Complex access patterns that don't follow the standard hierarchy.

**Example**:
```
Model: Economy Model
Required Tier: Free (reference only)
Restriction Mode: whitelist
Allowed Tiers: [free, enterprise]

Access Results:
- Free user:       ALLOWED (in whitelist)
- Pro user:        DENIED (not in whitelist)
- Enterprise user: ALLOWED (in whitelist)
```

**When to use**:
- Free models that Enterprise users can use for testing
- Special access patterns for compliance reasons
- Migration scenarios where you want to grant access to non-adjacent tiers

---

## Model Tier Configuration

### Current Model Tier Assignments

As of 2025-11-08, the following models are configured:

| Model | Display Name | Required Tier | Mode | Allowed Tiers | Rationale |
|-------|--------------|---------------|------|---------------|-----------|
| `gpt-5` | GPT-5 | Enterprise | minimum | [enterprise] | Highest cost model (500/1500 credits) - premium tier only |
| `gemini-2.0-pro` | Gemini 2.0 Pro | Pro | minimum | [pro, enterprise] | Extended context (2M tokens) - professional use case |
| `claude-3.5-sonnet` | Claude 3.5 Sonnet | Pro | minimum | [pro, enterprise] | Optimized for coding - professional use case |

### Recommended Tier Assignment Strategy

Use this decision tree to assign tiers to new models:

```
1. What is the cost per 1M tokens?
   ├─ < 100 credits  → Free tier
   ├─ 100-400 credits → Pro tier
   └─ > 400 credits   → Enterprise tier

2. What are the model capabilities?
   ├─ Basic text completion → Free tier
   ├─ Advanced reasoning, vision, functions → Pro tier
   └─ Cutting-edge, highest capability → Enterprise tier

3. What is the expected usage pattern?
   ├─ High volume, general purpose → Free tier
   ├─ Professional tools, specialized → Pro tier
   └─ Enterprise-only features → Enterprise tier
```

### How to Update Model Tiers via Database

Until the admin UI is built, you can update model tiers directly via the database:

#### Using Prisma Studio (GUI Method)

```bash
cd backend
npx prisma studio
```

1. Navigate to the "Model" table
2. Find the model you want to update
3. Edit the following fields:
   - `required_tier`: Select from dropdown (free, pro, enterprise)
   - `tier_restriction_mode`: Enter "minimum", "exact", or "whitelist"
   - `allowed_tiers`: Edit array (e.g., `["pro", "enterprise"]`)
4. Click "Save" to apply changes

#### Using SQL (Direct Method)

**Update single model to Pro tier (minimum mode)**:

```sql
UPDATE models
SET
  required_tier = 'pro',
  tier_restriction_mode = 'minimum',
  allowed_tiers = ARRAY['pro', 'enterprise']::subscription_tier[]
WHERE id = 'claude-3.5-sonnet';
```

**Update model to exact Pro-only access**:

```sql
UPDATE models
SET
  required_tier = 'pro',
  tier_restriction_mode = 'exact',
  allowed_tiers = ARRAY['pro']::subscription_tier[]
WHERE id = 'special-pro-model';
```

**Create whitelist access (Free + Enterprise only)**:

```sql
UPDATE models
SET
  required_tier = 'free',
  tier_restriction_mode = 'whitelist',
  allowed_tiers = ARRAY['free', 'enterprise']::subscription_tier[]
WHERE id = 'economy-model';
```

**Bulk update all OpenAI models to Enterprise tier**:

```sql
UPDATE models
SET
  required_tier = 'enterprise',
  tier_restriction_mode = 'minimum',
  allowed_tiers = ARRAY['enterprise']::subscription_tier[]
WHERE provider = 'openai'
  AND id LIKE 'gpt-%';
```

### Verification After Changes

After updating tier settings, verify the changes:

```sql
-- Check specific model configuration
SELECT
  id,
  display_name,
  required_tier,
  tier_restriction_mode,
  allowed_tiers
FROM models
WHERE id = 'claude-3.5-sonnet';

-- List all models with their tier settings
SELECT
  id,
  display_name,
  provider,
  required_tier,
  tier_restriction_mode,
  is_available
FROM models
ORDER BY required_tier, display_name;
```

### Cache Invalidation

After making tier changes, the model cache will automatically expire within **5 minutes**.

For immediate effect, restart the backend service:

```bash
# Development environment
npm run dev

# Production environment (systemd example)
sudo systemctl restart rephlo-backend
```

---

## Best Practices

### 1. Start Conservative, Then Relax

**Recommendation**: When adding new models, start with higher tier requirements and reduce them based on usage patterns.

**Why**: It's easier to grant access than to revoke it. Users won't complain if you make a model more accessible.

**Example**:
```
Week 1: GPT-5 → Enterprise only
Week 4: Analyze usage, cost per user
Week 5: Lower to Pro if sustainable
```

### 2. Align with Cost Structure

**Recommendation**: Ensure tier pricing reflects model costs.

**Cost Analysis**:
```
Free Tier (2000 credits/month):
- Can afford ~4,000 tokens with 500-credit models (GPT-5)
- Can afford ~6,600 tokens with 300-credit models (Claude)

Pro Tier (50,000 credits/month):
- Can afford ~100,000 tokens with 500-credit models
- Can afford ~166,000 tokens with 300-credit models
```

**Rule**: If free tier can't afford meaningful usage (< 10 requests), move to Pro.

### 3. Test Changes in Staging First

**Recommendation**: Always test tier changes in a staging environment before production.

**Testing Checklist**:
```
□ Create test users with different tiers (free, pro, enterprise)
□ Generate JWT tokens for each test user
□ Test /v1/models endpoint - verify access_status correct
□ Test /v1/chat/completions - verify 403 for denied access
□ Test /v1/chat/completions - verify 200 for allowed access
□ Verify error messages are user-friendly
□ Check logs for tier validation events
```

### 4. Communicate Changes to Users

**Recommendation**: Notify users before changing tier requirements for existing models.

**Email Template**:
```
Subject: [Action Required] Model Access Update - Upgrade to Pro

Hi [User],

Starting [Date], access to [Model Name] will require a Pro subscription.

Why: [Reason - e.g., "Due to increased infrastructure costs..."]

What you can do:
1. Upgrade to Pro: [Upgrade Link]
2. Use alternative free models: [List]
3. Contact support: [Support Email]

Thank you,
Rephlo Team
```

### 5. Monitor Denial Metrics

**Recommendation**: Track tier access denials to identify monetization opportunities.

**Metrics to Track**:
```sql
-- Models most frequently denied to free users
SELECT
  uh.model_id,
  COUNT(*) as denial_count,
  COUNT(DISTINCT uh.user_id) as unique_users
FROM usage_history uh
JOIN users u ON uh.user_id = u.id
JOIN subscriptions s ON u.id = s.user_id
WHERE s.tier = 'free'
  AND uh.created_at >= NOW() - INTERVAL '30 days'
GROUP BY uh.model_id
ORDER BY denial_count DESC
LIMIT 10;
```

**Insight**: High denial counts indicate demand - potential upgrade conversions.

### 6. Document Tier Rationale

**Recommendation**: Maintain a changelog explaining why each tier assignment was made.

**Example**:
```markdown
# Model Tier Assignment Changelog

## GPT-5 (Enterprise Tier)
- Date: 2025-11-08
- Rationale: Highest cost model (500/1500 credits per 1M tokens)
- Cost analysis: Free tier can only afford 4 requests/month
- Decision: Enterprise only to prevent free tier abuse

## Claude 3.5 Sonnet (Pro Tier)
- Date: 2025-11-08
- Rationale: Optimized for professional coding use cases
- Target audience: Developers, technical teams
- Decision: Pro tier aligns with professional user segment
```

---

## Troubleshooting

### Issue 1: Users Report Unexpected Access Denial

**Symptoms**:
- User receives 403 error when accessing previously available model
- Error message: "Model access restricted: Requires Pro tier or higher"

**Diagnosis**:
```sql
-- Check model tier configuration
SELECT
  id,
  display_name,
  required_tier,
  tier_restriction_mode,
  allowed_tiers
FROM models
WHERE id = 'MODEL_ID';

-- Check user subscription
SELECT
  u.email,
  s.tier,
  s.status,
  s.current_period_end
FROM users u
JOIN subscriptions s ON u.id = s.user_id
WHERE u.email = 'user@example.com'
  AND s.status = 'active';
```

**Common Causes**:
1. **Subscription expired** - User's subscription period ended
2. **Tier downgrade** - User voluntarily downgraded subscription
3. **Model tier changed** - Admin updated model tier requirements
4. **Payment failure** - Subscription cancelled due to failed payment

**Resolution**:
```sql
-- Verify subscription status
SELECT tier, status, current_period_end
FROM subscriptions
WHERE user_id = 'USER_UUID'
  AND status = 'active';

-- If subscription is expired, user needs to renew
-- If model tier changed recently, check changelog
```

---

### Issue 2: Tier Changes Not Reflected Immediately

**Symptoms**:
- Updated model tier in database
- Users still see old tier requirements
- Access status doesn't match new configuration

**Cause**: Model cache hasn't expired yet (5-minute TTL)

**Resolution**:

**Option 1: Wait for cache to expire** (5 minutes)

**Option 2: Restart backend service** (immediate effect)
```bash
# Development
npm run dev

# Production
sudo systemctl restart rephlo-backend
```

**Option 3: Clear cache programmatically** (if implemented)
```bash
curl -X POST "https://api.rephlo.com/admin/cache/clear" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### Issue 3: Exact Mode Not Working as Expected

**Symptoms**:
- Set model to exact mode with required_tier = "pro"
- Enterprise users can still access the model

**Diagnosis**:
```sql
SELECT
  tier_restriction_mode,
  required_tier,
  allowed_tiers
FROM models
WHERE id = 'MODEL_ID';
```

**Common Mistake**: `allowed_tiers` not updated to match exact mode

**Incorrect Configuration**:
```sql
required_tier = 'pro'
tier_restriction_mode = 'exact'
allowed_tiers = ['pro', 'enterprise']  -- WRONG! Includes enterprise
```

**Correct Configuration**:
```sql
UPDATE models
SET
  required_tier = 'pro',
  tier_restriction_mode = 'exact',
  allowed_tiers = ARRAY['pro']::subscription_tier[]  -- Only pro
WHERE id = 'MODEL_ID';
```

---

### Issue 4: Whitelist Mode Confusion

**Symptoms**:
- Set whitelist mode but access still follows hierarchy
- Unexpected users can access model

**Cause**: `tier_restriction_mode` not set to "whitelist"

**Diagnosis**:
```sql
SELECT
  tier_restriction_mode,
  allowed_tiers
FROM models
WHERE id = 'MODEL_ID';

-- Expected output for whitelist mode:
-- tier_restriction_mode: "whitelist"
-- allowed_tiers: [specific tiers you want]
```

**Fix**:
```sql
UPDATE models
SET
  tier_restriction_mode = 'whitelist',  -- MUST be set
  allowed_tiers = ARRAY['free', 'enterprise']::subscription_tier[]
WHERE id = 'MODEL_ID';
```

---

### Issue 5: User Has Multiple Subscriptions

**Symptoms**:
- User has both free and pro subscriptions
- System picks wrong tier

**Diagnosis**:
```sql
-- Check all user subscriptions
SELECT
  tier,
  status,
  current_period_end,
  created_at
FROM subscriptions
WHERE user_id = 'USER_UUID'
ORDER BY current_period_end DESC;
```

**How Tier is Determined**:
The system uses the **highest active tier** with the **latest end date**.

**Query Used by System**:
```sql
SELECT tier
FROM subscriptions
WHERE user_id = 'USER_UUID'
  AND status = 'active'
  AND current_period_end > NOW()
ORDER BY
  CASE tier
    WHEN 'enterprise' THEN 2
    WHEN 'pro' THEN 1
    WHEN 'free' THEN 0
  END DESC,
  current_period_end DESC
LIMIT 1;
```

**Resolution**:
- System automatically picks highest tier
- No action needed unless business logic should differ

---

## Common Questions

### Q: Can I temporarily grant a free user access to Enterprise models?

**A**: Yes, two options:

**Option 1**: Temporarily upgrade user's subscription
```sql
UPDATE subscriptions
SET tier = 'enterprise',
    current_period_end = NOW() + INTERVAL '7 days'
WHERE user_id = 'USER_UUID';
```

**Option 2**: Use whitelist mode to add "free" to allowed tiers
```sql
UPDATE models
SET
  tier_restriction_mode = 'whitelist',
  allowed_tiers = ARRAY['free', 'enterprise']::subscription_tier[]
WHERE id = 'MODEL_ID';
```

**Recommendation**: Option 1 is better for individual users. Option 2 affects all users.

---

### Q: How do I roll back a tier change?

**A**: Update the model tier back to previous values.

**Step 1**: Check change history (if available)
```sql
-- If you have an audit log table
SELECT * FROM model_tier_audit_log
WHERE model_id = 'MODEL_ID'
ORDER BY changed_at DESC
LIMIT 5;
```

**Step 2**: Restore previous values
```sql
UPDATE models
SET
  required_tier = 'PREVIOUS_TIER',
  tier_restriction_mode = 'PREVIOUS_MODE',
  allowed_tiers = ARRAY['tier1', 'tier2']::subscription_tier[]
WHERE id = 'MODEL_ID';
```

---

### Q: What happens if a user's subscription expires mid-request?

**A**: The request completes successfully.

**How it works**:
- Tier is checked **at the start** of the request
- If tier is valid at start, request proceeds
- Changes during the request don't affect it
- Next request will use updated tier

**Code Reference**:
```typescript
// Tier is snapshotted at request start
const userTier = await getUserTier(userId);

// Request proceeds with this tier
// Even if subscription expires during request
```

---

## Appendix

### A. Tier Comparison Matrix

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Monthly Credits | 2,000 | 50,000 | 250,000 |
| Access to Free Models | Yes | Yes | Yes |
| Access to Pro Models | No | Yes | Yes |
| Access to Enterprise Models | No | No | Yes |
| Rate Limit | 10 req/min | 100 req/min | 1000 req/min |
| Support Level | Community | Email | Priority |

### B. SQL Query Reference

**Get all tier configurations**:
```sql
SELECT
  id,
  display_name,
  provider,
  required_tier,
  tier_restriction_mode,
  allowed_tiers,
  is_available
FROM models
ORDER BY
  CASE required_tier
    WHEN 'free' THEN 0
    WHEN 'pro' THEN 1
    WHEN 'enterprise' THEN 2
  END,
  display_name;
```

**Find models accessible to Pro users**:
```sql
SELECT id, display_name
FROM models
WHERE
  (tier_restriction_mode = 'minimum' AND required_tier IN ('free', 'pro'))
  OR (tier_restriction_mode = 'exact' AND required_tier = 'pro')
  OR (tier_restriction_mode = 'whitelist' AND 'pro' = ANY(allowed_tiers))
  AND is_available = true;
```

---

**Last Updated**: 2025-11-08
**Version**: 1.0
**Maintainer**: Backend Team
**Support**: admin@rephlo.com
