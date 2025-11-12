-- Phase 4: Schema Alignment & Type Safety - Computed Fields and Analytics Views
-- Migration created: 2025-11-12
-- Purpose: Add database views for analytics queries and optimize indexes for computed field access

-- =============================================================================
-- ANALYTICS VIEWS
-- These views provide pre-computed aggregations for efficient dashboard queries
-- =============================================================================

-- View 1: Coupon Statistics with Computed Fields
-- Provides redemption counts and total discount values per coupon
CREATE OR REPLACE VIEW coupon_statistics AS
SELECT
    c.id AS coupon_id,
    c.code,
    c.coupon_type,
    c.discount_value,
    c.discount_type,
    c.is_active,
    c.valid_from,
    c.valid_until,
    c.campaign_id,

    -- Computed fields from CouponUsageLimit
    COALESCE(cul.total_uses, 0) AS redemption_count,
    COALESCE(cul.total_discount_applied_usd, 0) AS total_discount_value,
    COALESCE(cul.unique_users, 0) AS unique_users_count,
    cul.last_used_at,

    -- Computed status field
    CASE
        WHEN NOT c.is_active THEN 'inactive'
        WHEN NOW() < c.valid_from THEN 'scheduled'
        WHEN NOW() > c.valid_until THEN 'expired'
        ELSE 'active'
    END AS status,

    -- Campaign name (if associated)
    cc.campaign_name,

    c.created_at,
    c.updated_at
FROM coupon c
LEFT JOIN coupon_usage_limit cul ON cul.coupon_id = c.id
LEFT JOIN coupon_campaign cc ON cc.id = c.campaign_id;

-- View 2: Campaign Performance Metrics
-- Provides aggregated performance data per campaign with computed status
CREATE OR REPLACE VIEW campaign_performance AS
SELECT
    cc.id AS campaign_id,
    cc.campaign_name AS name,
    cc.campaign_type AS type,
    cc.start_date AS starts_at,
    cc.end_date AS ends_at,
    cc.budget_limit_usd AS budget_cap,
    cc.total_spent_usd AS current_spend,
    cc.target_tier,
    cc.is_active,

    -- Computed status field
    CASE
        WHEN NOT cc.is_active THEN 'paused'
        WHEN NOW() < cc.start_date THEN 'planning'
        WHEN NOW() > cc.end_date THEN 'ended'
        ELSE 'active'
    END AS status,

    -- Aggregated redemption metrics
    COUNT(DISTINCT cr.id) AS redemptions_count,
    COALESCE(SUM(cr.discount_applied_usd), 0) AS total_discount_given,
    COALESCE(SUM(cr.final_amount_usd), 0) AS actual_revenue,
    COUNT(DISTINCT cr.user_id) AS unique_users,

    -- Conversion rate (successful redemptions / total attempts)
    CASE
        WHEN COUNT(cr.id) > 0 THEN
            (COUNT(CASE WHEN cr.redemption_status = 'success' THEN 1 END)::DECIMAL / COUNT(cr.id)::DECIMAL * 100)
        ELSE 0
    END AS conversion_rate,

    -- ROI calculation
    CASE
        WHEN cc.total_spent_usd > 0 THEN
            ((SUM(cr.final_amount_usd) - cc.total_spent_usd) / cc.total_spent_usd * 100)
        ELSE 0
    END AS roi_percentage,

    cc.created_at,
    cc.updated_at
FROM coupon_campaign cc
LEFT JOIN coupon c ON c.campaign_id = cc.id
LEFT JOIN coupon_redemption cr ON cr.coupon_id = c.id
GROUP BY cc.id, cc.campaign_name, cc.campaign_type, cc.start_date, cc.end_date,
         cc.budget_limit_usd, cc.total_spent_usd, cc.target_tier, cc.is_active,
         cc.created_at, cc.updated_at;

