# API Consolidation Implementation Plan

**Document Number**: 102
**Created**: 2025-11-06
**Status**: In Progress
**Priority**: P0 (Critical)

## Executive Summary

This plan consolidates all backend API logic from the legacy `backend/src/api/` directory into the modern controller/routes architecture, eliminating the dual architectural pattern and ensuring consistency across the entire API surface.

## Current State Analysis

### Legacy API Files (to be migrated)
Located in `backend/src/api/`:

1. **downloads.ts**
   - Endpoint: `POST /api/track-download`
   - Functionality: Tracks download events with OS, user agent, hashed IP
   - Database: `Download` table
   - Auth: None (public)

2. **feedback.ts**
   - Endpoint: `POST /api/feedback`
   - Functionality: Stores user feedback
   - Database: `Feedback` table
   - Auth: None (public)

3. **version.ts**
   - Endpoint: `GET /api/version`
   - Functionality: Returns latest app version metadata
   - Database: `AppVersion` table
   - Auth: None (public)

4. **diagnostics.ts**
   - Endpoint: `POST /api/diagnostics`
   - Functionality: Handles diagnostic file uploads (multipart/form-data)
   - Dependencies: Multer middleware
   - Database: `Diagnostic` table
   - Max file size: 5MB
   - Allowed types: .json, .log, .txt, .zip
   - Auth: None (public)

5. **admin.ts**
   - Endpoint: `GET /admin/metrics`
   - Functionality: Returns aggregated system metrics
   - Auth: Bearer token (ADMIN_TOKEN env var)
   - Database: Aggregates from multiple tables

### Modern Controller Pattern
Located in `backend/src/controllers/`:
- Uses Dependency Injection (TSyringe)
- Service layer abstraction
- Consistent error handling
- Middleware-based authentication
- Scope-based authorization

## Migration Strategy

### Phase 1: Controller Creation (P0)

#### 1.1 Create BrandingController
**Purpose**: Handle public branding website endpoints
**Endpoints**:
- `POST /api/track-download` (downloads)
- `POST /api/feedback` (feedback)
- `GET /api/version` (version)
- `POST /api/diagnostics` (diagnostics with file upload)

**Dependencies**:
- `PrismaClient` (via DI)
- File upload handling (integrate Multer with controller)

**Response Format**: Maintain backward compatibility
```typescript
{
  success: true,
  data: { ... }
}
```

**Error Format**:
```typescript
{
  success: false,
  error: {
    code: "error_code",
    message: "Human-readable message"
  }
}
```

#### 1.2 Modernize AdminController
**Current**: Uses legacy `admin.ts` pattern
**Target**: Full DI controller with proper service layer

**Endpoints**:
- `GET /admin/metrics` - Migrate from legacy
- `GET /admin/users` - Implement (currently 501)
- `POST /admin/users/:id/suspend` - Implement (currently 501)
- `GET /admin/subscriptions` - Implement (currently 501)
- `GET /admin/usage` - Implement (currently 501)
- `POST /admin/webhooks/test` - Implement (currently 501)

**Authentication**: Implement proper admin role-based auth (replace simple Bearer token)

### Phase 2: Route Updates (P0)

#### 2.1 Update routes/index.ts
**Current mounting** (direct imports from `src/api/`):
```typescript
import { trackDownload } from '../api/downloads';
import { submitFeedback } from '../api/feedback';
import { uploadDiagnostic, uploadMiddleware, handleMulterError } from '../api/diagnostics';
import { getLatestVersion } from '../api/version';

router.post('/api/track-download', trackDownload);
router.post('/api/feedback', submitFeedback);
router.post('/api/diagnostics', uploadMiddleware, handleMulterError, uploadDiagnostic);
router.get('/api/version', getLatestVersion);
```

**Target mounting** (via controllers):
```typescript
import { BrandingController } from '../controllers/branding.controller';

const brandingController = container.resolve(BrandingController);

router.post('/api/track-download',
  asyncHandler(brandingController.trackDownload.bind(brandingController))
);
router.post('/api/feedback',
  asyncHandler(brandingController.submitFeedback.bind(brandingController))
);
router.post('/api/diagnostics',
  brandingController.getUploadMiddleware(), // Multer middleware
  asyncHandler(brandingController.uploadDiagnostic.bind(brandingController))
);
router.get('/api/version',
  asyncHandler(brandingController.getLatestVersion.bind(brandingController))
);
```

