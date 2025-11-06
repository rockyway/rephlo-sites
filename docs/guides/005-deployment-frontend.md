# Frontend Deployment Guide - Rephlo Branding Website

**Document Version:** 1.0
**Last Updated:** November 2025
**Target Environment:** Production

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build Process](#build-process)
3. [Environment Variables](#environment-variables)
4. [Deployment Options](#deployment-options)
5. [Performance Optimization](#performance-optimization)
6. [Health Checks](#health-checks)
7. [Rollback Procedure](#rollback-procedure)
8. [Post-Deployment Verification](#post-deployment-verification)

---

## Prerequisites

Before deploying the frontend, ensure you have:

- **Node.js 18+** installed locally
- **npm** or **yarn** package manager
- **Git** repository set up with the frontend code
- **Hosting account** (Vercel, Netlify, or alternative)
- **Custom domain** (optional, e.g., `rephlo.ai`)
- **Backend API URL** ready (e.g., `https://api.rephlo.ai`)

---

## Build Process

### Local Build Test

Before deploying, test the production build locally:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm ci

# Build for production
npm run build

# Preview the production build
npm run preview
```

**Build Output:**
- Creates optimized production build in `dist/` directory
- All TypeScript compiled to JavaScript
- CSS purged of unused styles
- Assets minified and optimized
- Source maps generated (optional)

**Expected Build Time:** 30-60 seconds

**Build Success Indicators:**
- No TypeScript errors
- No ESLint warnings (critical issues only)
- Output shows bundle sizes
- `dist/` directory contains `index.html` and `assets/`

---

## Environment Variables

### Required Environment Variables

Create these environment variables in your hosting platform:

```bash
# Backend API URL (production)
VITE_API_URL=https://api.rephlo.ai

# Application branding
VITE_APP_NAME=Rephlo
VITE_APP_TAGLINE=Transform text. Keep your flow.
```

### Setting Environment Variables

**Vercel:**
1. Go to Project Settings → Environment Variables
2. Add each variable with production scope
3. Redeploy to apply changes

**Netlify:**
1. Go to Site Settings → Build & Deploy → Environment
2. Add each variable
3. Trigger new deployment

**Local `.env` File (DO NOT COMMIT):**
```bash
# .env.local (for local testing only)
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Rephlo
VITE_APP_TAGLINE=Transform text. Keep your flow.
```

---

## Deployment Options

### Option 1: Vercel (Recommended)

**Why Vercel:**
- Automatic deployments on git push
- Built-in CDN and edge network
- Zero-configuration for Vite/React projects
- Automatic HTTPS with custom domains
- Excellent performance and DX

**Deployment Steps:**

1. **Connect GitHub Repository**
   ```bash
   # Push code to GitHub (if not already)
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your GitHub repository
   - Configure project:
     - Framework Preset: **Vite**
     - Root Directory: **frontend**
     - Build Command: `npm run build`
     - Output Directory: `dist`

3. **Set Environment Variables**
   - Add `VITE_API_URL`, `VITE_APP_NAME`, `VITE_APP_TAGLINE`
   - Set scope to **Production**

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build and deployment
   - Vercel provides a preview URL (e.g., `your-project.vercel.app`)

5. **Configure Custom Domain**
   - Go to Project Settings → Domains
   - Add custom domain: `rephlo.ai`
   - Update DNS records as instructed by Vercel:
     ```
     Type: A
     Name: @
     Value: 76.76.21.21

     Type: CNAME
     Name: www
     Value: cname.vercel-dns.com
     ```
   - Wait for DNS propagation (up to 48 hours, usually minutes)
   - Vercel auto-provisions SSL certificate

6. **Auto-Deployment Setup**
   - Every push to `main` branch triggers automatic deployment
   - Pull requests get preview deployments
   - Rollback available via Vercel dashboard

**Vercel CLI Deployment (Alternative):**
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (from frontend directory)
cd frontend
vercel --prod
```

---

### Option 2: Netlify

**Deployment Steps:**

1. **Connect to Netlify**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Select GitHub repository

2. **Configure Build Settings**
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Set Environment Variables**
   - Go to Site Settings → Build & Deploy → Environment
   - Add environment variables:
     ```
     VITE_API_URL=https://api.rephlo.ai
     VITE_APP_NAME=Rephlo
     VITE_APP_TAGLINE=Transform text. Keep your flow.
     ```

4. **Deploy**
   - Click "Deploy site"
   - Netlify provides a URL (e.g., `random-name.netlify.app`)

5. **Custom Domain**
   - Go to Domain Settings → Add custom domain
   - Follow DNS configuration instructions
   - Netlify auto-provisions SSL

**Netlify CLI Deployment:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd frontend
netlify deploy --prod --dir=dist
```

---

### Option 3: Cloudflare Pages

**Deployment Steps:**

1. **Connect Repository**
   - Go to Cloudflare Pages dashboard
   - Click "Create a project"
   - Connect GitHub repository

2. **Configure Build**
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `frontend`

3. **Set Environment Variables**
   - Add production environment variables

4. **Deploy**
   - Cloudflare builds and deploys
   - Provides a `.pages.dev` URL
   - Configure custom domain in DNS settings

---

### Option 4: Self-Hosted (nginx)

**Prerequisites:**
- Linux server with nginx installed
- Domain pointing to server IP
- SSL certificate (Let's Encrypt recommended)

**Deployment Steps:**

1. **Build Locally**
   ```bash
   cd frontend
   npm ci
   npm run build
   ```

2. **Upload to Server**
   ```bash
   # Using scp
   scp -r dist/* user@your-server:/var/www/rephlo

   # Or using rsync
   rsync -avz dist/ user@your-server:/var/www/rephlo/
   ```

3. **Configure nginx**

   Create `/etc/nginx/sites-available/rephlo.conf`:
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name rephlo.ai www.rephlo.ai;

       # Redirect HTTP to HTTPS
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       listen [::]:443 ssl http2;
       server_name rephlo.ai www.rephlo.ai;

       # SSL configuration
       ssl_certificate /etc/letsencrypt/live/rephlo.ai/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/rephlo.ai/privkey.pem;

       root /var/www/rephlo;
       index index.html;

       # Gzip compression
       gzip on;
       gzip_vary on;
       gzip_min_length 1024;
       gzip_types text/plain text/css text/xml text/javascript
                  application/x-javascript application/xml+rss
                  application/javascript application/json;

       # SPA routing - redirect all to index.html
       location / {
           try_files $uri $uri/ /index.html;
       }

       # Cache static assets
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }

       # Security headers
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header Referrer-Policy "no-referrer-when-downgrade" always;
   }
   ```

4. **Enable Site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/rephlo.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **Set Up SSL with Let's Encrypt**
   ```bash
   sudo certbot --nginx -d rephlo.ai -d www.rephlo.ai
   ```

---

## Performance Optimization

### Automatic Optimizations (Vite)

Vite automatically applies these optimizations during build:

- **Code splitting** - Separate vendor and app bundles
- **Tree shaking** - Remove unused code
- **Minification** - Compress JavaScript and CSS
- **Asset optimization** - Optimize images and fonts

### Additional Optimizations

1. **Enable HTTP/2**
   - Most modern hosting platforms enable this by default
   - For self-hosted: ensure nginx/Apache configured for HTTP/2

2. **Set Proper Cache Headers**

   **Vercel/Netlify (automatic):**
   - `index.html`: `Cache-Control: public, max-age=0, must-revalidate`
   - `assets/*`: `Cache-Control: public, max-age=31536000, immutable`

   **Self-hosted (nginx config above already includes this)**

3. **Enable Compression**
   - Vercel/Netlify: automatic gzip/brotli
   - Self-hosted: configure in nginx (see config above)

4. **Use CDN**
   - Vercel/Netlify/Cloudflare: built-in global CDN
   - Self-hosted: integrate with Cloudflare or CloudFront

5. **Optimize Images**
   ```bash
   # Before deployment, optimize images
   npm install -g imagemin-cli
   imagemin public/images/* --out-dir=public/images
   ```

6. **Analyze Bundle Size**
   ```bash
   npm run build
   # Review bundle sizes in terminal output
   # Target: Main bundle < 500KB, total < 1MB
   ```

---

## Health Checks

### Pre-Deployment Checks

Run these checks before deploying:

```bash
# 1. Build succeeds
npm run build

# 2. TypeScript compilation passes
npx tsc --noEmit

# 3. Linting passes (fix critical issues)
npm run lint

# 4. Preview build locally
npm run preview
# Visit http://localhost:4173 and test all pages
```

### Post-Deployment Checks

After deployment, verify:

1. **Site Loads**
   ```bash
   curl -I https://rephlo.ai
   # Should return: HTTP/2 200
   ```

2. **All Pages Accessible**
   - Visit `/` (Landing page)
   - Visit `/admin` (Admin dashboard)
   - Check that routing works (no 404s)

3. **API Connection Works**
   - Open browser console
   - Check for successful API calls to backend
   - Verify no CORS errors

4. **Assets Load**
   - Check that images, fonts, styles load
   - No 404 errors in Network tab

5. **Mobile Responsive**
   - Test on mobile device or Chrome DevTools
   - Verify layout works on small screens

6. **Performance Audit**
   ```bash
   # Run Lighthouse audit
   npx lighthouse https://rephlo.ai --view
   ```

   **Target Scores:**
   - Performance: > 90
   - Accessibility: > 90
   - Best Practices: > 90
   - SEO: > 90

7. **SSL Certificate Valid**
   ```bash
   curl -vI https://rephlo.ai 2>&1 | grep -i "SSL certificate verify"
   # Should show: SSL certificate verify ok
   ```

### Automated Health Checks

**Vercel (Built-in):**
- Deployment checks automatically run
- Failed deployments don't go live

**Uptime Monitoring:**
- Set up external monitoring (UptimeRobot, Pingdom, StatusCake)
- Monitor endpoint: `https://rephlo.ai`
- Alert if down for > 5 minutes

---

## Rollback Procedure

### Vercel Rollback

1. **Via Dashboard:**
   - Go to Deployments tab
   - Find last known good deployment
   - Click "..." → "Promote to Production"
   - Instant rollback (< 1 minute)

2. **Via CLI:**
   ```bash
   vercel rollback
   ```

### Netlify Rollback

1. **Via Dashboard:**
   - Go to Deploys tab
   - Find previous successful deployment
   - Click "Publish deploy"
   - Rollback complete in ~30 seconds

### Git-Based Rollback

If deployment is linked to git:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force origin main

# Platform auto-deploys the previous version
```

### Self-Hosted Rollback

```bash
# Keep previous builds
mv dist dist-backup-$(date +%Y%m%d-%H%M%S)

# Restore previous build
cp -r dist-previous dist

# Or re-deploy from git
git checkout <previous-tag>
npm ci
npm run build
rsync -avz dist/ user@server:/var/www/rephlo/
```

---

## Post-Deployment Verification

### Verification Checklist

After deployment, complete this checklist:

- [ ] **Site accessible** at production URL
- [ ] **HTTPS working** and certificate valid
- [ ] **Landing page loads** in < 2 seconds
- [ ] **Admin dashboard accessible** and shows data
- [ ] **API calls working** (check browser console)
- [ ] **Download buttons functional** (track in backend)
- [ ] **Feedback form submits** successfully
- [ ] **Responsive design** works on mobile/tablet/desktop
- [ ] **No console errors** in browser DevTools
- [ ] **Lighthouse score > 90** for performance
- [ ] **DNS propagated** for custom domain
- [ ] **CDN cache warmed** (visit pages to populate cache)
- [ ] **Monitoring alerts** configured and active

### Smoke Test Script

```bash
#!/bin/bash
# smoke-test-frontend.sh

URL="https://rephlo.ai"

echo "Running frontend smoke tests..."

# Test 1: Homepage loads
if curl -f -s "$URL" > /dev/null; then
  echo "✓ Homepage loads"
else
  echo "✗ Homepage failed"
  exit 1
fi

# Test 2: HTTPS certificate valid
if curl -vI "$URL" 2>&1 | grep -q "SSL certificate verify ok"; then
  echo "✓ SSL certificate valid"
else
  echo "✗ SSL certificate invalid"
  exit 1
fi

# Test 3: Admin page accessible
if curl -f -s "$URL/admin" > /dev/null; then
  echo "✓ Admin page accessible"
else
  echo "✗ Admin page failed"
  exit 1
fi

echo "All smoke tests passed!"
```

---

## Troubleshooting

### Common Issues

**Issue: Build fails with TypeScript errors**
- Solution: Run `npx tsc --noEmit` locally and fix errors
- Check `tsconfig.json` is correct

**Issue: Environment variables not working**
- Solution: Ensure variables start with `VITE_` prefix
- Redeploy after adding variables
- Clear cache and hard reload in browser

**Issue: API calls return CORS errors**
- Solution: Check `VITE_API_URL` is correct
- Verify backend CORS configuration allows frontend origin
- Check backend is running and accessible

**Issue: Pages show 404 on refresh**
- Solution: Configure SPA routing in hosting platform
- Vercel/Netlify: automatic
- Self-hosted: ensure nginx `try_files` directive (see config above)

**Issue: Images not loading**
- Solution: Check image paths are relative
- Verify images exist in `public/` directory
- Check browser console for 404 errors

**Issue: Slow performance**
- Solution: Run Lighthouse audit
- Check bundle sizes (`npm run build`)
- Optimize images and assets
- Enable compression and caching

---

## Additional Resources

- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [React Deployment Guide](https://react.dev/learn/start-a-new-react-project#deploying-to-production)

---

**Next Steps:**
- After frontend deployment, deploy backend (see `DEPLOYMENT_BACKEND.md`)
- Configure monitoring and alerts
- Set up uptime monitoring
- Review security hardening (see `SECURITY_HARDENING.md`)

---

**Document Status:** Ready for Production
**Maintained By:** DevOps Team
**Review Frequency:** After major updates