-- View 3: Subscription Statistics
-- Provides MRR, active counts, and trial conversion metrics
CREATE OR REPLACE VIEW subscription_statistics AS
SELECT
    COUNT(CASE WHEN status IN ('trial', 'active') THEN 1 END) AS total_active,
    COUNT(CASE WHEN status = 'past_due' THEN 1 END) AS past_due_count,

    -- MRR calculation (monthly recurring revenue)
    SUM(
        CASE
            WHEN status = 'active' AND billing_cycle = 'monthly' THEN base_price_usd
            WHEN status = 'active' AND billing_cycle = 'annual' THEN base_price_usd / 12
            ELSE 0
        END
    ) AS mrr,

    -- Trial conversions this month (trial -> active in current month)
    (SELECT COUNT(*)
     FROM subscription_monetization
     WHERE status = 'active'
       AND trial_ends_at IS NOT NULL
       AND updated_at >= DATE_TRUNC('month', NOW())
       AND updated_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
    ) AS trial_conversions_this_month,

    -- Breakdown by tier
    COUNT(CASE WHEN tier = 'free' THEN 1 END) AS free_count,
    COUNT(CASE WHEN tier = 'pro' THEN 1 END) AS pro_count,
    COUNT(CASE WHEN tier = 'pro_max' THEN 1 END) AS pro_max_count,
    COUNT(CASE WHEN tier = 'enterprise_pro' THEN 1 END) AS enterprise_pro_count,
    COUNT(CASE WHEN tier = 'enterprise_max' THEN 1 END) AS enterprise_max_count,
    COUNT(CASE WHEN tier = 'perpetual' THEN 1 END) AS perpetual_count,

    -- Breakdown by status
    COUNT(CASE WHEN status = 'trial' THEN 1 END) AS trial_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_count,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_count,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) AS expired_count,

    NOW() AS computed_at
FROM subscription_monetization;

-- View 4: User Credit Balances with Breakdown
-- Provides credit balance breakdown (subscription vs bonus credits)
CREATE OR REPLACE VIEW user_credit_balance_detailed AS
SELECT
    u.id AS user_id,
    u.email,
    u.status AS user_status,

    -- Total credit balance
    COALESCE(ucb.amount, 0) AS total_credits,

    -- Subscription credits (from monthly allocation)
    COALESCE(
        (SELECT SUM(ca.amount)
         FROM credit_allocation ca
         WHERE ca.user_id = u.id
           AND ca.source = 'subscription'
           AND ca.allocation_period_start <= NOW()
           AND ca.allocation_period_end >= NOW()
        ), 0
    ) AS subscription_credits,

    -- Bonus credits (from coupons, referrals, admin grants)
    COALESCE(
        (SELECT SUM(ca.amount)
         FROM credit_allocation ca
         WHERE ca.user_id = u.id
           AND ca.source IN ('bonus', 'admin_grant', 'referral', 'coupon')
           AND ca.allocation_period_start <= NOW()
           AND ca.allocation_period_end >= NOW()
        ), 0
    ) AS bonus_credits,

    -- Usage statistics
    ucb.last_deduction_at,
    ucb.last_deduction_amount,
    ucb.updated_at
FROM users u
LEFT JOIN user_credit_balance ucb ON ucb.user_id = u.id;

-- View 5: Fraud Detection Events with Populated Fields
-- Enriches fraud events with coupon codes and user emails
CREATE OR REPLACE VIEW fraud_detection_events_detailed AS
SELECT
    cfd.id,
    cfd.coupon_id,
    c.code AS coupon_code,
    cfd.user_id,
    u.email AS user_email,
    cfd.detection_type,
    cfd.severity,
    cfd.detected_at,

    -- Extract risk score from details JSON
    (cfd.details->>'risk_score')::INTEGER AS risk_score,

    -- Extract reasons array from details JSON
    cfd.details->'reasons' AS reasons,

    -- Extract IP and device info from details JSON
    cfd.details->>'ip_address' AS ip_address,
    cfd.details->>'device_fingerprint' AS device_fingerprint,
    cfd.details->>'user_agent' AS user_agent,

    -- Status mapping (resolution field maps to status)
    COALESCE(cfd.resolution, 'pending') AS status,
    cfd.is_flagged,
    cfd.reviewed_by,
    cfd.reviewed_at,
    cfd.resolution AS resolution_notes,
    cfd.created_at
FROM coupon_fraud_detection cfd
INNER JOIN coupon c ON c.id = cfd.coupon_id
INNER JOIN users u ON u.id = cfd.user_id;

