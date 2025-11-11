# Enum Migration Quick Reference

## CouponType Enum Value Changes

| Old Value | New Value | Notes |
|-----------|-----------|-------|
| `percentage_discount` | `percentage` | Simplified naming |
| `fixed_amount_discount` | `fixed_amount` | Simplified naming |
| `tier_specific_discount` | `tier_specific` | Simplified naming |
| `duration_bonus` | `duration_bonus` | Unchanged |
| `byok_migration` | `perpetual_migration` | Better reflects purpose |

## ProrationEventType Enum Changes

### Renamed Enum
- **Old Name:** `ProrationChangeType`
- **New Name:** `ProrationEventType`

### Value Changes

| Old Value | New Value | Notes |
|-----------|-----------|-------|
| `upgrade` | `upgrade` | Unchanged |
| `downgrade` | `downgrade` | Unchanged |
| `cancellation` | `cancellation` | Unchanged |
| `reactivation` | `upgrade` | Mapped to upgrade |
| N/A | `interval_change` | NEW: Monthly ↔ Annual |
| N/A | `migration` | NEW: Perpetual ↔ Subscription |

## Files Updated

### Schema Files
- `/home/user/rephlo-sites/backend/prisma/schema.prisma`

### Migration Files
- `/home/user/rephlo-sites/backend/prisma/migrations/20251110130000_fix_enum_values_plan_129/migration.sql`

### TypeScript Files
- `/home/user/rephlo-sites/backend/src/services/checkout-integration.service.ts`
- `/home/user/rephlo-sites/backend/src/services/coupon-redemption.service.ts`
- `/home/user/rephlo-sites/backend/src/services/__tests__/checkout-integration.service.test.ts`

## Migration Command

```bash
cd /home/user/rephlo-sites/backend
npm run prisma:migrate
```

## After Migration

```bash
# Regenerate Prisma Client
npm run prisma:generate

# Rebuild TypeScript
npm run build

# Run tests
npm run test
```