#### 2.2 Create branding.routes.ts
**Better organization**: Separate branding routes into dedicated module
```typescript
// routes/branding.routes.ts
export function createBrandingRouter(): Router {
  const router = Router();
  const brandingController = container.resolve(BrandingController);

  // Public endpoints for branding website
  router.post('/track-download', ...);
  router.post('/feedback', ...);
  router.post('/diagnostics', ...);
  router.get('/version', ...);

  return router;
}
```

Then mount in `routes/index.ts`:
```typescript
router.use('/api', createBrandingRouter());
```

#### 2.3 Update admin.routes.ts
Replace legacy admin import with modernized AdminController:
```typescript
// Current
import { getMetrics } from '../api/admin';
router.get('/metrics', authMiddleware, getMetrics);

// Target
import { AdminController } from '../controllers/admin.controller';
const adminController = container.resolve(AdminController);

router.get('/metrics',
  authMiddleware,
  requireAdminRole,
  asyncHandler(adminController.getMetrics.bind(adminController))
);
```

### Phase 3: File Cleanup (P0)

#### 3.1 Remove Legacy Files
After successful migration and testing:
```bash
rm backend/src/api/downloads.ts
rm backend/src/api/feedback.ts
rm backend/src/api/version.ts
rm backend/src/api/diagnostics.ts
rm backend/src/api/admin.ts
```

#### 3.2 Update Imports
Search and replace any remaining imports from `../api/`:
```bash
grep -r "from '../api/" backend/src/
grep -r "from './api/" backend/src/
```

### Phase 4: Swagger Documentation (P1)

#### 4.1 Current Coverage
The existing `enhanced-api.yaml` covers:
- `/api/user/credits`
- `/api/user/profile`
- `/oauth/token/enhance`

#### 4.2 Extend OpenAPI Spec
Add all endpoints to `backend/docs/openapi/enhanced-api.yaml`:

**Branding API Endpoints**:
- `POST /api/track-download`
- `POST /api/feedback`
- `GET /api/version`
- `POST /api/diagnostics`

**Admin API Endpoints**:
- `GET /admin/metrics`
- `GET /admin/users`
- `POST /admin/users/:id/suspend`
- `GET /admin/subscriptions`
- `GET /admin/usage`
- `POST /admin/webhooks/test`

**REST API v1 Endpoints** (currently undocumented):
- `GET /v1/models`
- `GET /v1/models/:modelId`
- `POST /v1/completions`
- `POST /v1/chat/completions`
- `GET /v1/subscriptions/me`
- `GET /v1/subscription-plans`
- `POST /v1/subscriptions`
- `PATCH /v1/subscriptions/me`
- `POST /v1/subscriptions/me/cancel`
- `GET /v1/credits/me`
- `GET /v1/usage`
- `GET /v1/usage/stats`
- `GET /v1/rate-limit`
- `GET /v1/users/me`
- `PATCH /v1/users/me`
- `GET /v1/users/me/preferences`
- `PATCH /v1/users/me/preferences`
- `POST /v1/users/me/preferences/model`
- `GET /v1/users/me/preferences/model`
- `GET /v1/webhooks/config`
- `POST /v1/webhooks/config`
- `DELETE /v1/webhooks/config`
- `POST /v1/webhooks/test`

**OAuth/OIDC Endpoints**:
- Standard OIDC endpoints (already provided by node-oidc-provider)
- Custom: `POST /oauth/token/enhance`

#### 4.3 Swagger Tags Organization
```yaml
tags:
  - name: Authentication
    description: OAuth 2.0 / OIDC authentication endpoints
  - name: Users
    description: User profile and preferences management
  - name: Credits
    description: Credit balance and usage tracking
  - name: Models
    description: Available AI models and inference endpoints
  - name: Subscriptions
    description: Subscription plans and management
  - name: Webhooks
    description: User webhook configuration
  - name: Branding
    description: Public branding website endpoints
  - name: Admin
    description: Administrative endpoints (requires admin role)
```

