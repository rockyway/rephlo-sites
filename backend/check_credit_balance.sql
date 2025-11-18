-- Check admin user credit balance
SELECT 
  u.id,
  u.email,
  u.role,
  sm.tier,
  sm.status as subscription_status,
  ucb.amount as credit_balance,
  ca.monthly_allocation,
  ca.remaining_credits
FROM users u
LEFT JOIN subscription_monetization sm ON u.id = sm.user_id AND sm.status = 'active'
LEFT JOIN user_credit_balance ucb ON u.id = ucb.user_id
LEFT JOIN credit_allocation ca ON u.id = ca.user_id AND ca.allocation_month = DATE_TRUNC('month', CURRENT_DATE)
WHERE u.email = 'admin.test@rephlo.ai';
