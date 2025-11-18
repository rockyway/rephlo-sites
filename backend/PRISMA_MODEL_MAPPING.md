# Prisma Model Name Reference

**CRITICAL**: Use this exact mapping when accessing Prisma models. The Prisma client property name matches the model name in `schema.prisma` EXACTLY.

## Complete Model Mapping (52 models)

### Core User & Auth Models
| Schema Model Name | Prisma Client Access | Type Import |
|-------------------|---------------------|-------------|
| `users` | `prisma.users` | `users` |
| `user_preferences` | `prisma.user_preferences` | `user_preferences` |
| `user_role_assignment` | `prisma.user_role_assignment` | `user_role_assignment` |
| `user_suspensions` | `prisma.user_suspensions` | `user_suspensions` |
| `user_credit_balance` | `prisma.user_credit_balance` | `user_credit_balance` |
| `role` | `prisma.role` | `role` |
| `permission` | `prisma.permission` | `permission` |
| `permission_override` | `prisma.permission_override` | `permission_override` |
| `role_change_log` | `prisma.role_change_log` | `role_change_log` |

### Subscription & Billing Models
| Schema Model Name | Prisma Client Access | Type Import |
|-------------------|---------------------|-------------|
| `subscriptions` | `prisma.subscriptions` | `subscriptions` |
| `subscription_monetization` | `prisma.subscription_monetization` | `subscription_monetization` |
| `subscription_tier_config` | `prisma.subscription_tier_config` | `subscription_tier_config` |
| `billing_invoice` | `prisma.billing_invoice` | `billing_invoice` |
| `payment_transaction` | `prisma.payment_transaction` | `payment_transaction` |
| `dunning_attempt` | `prisma.dunning_attempt` | `dunning_attempt` |
| `proration_event` | `prisma.proration_event` | `proration_event` |

### Credit System Models
| Schema Model Name | Prisma Client Access | Type Import |
|-------------------|---------------------|-------------|
| `credits` | `prisma.credits` | `credits` |
| `credit_allocation` | `prisma.credit_allocation` | `credit_allocation` |
| `credit_deduction_ledger` | `prisma.credit_deduction_ledger` | `credit_deduction_ledger` |
| `credit_usage_daily_summary` | `prisma.credit_usage_daily_summary` | `credit_usage_daily_summary` |

### Coupon System Models (ALL SINGULAR!)
| Schema Model Name | Prisma Client Access | Type Import |
|-------------------|---------------------|-------------|
| `coupon` | `prisma.coupon` ⚠️ SINGULAR | `coupon` |
| `coupon_redemption` | `prisma.coupon_redemption` ⚠️ SINGULAR | `coupon_redemption` |
| `coupon_usage_limit` | `prisma.coupon_usage_limit` ⚠️ SINGULAR | `coupon_usage_limit` |
| `coupon_fraud_detection` | `prisma.coupon_fraud_detection` ⚠️ SINGULAR | `coupon_fraud_detection` |
| `coupon_campaign` | `prisma.coupon_campaign` | `coupon_campaign` |
| `coupon_analytics_snapshot` | `prisma.coupon_analytics_snapshot` | `coupon_analytics_snapshot` |
| `coupon_validation_rule` | `prisma.coupon_validation_rule` | `coupon_validation_rule` |
| `campaign_coupon` | `prisma.campaign_coupon` | `campaign_coupon` |

### Model & Provider Models
| Schema Model Name | Prisma Client Access | Type Import |
|-------------------|---------------------|-------------|
| `models` | `prisma.models` | `models` |
| `providers` | `prisma.providers` | `providers` |
| `model_provider_pricing` | `prisma.model_provider_pricing` | `model_provider_pricing` |
| `model_tier_audit_logs` | `prisma.model_tier_audit_logs` | `model_tier_audit_logs` |

### Usage Tracking Models
| Schema Model Name | Prisma Client Access | Type Import |
|-------------------|---------------------|-------------|
| `token_usage_ledger` | `prisma.token_usage_ledger` ⚠️ SINGULAR | `token_usage_ledger` |
| `token_usage_daily_summary` | `prisma.token_usage_daily_summary` | `token_usage_daily_summary` |