#### 4.4 Validation Requirements
For each endpoint document:
- ✅ Correct HTTP method and path
- ✅ All request parameters (path, query, header)
- ✅ Request body schema (if applicable)
- ✅ All response codes (200, 400, 401, 403, 404, 429, 500)
- ✅ Response body schema for each status code
- ✅ Authentication requirements
- ✅ Rate limiting information
- ✅ Example requests and responses
- ✅ Scope requirements (if OAuth protected)

### Phase 5: Frontend Updates (P2)

#### 5.1 Analyze Frontend API Calls
Located in `frontend/src/services/api.ts`:
```typescript
// Current imports
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7150';

// Used endpoints:
// GET /health
// POST /api/track-download
// POST /api/feedback
// GET /api/version
// GET /admin/metrics
```

#### 5.2 Update Frontend (if needed)
**Response Format**: If we change response format, update frontend to handle new structure

**Example Change**:
```typescript
// Before (legacy format)
const response = await api.post('/api/track-download', data);
if (response.data.success) {
  const downloadUrl = response.data.data.download_url;
}

// After (modern format - if changed)
const response = await api.post('/api/track-download', data);
const downloadUrl = response.data.download_url;
```

**Recommendation**: Maintain backward-compatible response format for branding endpoints to avoid frontend changes.

#### 5.3 Add TypeScript Types
Create type definitions for all API responses:
```typescript
// frontend/src/types/api.ts
export interface DownloadTrackingResponse {
  download_id: string;
  download_url: string;
  platform: string;
}

export interface FeedbackResponse {
  feedback_id: string;
  message: string;
}

export interface VersionResponse {
  version: string;
  release_date: string;
  download_url: string;
  changelog: string;
}
```

### Phase 6: Testing Strategy (P2)

#### 6.1 Unit Tests
For each new controller:
- ✅ Test all methods with valid inputs
- ✅ Test validation errors
- ✅ Test database errors
- ✅ Test authentication/authorization (where applicable)

#### 6.2 Integration Tests
- ✅ Test complete request/response cycle
- ✅ Test with actual database
- ✅ Test file upload functionality (diagnostics)
- ✅ Test rate limiting
- ✅ Test error handling

#### 6.3 E2E Tests
- ✅ Test frontend calling all refactored endpoints
- ✅ Verify response format compatibility
- ✅ Test authentication flow
- ✅ Test admin endpoints with proper auth

#### 6.4 Regression Testing
- ✅ Verify all existing endpoints still work
- ✅ Verify no breaking changes to response formats
- ✅ Verify rate limits still apply correctly
- ✅ Verify authentication still works

## Implementation Order

### Sprint 1: Core Migration (P0)
1. ✅ Create BrandingController with all methods
2. ✅ Create branding.routes.ts
3. ✅ Modernize AdminController
4. ✅ Update admin.routes.ts
5. ✅ Update routes/index.ts to use new controllers
6. ✅ Test all endpoints locally
7. ✅ Remove legacy files after verification

### Sprint 2: Documentation (P1)
8. ✅ Extend OpenAPI specification with all endpoints
9. ✅ Add request/response examples
10. ✅ Add authentication/scope documentation
11. ✅ Validate Swagger UI displays correctly
12. ✅ Test "Try it out" functionality in Swagger

### Sprint 3: Frontend Integration (P2)
13. ✅ Analyze frontend API consumption
14. ✅ Update frontend code (if needed)
15. ✅ Add TypeScript types for all API responses
16. ✅ Integration testing with frontend
17. ✅ E2E testing

## Edge Cases & Special Handling

### 1. File Upload (Diagnostics)
**Challenge**: Multer middleware integration with DI controllers
**Solution**:
```typescript
class BrandingController {
  private uploadMiddleware: RequestHandler;

  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    // Initialize Multer in constructor
    const storage = multer.memoryStorage();
    const upload = multer({
      storage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['.json', '.log', '.txt', '.zip'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type'));
        }
      }
    });
    this.uploadMiddleware = upload.single('file');
  }

  getUploadMiddleware(): RequestHandler {
    return this.uploadMiddleware;
  }

  async uploadDiagnostic(req: Request, res: Response): Promise<void> {
    // Handle uploaded file
    const file = req.file;
    if (!file) {
      throw new ValidationError('File is required');
    }
    // ... rest of logic
  }
}
```

