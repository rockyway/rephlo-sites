# Test Data Documentation - Complete Reference

**Version**: 3.1 (Plans 109-112 + Plan 119 RBAC)
**Last Updated**: November 9, 2025
**Audience**: Developers, QA Engineers, Testers, Desktop App Developers, Product Managers, Operations Team
**Status**: Authoritative Single Source of Truth for Test Data

This document provides comprehensive information about all test data required for the Rephlo system, including Plans 109 (Subscription Monetization), 110 (Perpetual Licensing), 111 (Coupon & Discount System), 112 (Token-to-Credit Conversion), and 119 (User-Role-Permission RBAC System).

---

## Quick Reference: Test Credentials

### Seeded OAuth Clients
```
Client ID: poc-client-test
Client Secret: test-secret-poc-client-67890
Redirect URI: http://localhost:8080/oauth/callback

Client ID: desktop-app-test
Client Secret: test-secret-desktop-app-12345
Redirect URI: http://localhost:3000/callback

Client ID: web-app-test
Client Secret: test-secret-web-app-11111
Redirect URI: http://localhost:5173/callback
```

### Test User Accounts
```
FREE TIER:
  Email: free.user@example.com
  Password: TestPassword123!
  Credits: 100/month
  Tier: free

PRO TIER (Local Auth):
  Email: pro.user@example.com
  Password: TestPassword123!
  Credits: 10,000/month
  Tier: pro

ADMIN (MFA Enabled):
  Email: admin.test@rephlo.ai
  Password: AdminPassword123!
  MFA: TOTP Enabled
  Role: admin
  Tier: pro

PRO TIER (Google Auth):
  Email: google.user@example.com
  Auth: Google OAuth
  Tier: pro

=== RBAC TEAM MEMBERS ===

OPERATIONS LEAD (Ops Role):
  Email: ops.user@rephlo.ai
  Password: OpsPassword123!
  RBAC Role: ops (25 permissions)
  Tier: pro

SUPPORT AGENT (Support Role):
  Email: support.user@rephlo.ai
  Password: SupportPassword123!
  RBAC Role: support (12 permissions)
  Tier: pro

BUSINESS ANALYST (Analyst Role):
  Email: analyst.user@rephlo.ai
  Password: AnalystPassword123!
  RBAC Role: analyst (8 permissions)
  Tier: pro

COMPLIANCE AUDITOR (Auditor Role):
  Email: auditor.user@rephlo.ai
  Password: AuditorPassword123!
  RBAC Role: auditor (5 permissions)
  Tier: pro
```

---

## Table of Contents

