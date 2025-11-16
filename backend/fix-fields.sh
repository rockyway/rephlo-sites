#!/bin/bash
# Comprehensive field name fixer for Prisma snake_case conversion

# Common camelCase -> snake_case conversions for Prisma queries
find src/services src/controllers -name "*.ts" -exec sed -i '
# subscriptions table fields
s/stripeSubscriptionId:/stripe_subscription_id:/g
s/stripeCustomerId:/stripe_customer_id:/g
s/cancelledAt:/cancelled_at:/g
s/updatedAt:/updated_at:/g
s/createdAt:/created_at:/g
s/currentPeriodStart:/current_period_start:/g
s/currentPeriodEnd:/current_period_end:/g
s/creditsPerMonth:/credits_per_month:/g
s/priceNom/price_cents:/g

# user table fields
s/firstName:/first_name:/g
s/lastName:/last_name:/g
s/emailVerified:/email_verified:/g
s/phoneNumber:/phone_number:/g
s/creditBalance:/credit_balance:/g

# credit table fields
s/userCredit:/user_credit_balance:/g
s/usedCredits:/used_credits:/g
s/purchasedCredits:/purchased_credits:/g

# proration table fields
s/fromTier:/from_tier:/g
s/toTier:/to_tier:/g
s/netChargeUsd:/net_charge_usd:/g
s/effectiveDate:/effective_date:/g
s/changeType:/change_type:/g

# campaign table fields
s/campaignName:/campaign_name:/g
s/couponsIssued:/coupons_issued:/g
s/couponsRedeemed:/coupons_redeemed:/g
s/discountValue:/discount_value:/g
s/revenueGenerated:/revenue_generated:/g
s/roiPercentage:/roi_percentage:/g

# app_settings fields
s/isEncrypted:/is_encrypted:/g

# Relation names (be careful - only in includes/selects)
s/: {$/: {/g
' {} \;

echo "Field name fixes applied successfully"