-- View 6: User Details with Aggregated Stats
-- Provides comprehensive user information with usage statistics
CREATE OR REPLACE VIEW user_details_with_stats AS
SELECT
    u.id,
    u.email,
    u.username,
    u.first_name,
    u.last_name,
    CASE
        WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL THEN u.first_name || ' ' || u.last_name
        WHEN u.first_name IS NOT NULL THEN u.first_name
        WHEN u.last_name IS NOT NULL THEN u.last_name
        ELSE NULL
    END AS name,
    u.profile_picture_url,
    u.status,
    u.is_active,
    u.role,
    u.created_at,
    u.last_login_at AS last_active_at,
    u.deactivated_at,
    u.deleted_at,
    u.suspended_until,
    u.banned_at,
    u.lifetime_value,
    u.has_active_perpetual_license,
    u.email_verified,
    u.mfa_enabled,

    -- Current subscription tier
    COALESCE(sm.tier, 'free') AS current_tier,

    -- Credit balance
    COALESCE(ucb.amount, 0) AS credits_balance,

    -- Usage statistics
    COALESCE(
        (SELECT COUNT(*) FROM token_usage_ledger WHERE user_id = u.id),
        0
    ) AS total_api_calls,

    COALESCE(
        (SELECT SUM(credits_deducted) FROM credit_deduction_ledger WHERE user_id = u.id),
        0
    ) AS credits_used,

    -- Average calls per day (last 30 days)
    COALESCE(
        (SELECT COUNT(*) FROM token_usage_ledger
         WHERE user_id = u.id
           AND created_at >= NOW() - INTERVAL '30 days'
        ) / 30.0,
        0
    ) AS average_calls_per_day
FROM users u
LEFT JOIN subscription_monetization sm ON sm.user_id = u.id
    AND sm.status IN ('trial', 'active')
    AND sm.current_period_end >= NOW()
LEFT JOIN user_credit_balance ucb ON ucb.user_id = u.id;

-- =============================================================================
-- INDEXES FOR COMPUTED FIELD QUERIES
-- Optimize performance for queries that compute fields on the fly
-- =============================================================================

-- Index for coupon status computation (valid_from, valid_until, is_active)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupon_validity_dates
    ON coupon (valid_from, valid_until, is_active);

-- Index for campaign status computation (start_date, end_date, is_active)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_dates
    ON coupon_campaign (start_date, end_date, is_active);

-- Index for subscription MRR calculations (status, billing_cycle)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_mrr
    ON subscription_monetization (status, billing_cycle, base_price_usd);

-- Index for credit allocation by source and period
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_allocation_source_period
    ON credit_allocation (user_id, source, allocation_period_start, allocation_period_end);

