# @rephlo/shared-types

Single source of truth for TypeScript types across Rephlo backend and frontend.

## Overview

This package contains all shared types, interfaces, enums, and Zod schemas used by both the backend API and frontend applications. By maintaining types in a single location, we ensure:

- **Type Safety**: Compile-time validation of API contracts
- **Consistency**: Frontend and backend always use matching types
- **DRY Principle**: No duplicate type definitions
- **Validation**: Zod schemas for runtime validation

## Installation

```bash
# In backend or frontend directory
npm install @rephlo/shared-types
# or
npm link ../shared-types
```

## Usage

```typescript
import {
  User,
  UserStatus,
  Coupon,
  CouponType,
  ApiResponse,
  createSuccessResponse,
  UserSchema,
} from '@rephlo/shared-types';

// Use types
const user: User = {
  id: '123',
  email: 'user@example.com',
  status: UserStatus.ACTIVE,
  // ...
};

// Use enums
if (user.status === UserStatus.SUSPENDED) {
  // Handle suspended user
}

// Use Zod schemas for validation
const result = UserSchema.safeParse(userData);
if (result.success) {
  // Type-safe user data
  const validUser = result.data;
}

// Use response helpers
return createSuccessResponse(user, 'User retrieved successfully');
```

## Package Structure

```
shared-types/
├── src/
│   ├── user.types.ts           # User, Subscription types
│   ├── coupon.types.ts         # Coupon, Campaign, Fraud types
│   ├── billing.types.ts        # Invoice, Payment, Credit types
│   ├── credit.types.ts         # Token usage, Pricing types
│   ├── response.types.ts       # API response wrappers
│   └── index.ts                # Barrel export
├── package.json
├── tsconfig.json
└── README.md
```

## Type Categories

### User Types (`user.types.ts`)
- `User` - User profile with computed fields
- `UserDetails` - Extended user details for admin view
- `Subscription` - Subscription with billing info
- `UserStatus`, `SubscriptionTier`, `SubscriptionStatus` enums

### Coupon Types (`coupon.types.ts`)
- `Coupon` - Coupon configuration with usage stats
- `CouponCampaign` - Campaign with computed status
- `CouponRedemption` - Redemption records
- `FraudDetectionEvent` - Fraud detection events
- All coupon-related enums and request DTOs

### Billing Types (`billing.types.ts`)
- `SubscriptionStats` - Subscription metrics (MRR, conversion rate)
- `BillingInvoice` - Invoice records
- `PaymentTransaction` - Payment history
- `ProrationEvent` - Tier change proration

### Credit Types (`credit.types.ts`)
- `TokenUsage` - Token usage ledger
- `CreditDeduction` - Credit deduction records
- `PricingConfig` - Margin and pricing configuration

### Response Types (`response.types.ts`)
- `ApiResponse<T>` - Standardized response wrapper
- `PaginationData` - Pagination metadata
- Helper functions: `createSuccessResponse`, `createErrorResponse`, `createPaginatedResponse`

## Key Features

### Computed Fields

Several types include computed fields that don't exist in the database but are calculated on the backend:

#### User
- `name` - Computed from `firstName + lastName`
- `creditsBalance` - Aggregated from credit allocations
- `currentTier` - From active subscription

#### Subscription
- `nextBillingDate` - Computed from `currentPeriodEnd` for active subscriptions
- `finalPriceUsd` - After discounts (may differ from `basePriceUsd`)
- `monthlyCreditsAllocated` - Standardized field name (DB uses `monthlyCreditAllocation`)

#### Coupon
- `type` - Renamed from `couponType` (DB column name)
- `discount_percentage` - Only populated when `type === PERCENTAGE`
- `discount_amount` - Only populated when `type === FIXED_AMOUNT`
- `bonus_duration_months` - Only populated when `type === DURATION_BONUS`
- `redemption_count` - Aggregated from `CouponUsageLimit.totalUses`
- `total_discount_value` - Aggregated from `CouponUsageLimit.totalDiscountAppliedUsd`

#### Campaign
- `status` - Computed from dates and `isActive` flag
  - `planning` - Before `starts_at`
  - `active` - Between dates, `is_active=true`
  - `paused` - `is_active=false`
  - `ended` - After `ends_at`