1. [Overview](#overview)
2. [Plan 109: Subscription Monetization](#plan-109-subscription-monetization)
3. [Plan 110: Perpetual Licensing](#plan-110-perpetual-licensing)
4. [Plan 111: Coupon & Discount System](#plan-111-coupon--discount-system)
5. [Plan 112: Token-to-Credit Conversion](#plan-112-token-to-credit-conversion)
6. [Plan 119: User-Role-Permission RBAC System](#plan-119-user-role-permission-rbac-system)
7. [Core Test Users](#core-test-users)
8. [Seeding the Database](#seeding-the-database)
9. [Comprehensive Test Scenarios](#comprehensive-test-scenarios)
10. [Enum Reference](#enum-reference)
11. [Data Reset Procedures](#data-reset-procedures)

---

## Overview

The Rephlo system implements four major feature plans with corresponding test data requirements:

### Plan 109: Subscription Monetization
- Stripe integration with recurring billing
- Monthly credit allocation per tier
- Dunning management for failed payments
- Invoice tracking and payment transactions

### Plan 110: Perpetual Licensing
- One-time license purchases
- Device activation with SHA-256 machine fingerprinting
- Version eligibility tracking (SemVer)
- Version upgrade purchases with early-bird and loyalty pricing
- Mid-cycle proration for tier changes

### Plan 111: Coupon & Discount System
- Percentage and fixed-amount discounts
- Campaign tracking (seasonal, win-back, referral, early-bird)
- Fraud detection (velocity abuse, IP switching, bot patterns)
- Validation rules (first-time users, email domains, credit balance)

### Plan 112: Token-to-Credit Conversion
- Vendor pricing tracking (OpenAI, Anthropic, Google, Meta, Mistral, Cohere)
- Margin strategies (fixed percentage, tiered, dynamic)
- Token usage ledger (immutable audit trail)
- Credit deduction tracking
- Daily aggregated summaries

### Plan 119: User-Role-Permission RBAC System
- 6 hierarchical built-in roles (Super Admin, Admin, Ops, Support, Analyst, Auditor)
- 40+ granular permissions across 7 categories
- Permission override system with expiration
- Complete audit logging with IP tracking
- Role-based access control enforcement
- Temporary role assignments

---

## Plan 109: Subscription Monetization

### Subscription Tiers Configuration

```yaml
Free Tier:
  monthly_price_usd: 0.00
  monthly_credit_allocation: 100
  max_credit_rollover: 0
  features:
    - 1 device activation
    - Basic models only
    - Community support

Pro Tier:
  monthly_price_usd: 99.99
  monthly_credit_allocation: 10000
  max_credit_rollover: 2000
  features:
    - 3 device activations
    - All models
    - Priority support
    - Advanced analytics

Enterprise Pro Tier:
  monthly_price_usd: 299.99
  monthly_credit_allocation: 50000
  max_credit_rollover: 10000
  features:
    - Unlimited device activations
    - All models with priority
    - Dedicated support
    - Custom integrations

Enterprise Max Tier:
  monthly_price_usd: 499.99
  monthly_credit_allocation: 100000
  max_credit_rollover: 20000
  features:
    - Unlimited everything
    - SLA guarantee
    - Dedicated account manager
    - Custom pricing
```

### Test Subscription Data

| Email | Tier | Status | Base Price | Monthly Credits | Billing Cycle | Stripe Customer |
|-------|------|--------|-----------|-----------------|---------------|-----------------|
| free.user@example.com | free | active | $0.00 | 100 | monthly | NULL |
| pro.user@example.com | pro | active | $99.99 | 10,000 | monthly | cus_pro_001 |
| enterprise.user@example.com | enterprise_pro | active | $299.99 | 50,000 | monthly | cus_ent_001 |

### Credit Allocation Examples

```typescript
// Credit allocation for Pro user
{
  userId: "pro-user-id",
  amount: 10000,
  source: "monthly_allocation",
  allocation_period_start: "2025-11-01T00:00:00Z",
  allocation_period_end: "2025-11-30T23:59:59Z"
}

// Promotional bonus allocation
{
  userId: "pro-user-id",
  amount: 5000,
  source: "promotional_bonus",
  allocation_period_start: "2025-11-01T00:00:00Z",
  allocation_period_end: "2025-11-30T23:59:59Z"
}
```

### Dunning Management Test Scenarios

| User | Invoice Amount | Payment Status | Attempt #1 | Attempt #2 | Result |
|------|---|---|---|---|---|
| pro.user@example.com | $99.99 | failed | 2025-11-02 declined | 2025-11-05 declined | Dunning after 2 attempts |
| enterprise.user@example.com | $299.99 | success | 2025-11-01 approved | N/A | Immediate payment |

---

## Plan 110: Perpetual Licensing

### Perpetual License Test Data

```yaml
License 1 (Windows User - V1.0.0):
  license_key: "PERM-2025-WIN-001-BETA"
  user_id: "perpetual-user-1-id"
  purchase_price_usd: 299.99
  purchased_version: "1.0.0"
  eligible_until_version: "2.0.0"
  max_activations: 3
  current_activations: 2
  status: "active"
  purchased_at: "2025-10-15T00:00:00Z"
  activated_at: "2025-10-15T10:30:00Z"

License 2 (Enterprise - V1.5.0):
  license_key: "PERM-2025-ENT-002-GOLD"
  user_id: "perpetual-user-2-id"
  purchase_price_usd: 499.99
  purchased_version: "1.5.0"
  eligible_until_version: "3.0.0"
  max_activations: 5
  current_activations: 3
  status: "active"
  purchased_at: "2025-09-01T00:00:00Z"
  activated_at: "2025-09-01T14:00:00Z"

License 3 (Expired):
  license_key: "PERM-2024-TRIAL-003"
  user_id: "perpetual-user-3-id"
  purchase_price_usd: 99.99
  purchased_version: "1.0.0"
  eligible_until_version: "1.5.0"
  status: "expired"
  expires_at: "2025-11-01T00:00:00Z"
  purchased_at: "2024-11-01T00:00:00Z"
```

### License Activation Examples (Machine Fingerprinting)

```yaml
Activation 1 (Windows Desktop):
  license_id: "license-1-id"
  user_id: "perpetual-user-1-id"
  machine_fingerprint: "sha256(CPU:Intel-i7-12700K | MAC:00:1A:2B:3C:4D:5E | DISK:SERIAL123 | OS:Windows-10-21H2)"
  device_name: "John's Desktop"
  os_type: "Windows"
  os_version: "10.0.19045"
  cpu_info: "Intel Core i7-12700K @ 3.60GHz"
  status: "active"
  activated_at: "2025-10-15T10:30:00Z"
  last_seen_at: "2025-11-08T15:45:00Z"

Activation 2 (MacBook):
  license_id: "license-1-id"
  user_id: "perpetual-user-1-id"
  machine_fingerprint: "sha256(CPU:Apple-M1 | MAC:AA:BB:CC:DD:EE:FF | DISK:SERIALABC | OS:macOS-14.1.1)"
  device_name: "John's MacBook Pro"
  os_type: "macOS"
  os_version: "14.1.1"
  cpu_info: "Apple Silicon M1"
  status: "active"
  activated_at: "2025-10-20T09:15:00Z"
  last_seen_at: "2025-11-07T12:30:00Z"

Activation 3 (Deactivated):
  license_id: "license-1-id"
  user_id: "perpetual-user-1-id"
  machine_fingerprint: "sha256(CPU:Intel-i5-9400 | MAC:11:22:33:44:55:66 | DISK:OLDSERIAL | OS:Linux-5.15.0)"
  device_name: "John's Old Linux Box"
  os_type: "Linux"
  os_version: "5.15.0-84-generic"
  status: "deactivated"
  activated_at: "2025-08-01T08:00:00Z"
  deactivated_at: "2025-11-01T16:20:00Z"
```

### Version Upgrade Pricing Examples

```yaml
Upgrade 1 (Early Bird Pricing):
  license_id: "license-1-id"
  user_id: "perpetual-user-1-id"
  from_version: "1.0.0"
  to_version: "2.0.0"
  upgrade_price_usd: 79.00  # Early bird discount: $99 → $79
  status: "completed"
  purchased_at: "2025-10-20T12:00:00Z"
  stripe_payment_intent_id: "pi_upgrade_001"

Upgrade 2 (Standard Pricing):
  license_id: "license-2-id"
  user_id: "perpetual-user-2-id"
  from_version: "1.5.0"
  to_version: "2.5.0"
  upgrade_price_usd: 99.00  # Standard price
  status: "pending"
  purchased_at: "2025-11-05T10:30:00Z"

Upgrade 3 (Loyalty Discount):
  license_id: "license-1-id"
  user_id: "perpetual-user-1-id"
  from_version: "2.0.0"
  to_version: "3.0.0"
  upgrade_price_usd: 69.00  # Loyalty discount: $99 → $69
  status: "completed"
  purchased_at: "2025-11-04T14:15:00Z"
  stripe_payment_intent_id: "pi_upgrade_002"
```

### Proration Event Examples

```yaml
Proration 1 (Mid-cycle Upgrade):
  user_id: "pro-user-id"
  subscription_id: "sub-pro-001"
  from_tier: "pro"
  to_tier: "enterprise_pro"
  change_type: "upgrade"
  days_remaining: 15
  days_in_cycle: 30
  unused_credit_value_usd: 49.99  # 50% of month remaining = $99.99 / 2
  new_tier_prorated_cost_usd: 149.99  # 50% of enterprise price = $299.99 / 2
  net_charge_usd: 100.00  # $149.99 - $49.99
  status: "applied"
  effective_date: "2025-11-15T00:00:00Z"
  stripe_invoice_id: "inv_proration_001"

Proration 2 (Mid-cycle Downgrade):
  user_id: "enterprise-user-id"
  subscription_id: "sub-ent-001"
  from_tier: "enterprise_pro"
  to_tier: "pro"
  change_type: "downgrade"
  days_remaining: 10
  days_in_cycle: 30
  unused_credit_value_usd: 99.99  # Refund for unused credits
  new_tier_prorated_cost_usd: 33.33  # 33% of pro price = $99.99 / 3
  net_charge_usd: -66.66  # Refund to user
  status: "applied"
  effective_date: "2025-11-20T00:00:00Z"

Proration 3 (Cancellation):
  user_id: "pro-user-id"
  subscription_id: "sub-pro-002"
  from_tier: "pro"
  to_tier: null
  change_type: "cancellation"
  days_remaining: 7
  days_in_cycle: 30
  unused_credit_value_usd: 23.33  # 23% of month remaining
  new_tier_prorated_cost_usd: 0.00
  net_charge_usd: -23.33  # Refund to user
  status: "applied"
  effective_date: "2025-11-23T00:00:00Z"
```

---

## Plan 111: Coupon & Discount System

### Coupon Campaign Examples

```yaml
Campaign 1 (Black Friday 2025):
  campaign_name: "Black Friday 2025"
  campaign_type: "seasonal"
  start_date: "2025-11-24T00:00:00Z"
  end_date: "2025-11-30T23:59:59Z"
  budget_limit_usd: 50000.00
  total_spent_usd: 12450.50
  target_tier: "pro"
  is_active: true
  created_by: "admin-user-id"

Campaign 2 (Referral Program):
  campaign_name: "Friend Referral Program"
  campaign_type: "referral"
  start_date: "2025-01-01T00:00:00Z"
  end_date: "2025-12-31T23:59:59Z"
  budget_limit_usd: 100000.00
  total_spent_usd: 45200.75
  target_tier: null  # All tiers
  is_active: true
  created_by: "admin-user-id"

Campaign 3 (Win-Back):
  campaign_name: "Win Back Churned Users"
  campaign_type: "win_back"
  start_date: "2025-11-01T00:00:00Z"
  end_date: "2025-12-31T23:59:59Z"
  budget_limit_usd: 25000.00
  total_spent_usd: 8900.00
  target_tier: "pro"
  is_active: true
  created_by: "admin-user-id"

Campaign 4 (Early Bird):
  campaign_name: "Early Bird - New Feature Launch"
  campaign_type: "early_bird"
  start_date: "2025-11-10T00:00:00Z"
  end_date: "2025-11-17T23:59:59Z"
  budget_limit_usd: 15000.00
  total_spent_usd: 14500.00
  target_tier: "free"
  is_active: false  # Ended
  created_by: "admin-user-id"
```

### Coupon Examples

```yaml
Coupon 1 (Percentage Discount):
  code: "BF2025-30OFF"
  coupon_type: "percentage_discount"
  discount_value: 30.00
  discount_type: "percentage"
  max_uses: 1000
  max_uses_per_user: 1
  min_purchase_amount: 50.00
  tier_eligibility: ["pro", "pro_max", "enterprise_pro", "enterprise_max"]
  billing_cycles: ["monthly", "annual"]
  valid_from: "2025-11-24T00:00:00Z"
  valid_until: "2025-11-30T23:59:59Z"
  campaign_id: "campaign-bf-2025-id"
  is_active: true
  created_by: "admin-user-id"

Coupon 2 (Fixed Amount Discount):
  code: "SAVE25"
  coupon_type: "fixed_amount_discount"
  discount_value: 25.00
  discount_type: "fixed_amount"
  max_uses: 500
  max_uses_per_user: 1
  min_purchase_amount: 99.99
  tier_eligibility: ["pro", "pro_max"]
  billing_cycles: ["monthly"]
  valid_from: "2025-11-01T00:00:00Z"
  valid_until: "2025-12-31T23:59:59Z"
  campaign_id: "campaign-referral-id"
  is_active: true
  created_by: "admin-user-id"

Coupon 3 (Credits Bonus):
  code: "FRIEND50"
  coupon_type: "duration_bonus"
  discount_value: 5000.00
  discount_type: "credits"
  max_uses: null  # null indicates unlimited uses
  max_uses_per_user: 1
  tier_eligibility: ["free", "pro"]
  valid_from: "2025-01-01T00:00:00Z"
  valid_until: "2025-12-31T23:59:59Z"
  campaign_id: "campaign-referral-id"
  is_active: true
  created_by: "admin-user-id"

Coupon 4 (First-Time User Only):
  code: "WELCOME20"
  coupon_type: "percentage_discount"
  discount_value: 20.00
  discount_type: "percentage"
  max_uses: 10000
  max_uses_per_user: 1
  min_purchase_amount: 0
  tier_eligibility: ["free", "pro", "pro_max"]
  billing_cycles: ["monthly"]
  valid_from: "2025-10-01T00:00:00Z"
  valid_until: "2026-12-31T23:59:59Z"
  is_active: true
  created_by: "admin-user-id"
  validation_rules:
    - rule_type: "first_time_user_only"
      rule_value: {}
```

### Coupon Redemption Test Data

```yaml
Redemption 1 (Success):
  coupon_id: "bf2025-30off-id"
  user_id: "pro-user-id"
  subscription_id: "sub-pro-001"
  discount_applied_usd: 30.00
  original_amount_usd: 99.99
  final_amount_usd: 69.99
  redemption_status: "success"
  redemption_date: "2025-11-25T10:30:00Z"
  ip_address: "203.0.113.45"
  user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

Redemption 2 (Failed - Fraud Detected):
  coupon_id: "save25-id"
  user_id: "suspicious-user-id"
  discount_applied_usd: 0.00
  original_amount_usd: 99.99
  final_amount_usd: 99.99
  redemption_status: "failed"
  failure_reason: "Velocity abuse detected - 5 attempts in 1 hour"
  redemption_date: "2025-11-20T15:45:00Z"
  ip_address: "198.51.100.123"

Redemption 3 (Reversed):
  coupon_id: "friend50-id"
  user_id: "refund-user-id"
  subscription_id: "sub-pro-refund"
  discount_applied_usd: 5000.00
  original_amount_usd: 0.00
  final_amount_usd: -5000.00
  redemption_status: "reversed"
  failure_reason: "User requested refund"
  redemption_date: "2025-11-01T08:00:00Z"
  created_at: "2025-11-01T08:00:00Z"
```

### Fraud Detection Examples

```yaml
Fraud Detection 1 (Velocity Abuse):
  coupon_id: "save25-id"
  user_id: "bot-user-id"
  detection_type: "velocity_abuse"
  severity: "high"
  details:
    velocity: 5  # 5 attempts
    time_window: "1h"
    attempts: ["14:00:00", "14:05:00", "14:10:00", "14:15:00", "14:20:00"]
  is_flagged: true
  reviewed_by: "admin-user-id"
  reviewed_at: "2025-11-20T16:00:00Z"
  resolution: "Account suspended pending review"

Fraud Detection 2 (IP Switching):
  coupon_id: "bf2025-30off-id"
  user_id: "vpn-user-id"
  detection_type: "ip_switching"
  severity: "medium"
  details:
    ip_addresses: ["203.0.113.1", "198.51.100.1", "192.0.2.1"]
    time_span_minutes: 15
    country_codes: ["US", "UK", "CN"]
  is_flagged: true
  reviewed_by: null
  resolution: null

Fraud Detection 3 (Bot Pattern):
  coupon_id: "welcome20-id"
  user_id: "bot-like-user-id"
  detection_type: "bot_pattern"
  severity: "critical"
  details:
    suspicious_behaviors: ["form_autofill", "no_mouse_movement", "instant_submission"]
    confidence_score: 0.95
  is_flagged: true
  reviewed_by: "admin-user-id"
  reviewed_at: "2025-11-19T10:00:00Z"
  resolution: "Account flagged for manual review"
```

### Coupon Validation Rules

```yaml
Rule 1 (First-Time Users Only):
  coupon_id: "welcome20-id"
  rule_type: "first_time_user_only"
  rule_value: {}
  is_active: true

Rule 2 (Email Domain Whitelist):
  coupon_id: "corporate-discount-id"
  rule_type: "specific_email_domain"
  rule_value:
    domains: ["company.com", "subsidiary.com", "partner.org"]
  is_active: true

Rule 3 (Minimum Credit Balance):
  coupon_id: "loyal-user-bonus-id"
  rule_type: "minimum_credit_balance"
  rule_value:
    min_balance: 1000
  is_active: true

Rule 4 (Exclude Refunded Users):
  coupon_id: "bf2025-30off-id"
  rule_type: "exclude_refunded_users"
  rule_value:
    days: 90  # Users refunded in last 90 days
  is_active: true

Rule 5 (Require Payment Method):
  coupon_id: "premium-trial-id"
  rule_type: "require_payment_method"
  rule_value: {}
  is_active: true
```

---

## Plan 112: Token-to-Credit Conversion

### Provider Configuration

```yaml
Provider 1 (OpenAI):
  vendor_name: "openai"
  display_name: "OpenAI"
  api_endpoint: "https://api.openai.com/v1"
  is_active: true

Provider 2 (Anthropic):
  vendor_name: "anthropic"
  display_name: "Anthropic"
  api_endpoint: "https://api.anthropic.com/v1"
  is_active: true

Provider 3 (Google):
  vendor_name: "google"
  display_name: "Google Cloud AI"
  api_endpoint: "https://generativelanguage.googleapis.com"
  is_active: true

Provider 4 (Meta):
  vendor_name: "meta"
  display_name: "Meta AI"
  api_endpoint: "https://api.llama.meta.com"
  is_active: true

Provider 5 (Mistral):
  vendor_name: "mistral"
  display_name: "Mistral AI"
  api_endpoint: "https://api.mistral.ai/v1"
  is_active: true

Provider 6 (Cohere):
  vendor_name: "cohere"
  display_name: "Cohere"
  api_endpoint: "https://api.cohere.com/v1"
  is_active: true
```

### Model Provider Pricing

```yaml
Pricing 1 (GPT-4 Turbo):
  provider_id: "openai-id"
  model_name: "gpt-4-turbo"
  input_token_price_per_million: 10.00  # $0.01 per 1K tokens
  output_token_price_per_million: 30.00  # $0.03 per 1K tokens
  effective_date: "2025-11-01T00:00:00Z"
  is_current: true

Pricing 2 (Claude 3.5 Sonnet):
  provider_id: "anthropic-id"
  model_name: "claude-3.5-sonnet"
  input_token_price_per_million: 3.00  # $0.003 per 1K tokens
  output_token_price_per_million: 15.00  # $0.015 per 1K tokens
  effective_date: "2025-11-01T00:00:00Z"
  is_current: true

Pricing 3 (Gemini 1.5 Pro):
  provider_id: "google-id"
  model_name: "gemini-1.5-pro"
  input_token_price_per_million: 3.50  # $0.0035 per 1K tokens
  output_token_price_per_million: 10.50  # $0.0105 per 1K tokens
  effective_date: "2025-11-01T00:00:00Z"
  is_current: true

Pricing 4 (Llama 2 70B):
  provider_id: "meta-id"
  model_name: "llama-2-70b"
  input_token_price_per_million: 0.75  # $0.00075 per 1K tokens
  output_token_price_per_million: 1.00  # $0.001 per 1K tokens
  effective_date: "2025-11-01T00:00:00Z"
  is_current: true
```

### Pricing Configuration (Margin Strategies)

```yaml
Configuration 1 (Free Tier - Fixed Percentage):
  tier: "free"
  margin_strategy: "fixed_percentage"
  margin_percentage: 50.00  # 50% margin on all vendors
  effective_date: "2025-11-01T00:00:00Z"
  is_active: true

Configuration 2 (Pro Tier - Tiered Margin):
  tier: "pro"
  margin_strategy: "tiered"
  # Margin decreases with volume:
  # 0-10M tokens/month: 40%
  # 10-50M tokens/month: 30%
  # 50M+ tokens/month: 20%
  margin_percentage: 40.00  # Default for under 10M
  effective_date: "2025-11-01T00:00:00Z"
  is_active: true

Configuration 3 (Enterprise - Dynamic Margin):
  tier: "enterprise_pro"
  margin_strategy: "dynamic"
  # Dynamic margin based on:
  # - Vendor pricing changes
  # - Market conditions
  # - Contract terms
  margin_percentage: 25.00  # Base dynamic margin
  effective_date: "2025-11-01T00:00:00Z"
  is_active: true

Configuration 4 (Perpetual License - No Margin):
  tier: "perpetual"
  margin_strategy: "fixed_percentage"
  margin_percentage: 0.00  # BYOK: Bring Your Own Key - No credit deductions
  effective_date: "2025-11-01T00:00:00Z"
  is_active: true
```

### Token Usage Ledger Examples

```yaml
Usage 1 (GPT-4 Turbo Inference):
  user_id: "pro-user-id"
  subscription_id: "sub-pro-001"
  model_pricing_id: "gpt-4-turbo-pricing-id"
  request_id: "req_20251108_001"
  input_tokens: 250
  output_tokens: 150
  total_cost_usd: 0.007  # (250 * 10 + 150 * 30) / 1,000,000 = 7000 / 1,000,000
  credits_deducted: 18  # 0.007 * 2500 credit_multiplier = 17.5 ≈ 18
  timestamp: "2025-11-08T10:30:00Z"

Usage 2 (Claude 3.5 Sonnet Inference):
  user_id: "pro-user-id"
  subscription_id: "sub-pro-001"
  model_pricing_id: "claude-3.5-sonnet-pricing-id"
  request_id: "req_20251108_002"
  input_tokens: 1500
  output_tokens: 800
  total_cost_usd: 0.0165  # (1500 * 3 + 800 * 15) / 1,000,000
  credits_deducted: 41  # Proportional to cost
  timestamp: "2025-11-08T11:15:00Z"

Usage 3 (Gemini 1.5 Pro - Large Input):
  user_id: "enterprise-user-id"
  subscription_id: "sub-ent-001"
  model_pricing_id: "gemini-1.5-pro-pricing-id"
  request_id: "req_20251108_003"
  input_tokens: 10000
  output_tokens: 2000
  total_cost_usd: 0.056  # (10000 * 3.5 + 2000 * 10.5) / 1,000,000 = 56000 / 1,000,000
  credits_deducted: 140  # 0.056 * 2500 = 140 credits
  timestamp: "2025-11-08T14:45:00Z"

Usage 4 (Llama 2 70B - Cost Effective):
  user_id: "free-user-id"
  subscription_id: null  # No subscription (free tier)
  model_pricing_id: "llama-2-70b-pricing-id"
  request_id: "req_20251108_004"
  input_tokens: 500
  output_tokens: 300
  total_cost_usd: 0.000675  # (500 * 0.75 + 300 * 1.00) / 1,000,000 = 675 / 1,000,000
  credits_deducted: 2  # 0.000675 * 2500 = 1.6875 ≈ 2 credits
  timestamp: "2025-11-08T16:20:00Z"
```

### Credit Deduction Ledger

```yaml
Deduction 1 (Inference):
  user_id: "pro-user-id"
  subscription_id: "sub-pro-001"
  amount: 16
  deduction_type: "inference"
  related_usage_id: "req_20251108_001"
  timestamp: "2025-11-08T10:30:00Z"

Deduction 2 (Fine Tuning):
  user_id: "enterprise-user-id"
  subscription_id: "sub-ent-001"
  amount: 500
  deduction_type: "fine_tuning"
  related_usage_id: "finetune_20251108_001"
  timestamp: "2025-11-08T12:00:00Z"

Deduction 3 (Embedding):
  user_id: "pro-user-id"
  subscription_id: "sub-pro-001"
  amount: 5
  deduction_type: "embedding"
  related_usage_id: "embed_20251108_001"
  timestamp: "2025-11-08T13:30:00Z"

Deduction 4 (Custom):
  user_id: "enterprise-user-id"
  subscription_id: "sub-ent-001"
  amount: 100
  deduction_type: "custom"
  related_usage_id: "custom_20251108_001"
  timestamp: "2025-11-08T15:00:00Z"
```

### Daily Summary Examples

```yaml
Token Usage Daily Summary (2025-11-08):
  user_id: "pro-user-id"
  date: "2025-11-08"
  model_name: "gpt-4-turbo"
  total_input_tokens: 2500
  total_output_tokens: 1200
  total_cost_usd: 0.066
  total_credits: 165

  ---
  user_id: "pro-user-id"
  date: "2025-11-08"
  model_name: "claude-3.5-sonnet"
  total_input_tokens: 5000
  total_output_tokens: 3000
  total_cost_usd: 0.060
  total_credits: 150

Credit Usage Daily Summary (2025-11-08):
  user_id: "pro-user-id"
  date: "2025-11-08"
  credits_allocated: 333  # 10,000 / 30 days
  credits_deducted: 315  # From all API calls
  credits_balance_eod: 9865  # After day's usage

  ---
  user_id: "enterprise-user-id"
  date: "2025-11-08"
  credits_allocated: 1667  # 50,000 / 30 days
  credits_deducted: 670  # From all API calls
  credits_balance_eod: 49580
```

### Margin Audit Log

```yaml
Audit 1 (Margin Increase):
  config_id: "pricing-config-pro-id"
  changed_by: "admin-user-id"
  old_margin: 35.00
  new_margin: 40.00
  reason: "Market conditions adjustment - reduced vendor costs"
  timestamp: "2025-11-01T09:00:00Z"

Audit 2 (Tiered Margin Update):
  config_id: "pricing-config-ent-id"
  changed_by: "finance-admin-id"
  old_margin: 30.00
  new_margin: 25.00
  reason: "Enterprise contract negotiation - Q4 pricing adjustment"
  timestamp: "2025-11-05T14:30:00Z"
```

---

## Plan 119: User-Role-Permission RBAC System

### Role Definitions

The Rephlo platform implements 6 hierarchical built-in roles with granular permission management. The following test data covers all roles with their default permissions.

```yaml
Role 1 (Super Admin):
  id: "role-super-admin-id"
  name: "super_admin"
  displayName: "Super Administrator"
  description: "Platform owner with unrestricted access"
  isSystemRole: true
  hierarchy: 1
  defaultPermissions:
    # Subscriptions (6)
    - "subscriptions.view"
    - "subscriptions.create"
    - "subscriptions.edit"
    - "subscriptions.cancel"
    - "subscriptions.reactivate"
    - "subscriptions.refund"
    # Licenses (6)
    - "licenses.view"
    - "licenses.create"
    - "licenses.activate"
    - "licenses.deactivate"
    - "licenses.suspend"
    - "licenses.revoke"
    # Coupons (7)
    - "coupons.view"
    - "coupons.create"
    - "coupons.edit"
    - "coupons.delete"
    - "coupons.approve_redemption"
    - "campaigns.create"
    - "campaigns.set_budget"
    # Credits (5)
    - "credits.view_balance"
    - "credits.view_history"
    - "credits.grant"
    - "credits.deduct"
    - "credits.adjust_expiration"
    # Users (7)
    - "users.view"
    - "users.edit_profile"
    - "users.suspend"
    - "users.unsuspend"
    - "users.ban"
    - "users.delete"
    - "users.impersonate"
    # Roles (6)
    - "roles.view"
    - "roles.create"
    - "roles.edit"
    - "roles.delete"
    - "roles.assign"
    - "roles.view_audit_log"
    # Analytics (4)
    - "analytics.view_dashboard"
    - "analytics.view_revenue"
    - "analytics.view_usage"
    - "analytics.export_data"

Role 2 (Admin):
  id: "role-admin-id"
  name: "admin"
  displayName: "Administrator"
  description: "Trusted operations lead with broad permissions"
  isSystemRole: true
  hierarchy: 2
  defaultPermissions:
    # Subscriptions (6)
    - "subscriptions.view"
    - "subscriptions.create"
    - "subscriptions.edit"
    - "subscriptions.cancel"
    - "subscriptions.reactivate"
    - "subscriptions.refund"
    # Licenses (6)
    - "licenses.view"
    - "licenses.create"
    - "licenses.activate"
    - "licenses.deactivate"
    - "licenses.suspend"
    - "licenses.revoke"
    # Coupons (7)
    - "coupons.view"
    - "coupons.create"
    - "coupons.edit"
    - "coupons.delete"
    - "coupons.approve_redemption"
    - "campaigns.create"
    - "campaigns.set_budget"
    # Credits (5)
    - "credits.view_balance"
    - "credits.view_history"
    - "credits.grant"
    - "credits.deduct"
    - "credits.adjust_expiration"
    # Users (7)
    - "users.view"
    - "users.edit_profile"
    - "users.suspend"
    - "users.unsuspend"
    - "users.ban"
    - "users.delete"
    # Roles (5)
    - "roles.view"
    - "roles.assign"
    - "roles.view_audit_log"
    # Analytics (4)
    - "analytics.view_dashboard"
    - "analytics.view_revenue"
    - "analytics.view_usage"
    - "analytics.export_data"

Role 3 (Operations/Ops):
  id: "role-ops-id"
  name: "ops"
  displayName: "Operations"
  description: "Day-to-day subscription and license management"
  isSystemRole: true
  hierarchy: 3
  defaultPermissions:
    # Subscriptions (5)
    - "subscriptions.view"
    - "subscriptions.create"
    - "subscriptions.edit"
    - "subscriptions.cancel"
    - "subscriptions.reactivate"
    # Licenses (5)
    - "licenses.view"
    - "licenses.create"
    - "licenses.activate"
    - "licenses.deactivate"
    # Coupons (5)
    - "coupons.view"
    - "coupons.create"
    - "coupons.edit"
    - "coupons.approve_redemption"
    - "campaigns.create"
    # Credits (3)
    - "credits.view_balance"
    - "credits.view_history"
    - "credits.grant"  # Max $100 per transaction
    # Users (4)
    - "users.view"
    - "users.edit_profile"
    - "users.suspend"
    - "users.unsuspend"
    # Roles (1)
    - "roles.view"
    # Analytics (3)
    - "analytics.view_dashboard"
    - "analytics.view_revenue"
    - "analytics.view_usage"

Role 4 (Support):
  id: "role-support-id"
  name: "support"
  displayName: "Customer Support"
  description: "Customer support with read-mostly + limited credit grants"
  isSystemRole: true
  hierarchy: 4
  defaultPermissions:
    # Subscriptions (1)
    - "subscriptions.view"
    # Licenses (1)
    - "licenses.view"
    # Coupons (1)
    - "coupons.view"
    # Credits (3)
    - "credits.view_balance"
    - "credits.view_history"
    - "credits.grant"  # Max $50 per transaction
    # Users (3)
    - "users.view"
    - "users.unsuspend"
    # Roles (1)
    - "roles.view"
    # Analytics (3)
    - "analytics.view_dashboard"
    - "analytics.view_usage"

Role 5 (Analyst):
  id: "role-analyst-id"
  name: "analyst"
  displayName: "Business Analyst"
  description: "Business intelligence and reporting (read-only)"
  isSystemRole: true
  hierarchy: 5
  defaultPermissions:
    # Subscriptions (1)
    - "subscriptions.view"
    # Licenses (1)
    - "licenses.view"
    # Coupons (1)
    - "coupons.view"
    # Credits (2)
    - "credits.view_balance"
    - "credits.view_history"
    # Users (1)
    - "users.view"
    # Roles (1)
    - "roles.view"
    # Analytics (4)
    - "analytics.view_dashboard"
    - "analytics.view_revenue"
    - "analytics.view_usage"
    - "analytics.export_data"  # Anonymized only

Role 6 (Auditor):
  id: "role-auditor-id"
  name: "auditor"
  displayName: "Auditor"
  description: "Compliance and audit trail review (read-only)"
  isSystemRole: true
  hierarchy: 6
  defaultPermissions:
    # Subscriptions (1)
    - "subscriptions.view"
    # Licenses (1)
    - "licenses.view"
    # Roles (1)
    - "roles.view"
    # Roles Audit (1)
    - "roles.view_audit_log"
    # Analytics (1)
    - "analytics.view_dashboard"
```

### User Role Assignments

```yaml
Assignment 1 (Admin Role):
  id: "assignment-admin-id"
  userId: "admin-test-id"
  roleId: "role-admin-id"
  assignedBy: "super-admin-id"
  assignedAt: "2025-10-01T00:00:00Z"
  expiresAt: null  # Permanent
  isActive: true
  permissionOverrides: []
  assignmentReason: "Admin team member for operations"
  notifyUser: true

Assignment 2 (Ops Role):
  id: "assignment-ops-id"
  userId: "ops-user-id"
  roleId: "role-ops-id"
  assignedBy: "admin-test-id"
  assignedAt: "2025-10-15T00:00:00Z"
  expiresAt: null  # Permanent
  isActive: true
  permissionOverrides: []
  assignmentReason: "Operations team - subscription management"
  notifyUser: true

Assignment 3 (Support Role):
  id: "assignment-support-id"
  userId: "support-user-id"
  roleId: "role-support-id"
  assignedBy: "admin-test-id"
  assignedAt: "2025-11-01T00:00:00Z"
  expiresAt: null  # Permanent
  isActive: true
  permissionOverrides: []
  assignmentReason: "Support team - customer assistance"
  notifyUser: true

Assignment 4 (Analyst Role):
  id: "assignment-analyst-id"
  userId: "analyst-user-id"
  roleId: "role-analyst-id"
  assignedBy: "admin-test-id"
  assignedAt: "2025-11-05T00:00:00Z"
  expiresAt: null  # Permanent
  isActive: true
  permissionOverrides: []
  assignmentReason: "Business intelligence and reporting"
  notifyUser: true

Assignment 5 (Auditor Role):
  id: "assignment-auditor-id"
  userId: "auditor-user-id"
  roleId: "role-auditor-id"
  assignedBy: "admin-test-id"
  assignedAt: "2025-11-08T00:00:00Z"
  expiresAt: null  # Permanent
  isActive: true
  permissionOverrides: []
  assignmentReason: "Compliance and audit trail monitoring"
  notifyUser: true

Assignment 6 (Temporary Analyst - 24 hours):
  id: "assignment-temp-analyst-id"
  userId: "ops-user-id"
  roleId: "role-analyst-id"
  assignedBy: "admin-test-id"
  assignedAt: "2025-11-09T10:00:00Z"
  expiresAt: "2025-11-10T10:00:00Z"  # 24-hour temporary
  isActive: true
  permissionOverrides: []
  assignmentReason: "Temporary analytics access for Q4 planning"
  notifyUser: true
```

### Permission Override Examples

```yaml
Override 1 (Grant Temporary Emergency License Revocation):
  user_id: "ops-user-id"
  role_assignment_id: "assignment-ops-id"
  permission: "licenses.revoke"
  action: "grant"
  expiresAt: "2025-11-10T23:59:59Z"  # 24-hour grant
  reason: "Emergency license fraud investigation - user account 12345"
  grantedBy: "admin-test-id"
  grantedAt: "2025-11-09T14:30:00Z"

Override 2 (Revoke Default Credit Grant During Training):
  user_id: "support-user-id"
  role_assignment_id: "assignment-support-id"
  permission: "credits.grant"
  action: "revoke"
  expiresAt: null  # Permanent revocation
  reason: "Training period - restricted until Nov 30"
  grantedBy: "admin-test-id"
  grantedAt: "2025-11-09T09:00:00Z"

Override 3 (Grant Temporary Subscription Refund to Support):
  user_id: "support-user-id"
  role_assignment_id: "assignment-support-id"
  permission: "subscriptions.refund"
  action: "grant"
  expiresAt: "2025-11-30T23:59:59Z"  # Month-long grant
  reason: "Special project: legacy customer migration support"
  grantedBy: "admin-test-id"
  grantedAt: "2025-11-01T08:00:00Z"

Override 4 (Grant Temporary User Impersonation for Support):
  user_id: "support-user-id"
  role_assignment_id: "assignment-support-id"
  permission: "users.impersonate"
  action: "grant"
  expiresAt: "2025-11-16T23:59:59Z"  # 1-week grant
  reason: "Temporary authorization to debug customer account issues"
  grantedBy: "super-admin-id"
  grantedAt: "2025-11-09T11:00:00Z"
```

### Role Change Log Examples

```yaml
ChangeLog 1 (Role Assignment):
  id: "changelog-001-id"
  targetUserId: "ops-user-id"
  changedBy: "admin-test-id"
  action: "role_assigned"
  oldRoleId: null
  newRoleId: "role-ops-id"
  oldPermissions: []
  newPermissions: ["subscriptions.view", "subscriptions.create", ...]  # 25 permissions
  reason: "New team member - operations"
  ipAddress: "203.0.113.45"
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  timestamp: "2025-10-15T08:30:00Z"

ChangeLog 2 (Role Change):
  id: "changelog-002-id"
  targetUserId: "support-user-id"
  changedBy: "admin-test-id"
  action: "role_changed"
  oldRoleId: "role-support-id"
  newRoleId: "role-ops-id"
  oldPermissions: [12 permissions from Support role]
  newPermissions: [25 permissions from Ops role]
  reason: "Promotion from Support to Operations"
  ipAddress: "203.0.113.45"
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
  timestamp: "2025-11-01T10:00:00Z"

ChangeLog 3 (Permission Override Granted):
  id: "changelog-003-id"
  targetUserId: "ops-user-id"
  changedBy: "admin-test-id"
  action: "permission_override_granted"
  oldRoleId: "role-ops-id"
  newRoleId: "role-ops-id"  # Role unchanged
  permissionOverrideAdded:
    permission: "licenses.revoke"
    action: "grant"
    expiresAt: "2025-11-10T23:59:59Z"
    reason: "Emergency fraud investigation"
    grantedBy: "admin-test-id"
    grantedAt: "2025-11-09T14:30:00Z"
  oldPermissions: [25 permissions without licenses.revoke]
  newPermissions: [26 permissions with licenses.revoke]
  reason: "Emergency investigation authorization"
  ipAddress: "203.0.113.45"
  userAgent: "Mozilla/5.0"
  timestamp: "2025-11-09T14:30:00Z"

ChangeLog 4 (Permission Override Expired):
  id: "changelog-004-id"
  targetUserId: "ops-user-id"
  changedBy: "system"
  action: "permission_override_expired"
  oldRoleId: "role-ops-id"
  newRoleId: "role-ops-id"
  permissionOverrideRemoved:
    permission: "licenses.revoke"
    action: "grant"
    expiresAt: "2025-11-10T23:59:59Z"  # Expired
    reason: "Emergency fraud investigation"
    grantedBy: "admin-test-id"
    grantedAt: "2025-11-09T14:30:00Z"
  oldPermissions: [26 permissions with licenses.revoke]
  newPermissions: [25 permissions without licenses.revoke]
  reason: "Automatic expiration of temporary override"
  ipAddress: "system"
  userAgent: "background-job"
  timestamp: "2025-11-10T23:59:59Z"

ChangeLog 5 (Permission Revoked):
  id: "changelog-005-id"
  targetUserId: "support-user-id"
  changedBy: "admin-test-id"
  action: "permission_override_revoked"
  oldRoleId: "role-support-id"
  newRoleId: "role-support-id"
  permissionOverrideRemoved:
    permission: "credits.grant"
    action: "revoke"
    expiresAt: null
    reason: "Training period - restricted"
    grantedBy: "admin-test-id"
    grantedAt: "2025-11-09T09:00:00Z"
  oldPermissions: [11 permissions without credits.grant]
  newPermissions: [12 permissions with credits.grant]
  reason: "Training period ended - restoring default permissions"
  ipAddress: "203.0.113.45"
  userAgent: "Mozilla/5.0"
  timestamp: "2025-11-30T17:00:00Z"
```

### RBAC Test Scenarios

#### Scenario 1: Basic Role Permission Check
**Flow**: Assign Ops role → Verify permissions allowed → Verify permissions denied

```
1. User: ops-user-id assigned role: ops
2. Check allowed permission: subscriptions.view
   ✓ Expected: ALLOWED (Ops has this permission)
3. Check allowed permission: subscriptions.create
   ✓ Expected: ALLOWED (Ops has this permission)
4. Check denied permission: subscriptions.refund
   ✓ Expected: DENIED (Only Admin+ has this)
5. Check denied permission: roles.create
   ✓ Expected: DENIED (Only Super Admin has this)
```

#### Scenario 2: Permission Override - Temporary Grant
**Flow**: Ops role user → Grant temporary license.revoke → Verify access → Override expires → Access denied

```
1. User: ops-user-id assigned role: ops
2. User tries licenses.revoke
   ❌ Expected: DENIED (Ops doesn't have this)
3. Admin grants temporary override for 24 hours
   - Permission: licenses.revoke
   - Action: grant
   - Expires: 2025-11-10T23:59:59Z
4. User tries licenses.revoke again
   ✓ Expected: ALLOWED (Override is active)
5. Wait for override expiration
6. User tries licenses.revoke
   ❌ Expected: DENIED (Override expired)
```

#### Scenario 3: Permission Override - Revoke Default
**Flow**: Support role user → Revoke credits.grant → Verify access denied → Restore permission

```
1. User: support-user-id assigned role: support
2. User tries credits.grant
   ✓ Expected: ALLOWED (Support has this by default)
3. Admin revokes permission (permanent)
   - Permission: credits.grant
   - Action: revoke
   - Expires: null (permanent)
   - Reason: Training period restriction
4. User tries credits.grant
   ❌ Expected: DENIED (Override revokes it)
5. Admin restores permission at end of training
6. User tries credits.grant
   ✓ Expected: ALLOWED (Override removed)
```

#### Scenario 4: Multiple Roles - Permission Union
**Flow**: Assign user Ops + temporary Analyst → Effective permissions = union of both

```
1. User: ops-user-id has role: ops (25 permissions)
2. Assign temporary role: analyst (8 permissions) for 24 hours
3. User's effective permissions = ops + analyst
   - Includes all Ops permissions
   - Includes all Analyst permissions (added: revenue analytics)
   - Total: union of both sets
4. Check permission: analytics.view_revenue
   ✓ Expected: ALLOWED (From Analyst role)
5. Wait for temporary Analyst role to expire
6. User reverts to just Ops role
7. Check permission: analytics.view_revenue
   ❌ Expected: DENIED (Only in Analyst role, which expired)
```

#### Scenario 5: Role Hierarchy Enforcement
**Flow**: Support user → Try to assign Admin role → Denied → Admin user → Assign Ops → Allowed

```
1. User: support-user-id (Support role)
2. Try to assign Admin role to another user
   ❌ Expected: PERMISSION_DENIED (Support cannot assign roles)
3. User: admin-test-id (Admin role)
4. Try to assign Ops role to another user
   ✓ Expected: SUCCESS (Admin can assign lower roles)
5. Try to assign Super Admin role
   ❌ Expected: DENIED (Admin cannot assign Super Admin)
```

#### Scenario 6: Approval Workflow for Critical Operations
**Flow**: Ops user → Try critical operation → Denied → Admin approves → Request succeeds

```
1. User: ops-user-id (Ops role)
2. Request: subscriptions.refund (critical operation)
   ❌ Expected: DENIED (Ops doesn't have permission)
3. User: admin-test-id (Admin role)
4. Request: subscriptions.refund
   ✓ Expected: SUCCESS (Admin has permission with approval)
5. Audit log records: Refund processed by admin-test-id
   - Action: subscriptions.refund
   - Amount: $99.99
   - User: pro-user-id
   - Timestamp: logged
```

#### Scenario 7: Audit Log Completeness
**Flow**: Multiple role changes → Verify complete audit trail → Check IP and user-agent tracking

```
1. Admin: admin-test-id assigns Ops role to ops-user-id
   ✓ Log created: role_assigned
   ✓ IP tracked: 203.0.113.45
   ✓ User-agent: tracked
2. Change from Ops to different role
   ✓ Log created: role_changed
   ✓ Old permissions: captured
   ✓ New permissions: captured
3. Grant temporary override
   ✓ Log created: permission_override_granted
   ✓ Expiration: tracked
   ✓ Reason: documented
4. Override expires automatically
   ✓ Log created: permission_override_expired
   ✓ Action: automatic (system user)
5. Query audit log for ops-user-id
   ✓ All 4 logs visible in order
   ✓ Complete audit trail
```

---

## Core Test Users

### Seeded User Accounts

```yaml
User 1 (Free Tier):
  email: free.user@example.com
  firstName: Free
  lastName: User
  username: freeuser
  password: TestPassword123!
  role: user
  emailVerified: true
  authProvider: local
  isActive: true
  subscription_tier: free
  subscription_status: active
  mfaEnabled: false

User 2 (Pro Tier):
  email: pro.user@example.com
  firstName: Pro
  lastName: User
  username: prouser
  password: TestPassword123!
  role: user
  emailVerified: true
  authProvider: local
  isActive: true
  subscription_tier: pro
  subscription_status: active
  mfaEnabled: false

User 3 (Admin with MFA):
  email: admin.test@rephlo.ai
  firstName: Admin
  lastName: Test
  username: admintest
  password: AdminPassword123!
  role: admin
  emailVerified: true
  authProvider: local
  isActive: true
  subscription_tier: pro
  subscription_status: active
  mfaEnabled: true
  mfaMethod: totp

User 4 (Google OAuth):
  email: google.user@example.com
  firstName: Google
  lastName: User
  username: googleuser
  googleId: 118094742123456789012
  role: user
  emailVerified: true
  authProvider: google
  isActive: true
  subscription_tier: pro
  subscription_status: active
  mfaEnabled: false

User 5 (Operations Lead - Ops Role):
  email: ops.user@rephlo.ai
  firstName: Operations
  lastName: Lead
  username: opsuser
  password: OpsPassword123!
  role: user
  emailVerified: true
  authProvider: local
  isActive: true
  subscription_tier: pro
  subscription_status: active
  mfaEnabled: false
  rbacRole: ops

User 6 (Support Agent - Support Role):
  email: support.user@rephlo.ai
  firstName: Support
  lastName: Agent
  username: supportuser
  password: SupportPassword123!
  role: user
  emailVerified: true
  authProvider: local
  isActive: true
  subscription_tier: pro
  subscription_status: active
  mfaEnabled: false
  rbacRole: support

User 7 (Business Analyst - Analyst Role):
  email: analyst.user@rephlo.ai
  firstName: Business
  lastName: Analyst
  username: analystuser
  password: AnalystPassword123!
  role: user
  emailVerified: true
  authProvider: local
  isActive: true
  subscription_tier: pro
  subscription_status: active
  mfaEnabled: false
  rbacRole: analyst

User 8 (Compliance Auditor - Auditor Role):
  email: auditor.user@rephlo.ai
  firstName: Compliance
  lastName: Auditor
  username: auditoruser
  password: AuditorPassword123!
  role: user
  emailVerified: true
  authProvider: local
  isActive: true
  subscription_tier: pro
  subscription_status: active
  mfaEnabled: false
  rbacRole: auditor
```

---

## Seeding the Database

### Prerequisites

1. PostgreSQL database running and accessible
2. Database connection configured in `backend/.env`
3. All 14 Prisma migrations applied: `npx prisma migrate dev`

### Run Seed Script

```bash
# From backend directory
cd backend

# Run seed script
npm run db:seed

# Or use Prisma directly
npx prisma db seed

# To reset and reseed
npm run db:reset
```

### Expected Output

```
🌱 Starting comprehensive database seed...

Creating OAuth clients...
✓ Created/Updated 3 OAuth clients
  OAuth Clients Details:
    - Rephlo Desktop App (Test) (desktop-app-test)
    - POC Client (Test) (poc-client-test)
    - Rephlo Web App (Test) (web-app-test)

Creating user personas...
✓ Created/Updated 4 user personas
  User Personas Details:
    - free.user@example.com (Role: user)
    - pro.user@example.com (Role: user)
    - admin.test@rephlo.ai (Role: admin)
    - google.user@example.com (Role: user)

Creating subscriptions...
✓ Created/Updated 4 subscriptions

Creating credit allocations...
✓ Created/Updated 4 credit records

Creating download records...
✓ Created/Updated 5 download records

Creating feedback entries...
✓ Created/Updated 5 feedback entries

Creating diagnostic records...
✓ Created/Updated 3 diagnostic records

Creating app version records...
✓ Created/Updated 3 app version records

╔════════════════════════════════════════════════════════════════╗
║                  🌱 DATABASE SEED COMPLETED ✅                  ║
╚════════════════════════════════════════════════════════════════╝

📊 SEED SUMMARY BY CATEGORY:

🔐 OAuth & Identity:
   OAuth Clients: 3
   Users:         4

💳 Subscriptions & Billing:
   Subscriptions: 4
   Credit Pools:  4

📈 Legacy Branding:
   Downloads:     5
   Feedbacks:     5
   Diagnostics:   3
   App Versions:  3

===============================================================

✅ Next Steps:
   1. Verify OAuth clients are loaded in OIDC provider
   2. Update POC-Client with poc-client-test credentials
   3. Run integration tests with seeded data
   4. Validate subscription and credit tiers
```

---

## Comprehensive Test Scenarios

### Scenario 1: Free User Tier Usage
**Flow**: Free tier → Model access → Credit deduction → Monthly reset

```
1. Login: free.user@example.com / TestPassword123!
2. Verify subscription tier: free
3. Check initial credits: 100
4. Call model API: GPT-4 Turbo (cost: $0.0065 ≈ 16 credits)
5. Verify credits after: 84
6. End of month: Verify automatic reset to 100
```

### Scenario 2: Pro User Subscription Payment
**Flow**: Subscription created → Invoice generated → Payment processed → Credit allocated

```
1. Pro subscription created: $99.99/month
2. First billing cycle: 2025-11-01 → 2025-11-30
3. Monthly credit allocation: 10,000
4. Payment success: Stripe charge approved
5. Invoice generated and marked paid
6. Credits reflected in user account
```

### Scenario 3: Perpetual License with Multiple Device Activations
**Flow**: License purchase → Activate device 1 (Windows) → Activate device 2 (Mac) → API call from device 1

```
1. Purchase perpetual license: $299.99 for v1.0.0
2. Activate on Windows desktop
   - Machine fingerprint: sha256(CPU:i7 | MAC:00:1A | DISK:SER123 | OS:Win10)
   - Status: active
3. Activate on MacBook
   - Machine fingerprint: sha256(CPU:M1 | MAC:AA:BB | DISK:SERABC | OS:macOS14)
   - Status: active
4. API call from Windows
   - License check: Valid for 3 devices, 2 active ✓
   - API request allowed
   - No credit deduction (BYOK mode)
5. License management: 1 device slot remaining
```

### Scenario 4: Mid-Cycle Subscription Upgrade with Proration
**Flow**: Pro tier user → Upgrade to Enterprise → Proration calculated → Charged additional amount

```
1. Current subscription: Pro tier, $99.99/month, started 2025-11-01
2. Upgrade request on 2025-11-15 (15 days used, 15 days remaining)
3. Proration calculation:
   - Unused credit value: $99.99 × 15/30 = $49.99 (refund)
   - Enterprise prorated cost: $299.99 × 15/30 = $149.99 (charge)
   - Net charge: $149.99 - $49.99 = $100.00
4. Charge applied to account
5. Credits updated: Enterprise allocation for remaining 15 days
6. New billing cycle: 2025-12-15 (Enterprise full month)
```

### Scenario 5: Coupon Redemption with Fraud Detection
**Flow**: Apply coupon → Fraud check → Success → Discount applied

```
1. Black Friday coupon: BF2025-30OFF (30% discount)
2. User attempts redemption: pro.user@example.com
3. Validation checks:
   ✓ Coupon valid (2025-11-24 to 2025-11-30)
   ✓ User eligible (Pro tier)
   ✓ Not used before (max_uses_per_user: 1)
   ✓ Purchase amount: $99.99 > $50 minimum
4. Fraud detection: NO FRAUD
   - IP: 203.0.113.45 (legitimate range)
   - User-agent: Standard browser
   - Velocity: 1 attempt (normal)
5. Discount applied: $99.99 × 30% = $29.99 savings
6. Final charge: $69.99
7. Coupon usage recorded: 1/1 uses per user
```

### Scenario 6: Token Usage with Vendor Pricing & Margin Calculation
**Flow**: API call → Token count → Vendor cost → Margin applied → Credit deduction

```
1. User calls GPT-4 Turbo endpoint
   - Input tokens: 500
   - Output tokens: 300
2. Vendor pricing lookup:
   - Input: 500 × $10/M = $0.005
   - Output: 300 × $30/M = $0.009
   - Base cost: $0.014
3. Apply Pro tier margin (40%):
   - Customer cost: $0.014 × 1.4 = $0.0196
4. Convert to credits:
   - Credit multiplier: 2500 credits per $1
   - Credits deducted: 0.0196 × 2500 = 49 credits
5. Record usage:
   - TokenUsageLedger: track exact usage for audit
   - CreditDeductionLedger: track credit flow
   - DailySummary: aggregate daily metrics
6. User credit balance: Updated immediately
```

### Scenario 7: Failed Payment & Dunning Management
**Flow**: Invoice created → Payment failed → Dunning attempt 1 → Attempt 2 → Resolution

```
1. Monthly invoice generated: $99.99 (2025-11-01)
2. Payment attempt 1: DECLINED (insufficient funds)
   - Dunning attempt 1: 2025-11-02 ❌
   - Next retry: 2025-11-05
3. Payment attempt 2: DECLINED (card expired)
   - Dunning attempt 2: 2025-11-05 ❌
   - Next retry: 2025-11-08
4. User updates payment method: 2025-11-06
5. Manual payment: 2025-11-07 APPROVED ✓
6. Invoice marked as paid
7. Subscription continues normally
8. Dunning attempts concluded
```

---

## Enum Reference

### Subscription Status
- `active`: User is actively subscribed and can use services
- `trial`: User is in trial period
- `past_due`: Payment failed, awaiting resolution
- `grace_period`: Past due with grace period for payment
- `cancelled`: User cancelled subscription
- `paused`: Subscription temporarily paused

### Subscription Tier
- `free`: Free tier with limited features
- `pro`: Professional tier
- `pro_max`: Professional max tier
- `enterprise_pro`: Enterprise professional tier
- `enterprise_max`: Enterprise maximum tier
- `perpetual`: Perpetual license (one-time purchase)

### License Status
- `pending`: License purchased but not yet activated
- `active`: License is active and can be used
- `suspended`: License temporarily suspended
- `revoked`: License revoked (e.g., due to refund)
- `expired`: License eligibility expired

### Activation Status
- `active`: Device is actively using license
- `deactivated`: Device deactivated by user
- `replaced`: Device replaced with new one

### Upgrade Status
- `pending`: Upgrade purchased, pending completion
- `completed`: Upgrade completed successfully
- `failed`: Upgrade failed (payment or system issue)
- `refunded`: Upgrade refunded to user

### Proration Change Type
- `upgrade`: User upgraded to higher tier
- `downgrade`: User downgraded to lower tier
- `cancellation`: User cancelled subscription mid-cycle
- `reactivation`: User reactivated cancelled subscription

### Proration Status
- `pending`: Proration calculated, pending application
- `applied`: Proration applied successfully
- `failed`: Proration application failed
- `reversed`: Proration reversed (e.g., refund)

### Coupon Type
- `percentage_discount`: Discount as percentage (e.g., 30% off)
- `fixed_amount_discount`: Discount as fixed amount (e.g., $25 off)
- `tier_specific_discount`: Discount specific to tier
- `duration_bonus`: Additional credit or service duration
- `byok_migration`: Bring-Your-Own-Key migration discount

### Discount Type
- `percentage`: Percentage-based discount
- `fixed_amount`: Fixed dollar amount discount
- `credits`: Credit bonus
- `months_free`: Free months of service

### Campaign Type
- `seasonal`: Seasonal promotion (e.g., Black Friday)
- `win_back`: Campaign to re-engage churned users
- `referral`: Referral program
- `promotional`: General promotional campaign
- `early_bird`: Early adoption promotion

### Redemption Status
- `success`: Coupon successfully redeemed
- `failed`: Coupon redemption failed
- `reversed`: Coupon redemption reversed (refund)
- `pending`: Redemption pending processing

### Fraud Detection Type
- `velocity_abuse`: Multiple attempts in short time window
- `ip_switching`: Requests from multiple IPs in short time
- `bot_pattern`: Suspicious behavior pattern (autofill, no interaction)
- `device_fingerprint_mismatch`: Device doesn't match expected fingerprint
- `stacking_abuse`: Multiple coupons stacked inappropriately

### Fraud Severity
- `low`: Minor concern, monitor
- `medium`: Moderate concern, may block
- `high`: High concern, likely block
- `critical`: Critical concern, block immediately

### Validation Rule Type
- `first_time_user_only`: Coupon valid only for first-time users
- `specific_email_domain`: Whitelist specific email domains
- `minimum_credit_balance`: User must have minimum credits
- `exclude_refunded_users`: Exclude users refunded in time period
- `require_payment_method`: Require valid payment method on file

### Vendor Name
- `openai`: OpenAI (GPT-4, GPT-3.5)
- `anthropic`: Anthropic (Claude models)
- `google`: Google (Gemini models)
- `meta`: Meta (Llama models)
- `mistral`: Mistral (Mistral models)
- `cohere`: Cohere (Command models)

### Margin Strategy
- `fixed_percentage`: Fixed margin % for all tiers/volumes
- `tiered`: Margin decreases with higher usage volumes
- `dynamic`: Margin adjusted based on market conditions

### Deduction Type
- `inference`: Standard API inference call
- `embedding`: Text embedding operation
- `fine_tuning`: Fine-tuning operation (higher cost)
- `custom`: Custom operation or bulk request

---

## Data Reset Procedures

### Complete Database Reset (Destructive)

```bash
# Warning: This will delete ALL data
cd backend

# Reset migrations and reseed
npm run db:reset

# Alternative: Manual reset
npx prisma migrate reset
npx prisma db seed
```

### Selective Data Reset

```bash
# Delete test data without losing schema
npx prisma db execute --stdin < ./reset-test-data.sql

# SQL script to reset test data while keeping schema:
-- Delete in dependency order
DELETE FROM coupon_redemption WHERE 1=1;
DELETE FROM coupon_usage_limit WHERE 1=1;
DELETE FROM coupon_fraud_detection WHERE 1=1;
DELETE FROM coupon_validation_rule WHERE 1=1;
DELETE FROM coupon WHERE 1=1;
DELETE FROM coupon_campaign WHERE 1=1;
DELETE FROM proration_event WHERE 1=1;
DELETE FROM version_upgrade WHERE 1=1;
DELETE FROM license_activation WHERE 1=1;
DELETE FROM perpetual_license WHERE 1=1;
DELETE FROM token_usage_ledger WHERE 1=1;
DELETE FROM credit_deduction_ledger WHERE 1=1;
DELETE FROM token_usage_daily_summary WHERE 1=1;
DELETE FROM credit_usage_daily_summary WHERE 1=1;
DELETE FROM dunning_attempt WHERE 1=1;
DELETE FROM payment_transaction WHERE 1=1;
DELETE FROM billing_invoice WHERE 1=1;
DELETE FROM credit_allocation WHERE 1=1;
DELETE FROM subscription_monetization WHERE 1=1;
DELETE FROM webhook_logs WHERE 1=1;
DELETE FROM webhook_configs WHERE 1=1;
DELETE FROM user_credit_balance WHERE 1=1;
DELETE FROM subscriptions WHERE 1=1;
DELETE FROM credits WHERE 1=1;
DELETE FROM users WHERE email NOT IN ('admin@system');
```

### Reseed After Reset

```bash
# After deletion, run seed
npm run db:seed

# Verify seed success
npm run db:seed:verify
```

---

## Implementation Notes

### Schema Constraints to Validate

✅ Foreign Key Integrity
- All user references point to valid users
- All subscription references point to valid subscriptions_monetization records
- All coupon references point to valid coupons
- All license references point to valid perpetual_licenses

✅ Unique Constraints
- Coupon codes are unique
- License keys are unique
- Stripe customer IDs are unique per subscription
- Machine fingerprint + license combination is unique (no duplicate activations)

✅ Enum Values Match
- subscription_tier values: free, pro, pro_max, enterprise_pro, enterprise_max, perpetual
- All coupon_type values from migration
- All vendor_name values from migration
- All deduction_type values from migration

✅ Decimal Precision
- All prices are stored as DECIMAL(10,2) for exact money calculations
- Margin percentages as DECIMAL(5,2)
- Token prices as DECIMAL(10,6) for precision

### Testing Checklist

**OAuth & Authentication**:
- [ ] OAuth clients authenticate correctly
- [ ] Users can login with correct credentials
- [ ] MFA verification works for admin user

**Subscriptions & Billing**:
- [ ] Subscriptions render correctly with tiers
- [ ] Credits allocate monthly automatically
- [ ] Proration calculates correctly for mid-cycle changes
- [ ] Dunning attempts schedule and retry correctly

**Perpetual Licensing**:
- [ ] License activation enforces 3-device limit
- [ ] Machine fingerprint prevents duplicate activations
- [ ] Version upgrades apply pricing correctly

**Coupons & Discounts**:
- [ ] Coupons apply correctly with fraud detection
- [ ] Campaign budgets are tracked accurately
- [ ] Validation rules enforce restrictions

**Token-to-Credit Conversion**:
- [ ] Token usage converts to credits with margins
- [ ] Daily summaries aggregate correctly
- [ ] Vendor pricing changes update margin calculations

**RBAC & Permissions**:
- [ ] Role assignments grant correct default permissions
- [ ] Permission overrides grant/revoke as expected
- [ ] Temporary overrides expire automatically
- [ ] Multiple roles compute permission union correctly
- [ ] Role hierarchy enforcement denies invalid assignments
- [ ] Audit logs record all role changes with IP/user-agent
- [ ] Support user cannot perform Ops operations
- [ ] Admin user can assign lower roles but not Super Admin
- [ ] Permission check correctly identifies approved operations

---

## Maintenance Schedule

**Weekly**:
- Review permission override expirations
- Monitor audit log for anomalies

**Monthly**:
- Review and update pricing tiers based on vendor costs
- Audit fraud detection thresholds and adjust if needed
- Verify role assignments are current and valid

**Quarterly**:
- Review coupon campaign performance and ROI
- Audit role changes and permission overrides
- Review RBAC permission boundaries

**Bi-Annually**:
- Analyze permission usage patterns
- Identify unused roles or permissions

**Annually**:
- Plan perpetual license upgrade pricing strategy
- Review 7-year audit log retention policy
- Assess role hierarchy and permission structure

---

## Support & Questions

For questions about test data:
1. Check enum definitions in this document
2. Review migration files for schema details
3. Check seed.ts for current seeding logic
4. File issues on project tracker with specific scenario

---

**Last Updated**: November 2025
**Next Review**: December 2025
**Responsibility**: QA & Product Teams
