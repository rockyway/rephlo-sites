# Security Hardening Guide - Rephlo

**Document Version:** 1.0
**Last Updated:** November 2025

---

## Security Checklist

### Frontend Security

- [ ] **HTTPS Enforced** - All traffic uses HTTPS
- [ ] **Security Headers** - Configured on hosting platform
- [ ] **XSS Prevention** - React auto-escapes, no dangerouslySetInnerHTML
- [ ] **Dependencies Updated** - No known vulnerabilities
- [ ] **Secrets Not Exposed** - API keys not in frontend code
- [ ] **CORS Properly Configured** - Only allowed origins

### Backend Security

- [ ] **HTTPS/TLS Enforced** - All API endpoints use HTTPS
- [ ] **Input Validation** - All POST endpoints validate input
- [ ] **SQL Injection Prevention** - Prisma parameterizes queries
- [ ] **CORS Configured** - Only frontend origins allowed
- [ ] **Rate Limiting** - Planned for v1.1
- [ ] **Error Messages Safe** - No stack traces in production
- [ ] **Dependencies Updated** - No critical vulnerabilities
- [ ] **Secrets Secured** - Environment variables not committed

### Database Security

- [ ] **SSL/TLS Connection** - `?sslmode=require` in DATABASE_URL
- [ ] **Strong Passwords** - 16+ characters, random generated
- [ ] **Least Privilege** - Database user has minimal permissions
- [ ] **IP Whitelisting** - Only hosting platform IPs allowed (if supported)
- [ ] **Backups Encrypted** - Automatic encryption by provider
- [ ] **Regular Updates** - Database software kept current

---

## HTTPS & SSL/TLS

### Frontend (Vercel/Netlify)

**Automatic SSL:**
- Vercel and Netlify auto-provision SSL certificates
- Let's Encrypt certificates (free, auto-renewed)
- No configuration needed

**Custom Domain SSL:**
1. Add custom domain in dashboard
2. Update DNS records
3. SSL automatically provisioned (2-24 hours)
4. HTTPS enforced automatically

**Verify SSL:**
```bash
curl -vI https://rephlo.ai 2>&1 | grep "SSL certificate"
# Should show: SSL certificate verify ok
```

### Backend (Render/Heroku)

**Automatic SSL:**
- All Render/Heroku apps have automatic HTTPS
- TLS 1.2+ enforced
- HTTP automatically redirects to HTTPS

**Database SSL:**
```bash
# Ensure SSL mode in DATABASE_URL
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require
```

### HSTS (HTTP Strict Transport Security)

**Vercel/Netlify:**
- Add to `vercel.json` or `netlify.toml`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

---

## Security Headers

### Recommended Headers

**Frontend (via hosting config):**

```nginx
# For nginx (self-hosted)
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.rephlo.ai;" always;
```

**Vercel config** (`vercel.json`):

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "no-referrer-when-downgrade" }
      ]
    }
  ]
}
```

**Backend (Express.js):**

```typescript
// backend/src/middleware/security.ts
import helmet from 'helmet';

export function securityMiddleware() {
  return helmet({
    contentSecurityPolicy: false, // Configured separately if needed
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });
}

// In server.ts
import { securityMiddleware } from './middleware/security';
app.use(securityMiddleware());
```

### Test Security Headers

```bash
# Check headers
curl -I https://rephlo.ai | grep -E "X-|Content-Security"

# Use SecurityHeaders.com
# Visit: https://securityheaders.com/?q=https://rephlo.ai
```

---

## Input Validation

### Backend Validation

**Use Zod for schema validation:**

```typescript
// backend/src/api/feedback.ts
import { z } from 'zod';

const feedbackSchema = z.object({
  message: z.string().min(1).max(1000),
  email: z.string().email().optional(),
  userId: z.string().optional(),
});

