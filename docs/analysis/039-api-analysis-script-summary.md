# API Endpoint Analysis Script - Summary

**Created:** 2025-11-12
**Script Location:** `scripts/analyze-api-endpoints.ts`
**Generated Report:** `docs/analysis/038-api-endpoints-analysis.md`

---

## Overview

Created a comprehensive TypeScript script that analyzes the entire Rephlo monorepo to:
1. Extract all API endpoints from backend and identity-provider
2. Identify the exact file and line number where each endpoint is defined
3. Find all usages of these endpoints across the codebase (frontend, backend, identity-provider)
4. Generate a detailed markdown report with statistics

---

## Script Capabilities

### 1. **Backend Route Discovery**
- Scans `backend/src/routes/` directory for Express route definitions
- Handles multi-line route definitions (e.g., routes split across multiple lines)
- Extracts HTTP methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
- Identifies middleware: `authenticate`, `requireAdmin`, `requireScopes`, `auditLog`
- Captures handler information: controller.method references

### 2. **Identity Provider Route Discovery**
- Scans identity-provider source files for Express routes
- Includes standard OIDC endpoints:
  - `/.well-known/openid-configuration`
  - `/oauth/authorize`
  - `/oauth/token`
  - `/oauth/userinfo`
  - `/oauth/jwks`
  - `/oauth/introspect`
  - `/oauth/revoke`

### 3. **Usage Detection**
- Searches frontend (`frontend/src/`) for API calls
- Searches backend for internal API usage
- Detects patterns:
  - `axios.get('/path')`
  - `apiClient.post('/path')`
  - `fetch('/path')`
  - String literals containing endpoint paths

### 4. **Report Generation**

Two output formats available:

#### **Full Format** (default)
- Markdown with detailed sections
- Organized by project and HTTP method
- Separate section for each endpoint
- Includes:
  - Endpoint path and method
  - Definition location (file:line)
  - Handler and middleware information
  - All usage locations with context in tables
  - Summary statistics
- Best for: Detailed investigation, understanding context

#### **Simple Format** (recommended)
- Single flat table per project
- Sorted by endpoint (ascending)
- Columns: Method | Endpoint | File | Handler | Middleware | Usages
- Compact format with all info in one view
- Semicolon-separated usage list
- Best for: Quick reference, API catalog, searching

**Example Simple Format Table:**
```markdown
| Method | Endpoint | File | Handler | Middleware | Usages |
|--------|----------|------|---------|------------|--------|
| GET | `/admin/metrics` | `backend\src\routes\admin.routes.ts L:63` | `adminController.getMetrics` | `authenticate, requireAdmin` | `frontend\src\api\admin.ts L:96; frontend\src\services\api.ts L:260` |
| POST | `/admin/users` | `backend\src\routes\admin.routes.ts L:75` | `adminController.createUser` | `authenticate, requireAdmin, auditLog` | `frontend\src\api\admin.ts L:158` |
```

---

## Results

### Analysis Report: `docs/analysis/038-api-endpoints-analysis.md`

**Total Endpoints Found:** 228

#### Backend API
- **Total Endpoints:** 206
- **HTTP Methods:** GET (119), POST (52), PATCH (20), DELETE (6), PUT (9)
- **Endpoints with Usages:** 138 (67%)
- **Total Usage References:** 1,972
- **Unused Endpoints:** 68 (33%)

#### Identity Provider (OAuth 2.0/OIDC)
- **Total Endpoints:** 22
- **HTTP Methods:** GET (8), POST (8), ALL (1), PUT (5)
- **Endpoints with Usages:** 2 (9%)
- **Total Usage References:** 868
- **Unused Endpoints:** 20 (91%)

---

## Key Features

### Multi-Line Route Detection
The script handles complex Express route definitions:
```typescript
router.post(
  '/models/tiers/bulk',
  asyncHandler(modelTierAdminController.bulkUpdateModelTiers.bind(modelTierAdminController))
);
```

### Middleware Identification
Automatically detects common middleware patterns:
- `authenticate()` - Authentication requirement
- `requireAdmin()` - Admin role requirement
- `requireScopes(['admin'])` - Scope-based authorization
- `auditLog()` - Audit logging