- `actual_revenue` - Aggregated from redemptions
- `redemptions_count` - Count from associated coupons
- `conversion_rate` - Percentage calculation

### Field Name Mapping

Some types use different field names than the database for consistency:

| Type | Frontend Field | Database Field |
|------|---------------|----------------|
| User | `name` | `firstName + lastName` |
| User | `currentTier` | `subscription.tier` |
| User | `lastActiveAt` | `lastLoginAt` |
| Subscription | `finalPriceUsd` | `basePriceUsd` |
| Subscription | `monthlyCreditsAllocated` | `monthlyCreditAllocation` |
| Subscription | `nextBillingDate` | computed from `currentPeriodEnd` |
| Coupon | `type` | `couponType` |
| Coupon | `max_discount_applications` | `maxUses` |
| Campaign | `name` | `campaignName` |
| Campaign | `type` | `campaignType` |
| Campaign | `starts_at` | `startDate` |
| Campaign | `ends_at` | `endDate` |
| Campaign | `budget_cap` | `budgetLimitUsd` |
| Campaign | `current_spend` | `totalSpentUsd` |

### Zod Validation

All request DTOs have corresponding Zod schemas for validation:

```typescript
import { CreateCouponRequestSchema } from '@rephlo/shared-types';

// Validate request body
const result = CreateCouponRequestSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({
    error: 'Validation failed',
    details: result.error.format(),
  });
}

// result.data is type-safe and validated
const validatedData = result.data;
```

## Development

```bash
# Build the package
npm run build

# Watch mode during development
npm run watch

# Clean build artifacts
npm run clean
```

## Type Safety Best Practices

1. **Always use shared types** - Never duplicate type definitions
2. **Use Zod schemas for validation** - Validate all incoming data
3. **Use helper functions** - `createSuccessResponse`, `createPaginatedResponse`
4. **Document computed fields** - Add comments explaining calculations
5. **Keep enums in sync** - Enums must match database enum values
6. **Use strict TypeScript** - Enable `strict` mode in tsconfig.json

## Integration with Backend

Backend services should use these types and map database records to match:

```typescript
import { User, UserStatus } from '@rephlo/shared-types';

// Service method
async findById(id: string): Promise<User> {
  const dbUser = await this.prisma.user.findUnique({
    where: { id },
    include: {
      subscriptionMonetization: {
        where: { status: { in: ['trial', 'active'] } },
        take: 1,
      },
      creditAllocations: true,
    },
  });

  // Map to shared type
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.firstName && dbUser.lastName
      ? `${dbUser.firstName} ${dbUser.lastName}`
      : dbUser.firstName || dbUser.lastName || null,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    username: dbUser.username,
    profilePictureUrl: dbUser.profilePictureUrl,
    status: dbUser.status as UserStatus, // Use DB enum directly
    isActive: dbUser.isActive,
    currentTier: dbUser.subscriptionMonetization[0]?.tier || SubscriptionTier.FREE,
    creditsBalance: this.calculateCreditsBalance(dbUser.creditAllocations),
    createdAt: dbUser.createdAt.toISOString(),
    lastActiveAt: dbUser.lastLoginAt?.toISOString() || null,
    deactivatedAt: dbUser.deactivatedAt?.toISOString() || null,
    deletedAt: dbUser.deletedAt?.toISOString() || null,
    suspendedUntil: dbUser.suspendedUntil?.toISOString() || null,
    bannedAt: dbUser.bannedAt?.toISOString() || null,
    role: dbUser.role,
    lifetimeValue: dbUser.lifetimeValue,
  };
}
```

## Integration with Frontend

Frontend should import and use these types directly:

```typescript
import { User, UserStatus, ApiResponse } from '@rephlo/shared-types';
import { useState, useEffect } from 'react';

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then((response: ApiResponse<User>) => {
        if (response.success && response.data) {
          setUser(response.data);
        }
      });
  }, [userId]);

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>Status: {user.status}</p>
      {user.status === UserStatus.SUSPENDED && (
        <p>Suspended until: {user.suspendedUntil}</p>
      )}
      <p>Credits: {user.creditsBalance}</p>
    </div>
  );
}
```

## Versioning

This package follows semantic versioning:
- **Major**: Breaking changes to types or interfaces
- **Minor**: New types or optional fields added
- **Patch**: Bug fixes, documentation updates

## License

MIT