app.post('/api/feedback', async (req, res) => {
  try {
    // Validate input
    const data = feedbackSchema.parse(req.body);

    // Process validated data
    const feedback = await prisma.feedback.create({ data });

    res.json({ success: true, feedbackId: feedback.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: error.errors,
      });
    }
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});
```

**File Upload Validation:**

```typescript
// backend/src/api/diagnostics.ts
import multer from 'multer';

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Only allow specific file types
    const allowedTypes = ['.txt', '.log', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedTypes.includes(ext)) {
      return cb(new Error('Invalid file type'));
    }

    cb(null, true);
  },
});

app.post('/api/diagnostics', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  // Process file...
});
```

### Frontend Validation

```typescript
// frontend/src/components/FeedbackForm.tsx
import { z } from 'zod';

const schema = z.object({
  message: z.string().min(10).max(1000),
  email: z.string().email().optional(),
});

function FeedbackForm() {
  const handleSubmit = async (data: any) => {
    try {
      // Validate before sending
      const validated = schema.parse(data);

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      });

      // Handle response...
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Show validation errors
        console.error('Validation failed:', error.errors);
      }
    }
  };
}
```

---

## SQL Injection Prevention

**Prisma Automatically Prevents SQL Injection:**

```typescript
// ✅ Safe - Prisma parameterizes queries
const downloads = await prisma.download.findMany({
  where: { os: userInput },
});

// ✅ Safe - Prisma handles escaping
const feedback = await prisma.feedback.create({
  data: {
    message: userMessage,
    email: userEmail,
  },
});

// ❌ Never use raw SQL with user input
// const result = await prisma.$queryRaw`SELECT * FROM "Download" WHERE os = ${userInput}`;
// Use parameterized queries if raw SQL needed:
const result = await prisma.$queryRaw`SELECT * FROM "Download" WHERE os = ${Prisma.sql`${userInput}`}`;
```

---

## XSS Prevention

**React Automatic Escaping:**

```typescript
// ✅ Safe - React automatically escapes
<div>{userMessage}</div>

// ✅ Safe - React escapes attributes
<input value={userInput} />

// ❌ Dangerous - Avoid unless absolutely necessary
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// If HTML needed, sanitize first:
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
```

---

## CORS Configuration

### Backend CORS Setup

```typescript
// backend/src/middleware/cors.ts
import cors from 'cors';

export function corsMiddleware() {
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}

// In server.ts
app.use(corsMiddleware());
```

### Environment-Specific CORS

```bash
# Development
CORS_ORIGIN=http://localhost:5173,http://localhost:4173

# Production
CORS_ORIGIN=https://rephlo.ai,https://www.rephlo.ai

# Never use in production:
# CORS_ORIGIN=*
```

---

## Rate Limiting (Future Implementation)

**Planned for v1.1:**

```typescript
// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to specific routes
app.use('/api/feedback', apiLimiter);
app.use('/api/diagnostics', apiLimiter);

// Stricter limit for admin
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
});

app.use('/admin', adminLimiter);
```

---

## Secret Management

### DO NOT

- ❌ Commit `.env` files to git
- ❌ Hardcode API keys in source code
- ❌ Share production secrets in Slack/email
- ❌ Use weak passwords (e.g., "password123")
- ❌ Reuse secrets across environments

### DO

- ✅ Use `.env.example` with placeholders
- ✅ Store secrets in platform environment variables
- ✅ Use strong, randomly generated secrets
- ✅ Rotate secrets every 90 days
- ✅ Use secret vaults (Doppler, AWS Secrets Manager)

### Generate Strong Secrets

```bash
# Generate random salt (32 characters)
openssl rand -base64 32

# Generate API key
openssl rand -hex 32

# Generate password
openssl rand -base64 24
```

### Secret Rotation

**Quarterly secret rotation:**

1. Generate new secret
2. Add new secret to environment variables (keep old)
3. Deploy with new secret
4. Verify application works
5. Remove old secret after 24 hours

---

## Dependency Security

### Regular Audits

```bash
# Check for vulnerabilities
cd frontend
npm audit

cd backend
npm audit

# Fix vulnerabilities
npm audit fix

# Force fix (may break things)
npm audit fix --force
```

### Automated Scanning

**GitHub Dependabot:**
- Automatically enabled on GitHub repos
- Creates PRs for vulnerable dependencies
- Configure in `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"

  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