### 2. Response Format Compatibility
**Challenge**: Legacy format uses `{success: true, data: {...}}`, modern format is direct object
**Solution**: Maintain legacy format for branding endpoints to avoid breaking frontend

```typescript
// Utility function for legacy response format
function legacyResponse<T>(data: T) {
  return {
    success: true,
    data
  };
}

function legacyError(code: string, message: string) {
  return {
    success: false,
    error: { code, message }
  };
}
```

### 3. Admin Authentication
**Challenge**: Current admin auth uses simple Bearer token, need role-based auth
**Solution**:
- Phase 1: Maintain Bearer token check for backward compatibility
- Phase 2: Implement proper admin role in user table
- Phase 3: Add role-based middleware (`requireAdminRole`)

### 4. Missing Validation
**Challenge**: Legacy endpoints have minimal validation
**Solution**: Add Zod schemas for all request bodies

```typescript
// Example for downloads
const trackDownloadSchema = z.object({
  platform: z.enum(['windows', 'macos', 'linux']),
  version: z.string(),
  user_agent: z.string().optional(),
  referrer: z.string().url().optional()
});
```

### 5. Rate Limiting
**Challenge**: Branding endpoints currently have no rate limiting
**Solution**: Apply IP-based rate limiting to prevent abuse

```typescript
// In branding.routes.ts
import { createIPRateLimiter } from '../middleware/ratelimit.middleware';

const brandingRateLimiter = createIPRateLimiter(100); // 100 req/min per IP

router.post('/track-download', brandingRateLimiter, ...);
router.post('/feedback', brandingRateLimiter, ...);
```

## Rollback Plan

### If Migration Fails
1. Keep legacy files in place until full verification
2. Use feature flag to toggle between old and new implementations
3. Revert route changes if critical issues found
4. Full rollback: restore `src/api/` imports in routes

### Monitoring After Deployment
- Monitor error rates on all endpoints
- Track response time changes
- Monitor rate limit hits
- Check for any 500 errors in logs

## Success Criteria

### P0 Requirements (Must Have)
- ✅ All API logic moved from `src/api/` to `controllers/`
- ✅ Legacy `src/api/` directory removed
- ✅ All endpoints accessible via controllers
- ✅ Consistent error handling across all endpoints
- ✅ No breaking changes to response formats
- ✅ All tests passing

### P1 Requirements (Should Have)
- ✅ Complete Swagger documentation for all endpoints
- ✅ Accurate request/response schemas in OpenAPI spec
- ✅ All endpoints testable via Swagger UI
- ✅ Examples for all request/response types

### P2 Requirements (Nice to Have)
- ✅ Frontend updated to use refactored endpoints
- ✅ TypeScript types for all API responses
- ✅ E2E tests passing
- ✅ Integration tests covering all scenarios

## Timeline Estimate

- **Sprint 1 (Core Migration)**: 3-5 days
- **Sprint 2 (Documentation)**: 2-3 days
- **Sprint 3 (Frontend Integration)**: 2-3 days
- **Total**: 7-11 days

## Dependencies

- ✅ DI container (TSyringe) - Already configured
- ✅ Prisma client - Already in DI container
- ✅ Multer - Already installed
- ✅ Swagger UI - Already configured
- ✅ OpenAPI spec template - Already exists

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking frontend | High | Medium | Maintain backward-compatible response format |
| File upload regression | High | Low | Thorough testing of multipart/form-data |
| Performance degradation | Medium | Low | Monitor response times, optimize if needed |
| Missing edge cases | Medium | Medium | Comprehensive testing strategy |
| Documentation drift | Low | Medium | Validate docs against actual implementation |

## Next Steps

1. ✅ Review and approve this plan
2. ✅ Create BrandingController implementation
3. ✅ Create branding.routes.ts
4. ✅ Test endpoints locally
5. ✅ Update OpenAPI specification
6. ✅ Deploy and monitor

---

**Document Status**: Ready for Implementation
**Approved By**: Pending
**Implementation Start Date**: TBD