### Usage Context
For each usage, the report shows:
- File path (relative to project root)
- Line number
- Code context (truncated to 80 characters)

---

## Usage

### Run the Analysis
```bash
# From project root

# Default (full format, no tests)
npm run analyze:api

# Simple table format (recommended)
npm run analyze:api:simple

# Full detailed format
npm run analyze:api:full

# Include test files
npm run analyze:api:with-tests

# Or directly with custom options
npx tsx scripts/analyze-api-endpoints.ts -- --format=simple
npx tsx scripts/analyze-api-endpoints.ts -- --format=full
npx tsx scripts/analyze-api-endpoints.ts -- --include-test=true
npx tsx scripts/analyze-api-endpoints.ts -- --format=simple --include-test=true
```

### Arguments
- `--format=simple|full` - Output format (default: full)
  - **simple**: Single flat table per project, sorted by endpoint
  - **full**: Detailed report grouped by HTTP method with context
- `--include-test=true` - Include test files (default: false)
  - When false, excludes `__tests__/`, `test/`, `tests/`, `__mocks__/`, `*.test.ts`, `*.spec.ts`

### Output
- Generates sequentially numbered reports in `docs/analysis/`
- Format: `NNN-api-endpoints-analysis.md`
- Automatically determines next available number

---

## Technical Implementation

### Technologies
- **TypeScript** - Type-safe script implementation
- **Node.js fs/path** - File system operations
- **Regex Patterns** - Multi-line route matching
- **tsx** - TypeScript execution runtime

### Key Algorithms

1. **Route Extraction:**
   - Normalize multi-line code to single line
   - Apply regex patterns for Express route methods
   - Find original line numbers in source
   - Extract middleware and handler from context

2. **Usage Finding:**
   - Convert route paths to regex (handle :params)
   - Search all TypeScript/JavaScript files
   - Match common API call patterns
   - Capture line and context

3. **Report Generation:**
   - Group endpoints by project and method
   - Generate markdown tables
   - Calculate summary statistics

---

## Insights

### Backend Coverage
- **67% of endpoints are actively used** - Good coverage
- **33% unused endpoints** - Potential technical debt or future features

### Identity Provider Usage
- **Only 9% of OIDC endpoints have detected usage** - This is expected
  - OIDC endpoints are primarily called by OAuth flows (browser redirects)
  - Not typically called via JavaScript API clients
  - Backend uses introspection internally

### Most Active Endpoints
The report shows endpoints like `/admin/users/:userId/*` have the most usage references, indicating core admin functionality.

---

## Future Enhancements

Potential improvements for the script:

1. **Route Parameter Detection**
   - Show which parameters are required/optional
   - Extract from JSDoc comments or validation schemas

2. **Request/Response Schema**
   - Parse TypeScript interfaces
   - Show expected request bodies and response types

3. **Authentication Requirements**
   - Detect required scopes/roles more accurately
   - Show tier restrictions (Free/Pro/Enterprise)

4. **API Versioning**
   - Track `/v1/`, `/v2/` versioning
   - Show deprecated endpoints

5. **Interactive Report**
   - Generate HTML with search/filter
   - Click to jump to source files

---

## Maintenance

### When to Re-run
- After adding new endpoints
- After major refactoring
- Before API documentation updates
- During API security audits

### Updating the Script
Location: `scripts/analyze-api-endpoints.ts`

To add new patterns:
1. Update `routePatterns` regex array
2. Add middleware detection patterns
3. Test with sample route files

---

## Related Documentation

- **Main Documentation:** `docs/analysis/038-api-endpoints-analysis.md` (generated report)
- **Project Structure:** `CLAUDE.md` - API architecture overview
- **Backend Routes:** `backend/src/routes/` - Source route definitions
- **Frontend API Clients:** `frontend/src/api/` - Usage examples

---

## Script Statistics

- **Lines of Code:** ~400
- **Execution Time:** ~2-5 seconds
- **Report Size:** ~33,000 tokens (large codebase)
- **Files Scanned:** All `.ts`/`.tsx`/`.js`/`.jsx` in:
  - `backend/src/`
  - `identity-provider/src/`
  - `frontend/src/`
