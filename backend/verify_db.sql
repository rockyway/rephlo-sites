-- 1. OAuth Clients
SELECT 'OAuth Clients:' as section;
SELECT 
  client_id, 
  client_name, 
  LEFT(client_secret_hash, 60) as secret_hash,
  LENGTH(client_secret_hash) as hash_len,
  is_active,
  array_length(grant_types, 1) as grant_count,
  array_length(redirect_uris, 1) as redirect_count
FROM oauth_clients
ORDER BY client_id;

-- 2. Users
SELECT 'Users:' as section;
SELECT 
  id,
  email,
  role::text,
  auth_provider::text,
  email_verified,
  is_active,
  mfa_enabled,
  mfa_method::text,
  LENGTH(password_hash) as pwd_hash_len,
  google_id
FROM users
ORDER BY email;

-- 3. Subscriptions
SELECT 'Subscriptions:' as section;
SELECT 
  s.id,
  u.email,
  s.tier::text,
  s.status::text,
  s.credits_per_month,
  s.current_period_start,
  s.current_period_end
FROM subscriptions s
JOIN users u ON s.user_id = u.id
ORDER BY u.email;

-- 4. Credits
SELECT 'Credits:' as section;
SELECT 
  u.email,
  c.total_credits,
  c.used_credits,
  c.credit_type,
  c.monthly_allocation,
  c.is_current,
  c.billing_period_start,
  c.billing_period_end
FROM credits c
JOIN subscriptions s ON c.subscription_id = s.id
JOIN users u ON s.user_id = u.id
ORDER BY u.email;

-- 5. Record Counts
SELECT 'Record Counts:' as section;
SELECT 
  'oauth_clients' as table_name, COUNT(*) as count FROM oauth_clients
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'credits', COUNT(*) FROM credits
UNION ALL
SELECT 'downloads', COUNT(*) FROM downloads
UNION ALL
SELECT 'feedbacks', COUNT(*) FROM feedbacks
UNION ALL
SELECT 'diagnostics', COUNT(*) FROM diagnostics
UNION ALL
SELECT 'app_versions', COUNT(*) FROM app_versions;

-- 6. MFA Fields Check
SELECT 'MFA Column Check:' as section;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name IN ('mfa_enabled', 'mfa_secret', 'mfa_backup_codes', 'mfa_verified_at', 'mfa_method')
ORDER BY column_name;

-- 7. Migration Status
SELECT 'Migration Status:' as section;
SELECT 
  migration_name,
  finished_at,
  applied_steps_count
FROM _prisma_migrations
WHERE migration_name LIKE '2025110%'
ORDER BY finished_at;
