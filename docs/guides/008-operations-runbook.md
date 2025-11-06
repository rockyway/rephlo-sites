# Operations Runbook - Rephlo

**Document Version:** 1.0
**Last Updated:** November 2025

---

## Quick Reference

### Production URLs
- **Frontend:** https://rephlo.ai
- **Backend:** https://api.rephlo.ai
- **Admin Dashboard:** https://rephlo.ai/admin

### Hosting Platforms
- **Frontend:** Vercel (or alternative)
- **Backend:** Render (or alternative)
- **Database:** Neon/Supabase/RDS PostgreSQL

### Emergency Contacts
| Role | Contact | Phone | Email |
|------|---------|-------|-------|
| On-Call Engineer | TBD | TBD | TBD |
| DevOps Lead | TBD | TBD | TBD |
| Product Owner | TBD | TBD | TBD |

---

## Common Operations

### 1. Checking System Health

**Quick Health Check:**
```bash
# Frontend
curl -I https://rephlo.ai
# Expected: HTTP/2 200

# Backend
curl https://api.rephlo.ai/health
# Expected: {"status":"ok"}

# API Version
curl https://api.rephlo.ai/api/version
# Expected: JSON with version info
```

**Full Health Check:**
```bash
#!/bin/bash
# Run comprehensive health checks

echo "Checking Frontend..."
curl -f https://rephlo.ai > /dev/null && echo "✓ Frontend OK" || echo "✗ Frontend DOWN"

echo "Checking Backend Health..."
curl -f https://api.rephlo.ai/health > /dev/null && echo "✓ Backend OK" || echo "✗ Backend DOWN"

echo "Checking API Endpoints..."
curl -f https://api.rephlo.ai/api/version > /dev/null && echo "✓ API OK" || echo "✗ API DOWN"

echo "Checking Admin Dashboard..."
curl -f https://api.rephlo.ai/admin/metrics > /dev/null && echo "✓ Admin OK" || echo "✗ Admin DOWN"
```

### 2. Viewing Logs

**Render (Backend):**
```bash
# Via Dashboard: Render → Service → Logs

# Via CLI (if installed):
render logs -a rephlo-api --tail 100
```

**Vercel (Frontend):**
```bash
# Via Dashboard: Vercel → Deployments → Select deployment → Function Logs

# Via CLI:
vercel logs rephlo-frontend
```

**Database (Neon/Supabase):**
- Neon: Dashboard → Monitoring → Query Stats
- Supabase: Dashboard → Database → Logs
- Render PostgreSQL: Dashboard → Database → Logs

### 3. Deploying New Versions

**Frontend Deployment:**
```bash
# Automatic via git push
git add .
git commit -m "Update frontend"
git push origin main
# Vercel auto-deploys

# Manual deployment (if needed):
cd frontend
vercel --prod
```

**Backend Deployment:**
```bash
# Automatic via git push
git add .
git commit -m "Update backend"
git push origin main
# Render auto-deploys

# Manual deployment:
# Render Dashboard → Manual Deploy button
```

**Database Migrations:**
```bash
cd backend
npx prisma migrate deploy
```

### 4. Rolling Back Deployments

**Frontend Rollback (Vercel):**
1. Vercel Dashboard → Deployments
2. Find last known good deployment
3. Click "..." → "Promote to Production"
4. Rollback complete in ~30 seconds

**Backend Rollback (Render):**
1. Render Dashboard → Deployments
2. Find previous successful deployment
3. Click "Redeploy"
4. Wait 2-3 minutes

**Git-Based Rollback:**
```bash
# Revert last commit
git revert HEAD
git push origin main
# Platforms auto-deploy previous version

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force origin main
```

### 5. Scaling Resources

**Render (Backend):**
1. Dashboard → Settings → Instance Type
2. Upgrade plan (Free → Starter → Standard)
3. Apply changes (service restarts)

**Vercel (Frontend):**
- Vercel scales automatically
- No manual intervention needed
- Monitor usage in Analytics tab

**Database Scaling:**
- Neon: Dashboard → Settings → Compute Size
- Supabase: Dashboard → Settings → Upgrade Plan
- AWS RDS: Console → Modify → Instance Class

### 6. Database Maintenance

**View Database Stats:**
```bash
psql $DATABASE_URL << EOF
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
EOF
```

**Vacuum Database (if performance degrades):**
```bash
psql $DATABASE_URL -c "VACUUM ANALYZE;"
```