### License System Models
| Schema Model Name | Prisma Client Access | Type Import |
|-------------------|---------------------|-------------|
| `perpetual_license` | `prisma.perpetual_license` ⚠️ SINGULAR | `perpetual_license` |
| `license_activation` | `prisma.license_activation` | `license_activation` |
| `version_upgrade` | `prisma.version_upgrade` | `version_upgrade` |

### Webhook Models
| Schema Model Name | Prisma Client Access | Type Import |
|-------------------|---------------------|-------------|
| `webhook_configs` | `prisma.webhook_configs` | `webhook_configs` |
| `webhook_logs` | `prisma.webhook_logs` | `webhook_logs` |

### Branding & Tracking Models
| Schema Model Name | Prisma Client Access | Type Import |
|-------------------|---------------------|-------------|
| `downloads` | `prisma.downloads` | `downloads` |
| `feedbacks` | `prisma.feedbacks` | `feedbacks` |
| `diagnostics` | `prisma.diagnostics` | `diagnostics` |
| `app_versions` | `prisma.app_versions` | `app_versions` |

### Configuration & Settings Models
| Schema Model Name | Prisma Client Access | Type Import |
|-------------------|---------------------|-------------|
| `app_settings` | `prisma.app_settings` | `app_settings` |
| `pricing_configs` | `prisma.pricing_configs` | `pricing_configs` |
| `pricing_configuration` | `prisma.pricing_configuration` | `pricing_configuration` |
| `ip_whitelists` | `prisma.ip_whitelists` | `ip_whitelists` |

### Audit & Margin Models
| Schema Model Name | Prisma Client Access | Type Import |
|-------------------|---------------------|-------------|
| `admin_audit_log` | `prisma.admin_audit_log` | `admin_audit_log` |
| `margin_audit_log` | `prisma.margin_audit_log` | `margin_audit_log` |
| `approval_requests` | `prisma.approval_requests` | `approval_requests` |

### OAuth & OIDC Models
| Schema Model Name | Prisma Client Access | Type Import |
|-------------------|---------------------|-------------|
| `oauth_clients` | `prisma.oauth_clients` | `oauth_clients` |
| `oidc_models` | `prisma.oidc_models` | `oidc_models` |

---

## Common Mistakes to Avoid

### ❌ WRONG
```typescript
// These are INCORRECT - do not use plural for singular models:
this.prisma.coupons           // WRONG - should be coupon
this.prisma.coupon_redemptions // WRONG - should be coupon_redemption
this.prisma.coupon_usage_limits // WRONG - should be coupon_usage_limit
this.prisma.permissions       // WRONG - should be permission
this.prisma.roles            // WRONG - should be role
```

### ✅ CORRECT
```typescript
// Use exact model names from schema:
this.prisma.coupon           // ✅ Singular (as in schema)
this.prisma.coupon_redemption // ✅ Singular
this.prisma.coupon_usage_limit // ✅ Singular
this.prisma.permission       // ✅ Singular
this.prisma.role             // ✅ Singular

// These ARE plural in schema:
this.prisma.users            // ✅ Plural (as in schema)
this.prisma.subscriptions    // ✅ Plural
this.prisma.models           // ✅ Plural
this.prisma.credits          // ✅ Plural
```

---

## Enum Types (ALL SINGULAR)

| Enum Name | Usage |
|-----------|-------|
| `subscription_tier` | Type: `subscription_tier` |
| `subscription_status` | Type: `subscription_status` |
| `activation_status` | Type: `activation_status` |
| `request_status` | Type: `request_status` |
| `campaign_type` | Type: `campaign_type` |
| `discount_type` | Type: `discount_type` |

---

## Verification Command

```bash
# List all model names from schema:
grep "^model " backend/prisma/schema.prisma

# The model name in schema is the EXACT name to use in prisma client
```

---

**Last Updated**: 2025-11-15
**Generated From**: `backend/prisma/schema.prisma`