```

**Snyk (Optional):**
```bash
# Install Snyk
npm install -g snyk

# Authenticate
snyk auth

# Test for vulnerabilities
snyk test

# Monitor continuously
snyk monitor
```

---

## Database Security

### Connection Security

```bash
# ✅ Always use SSL in production
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require

# ✅ Strong password (16+ characters)
# Generate with: openssl rand -base64 24

# ❌ Never use default passwords
# DATABASE_URL=postgresql://postgres:postgres@...
```

### Least Privilege Principle

```sql
-- Create app user with limited permissions
CREATE USER rephlo_app WITH PASSWORD 'strong-random-password';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE rephlo_prod TO rephlo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rephlo_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rephlo_app;

-- Revoke dangerous permissions
REVOKE CREATE ON SCHEMA public FROM rephlo_app;
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM rephlo_app;
```

### IP Whitelisting

**Neon/Supabase:**
- Free tiers allow all IPs
- Paid plans support IP whitelisting

**AWS RDS:**
```bash
# Security group rules
# Allow only from Render IP ranges or specific IPs
```

---

## Error Handling

### Safe Error Messages

```typescript
// ❌ Don't expose internal details
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});

// ✅ Generic error messages in production
app.use((err, req, res, next) => {
  console.error('Error:', err); // Log internally

  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again later.',
    });
  } else {
    // Detailed errors in development only
    res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack,
    });
  }
});
```

---

## Authentication (Future - v1.1)

**Planned for admin dashboard:**

```typescript
// backend/src/middleware/auth.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Hash passwords (use in setup)
const hash = await bcrypt.hash('password', 10);

// Verify password
const valid = await bcrypt.compare(password, hash);

// Generate JWT
const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
  expiresIn: '24h',
});

// Verify JWT
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

---

## Security Monitoring

### Log Security Events

```typescript
// backend/src/middleware/securityLogging.ts
app.use((req, res, next) => {
  // Log failed authentication attempts
  // Log unusual request patterns
  // Log file upload attempts
  // Log SQL errors (potential injection)

  if (req.path.includes('admin') && !req.headers.authorization) {
    console.warn(`Unauthorized admin access attempt from ${req.ip}`);
  }

  next();
});
```

### Set Up Alerts

**UptimeRobot:**
- Monitor for unexpected downtime (may indicate attack)

**Sentry:**
- Alert on unusual error spikes
- Monitor security-related errors

---

## Security Checklist

### Pre-Deployment

- [ ] All dependencies audited (`npm audit`)
- [ ] No secrets in git history
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Input validation on all endpoints
- [ ] CORS properly configured
- [ ] Database uses SSL
- [ ] Error messages safe (no stack traces in production)

### Post-Deployment

- [ ] SSL certificate valid
- [ ] Security headers present (use securityheaders.com)
- [ ] CORS working correctly
- [ ] Rate limiting planned (v1.1)
- [ ] Error tracking configured
- [ ] Security monitoring active

### Regular Maintenance

- [ ] Weekly: Review security logs
- [ ] Monthly: Audit dependencies
- [ ] Quarterly: Rotate secrets
- [ ] Annually: Security assessment/penetration testing

---

## Incident Response

### Security Breach Steps

1. **Isolate:** Disconnect affected systems
2. **Assess:** Identify scope and impact
3. **Contain:** Stop ongoing attack
4. **Eradicate:** Remove vulnerability
5. **Recover:** Restore from clean backup
6. **Learn:** Document and prevent recurrence
7. **Notify:** Inform users if data affected (legal requirement)

### Contact

**Security Issues:**
- Email: security@rephlo.ai
- Responsible disclosure: 90-day window before public disclosure

---

## Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Security Headers: https://securityheaders.com
- Mozilla Observatory: https://observatory.mozilla.org
- SSL Labs: https://www.ssllabs.com/ssltest/

---

**Document Status:** Production Ready
**Maintained By:** Security Team
**Review Frequency:** Quarterly
**Last Security Audit:** ___/___/___