-- Index for fraud detection details JSON field (GIN index for JSONB queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fraud_detection_details
    ON coupon_fraud_detection USING gin (details);

-- Index for user full name search (trigram for fuzzy search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_first_last_name
    ON users USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- Index for active subscriptions by tier
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_active_tier
    ON subscription_monetization (tier)
    WHERE status IN ('trial', 'active');

-- Index for coupon redemptions by date range (for analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupon_redemption_date
    ON coupon_redemption (redemption_date, redemption_status);

-- Index for token usage by date range (for usage summaries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_date
    ON token_usage_ledger (created_at, user_id, status);

-- =============================================================================
-- MATERIALIZED VIEW FOR EXPENSIVE AGGREGATIONS (OPTIONAL)
-- Can be refreshed periodically via cron job for better performance
-- =============================================================================

-- Materialized view for daily analytics snapshot
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_analytics_snapshot AS
SELECT
    CURRENT_DATE AS snapshot_date,

    -- Coupon metrics
    (SELECT COUNT(*) FROM coupon WHERE is_active = true) AS active_coupons_count,
    (SELECT COUNT(*) FROM coupon_redemption WHERE redemption_date >= CURRENT_DATE) AS redemptions_today,
    (SELECT SUM(discount_applied_usd) FROM coupon_redemption WHERE redemption_date >= CURRENT_DATE) AS discount_value_today,

    -- Subscription metrics
    (SELECT COUNT(*) FROM subscription_monetization WHERE status IN ('trial', 'active')) AS active_subscriptions,
    (SELECT SUM(
        CASE
            WHEN status = 'active' AND billing_cycle = 'monthly' THEN base_price_usd
            WHEN status = 'active' AND billing_cycle = 'annual' THEN base_price_usd / 12
            ELSE 0
        END
    ) FROM subscription_monetization) AS current_mrr,

    -- User metrics
    (SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users_count,
    (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE) AS new_users_today,

    -- Credit metrics
    (SELECT SUM(amount) FROM user_credit_balance) AS total_credits_outstanding,

    -- Fraud metrics
    (SELECT COUNT(*) FROM coupon_fraud_detection WHERE detected_at >= CURRENT_DATE) AS fraud_events_today,
    (SELECT COUNT(*) FROM coupon_fraud_detection WHERE is_flagged = true AND reviewed_at IS NULL) AS pending_fraud_reviews,

    NOW() AS refreshed_at;

-- Create unique index on snapshot_date for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_analytics_snapshot_date
    ON daily_analytics_snapshot (snapshot_date);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to calculate next billing date for active subscriptions
CREATE OR REPLACE FUNCTION calculate_next_billing_date(
    subscription_status TEXT,
    current_period_end TIMESTAMP,
    cancelled_at TIMESTAMP
) RETURNS TIMESTAMP AS $$
BEGIN
    -- If subscription is active and not cancelled, return current_period_end
    IF subscription_status IN ('trial', 'active') AND cancelled_at IS NULL THEN
        RETURN current_period_end;
    END IF;

    -- Otherwise, no next billing date
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to compute campaign status
CREATE OR REPLACE FUNCTION compute_campaign_status(
    is_active BOOLEAN,
    start_date TIMESTAMP,
    end_date TIMESTAMP
) RETURNS TEXT AS $$
BEGIN
    IF NOT is_active THEN
        RETURN 'paused';
    ELSIF NOW() < start_date THEN
        RETURN 'planning';
    ELSIF NOW() > end_date THEN
        RETURN 'ended';
    ELSE
        RETURN 'active';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to compute coupon status
CREATE OR REPLACE FUNCTION compute_coupon_status(
    is_active BOOLEAN,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP
) RETURNS TEXT AS $$
BEGIN
    IF NOT is_active THEN
        RETURN 'inactive';
    ELSIF NOW() < valid_from THEN
        RETURN 'scheduled';
    ELSIF NOW() > valid_until THEN
        RETURN 'expired';
    ELSE
        RETURN 'active';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- GRANTS (if needed for read-only analytics role)
-- =============================================================================

-- Grant SELECT on all views to the backend application role
-- GRANT SELECT ON coupon_statistics TO rephlo_backend;
-- GRANT SELECT ON campaign_performance TO rephlo_backend;
-- GRANT SELECT ON subscription_statistics TO rephlo_backend;
-- GRANT SELECT ON user_credit_balance_detailed TO rephlo_backend;
-- GRANT SELECT ON fraud_detection_events_detailed TO rephlo_backend;
-- GRANT SELECT ON user_details_with_stats TO rephlo_backend;
-- GRANT SELECT ON daily_analytics_snapshot TO rephlo_backend;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON VIEW coupon_statistics IS 'Aggregates coupon redemption counts and discount values with computed status field';
COMMENT ON VIEW campaign_performance IS 'Provides campaign performance metrics including ROI, conversion rate, and aggregated revenue';
COMMENT ON VIEW subscription_statistics IS 'Calculates subscription statistics including MRR, active counts, and trial conversions';
COMMENT ON VIEW user_credit_balance_detailed IS 'Shows user credit balances broken down by source (subscription vs bonus)';
COMMENT ON VIEW fraud_detection_events_detailed IS 'Enriches fraud events with user emails and coupon codes';
COMMENT ON VIEW user_details_with_stats IS 'Comprehensive user view with aggregated usage statistics';
COMMENT ON MATERIALIZED VIEW daily_analytics_snapshot IS 'Daily snapshot of key metrics for dashboard performance (refresh via cron)';

COMMENT ON FUNCTION calculate_next_billing_date IS 'Computes next billing date for active subscriptions';
COMMENT ON FUNCTION compute_campaign_status IS 'Computes campaign status based on dates and active flag';
COMMENT ON FUNCTION compute_coupon_status IS 'Computes coupon status based on validity dates and active flag';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- To refresh the materialized view daily, add this to cron:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY daily_analytics_snapshot;