**Check Connection Count:**
```bash
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

### 7. Monitoring Checks

**Daily Checks:**
- [ ] Review uptime monitoring alerts (UptimeRobot)
- [ ] Check error tracking dashboard (Sentry)
- [ ] Review application logs for errors
- [ ] Verify latest deployment successful

**Weekly Checks:**
- [ ] Review performance metrics (Lighthouse)
- [ ] Check database growth rate
- [ ] Review API response times
- [ ] Check for dependency updates

**Monthly Checks:**
- [ ] Review backup status
- [ ] Test backup restoration
- [ ] Security dependency audit
- [ ] Review and rotate secrets (if due)

---

## Incident Response

### Level 1: Minor Issues (< 5% users affected)

**Examples:** Slow response times, occasional errors

**Response:**
1. Monitor the issue
2. Log in incident tracking system
3. Schedule fix in next sprint
4. No immediate action needed

### Level 2: Major Issues (5-50% users affected)

**Examples:** API endpoint down, slow page loads

**Response:**
1. Notify team immediately
2. Investigate root cause
3. Deploy fix within 4 hours
4. Post-mortem after resolution

### Level 3: Critical Incidents (> 50% users affected)

**Examples:** Complete site down, database unavailable

**Response:**
1. **Immediate:** Page on-call engineer
2. **Notify:** Inform team via Slack #incidents
3. **Investigate:** Check logs, monitoring dashboards
4. **Communicate:** Update status page/users
5. **Fix:** Deploy rollback or hotfix
6. **Verify:** Run health checks
7. **Document:** Write incident report

**Critical Incident Checklist:**
- [ ] Incident logged with timestamp
- [ ] On-call engineer notified
- [ ] Root cause identified
- [ ] Fix deployed or rollback completed
- [ ] Services verified healthy
- [ ] Users notified of resolution
- [ ] Post-mortem scheduled

---

## Troubleshooting Procedures

### Frontend Not Loading

**Symptoms:** Blank page, "Site cannot be reached"

**Diagnosis:**
```bash
# Check if site is accessible
curl -I https://rephlo.ai

# Check DNS resolution
nslookup rephlo.ai

# Check SSL certificate
openssl s_client -connect rephlo.ai:443 -servername rephlo.ai
```

**Common Fixes:**
1. Check Vercel deployment status
2. Verify DNS records correct
3. Check if custom domain configured properly
4. Review deployment logs for build errors

### Backend API Errors

**Symptoms:** 500 errors, timeout, connection refused

**Diagnosis:**
```bash
# Check backend health
curl https://api.rephlo.ai/health

# Check backend logs
# Render: Dashboard → Logs
```

**Common Fixes:**
1. Check if service is running (Render dashboard)
2. Verify environment variables set
3. Check database connectivity
4. Review error logs
5. Restart service if needed

### Database Connection Issues

**Symptoms:** "Connection refused", "Database timeout"

**Diagnosis:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection string
echo $DATABASE_URL
```

**Common Fixes:**
1. Verify DATABASE_URL correct
2. Check database is running (provider dashboard)
3. Verify SSL mode required: `?sslmode=require`
4. Check firewall/IP whitelisting
5. Restart backend service

### Slow Performance

**Symptoms:** Pages load > 5 seconds, API > 1 second response

**Diagnosis:**
```bash
# Measure response times
time curl https://api.rephlo.ai/api/version

# Run Lighthouse audit
npx lighthouse https://rephlo.ai --view

# Check database query performance
# Review slow query logs
```

**Common Fixes:**
1. Add database indexes
2. Optimize queries (use EXPLAIN)
3. Enable caching
4. Optimize images/bundle size
5. Scale resources if needed

---

## Scheduled Maintenance

### Weekly Maintenance

**Every Monday, 2:00 AM UTC:**
- Review logs for errors
- Check for dependency updates
- Verify backups completed successfully

### Monthly Maintenance

**First Monday of month:**
- Run backup restoration test
- Review performance metrics
- Update dependencies
- Check for security advisories

### Quarterly Maintenance

**First Monday of January, April, July, October:**
- Rotate secrets (DATABASE_URL password, IP_HASH_SALT)
- Comprehensive security audit
- Load testing
- Disaster recovery test

---

## On-Call Procedures

### On-Call Schedule

**Rotation:** Weekly (Monday 9 AM - Monday 9 AM)

**Responsibilities:**
- Respond to critical alerts within 15 minutes
- Investigate and resolve incidents
- Escalate if unable to resolve within 1 hour
- Document all incidents in runbook

### Alert Response

**Critical Alert (Pagerduty/Phone):**
1. Acknowledge alert within 5 minutes
2. Check monitoring dashboards
3. Review recent deployments
4. Investigate logs
5. Deploy fix or rollback
6. Update incident channel
7. Verify resolution

**Warning Alert (Email/Slack):**
1. Acknowledge within 30 minutes
2. Monitor issue
3. Create ticket if action needed
4. Escalate if becomes critical

### Escalation Path

1. **Level 1:** On-call engineer (15 min response)
2. **Level 2:** DevOps lead (30 min response)
3. **Level 3:** CTO/Product owner (1 hour response)

---

## Useful Commands

### Database

```bash
# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore database
psql $DATABASE_URL < backup_20251103.sql

# Run migrations
cd backend && npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# View table sizes
psql $DATABASE_URL -c "\dt+"
```

### Deployment

```bash
# Deploy frontend (Vercel)
cd frontend && vercel --prod

# Check deployment status (Render)
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services/srv-xxxxx/deploys

# Restart backend (Heroku)
heroku restart -a rephlo-api
```

### Monitoring

```bash
# Check uptime
curl -I https://rephlo.ai
curl https://api.rephlo.ai/health

# Measure response time
time curl https://api.rephlo.ai/api/version

# Check SSL certificate expiry
echo | openssl s_client -connect rephlo.ai:443 2>/dev/null | \
  openssl x509 -noout -dates
```

---

## Runbook Updates

**When to Update:**
- After resolving new incident type
- After infrastructure changes
- After adding new monitoring
- Quarterly review

**How to Update:**
1. Edit OPERATIONS_RUNBOOK.md
2. Commit changes with description
3. Notify team of updates
4. Review in team meeting

---

**Document Status:** Living Document
**Maintained By:** DevOps Team
**Review Frequency:** Quarterly
**Last Incident:** ___/___/___
