# Product Requirements Document (PRD)  
**Project:** Rephlo Branding Website  
**Author:** Product Management  
**Date:** 2025-11-03

---

## 1. Overview

**Tool Name & Purpose**  
**Rephlo Branding Website** — A marketing and support website for *Rephlo*, an AI-powered rewriting cross-platform desktop application. The site communicates the product’s value, enables user downloads, and gathers diagnostic and feedback data from users.

**Problem It Solves**  
Users need a clear entry point to understand Rephlo, download the desktop app, and provide feedback. Internally, the Rephlo team needs analytics on downloads, diagnostics, and version deployment control.

**Target Users**  
- Prospective users discovering Rephlo  
- Existing Rephlo desktop users (using feedback or diagnostic submission endpoints)  
- Rephlo internal team (admin side for feedback review and version deployment)  

---

## 2. Functional Requirements

### Core Functionality
1. **Landing page:** Show branding, product highlights, screenshots, and “Download for Mac/Windows/Linux” links.  Windows for now, Mac/Linu
2. **Download tracking API:** Log each download (OS, timestamp).  
3. **Version management API:** Serve the latest app release metadata to the desktop app.  
4. **Feedback submission API:** Allow users (and app) to post feedback to the server.  
5. **Diagnostic data receiver:** Accept optional diagnostic logs posted by the desktop app (for troubleshooting).  
6. **Admin dashboard (basic placeholder):** View feedback entries and download metrics.  

### Input
- User actions on the website (clicks, download requests)
- HTTP POST requests from the Rephlo desktop app with:
  - Diagnostics JSON/log file  
  - Feedback text and metadata  
  - Version check request  

### Processing
- Record incoming logs and feedback to PostgreSQL  
- Track download metrics per OS  
- Return JSON release metadata to the desktop app  

### Output
- HTML/CSS/JS-based responsive landing site  
- RESTful JSON responses for API endpoints  
- Admin pages showing simple data tables for feedback and download counts  

### User Stories
1. **As a visitor**, I want to see what Rephlo does and download the app, so I can try it out easily.  
2. **As a developer**, I want to track download numbers and versions, so we know how users engage.  
3. **As a user**, I want to submit feedback easily, so I can share my experience or report issues.  
4. **As the desktop client**, I want to send diagnostic logs, so the dev team can analyze problems.  
5. **As an admin**, I want to see feedback entries, so I can plan product improvements.

---

## 3. Technical Approach

**Recommended Technologies**  
- **Frontend:** React (TypeScript), shadcn/ui, TailwindCSS  
- **Backend:** Node.js (TypeScript), Express.js, PostgreSQL, Prisma ORM  
- **Hosting:** Vercel for frontend, Render/Heroku for backend (or unified deployment under one domain)  

**Dependencies:**
- React Router, Axios (frontend)
- Express.js, Prisma, pg (backend)
- Authentication (optional placeholder for future admin use)

**Runtime:**
- Frontend runs as a **web app (SPA)** served via CDN  
- Backend runs as **Node.js REST API**

**Suggested File Structure:**
```
/frontend
  /src
    /components
    /pages
    /assets
/backend
  /src
    /api
      feedback.ts
      diagnostics.ts
      downloads.ts
      version.ts
    /db
```

---

## 4. Usage Flow

1. **User visits** `rephlo.ai` landing page.  
2. Reads highlights → clicks “Download for Mac.”  
3. Frontend triggers API call `/api/track-download?os=mac`.  
4. Backend logs event, then redirects to file in cloud storage (e.g., AWS S3).  
5. Desktop app on launch calls `/api/version` to confirm it’s up-to-date.  
6. User submits feedback → POST `/api/feedback`.  
7. Diagnostic logs (optional) sent from app to `/api/diagnostics`.  
8. Admin visits `/admin` for summary metrics.

**Example Command / Interaction**
```bash
curl -X POST https://api.rephlo.ai/feedback \
     -H "Content-Type: application/json" \
     -d '{"userId":"abc123","message":"Love the app!"}'
```

---

## 5. Requirements & Constraints

**Performance**
- Handle up to 10,000 requests/day.
- API response time < 300ms typical for simple POSTs.
- Download log writes must not block user redirect.

**File & Data Constraints**
- Diagnostic uploads ≤ 5MB each.
- Feedback text ≤ 1000 characters.

**Error Handling**
- Return consistent JSON: `{ "success": false, "error": "message" }`
- Handle invalid POST body gracefully.
- Validate file types & size for diagnostics.

**Assumptions**
- Admin authentication will use placeholder static key initially.
- Community/shared Templates not implemented yet; reserved for v2.

---

## 6. Success Criteria

- ✅ Website live and accessible with responsive design.  
- ✅ Downloads are correctly logged and stored in DB.  
- ✅ Feedback and diagnostic endpoints accept and persist data.  
- ✅ Backend health check passes automated tests and uptime monitor.  

---

**End of PRD**