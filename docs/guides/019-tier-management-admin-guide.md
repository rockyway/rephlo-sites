# Tier Management Admin User Guide (Plan 190)

**Audience:** Platform Administrators
**Feature:** Tier Configuration Management
**Version:** 2.1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Accessing Tier Management](#accessing-tier-management)
3. [Understanding the Tier Configuration Table](#understanding-the-tier-configuration-table)
4. [Editing Tier Credits](#editing-tier-credits)
5. [Updating Tier Pricing](#updating-tier-pricing)
6. [Understanding Impact Preview](#understanding-impact-preview)
7. [Immediate vs Scheduled Rollouts](#immediate-vs-scheduled-rollouts)
8. [Viewing Tier History](#viewing-tier-history)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)

---

## Overview

The Tier Management interface allows platform administrators to configure credit allocations and pricing for all subscription tiers (Free, Pro, Enterprise). This powerful tool ensures you can:

- **Adjust credit allocations** based on market conditions and competitive positioning
- **Update pricing** to reflect value propositions without affecting existing subscribers
- **Preview impact** before applying changes to avoid surprises
- **Schedule rollouts** for coordinated marketing campaigns
- **Maintain audit trail** for compliance and historical analysis
- **Enforce upgrade-only policy** to ensure users never lose credits

### Key Principles

- **Upgrade-Only Policy**: Users can only gain credits, never lose them
- **Grandfathering**: Existing subscribers maintain their original pricing
- **Audit Trail**: All changes are permanently recorded with reason and timestamp
- **Configuration Versioning**: Each tier maintains version history for rollback capability
- **Preview-First Workflow**: Always preview impact before applying changes

---

## Accessing Tier Management

**Navigation Path:**
1. Log in to Rephlo Admin Dashboard (`https://app.rephlo.com/admin`)
2. In the left sidebar, click **Subscriptions** to expand the group
3. Click **Tier Management**

**URL:** `https://app.rephlo.com/admin/tier-management`

**Required Permissions:** Admin role with `admin` scope

**Screenshot Reference:**
```
Sidebar > Subscriptions
  ├── Subscription Management
  ├── Billing Dashboard
  ├── Credit Management
  └── Tier Management ← Click here
```

---

## Understanding the Tier Configuration Table

The main tier management page displays all subscription tiers in a table format.

### Table Columns

| Column           | Description                                              |
|------------------|----------------------------------------------------------|
| **Tier**         | Tier name with color-coded badge (Free/Pro/Enterprise)   |
| **Monthly Credits** | Current monthly credit allocation for the tier         |
| **Monthly Price** | Current monthly subscription price in USD               |
| **Annual Price** | Current annual subscription price in USD                 |
| **Version**      | Configuration version number (increments with changes)   |
| **Last Modified** | Timestamp of last configuration change                  |
| **Status**       | Active (✓) or Inactive indicator                         |
| **Actions**      | Edit (✏️) and History (🕐) buttons                       |

### Tier Color Coding

- **Free**: Gray badge
- **Pro**: Blue badge (#2563EB)
- **Enterprise**: Purple badge (#7C3AED)

### Status Indicators

- **Green checkmark (✓)**: Tier is active and accepting new subscribers
- **"Inactive" chip**: Tier is disabled (no new subscribers allowed)

---

## Editing Tier Credits

### Step-by-Step Guide

#### Step 1: Open Edit Modal

1. Locate the tier you want to edit in the table
2. Click the **Edit (✏️)** button in the Actions column
3. The "Edit Tier" modal opens with two tabs: **Credit Allocation** and **Pricing**
4. Ensure the **Credit Allocation** tab is selected (default)

#### Step 2: Enter New Credit Amount

1. In the **New Monthly Credits** field, enter the desired credit allocation
   - **Minimum**: 100 credits
   - **Maximum**: 1,000,000 credits
   - **Increment**: Must be in multiples of 100 (e.g., 1000, 1500, 2000)

2. **Validation Messages:**
   - ✅ "Must be in increments of 100 (min: 100, max: 1,000,000)"
   - ❌ "Credits must be in increments of 100"
   - ❌ "Minimum 100 credits required"
   - ❌ "Maximum 1,000,000 credits allowed"

#### Step 3: Provide Change Justification

1. In the **Reason for Change** field, enter a detailed explanation
   - **Minimum**: 10 characters
   - **Maximum**: 500 characters
   - **Example**: "Increased credits for competitive positioning against market rivals based on Q1 2025 market analysis"

2. **Why This Matters:**
   - Creates permanent audit trail for compliance
   - Helps future admins understand decision context
   - Required for regulatory documentation

#### Step 4: Configure Rollout Options

1. **Apply to Existing Users** checkbox:
   - ☑️ **Checked**: Upgrade existing users immediately (or at scheduled time)
   - ☐ **Unchecked**: Only new subscribers get new credit allocation

2. **Scheduled Rollout Date** (optional, only visible if "Apply to existing users" is checked):
   - Leave empty for **immediate rollout**
   - Select a future date/time for **scheduled rollout**
   - Format: `YYYY-MM-DD HH:MM` (24-hour format)

#### Step 5: Preview Impact (Recommended)

1. Click the **Preview Impact** button
2. Review the **Impact Preview** panel that appears:
   - **Current Credits**: Existing allocation
   - **New Credits**: Proposed allocation
   - **Change Type**: Increase (↗️) or Decrease (↘️)
   - **Total Users**: Number of active users in this tier
   - **Will Upgrade**: Users whose credits will increase
   - **Unchanged**: Users whose credits won't change
   - **Estimated Cost Impact**: Approximate cost increase in USD

3. **Example Preview:**
   ```
   Impact Preview
   ─────────────────────────────────────
   Current Credits: 50,000
   New Credits: 75,000 ↗️

   Total Users: 1,250
   Will Upgrade: 1,250
   Unchanged: 0

   ℹ️ Estimated Cost Impact: $31,250.00
   ```

4. **Decision Point:**
   - If impact looks correct, proceed to Step 6
   - If numbers seem incorrect, review your inputs and re-preview

#### Step 6: Save Changes

1. Click the **Save Changes** button
2. System validates inputs and processes the request
3. **Success Indicators:**
   - Green snackbar notification: "Tier configuration updated successfully"
   - Table automatically refreshes with new values
   - Config version increments

4. **Error Handling:**
   - Red snackbar notification with error details
   - Form remains open for corrections
   - Common errors:
     - "Reason must be at least 10 characters"
     - "Credits must be in increments of 100"
     - "Scheduled date must be in the future"

### Credit Increase Example

**Scenario:** Increase Pro tier from 50,000 to 75,000 credits immediately for all users.

**Steps:**
1. Click Edit on Pro tier row
2. Enter **75000** in "New Monthly Credits"
3. Enter reason: **"Increased credits for competitive positioning against market rivals based on Q1 2025 market analysis"**
4. Check **"Apply to existing users immediately"**
5. Leave **"Scheduled Rollout Date"** empty
6. Click **"Preview Impact"** → Review: 1,250 users will get +25,000 credits
7. Click **"Save Changes"**
8. ✅ Success! All 1,250 Pro users immediately receive 25,000 additional credits

### Upgrade-Only Policy Enforcement

**⚠️ Important:** The system enforces an **upgrade-only policy** for existing users:

- ✅ **Allowed**: Increase from 50,000 → 75,000 credits
- ❌ **Blocked**: Decrease from 75,000 → 50,000 credits

**If you attempt a credit decrease for existing users:**
```
Error: Credit decreases are not allowed for existing users

Current Credits: 75,000
Requested Credits: 50,000
Policy: upgrade_only

To reduce tier credits, uncheck "Apply to existing users" to only affect new subscribers.
```

**Workaround for Credit Reduction:**
- Uncheck **"Apply to existing users"**
- Save changes
- Only **new subscribers** will receive the lower credit allocation
- **Existing users** keep their current credits (grandfathering)

---

## Updating Tier Pricing

### Step-by-Step Guide

#### Step 1: Open Edit Modal

1. Locate the tier in the table
2. Click the **Edit (✏️)** button
3. Click the **Pricing** tab

#### Step 2: Enter New Prices

1. **New Monthly Price (USD):**
   - Enter decimal amount (e.g., `34.99`)
   - Minimum: `0.00` (Free tier)
   - Step: `0.01` (supports cents)

2. **New Annual Price (USD):**
   - Enter decimal amount (e.g., `349.99`)
   - Minimum: `0.00`
   - Typically 2-3 months free compared to monthly × 12

#### Step 3: Provide Justification

1. In **Reason for Change**, explain the pricing adjustment
   - Minimum: 10 characters
   - Maximum: 500 characters
   - **Example**: "Adjusted pricing to reflect improved service tier value proposition and market positioning"

#### Step 4: Save Changes

1. Click **Save Changes**
2. System updates pricing **for new subscribers only**
3. **Existing subscribers maintain their original pricing** (grandfathering policy)

### Pricing Update Example

**Scenario:** Increase Pro tier monthly price from $29.99 to $34.99.

**Steps:**
1. Click Edit on Pro tier row
2. Switch to **Pricing** tab
3. Enter **34.99** in "New Monthly Price (USD)"
4. Enter **349.99** in "New Annual Price (USD)"
5. Enter reason: **"Adjusted pricing to reflect improved service tier value proposition and market positioning"**
6. Click **Save Changes**
7. ✅ Success! New Pro subscribers pay $34.99/month, existing users keep $29.99/month

### Grandfathering Policy

**Existing Subscribers:** Keep their original pricing forever (unless they cancel and re-subscribe)

**New Subscribers:** Pay the new pricing immediately

**Example:**
- User A subscribed to Pro on Jan 1, 2025 at $29.99/month
- Admin updates Pro pricing to $34.99/month on Jan 15, 2025
- User A continues paying $29.99/month (grandfathered)
- User B subscribes to Pro on Jan 16, 2025 → pays $34.99/month

---

## Understanding Impact Preview

The Impact Preview feature provides a **dry-run analysis** before applying credit changes.

### What Gets Previewed

| Field                     | Description                                                  |
|---------------------------|--------------------------------------------------------------|
| **Current Credits**       | Existing monthly credit allocation                           |
| **New Credits**           | Proposed monthly credit allocation                           |
| **Change Type**           | Increase (↗️), Decrease (↘️), or No Change                    |
| **Total Users**           | Number of active users in this tier                          |
| **Will Upgrade**          | Users whose credits will increase                            |
| **Unchanged**             | Users whose credits won't change (already at new allocation) |
| **Estimated Cost Impact** | Approximate cost increase in USD                             |

### Cost Impact Calculation

**Formula:**
```
Additional Credits per User = New Credits - Current Credits
Cost per 1,000 Credits = $0.05 (average)
Cost Impact = (Additional Credits × Total Users × $0.05) / 1,000
```

**Example:**
```
New Credits: 75,000
Current Credits: 50,000
Additional Credits: 25,000
Total Users: 1,250

Cost Impact = (25,000 × 1,250 × $0.05) / 1,000 = $1,562.50 per month
```

**Note:** This is an **estimate** based on average API costs. Actual cost varies by:
- Model selection (GPT-4 vs GPT-3.5)
- Input/output token ratios
- Cache hit rates

### When to Use Preview

**Always preview when:**
- Increasing credits for large user populations (>100 users)
- Making significant credit changes (>20% increase)
- Uncertain about financial impact
- Testing different credit amounts before deciding

**Can skip preview when:**
- Updating pricing (no immediate user impact)
- Reducing credits for new subscribers only
- Small pilot tier with <10 users

---

## Immediate vs Scheduled Rollouts

### Immediate Rollout

**When to Use:**
- Urgent competitive response
- Immediate marketing campaign launch
- Bug fix requiring credit compensation
- Small user base (<100 users)

**How It Works:**
1. Admin saves credit update with **no scheduled date**
2. System **immediately processes all eligible users** (typically <30 seconds for 1,000 users)
3. Each user receives:
   - New `credit_allocation` record
   - Updated `user_credit_balance` (atomic increment)
   - Updated `subscription_monetization.monthly_credit_allocation`
4. History record marked with `applied_at` timestamp
5. Users see increased credits in their dashboard instantly

**Visual Indicator:** No "Scheduled Rollout" section in success response.

### Scheduled Rollout

**When to Use:**
- Coordinated marketing campaigns (e.g., "New Year Upgrade")
- Phased rollouts to monitor system load
- Time-zone aligned launches
- Advance preparation for announcements

**How It Works:**
1. Admin saves credit update with **future scheduled date** (e.g., Jan 20, 2025 00:00 UTC)
2. System updates `tier_config` but **does NOT process users yet**
3. History record created with:
   - `scheduled_rollout_date`: Jan 20, 2025 00:00 UTC
   - `applied_at`: null (pending)
4. **Background worker** runs every 5 minutes:
   - Checks for pending upgrades where `scheduled_rollout_date ≤ now`
   - Processes all eligible users
   - Marks history record with `applied_at` timestamp
5. Users receive credits at scheduled time (within 5-minute window)

**Visual Indicator:**
```json
{
  "scheduledRollout": {
    "scheduledDate": "2025-01-20T00:00:00.000Z",
    "status": "pending",
    "affectedUsers": 1250
  }
}
```

### Comparison Table

| Aspect               | Immediate Rollout                  | Scheduled Rollout                        |
|----------------------|------------------------------------|------------------------------------------|
| **Processing Time**  | Instant (<30 sec for 1K users)     | At scheduled time (±5 min accuracy)      |
| **Use Case**         | Urgent changes, small campaigns    | Marketing campaigns, coordinated launches|
| **Coordination**     | No advance notice required         | Sync with email, blog, social media      |
| **Reversibility**    | Cannot undo once processed         | Can cancel before scheduled time         |
| **System Load**      | Immediate CPU/DB spike             | Distributed load via background worker   |
| **Audit Trail**      | `applied_at` set immediately       | `applied_at` set at scheduled time       |

### Canceling Scheduled Rollouts

**⚠️ Currently Not Supported:**
- Once a scheduled rollout is created, it **cannot be canceled** via UI
- Manual intervention required:
  1. Contact engineering team
  2. Provide tier name and scheduled date
  3. Engineer manually deletes pending history record from database

**Future Enhancement:** Cancel button in tier history modal for pending rollouts.

---

## Viewing Tier History

The tier history feature provides a complete audit trail of all configuration changes.

### Step-by-Step Guide

1. Locate the tier in the table
2. Click the **History (🕐)** button in the Actions column
3. **Tier History Modal** opens with timeline view

### Timeline Display

**Layout:**
- **Left Side**: Relative time (e.g., "2 hours ago") + absolute date
- **Center**: Colored timeline dot with icon
- **Right Side**: Change details in card format

**Timeline Icons & Colors:**
- **↗️ Trending Up (Green)**: Credit increase
- **↘️ Trending Down (Red)**: Credit decrease
- **💲 Dollar Sign (Blue)**: Price change
- **🔧 Wrench (Gray)**: Feature update

### Change Details Card

Each history entry displays:

1. **Change Description** (Bold):
   - "Credits changed from 50,000 to 75,000"
   - "Price changed from $29.99 to $34.99"

2. **Change Reason** (Gray):
   - Admin-provided justification
   - Visible below description

3. **Metadata Chips**:
   - **Applied Status**:
     - ✅ "Applied 2 hours ago" (green, success)
     - ⏰ "Pending" (yellow, warning)
   - **Affected Users**: "1,250 users"
   - **Changed By**: "by Admin"

### Example Timeline Entry

```
┌─────────────────┐
│  2 hours ago    │  ╭──●── ↗️  Credits changed from 50,000 to 75,000
│  Jan 15, 2:30 PM│  │
└─────────────────┘  │     Increased credits for competitive positioning
                     │     against market rivals based on Q1 2025
                     │     market analysis
                     │
                     │     ✅ Applied 2 hours ago  👥 1,250 users  by Admin
                     ├───
                     │
  4 days ago        ╭──●── 💲  Price changed from $24.99 to $29.99
  Jan 11, 10:00 AM  │
                    │     Adjusted pricing to reflect improved service
                    │     tier value proposition and market positioning
                    │
                    │     ✅ Applied 4 days ago  👥 0 users  by Admin
```

### Filtering and Limits

- **Default Limit**: 50 most recent changes
- **Sorting**: Newest first (reverse chronological)
- **Filtering**: Currently not available (future enhancement)

---

## Best Practices

### 1. Always Preview Before Applying

**Why:**
- Avoid costly mistakes (e.g., accidentally granting 1M credits instead of 100K)
- Understand financial impact before committing
- Identify edge cases (e.g., users already upgraded manually)

**How:**
- Click "Preview Impact" button before "Save Changes"
- Review all fields in preview panel
- Verify "Estimated Cost Impact" aligns with budget

### 2. Provide Detailed Change Reasons

**Why:**
- Future admins understand decision context
- Regulatory compliance and audits
- Historical analysis of pricing strategy

**Good Example:**
> "Increased credits for competitive positioning against market rivals based on Q1 2025 market analysis. Competitors (Acme Corp, Widget Inc) now offer 60K-80K credits. Our 50K allocation was losing deals. Survey data shows 75K is sweet spot for retention."

**Bad Example:**
> "More credits" ❌ (Too vague, no context)

### 3. Schedule Large Rollouts During Off-Peak Hours

**Why:**
- Minimize user-facing performance impact
- Allow time for monitoring and rollback if needed
- Coordinate with marketing announcements

**Recommended Schedule:**
- **Weekdays**: 2:00 AM - 4:00 AM UTC (lowest traffic)
- **Weekends**: Avoid (support staff availability limited)

**Example:**
- Marketing campaign launches Monday 9:00 AM EST
- Schedule rollout for Monday 8:00 AM UTC (3:00 AM EST)
- Gives 1-hour buffer for verification

### 4. Communicate Changes to Users

**Before Rollout:**
- Email announcement 3-7 days in advance
- Blog post explaining benefits
- Social media teasers

**During Rollout:**
- In-app notification: "Great news! Your credits just increased"
- Email confirmation: "Your Pro plan now includes 75,000 credits"

**After Rollout:**
- Monitor support tickets for confusion
- Update pricing page and FAQs
- Post-launch metrics dashboard review

### 5. Monitor System Health After Large Rollouts

**Key Metrics:**
- **API Response Time**: Should stay <200ms p95
- **Database CPU**: Should stay <70%
- **Redis Memory**: Should stay <80%
- **Error Rate**: Should stay <0.1%

**Tools:**
- Admin Analytics Dashboard (`/admin/analytics`)
- Platform Analytics (`/admin/analytics/platform`)
- External monitoring (DataDog, New Relic)

**If Issues Detected:**
1. Check `/admin/analytics` for anomalies
2. Review worker logs: `tail -f backend/logs/worker-tier-upgrade.log`
3. Verify database locks: `SELECT * FROM pg_locks WHERE NOT granted;`
4. Escalate to engineering if CPU >90% or errors >1%

### 6. Use Scheduled Rollouts for Marketing Campaigns

**Campaign Coordination:**
1. **Week 1**: Finalize credit increase decision (75K credits)
2. **Week 2**: Create campaign materials (emails, blog, social)
3. **Week 3**: Schedule rollout for Week 4, Monday 8:00 AM UTC
4. **Week 4, Sunday**: Send teaser email "Big announcement tomorrow"
5. **Week 4, Monday 8:00 AM UTC**: Rollout processes automatically
6. **Week 4, Monday 9:00 AM EST**: Marketing launches campaign
7. **Week 4, Monday**: Monitor metrics and support tickets

### 7. Document Major Changes in Internal Wiki

**Template:**
```markdown
## Pro Tier Credit Increase (Jan 15, 2025)

**Decision:** Increase Pro tier from 50K → 75K credits
**Reason:** Competitive positioning against Acme Corp (60K) and Widget Inc (80K)
**Affected Users:** 1,250 Pro subscribers
**Financial Impact:** $1,562.50/month additional cost
**Rollout:** Immediate (Jan 15, 2:30 PM EST)
**Metrics (1 week):**
- Churn: -15% (↓ from 3.2% to 2.7%)
- NPS: +8 points (↑ from 42 to 50)
- Support tickets: +5% (mostly "thank you" messages)
**ROI:** Positive - $1,562 cost vs $4,200 retained revenue
```

---

## Troubleshooting

### Issue 1: "Preview Impact" Button Doesn't Work

**Symptoms:**
- Click "Preview Impact" button
- Nothing happens, no error message

**Causes:**
1. Form validation failed (check for red error messages)
2. Network connectivity issues
3. API rate limit exceeded

**Solutions:**
1. Check form validation:
   - "New Monthly Credits" must be 100-1,000,000 in increments of 100
   - "Reason for Change" must be 10-500 characters
2. Check browser console for network errors:
   - Press F12 → Console tab
   - Look for red errors
3. Wait 60 seconds and retry (rate limit window)
4. If persists, hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Issue 2: "Save Changes" Returns Error

**Error Message:** "Credits must be in increments of 100"

**Cause:** Entered credits not divisible by 100

**Solution:**
- Entered: `75050` ❌
- Correct: `75000` ✅

---

**Error Message:** "Reason must be at least 10 characters"

**Cause:** Change reason too short

**Solution:**
- Entered: "More credits" (12 chars) ❌
- Correct: "Increased credits for competitive positioning" (45 chars) ✅

---

**Error Message:** "Scheduled date must be in the future"

**Cause:** Selected past date/time

**Solution:**
1. Check current time in UTC (not local time zone)
2. Add at least 5 minutes buffer
3. Use datetime picker (don't type manually)

---

**Error Message:** "Credit decreases are not allowed for existing users"

**Cause:** Attempting to reduce credits with "Apply to existing users" checked

**Solution:**
1. **Option A (Recommended):** Uncheck "Apply to existing users"
   - Existing users keep current credits (grandfathering)
   - New subscribers get reduced allocation
2. **Option B (Not Recommended):** Contact engineering to override policy
   - Requires VP approval
   - Manual database intervention

### Issue 3: Scheduled Rollout Didn't Process

**Symptoms:**
- Scheduled time passed (e.g., Jan 20, 12:00 AM)
- Users still have old credit allocation
- Tier history shows "Pending" status

**Causes:**
1. Background worker not running
2. Worker crashed during processing
3. Database lock preventing updates

**Diagnostic Steps:**
1. Check worker status:
   ```bash
   # SSH into backend server
   ps aux | grep tier-credit-upgrade.worker
   ```
   - If process not found, worker is not running

2. Check worker logs:
   ```bash
   tail -n 100 backend/logs/worker-tier-upgrade.log
   ```
   - Look for errors: "Database connection failed", "Transaction timeout"

3. Check database locks:
   ```sql
   SELECT * FROM pg_locks WHERE relation::regclass::text = 'tier_config_history';
   ```
   - If locks present, another process is blocking

**Solutions:**
1. **If worker not running:**
   ```bash
   npm run worker:tier-upgrade
   ```
   - Worker starts and processes pending upgrades within 5 minutes

2. **If worker crashed:**
   ```bash
   # Check error logs
   tail -n 500 backend/logs/error.log | grep tier-credit-upgrade
   # Restart worker
   pm2 restart tier-credit-upgrade-worker  # (if using PM2)
   ```

3. **If database locked:**
   ```sql
   -- Find blocking process
   SELECT pid, query FROM pg_stat_activity WHERE state = 'active';
   -- Kill blocking process (CAUTION: only if confirmed safe)
   SELECT pg_terminate_backend(<pid>);
   ```

4. **Manual trigger (last resort):**
   ```bash
   npm run worker:tier-upgrade:once
   ```
   - Runs worker immediately in one-time mode
   - Check tier history modal to verify "Applied" status

### Issue 4: Users Report Not Receiving Credits

**Symptoms:**
- Admin sees "Applied 10 minutes ago" in tier history
- Users complain credits didn't increase

**Diagnostic Steps:**
1. **Verify user's subscription tier:**
   - Navigate to `/admin/users`
   - Search for user email
   - Check "Subscription" column - is it the correct tier?

2. **Check user's credit allocation:**
   - Click user row to open User Detail page
   - Scroll to "Credit Information" section
   - Verify "Monthly Credit Allocation" matches new tier config

3. **Check credit allocation records:**
   ```sql
   SELECT * FROM credit_allocation
   WHERE user_id = '<user_uuid>'
   ORDER BY allocation_period_start DESC
   LIMIT 10;
   ```
   - Should see record with `source = 'admin_grant'` and timestamp matching rollout

4. **Check user credit balance:**
   ```sql
   SELECT * FROM user_credit_balance WHERE user_id = '<user_uuid>';
   ```
   - `amount` should include the upgrade credits

**Common Causes & Solutions:**

1. **User is in different tier:**
   - Example: User thinks they're Pro, but actually Free
   - Solution: Verify subscription in `/admin/users`, upgrade if needed

2. **User's subscription is inactive:**
   - Status: `canceled`, `past_due`, `paused`
   - Solution: Upgrade only processes `active` subscriptions
   - Have user reactivate subscription first

3. **Race condition during billing cycle:**
   - User's subscription renewed during rollout
   - Credits reset to old allocation after upgrade applied
   - Solution: Manually grant credits via `/admin/credits` page

4. **User already had higher credits:**
   - User was manually granted 100K credits
   - Upgrade to 75K skipped (upgrade-only policy)
   - Solution: This is expected behavior, explain to user

### Issue 5: Impact Preview Shows Unexpected Numbers

**Example:** Preview says "0 users will upgrade" but you expected 1,250.

**Causes:**
1. **All users already have higher allocations:**
   - Previous manual credit grants
   - Previous tier upgrade that wasn't rolled back
   - Check tier history for recent credit increases

2. **All users in tier have inactive subscriptions:**
   - Status: `canceled`, `past_due`, `expired`
   - Upgrade only applies to `active` subscriptions

3. **Wrong tier selected:**
   - Opened edit modal for Free tier instead of Pro
   - Check modal title: "Edit Tier: FREE" vs "Edit Tier: PRO"

**Solutions:**
1. Query active users in tier:
   ```sql
   SELECT COUNT(*) FROM subscription_monetization
   WHERE tier = 'pro' AND status = 'active';
   ```
   - Compare with preview "Total Users" count

2. Query users with lower allocations:
   ```sql
   SELECT COUNT(*) FROM subscription_monetization
   WHERE tier = 'pro'
     AND status = 'active'
     AND monthly_credit_allocation < 75000;
   ```
   - Should match preview "Will Upgrade" count

3. If counts still don't match, clear browser cache and retry preview

---

## FAQ

### General Questions

**Q: Who can access Tier Management?**
A: Only users with Admin role and `admin` scope. Regular users and non-admin staff cannot access this page.

**Q: Can I delete a tier?**
A: No. Tiers are permanent to preserve historical data integrity. You can deactivate a tier by setting `isActive: false` (requires database access - contact engineering).

**Q: Can I create a new tier (e.g., "Teams")?**
A: Currently requires database migration and code changes. Submit a feature request to the Product team.

**Q: How often should we adjust tier credits?**
A: Typical cadence:
- **Quarterly reviews** (Jan, Apr, Jul, Oct) for competitive analysis
- **As-needed adjustments** for urgent competitive threats
- **Annual pricing reviews** (December) for next year's strategy

---

### Credit Allocation Questions

**Q: What happens if I decrease credits for existing users?**
A: The system **blocks this action** with error message. Existing users must always keep their current credits or higher (upgrade-only policy). You can only reduce credits for **new subscribers** by unchecking "Apply to existing users".

**Q: Can I grant credits to a single user instead of all users in a tier?**
A: Tier Management affects entire tiers. For individual users, use the Credit Management page (`/admin/credits`) to manually grant/adjust credits.

**Q: Do credits expire?**
A: Yes, monthly credits expire at the end of the billing cycle (30 days). Unused credits do not roll over. See Credit Management documentation for details.

**Q: What's the difference between "Monthly Credit Allocation" and "Current Balance"?**
A:
- **Monthly Credit Allocation**: Base credits user receives each billing cycle (tier configuration)
- **Current Balance**: Actual credits available right now (includes bonuses, rollover exceptions, grants)

---

### Pricing Questions

**Q: Will existing subscribers see price increases?**
A: No. Pricing changes only affect **new subscribers**. Existing subscribers are "grandfathered" at their original price unless they cancel and re-subscribe.

**Q: How do I change prices for existing subscribers?**
A: This requires a "price migration campaign":
1. Create new tier with different name (e.g., "Pro V2")
2. Email existing users offering upgrade with benefits
3. Provide opt-in process via Support team
4. Manually migrate willing users to new tier

This is complex and rare - consult with Product and Legal teams first.

**Q: Can I offer promotional pricing for limited time?**
A: Tier Management is for permanent tier configuration. For promotions, use:
- **Coupons**: Create coupon codes in Coupon Management (`/admin/coupons`)
- **Campaigns**: Set up time-limited campaigns (`/admin/coupons/campaigns`)

**Q: What's the recommended annual discount?**
A: Industry standard: 16-20% discount vs monthly × 12
- Example: $29.99/month = $359.88/year → Offer $299/year (17% discount)
- Higher discounts (25-30%) for enterprise tiers to encourage commitment

---

### Rollout Questions

**Q: Can I cancel a scheduled rollout?**
A: Currently **not supported** via UI. Contact engineering team to manually remove pending history record from database. Future enhancement planned.

**Q: What's the maximum future date for scheduled rollouts?**
A: No hard limit, but recommended: **30 days maximum**
- Marketing campaigns rarely plan >1 month ahead
- Longer schedules increase risk of forgetting/conflicts
- If needed, schedule closer to launch date

**Q: Can I see all pending scheduled rollouts across all tiers?**
A: Currently **not supported**. Must check each tier's history individually. Workaround:
1. Navigate to `/admin/tier-management`
2. Click History for each tier
3. Look for "Pending" status chips

Future enhancement: Unified scheduled rollouts dashboard.

**Q: What happens if I schedule two rollouts for the same tier on the same day?**
A: Both execute sequentially:
1. First rollout processes (e.g., 50K → 75K credits)
2. Second rollout processes (e.g., 75K → 100K credits)
3. Users end up with 100K credits
4. Both history records marked "Applied"

This is supported but confusing - avoid by spacing rollouts at least 1 day apart.

---

### Audit & Compliance Questions

**Q: How long is tier history retained?**
A: **Permanently**. All `tier_config_history` records are immutable and never deleted. This ensures:
- Regulatory compliance (SOC 2, GDPR Article 5)
- Forensic analysis capability
- Pricing dispute resolution

**Q: Can I edit or delete a history record?**
A: **No**. History records are immutable. If a mistake was made:
1. Create a new corrective change (e.g., revert credits to previous value)
2. Document the error in the new change reason
3. Both records remain in history for audit trail

**Q: Who can see the admin who made each change?**
A: All admins can see "Changed By" in tier history. The email is stored in `tier_config_history.changed_by` field, derived from the admin's JWT token.

**Q: Are tier configuration changes logged in the main audit log?**
A: Yes, in two places:
1. **Tier Config History**: Detailed tier-specific audit trail
2. **Admin Audit Log** (`/admin/audit`): General admin action log

Both are permanent and cross-reference each other.

---

### Technical Questions

**Q: What happens if the background worker fails mid-processing?**
A: The system is designed to be **resumable**:
1. Worker crashes after processing 500 of 1,250 users
2. Transaction isolation ensures partial updates are committed
3. Next worker run (5 minutes later) processes remaining 750 users
4. History record marked "Applied" only when all users complete

**Verification:**
- Check user credit balances via SQL query
- Look for users in tier with old vs new allocation
- If incomplete, manually run: `npm run worker:tier-upgrade:once`

**Q: How is concurrency handled if two admins edit the same tier simultaneously?**
A: Last write wins (optimistic locking):
1. Admin A opens edit modal for Pro tier (config_version: 5)
2. Admin B opens edit modal for Pro tier (config_version: 5)
3. Admin A saves changes → config_version: 6
4. Admin B saves changes → **overwrites Admin A's changes** → config_version: 7
5. Admin A's changes are lost (not reverted - overwritten)

**Best Practice:** Coordinate tier changes via Slack before editing.

**Future Enhancement:** Add optimistic locking check:
```javascript
if (currentVersion !== expectedVersion) {
  throw new Error('Tier was modified by another admin. Please refresh and retry.');
}
```

**Q: What's the maximum number of users that can be upgraded in one rollout?**
A: **No hard limit**, but practical constraints:
- **10,000 users**: ~3-5 minutes processing time
- **100,000 users**: ~30-50 minutes processing time
- **1,000,000 users**: Contact engineering for batch optimization

**Recommendation:**
- <10K users: Immediate rollout fine
- 10K-100K users: Use scheduled rollout during off-peak hours
- >100K users: Consult engineering for phased rollout strategy

---

## Related Documentation

- **API Documentation**: `docs/reference/189-tier-config-api-documentation.md`
- **Plan 190 Specification**: `docs/plan/190-tier-credit-allocation-management.md`
- **Credit Management Guide**: `docs/guides/012-credit-management-guide.md` *(if exists)*
- **Subscription Management Guide**: `docs/guides/008-subscription-management-guide.md` *(if exists)*

---

## Support & Feedback

**For Questions:**
- Slack: #admin-support
- Email: admin-support@rephlo.com

**For Feature Requests:**
- Submit via `/admin/settings` → "Feature Requests" tab
- Or create ticket in Jira: Project = "Platform", Component = "Tier Management"

**For Bugs:**
- Immediately report critical issues (e.g., users losing credits) to #incidents Slack channel
- For non-critical bugs, create ticket in Jira with screenshots and reproduction steps

---

**Last Updated:** 2025-01-15
**Author:** Plan 190 Implementation Team
**Version:** 1.0
