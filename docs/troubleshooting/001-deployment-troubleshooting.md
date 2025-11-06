# Deployment Troubleshooting Guide - Rephlo

**Document Version:** 1.0
**Last Updated:** November 2025

---

## Table of Contents

1. [Frontend Issues](#frontend-issues)
2. [Backend Issues](#backend-issues)
3. [Database Issues](#database-issues)
4. [Deployment Platform Issues](#deployment-platform-issues)
5. [Networking & DNS Issues](#networking--dns-issues)
6. [Performance Issues](#performance-issues)
7. [Monitoring & Logging Issues](#monitoring--logging-issues)
8. [Common Error Messages](#common-error-messages)

---

## Frontend Issues

### Issue: Build Fails During Deployment

**Symptoms:**
- Vercel/Netlify shows "Build failed"
- Error: "Command failed with exit code 1"
- TypeScript compilation errors

**Possible Causes & Solutions:**

1. **Node version mismatch**
   ```bash
   # Check Node version requirement
   cat frontend/package.json | grep "node"

   # Update Vercel/Netlify to use Node 18
   # Vercel: Add in Settings → Environment → Node.js Version
   # Netlify: Add .nvmrc file
   echo "18" > frontend/.nvmrc
   ```

2. **Missing dependencies**
   ```bash
   # Ensure package-lock.json is committed
   git add frontend/package-lock.json
   git commit -m "Add package-lock.json"

   # Clear npm cache and reinstall
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

3. **TypeScript errors**
   ```bash
   # Check TypeScript compilation
   cd frontend
   npx tsc --noEmit

   # Fix errors shown
   # Common fixes:
   # - Add missing type declarations
   # - Fix type mismatches
   # - Update @types/* packages
   ```

4. **Environment variables not set**
   - Verify `VITE_API_URL` is set in deployment platform
   - Check all `VITE_` variables are configured
   - Redeploy after adding variables

### Issue: Page Shows Blank/White Screen

**Symptoms:**
- Frontend loads but shows blank page
- No content visible
- Browser console may show errors

**Diagnosis:**
```bash
# Open browser DevTools (F12)
# Check Console tab for errors
# Check Network tab for failed requests
```

**Possible Causes & Solutions:**

1. **API URL incorrect**
   ```javascript
   // Check VITE_API_URL in deployed environment
   // Should be: https://api.rephlo.ai
   // Not: http://localhost:3000

   // Verify in browser console:
   console.log(import.meta.env.VITE_API_URL)
   ```

2. **JavaScript errors**
   - Check browser console for errors
   - Look for "Uncaught" or "TypeError" messages
   - Fix errors in source code and redeploy

3. **CORS errors preventing data load**
   - See "CORS Errors" section below

4. **Router configuration issue**
   ```javascript
   // Verify React Router configured correctly
   // For Vercel/Netlify, no special config needed
   // For custom hosting, ensure server redirects to index.html
   ```

### Issue: API Calls Return 404 or Fail

**Symptoms:**
- Network tab shows failed API requests
- Console shows "Failed to fetch" or "Network error"
- 404 Not Found for API endpoints

**Diagnosis:**
```bash
# Check API URL in browser DevTools
# Network tab → Click failed request → Headers
# Verify Request URL is correct

# Test API directly
curl https://api.rephlo.ai/health
```

**Possible Causes & Solutions:**

1. **Wrong API URL**
   ```bash
   # Verify VITE_API_URL environment variable
   # In Vercel: Settings → Environment Variables
   # Should be: https://api.rephlo.ai

   # Redeploy after fixing
   ```

2. **Backend not deployed yet**
   - Deploy backend first
   - Verify backend is accessible: `curl https://api.rephlo.ai/health`

3. **CORS errors** (see CORS section below)

### Issue: CORS Errors

**Symptoms:**
```
Access to fetch at 'https://api.rephlo.ai/api/version' from origin 'https://rephlo.ai'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

**Diagnosis:**
```bash
# Check CORS headers on API
curl -I -H "Origin: https://rephlo.ai" https://api.rephlo.ai/health

# Should include:
# Access-Control-Allow-Origin: https://rephlo.ai
```

**Solutions:**

1. **Backend CORS not configured**
   ```bash
   # Verify backend environment variable
   CORS_ORIGIN=https://rephlo.ai,https://www.rephlo.ai

   # Ensure no spaces in CORS_ORIGIN
   # Ensure includes all frontend URLs (www and non-www)
   ```

2. **CORS allows wrong origin**
   - Check backend CORS middleware configuration
   - Verify `CORS_ORIGIN` matches deployed frontend URL exactly
   - Include both `rephlo.ai` and `www.rephlo.ai` if applicable

3. **Protocol mismatch (http vs https)**
   - Frontend must use https, not http
   - Backend must use https, not http
   - Both must match in CORS configuration

### Issue: Images Not Loading

**Symptoms:**
- Broken image icons
- 404 errors in Network tab for images
- Missing assets

**Solutions:**

1. **Incorrect image paths**
   ```javascript
   // Use relative paths from public/
   // Correct:
   <img src="/logo.png" alt="Logo" />

   // Wrong:
   <img src="../assets/logo.png" alt="Logo" />
   ```

2. **Images not in public/ directory**
   - Move images to `frontend/public/` directory
   - Reference without "/public" prefix
   ```javascript
   // File: frontend/public/images/logo.png
   // Reference: <img src="/images/logo.png" />
   ```

3. **Case sensitivity issues**
   - Development (Windows/Mac) may be case-insensitive
   - Production (Linux) is case-sensitive
   - Ensure exact case matching:
     ```javascript
     // File: logo.PNG
     // Reference must be: /logo.PNG (not /logo.png)
     ```

### Issue: Slow Performance / High Load Times

**Symptoms:**
- Page takes > 5 seconds to load
- Lighthouse score < 50
- Large bundle sizes

**Diagnosis:**
```bash
# Run Lighthouse audit
npx lighthouse https://rephlo.ai --view

# Check bundle sizes
cd frontend
npm run build
# Review output for bundle sizes
```

**Solutions:**

1. **Large bundle size**
   ```bash
   # Analyze bundle
   npm run build

   # If main bundle > 500KB, consider:
   # - Code splitting
   # - Lazy loading routes
   # - Tree shaking unused code
   ```

2. **Unoptimized images**
   ```bash
   # Optimize images before deployment
   npm install -g sharp-cli
   sharp -i public/images/*.png -o public/images/ -f webp
   ```

3. **Missing compression**
   - Vercel/Netlify enable gzip/brotli automatically
   - For self-hosted, ensure nginx gzip enabled (see DEPLOYMENT_FRONTEND.md)

---

## Backend Issues

### Issue: Server Won't Start / Crashes on Start

**Symptoms:**
- Render/Heroku shows "Application Error"
- Logs show "Server failed to start"
- Process exits immediately after starting

**Diagnosis:**
```bash
# Check deployment logs
# Render: Dashboard → Logs tab
# Heroku: heroku logs --tail -a rephlo-api

# Look for startup errors
```

**Possible Causes & Solutions:**

1. **Missing environment variables**
   ```bash
   # Check all required variables are set:
   # - NODE_ENV
   # - DATABASE_URL
   # - CORS_ORIGIN
   # - IP_HASH_SALT
   # - LOG_LEVEL

   # Verify in platform dashboard
   # Render: Environment tab
   # Heroku: heroku config -a rephlo-api
   ```

2. **Port binding issue**
   ```javascript
   // Ensure server uses process.env.PORT
   // backend/src/server.ts
   const PORT = process.env.PORT || 3000;
   app.listen(PORT, () => {
     console.log(`Server listening on port ${PORT}`);
   });
   ```

3. **Database connection fails**
   - See "Database Connection Fails" section below

4. **Build failed**
   ```bash
   # Verify build succeeds locally
   cd backend
   npm run build

   # Check for TypeScript errors
   npx tsc --noEmit
   ```

### Issue: Database Connection Fails

**Symptoms:**
- Error: "Connection refused"
- Error: "ECONNREFUSED"
- Error: "Database connection timeout"
- Server starts but crashes on first request

**Diagnosis:**
```bash
# Test database connection manually
psql $DATABASE_URL -c "SELECT 1;"

# Check connection string format
echo $DATABASE_URL
# Should be: postgresql://user:password@host:port/database
```

**Possible Causes & Solutions:**

1. **DATABASE_URL not set or incorrect**
   ```bash
   # Verify environment variable
   # Should include:
   # - Protocol: postgresql://
   # - User: username
   # - Password: (correctly URL-encoded)
   # - Host: database hostname
   # - Port: 5432 (usually)
   # - Database name
   # - SSL mode: ?sslmode=require (for production)

   # Example:
   DATABASE_URL=postgresql://user:password@host.neon.tech:5432/rephlo?sslmode=require
   ```

2. **Password has special characters (not URL-encoded)**
   ```bash
   # If password contains @, :, /, ?, #, &
   # URL-encode them:
   # @ → %40
   # : → %3A
   # / → %2F

   # Example:
   # Password: p@ss:word
   # Encoded:  p%40ss%3Aword
   DATABASE_URL=postgresql://user:p%40ss%3Aword@host:5432/db
   ```

3. **Database not accessible from hosting platform**
   ```bash
   # Check firewall rules
   # Ensure database allows connections from:
   # - Render IPs (any IP if using Render)
   # - Heroku (any IP)
   # - Or specific IP ranges

   # For Neon/Supabase: Usually allows all IPs by default
   # For AWS RDS: Check security group rules
   ```

4. **SSL/TLS issues**
   ```bash
   # Add SSL mode to connection string
   DATABASE_URL=postgresql://...?sslmode=require

   # If still fails, try:
   DATABASE_URL=postgresql://...?sslmode=no-verify
   # (less secure, but may work)
   ```

5. **Migrations not applied**
   ```bash
   # Apply migrations to production database
   cd backend
   npx prisma migrate deploy

   # Verify tables exist
   npx prisma db pull
   ```

### Issue: API Returns 500 Internal Server Error

**Symptoms:**
- All/most API requests return 500
- Frontend shows "Something went wrong"
- No specific error message

**Diagnosis:**
```bash
# Check application logs
# Render: Dashboard → Logs
# Heroku: heroku logs --tail

# Look for error stack traces
```

**Possible Causes & Solutions:**

1. **Unhandled exceptions in code**
   - Review logs for stack traces
   - Fix errors in source code
   - Redeploy

2. **Database query failures**
   ```bash
   # Check Prisma errors in logs
   # Common issues:
   # - Table doesn't exist (run migrations)
   # - Column doesn't exist (schema mismatch)
   # - Connection pool exhausted
   ```

3. **Missing error handling**
   ```javascript
   // Ensure all async functions have try/catch
   app.get('/api/endpoint', async (req, res) => {
     try {
       const data = await someAsyncFunction();
       res.json({ success: true, data });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ success: false, error: 'Internal error' });
     }
   });
   ```

### Issue: Slow API Response Times

**Symptoms:**
- API responses take > 1 second
- Timeout errors
- Poor user experience

**Diagnosis:**
```bash
# Measure response time
time curl https://api.rephlo.ai/api/version

# Check database query performance
# Look in logs for slow queries
```

**Solutions:**

1. **Missing database indexes**
   ```prisma
   // Ensure indexes exist on frequently queried fields
   // backend/prisma/schema.prisma

   model Download {
     id        String   @id @default(cuid())
     os        String
     timestamp DateTime @default(now())

     @@index([timestamp])  // Add this
     @@index([os])          // Add this
   }
   ```

2. **N+1 query problem**
   - Use Prisma `include` to fetch related data in one query
   - Avoid loops with database queries inside

3. **Connection pool exhausted**
   ```javascript
   // Increase connection pool size
   // In DATABASE_URL or prisma schema
   DATABASE_URL=postgresql://...?pool_timeout=20
   ```

4. **No caching**
   - Consider caching frequent queries (Redis, in-memory)
   - Cache API version endpoint (rarely changes)

---

## Database Issues

### Issue: Migrations Fail

**Symptoms:**
- Error: "Migration failed to apply"
- Error: "Table already exists"
- Error: "Column does not exist"

**Solutions:**

1. **Database out of sync with migrations**
   ```bash
   # Check migration status
   npx prisma migrate status

   # If migrations were manually modified:
   # Reset database (⚠️ DELETES ALL DATA - dev only!)
   npx prisma migrate reset

   # For production, create new migration:
   npx prisma migrate dev --name fix_schema
   npx prisma migrate deploy
   ```

2. **Conflicting migrations**
   - Review migration files in `prisma/migrations/`
   - Ensure migrations are in correct order
   - May need to consolidate or reorder migrations

3. **Database permissions**
   ```bash
   # Ensure database user has DDL permissions
   # Check user can CREATE, ALTER, DROP tables

   # Test:
   psql $DATABASE_URL -c "CREATE TABLE test_table (id INT);"
   psql $DATABASE_URL -c "DROP TABLE test_table;"
   ```

### Issue: Data Not Appearing in Admin Dashboard

**Symptoms:**
- Feedback submissions succeed but don't show in dashboard
- Download tracking works but metrics show 0
- Database appears empty

**Diagnosis:**
```bash
# Check if data is in database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Download\";"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Feedback\";"

# Check table names (case-sensitive!)
psql $DATABASE_URL -c "\dt"
```

**Solutions:**

1. **Frontend calling wrong backend**
   - Verify `VITE_API_URL` points to correct backend
   - Check Network tab in browser to see where requests go

2. **Backend writing to wrong database**
   - Verify `DATABASE_URL` in backend environment
   - Ensure production backend uses production database

3. **Query errors in admin endpoint**
   - Check backend logs for errors
   - Test admin endpoint: `curl https://api.rephlo.ai/admin/metrics`

---

## Deployment Platform Issues

### Render

**Issue: Deployment Stuck / Taking Too Long**

**Solutions:**
1. Check Build Logs for errors
2. Verify build command is correct: `npm install && npm run build`
3. Check for large dependencies slowing install
4. Consider upgrading plan if free tier is slow

**Issue: Service Sleeping (Free Tier)**

**Symptoms:**
- First request takes 30+ seconds
- Service spins down after 15 minutes

**Solutions:**
1. Upgrade to paid plan ($7/month) to prevent sleep
2. Use external ping service to keep alive (every 10 min)
3. Accept cold start delay for free tier

### Vercel

**Issue: Deployment Preview Not Working**

**Solutions:**
1. Check GitHub integration is connected
2. Verify Vercel app has repo access
3. Ensure build settings correct (Root Directory: `frontend`)

**Issue: Function Timeout (Serverless Functions)**

**Note:** Rephlo frontend is static, doesn't use serverless functions. If adding API routes to Vercel, note:
- Free tier: 10s timeout
- Pro tier: 60s timeout

### Heroku

**Issue: H10 App Crashed**

**Solutions:**
```bash
# Check logs
heroku logs --tail -a rephlo-api

# Restart dyno
heroku restart -a rephlo-api

# Check dyno status
heroku ps -a rephlo-api
```

**Issue: R14 Memory Quota Exceeded**

**Solutions:**
1. Check for memory leaks
2. Upgrade to larger dyno size
3. Optimize database queries (may be loading too much data)

---

## Networking & DNS Issues

### Issue: Domain Not Resolving

**Symptoms:**
- `nslookup rephlo.ai` returns no results
- Browser shows "DNS_PROBE_FINISHED_NXDOMAIN"

**Diagnosis:**
```bash
# Check DNS resolution
nslookup rephlo.ai
dig rephlo.ai

# Check nameservers
dig NS rephlo.ai
```

**Solutions:**

1. **DNS not propagated yet**
   - DNS changes can take 24-48 hours
   - Check propagation: https://dnschecker.org
   - Wait and verify again

2. **Incorrect DNS records**
   ```bash
   # For Vercel (frontend):
   # A record: 76.76.21.21
   # CNAME www: cname.vercel-dns.com

   # For Render (backend):
   # CNAME api: <your-app>.onrender.com
   ```

3. **Nameservers not updated**
   - Verify domain registrar points to correct nameservers
   - Check domain settings in registrar dashboard

### Issue: SSL Certificate Errors

**Symptoms:**
- Browser shows "Not Secure" warning
- "SSL certificate problem: unable to get local issuer certificate"

**Solutions:**

1. **Certificate not provisioned yet**
   - Wait up to 24 hours for auto-provisioning
   - Verify domain is correctly pointed

2. **Mixed content warnings**
   ```javascript
   // Ensure all resources load via HTTPS
   // Check for:
   <script src="http://...">  // Change to https://
   <link href="http://...">   // Change to https://
   ```

---

## Performance Issues

### Issue: Slow Page Load Times

**Run Lighthouse Audit:**
```bash
npx lighthouse https://rephlo.ai --view
```

**Common Issues & Solutions:**

1. **Large images** → Optimize/compress (use WebP)
2. **Large JavaScript bundles** → Code splitting, tree shaking
3. **Render-blocking resources** → Defer non-critical JS/CSS
4. **No caching** → Verify cache headers configured

### Issue: High Database Load

**Diagnosis:**
- Check database dashboard for query metrics
- Review slow query logs

**Solutions:**
1. Add database indexes on frequently queried columns
2. Optimize queries (use `EXPLAIN` to analyze)
3. Implement caching layer (Redis)
4. Upgrade database plan if needed

---

## Monitoring & Logging Issues

### Issue: No Logs Appearing

**Solutions:**

1. **Log level too restrictive**
   ```bash
   # Change LOG_LEVEL to debug temporarily
   LOG_LEVEL=debug
   ```

2. **Logs going to wrong destination**
   - Check platform-specific log viewing tools
   - Render: Dashboard → Logs tab
   - Heroku: `heroku logs --tail`

3. **Insufficient permissions**
   - Verify you have access to production logs
   - Check role-based access controls

### Issue: Monitoring Alerts Not Firing

**Solutions:**

1. **Alert conditions incorrect**
   - Review alert configuration
   - Test alert manually

2. **Notification settings wrong**
   - Verify email/Slack integration configured
   - Check spam folder

3. **Monitoring service down**
   - Check UptimeRobot/Pingdom status page

---

## Common Error Messages

### "Cannot read property 'X' of undefined"

**Location:** Frontend (JavaScript error)

**Cause:** Accessing property on null/undefined object

**Solution:**
```javascript
// Add optional chaining
const value = data?.property?.nested;

// Or null checks
if (data && data.property) {
  const value = data.property;
}
```

### "EADDRINUSE: address already in use"

**Location:** Backend (local development)

**Cause:** Port already occupied

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### "Prisma Client did not initialize yet"

**Location:** Backend

**Cause:** Prisma Client not generated

**Solution:**
```bash
npx prisma generate
npm run build
```

### "CORS policy: No 'Access-Control-Allow-Origin' header"

**Location:** Frontend (browser console)

**Cause:** Backend CORS not configured for frontend origin

**Solution:** See CORS section above

### "Migration failed: Table already exists"

**Location:** Backend deployment

**Cause:** Database schema out of sync

**Solution:**
```bash
# Check migration status
npx prisma migrate status

# Mark existing migrations as applied
npx prisma migrate resolve --applied "migration_name"

# Or reset (dev only!)
npx prisma migrate reset
```

---

## Emergency Recovery

### Complete System Down

**Step 1: Identify the issue**
```bash
# Check uptime monitoring alerts
# Check platform status pages:
# - Vercel: status.vercel.com
# - Render: status.render.com
# - Neon: status.neon.tech

# Test services:
curl https://rephlo.ai
curl https://api.rephlo.ai/health
```

**Step 2: Check logs**
- Render: Dashboard → Logs
- Vercel: Deployment logs
- Database: Check connection status

**Step 3: Rollback if needed**
- See DEPLOYMENT_FRONTEND.md and DEPLOYMENT_BACKEND.md for rollback procedures

**Step 4: Communicate**
- Notify users (if prolonged outage)
- Post status update
- Update team

---

## Getting Help

**Resources:**
- Render Support: https://render.com/docs/support
- Vercel Support: https://vercel.com/support
- Prisma Docs: https://www.prisma.io/docs
- Stack Overflow: Tag questions with [prisma], [react], [express]

**Internal:**
- Check operations runbook (OPERATIONS_RUNBOOK.md)
- Contact on-call engineer (see PRODUCTION_READINESS_CHECKLIST.md)
- Review deployment guides

---

**Document Status:** Production Ready
**Maintained By:** DevOps Team
**Review Frequency:** After major incidents
