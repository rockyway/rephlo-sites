# Batch 7: Branding (Legacy) API Response Standardization - Implementation Specification

**Created:** 2025-11-12
**Status:** Implementation In Progress
**Batch:** 7 of 12
**Endpoints:** 3 endpoints (POST /diagnostics, POST /feedback, POST /track-download)

---

## Overview

This document specifies the standardization of 3 branding endpoints that currently use a legacy response format (`{ success: true, data: {...} }`). Since the application has **NOT launched yet**, we can safely migrate these endpoints to the standard response format without breaking backward compatibility.

**Context:**
- Previous batches: 68 endpoints standardized across 6 batches
- Current coverage: 68/90 (76%)
- After this batch: 71/90 (79%)
- All 3 endpoints are in `backend/src/controllers/branding.controller.ts`

---

## Standard Response Format (Required)

```typescript
{
  status: 'success',
  data: <PrimaryResource>,  // Flat object, NOT nested
  meta?: {
    message?: string,
    affectedRecords?: number
  }
}
```

---

## Endpoints to Standardize

### 1. POST /diagnostics - Upload Diagnostic Information

**Route:** `backend/src/routes/branding.routes.ts` L:159
**Controller:** `brandingController.uploadDiagnostic`
**File:** `backend/src/controllers/branding.controller.ts` L:362-423
**Auth:** No auth required
**Status Code:** 201 (Created)

**Current Response Format:**
```typescript
// Success (201)
{
  success: true,
  data: {
    diagnosticId: "clx...",
    fileSize: 12345
  }
}

// Error (400/413/500)
{
  success: false,
  error: "Validation failed: ..."
}
```

**New Response Format:**
```typescript
// Success (201)
{
  status: 'success',
  data: {
    diagnosticId: "clx...",
    fileSize: 12345
  },
  meta: {
    message: "Diagnostic file uploaded successfully"
  }
}

// Error (400/413/500)
{
  status: 'error',
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed: ...',
    details: null
  }
}
```

**Changes Required:**
- Replace `legacySuccess()` with standard format
- Replace `legacyError()` with standard error format
- Add meta.message for success case
- Standardize error responses

---

### 2. POST /feedback - Submit User Feedback

**Route:** `backend/src/routes/branding.routes.ts` L:100
**Controller:** `brandingController.submitFeedback`
**File:** `backend/src/controllers/branding.controller.ts` L:214-266
**Auth:** No auth required
**Status Code:** 201 (Created)
**Frontend Usage:** `frontend/src/services/api.ts` L:248

**Current Response Format:**
```typescript
// Success (201)
{
  success: true,
  data: {
    feedbackId: "clx..."
  }
}

// Error (400/500)
{
  success: false,
  error: "Validation failed: ..."
}
```

**New Response Format:**
```typescript
// Success (201)
{
  status: 'success',
  data: {
    feedbackId: "clx..."
  },
  meta: {
    message: "Feedback submitted successfully"
  }
}

// Error (400/500)
{
  status: 'error',
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed: ...',
    details: null
  }
}
```

**Changes Required:**
- Replace `legacySuccess()` with standard format
- Replace `legacyError()` with standard error format
- Add meta.message for success case
- Update frontend API client to unwrap response.data

---

### 3. POST /track-download - Track Download by OS

**Route:** `backend/src/routes/branding.routes.ts` L:68
**Controller:** `brandingController.trackDownload`
**File:** `backend/src/controllers/branding.controller.ts` L:132-189
**Auth:** No auth required
**Status Code:** 200 (OK)
**Frontend Usage:** `frontend/src/services/api.ts` L:242

**Current Response Format:**
```typescript
// Success (200)
{
  success: true,
  data: {
    downloadUrl: "https://...",
    downloadId: "clx..."
  }
}

// Error (400/500)
{
  success: false,
  error: "Validation failed: ..."
}
```

**New Response Format:**
```typescript
// Success (200)
{
  status: 'success',
  data: {
    downloadUrl: "https://...",
    downloadId: "clx..."
  },
  meta: {
    message: "Download tracked successfully"
  }
}

// Error (400/500)
{
  status: 'error',
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed: ...',
    details: null
  }
}
```

**Changes Required:**
- Replace `legacySuccess()` with standard format
- Replace `legacyError()` with standard error format
- Add meta.message for success case
- Update frontend API client to unwrap response.data

---

## Implementation Strategy

### Phase 1: Backend Controller Standardization

**File:** `backend/src/controllers/branding.controller.ts`

1. **Remove Legacy Format Utilities** (Lines 41-67):
   - Delete `legacySuccess()` function
   - Delete `legacyError()` function
   - Update controller header comments

2. **Standardize `uploadDiagnostic` (Lines 362-423):**
   - Replace success response with standard format
   - Add meta.message: "Diagnostic file uploaded successfully"
   - Replace error responses with standard error format
   - Update error codes (VALIDATION_ERROR, FILE_SIZE_EXCEEDED, INTERNAL_SERVER_ERROR)

3. **Standardize `submitFeedback` (Lines 214-266):**
   - Replace success response with standard format
   - Add meta.message: "Feedback submitted successfully"
   - Replace error responses with standard error format
   - Update error codes (VALIDATION_ERROR, INTERNAL_SERVER_ERROR)

4. **Standardize `trackDownload` (Lines 132-189):**
   - Replace success response with standard format
   - Add meta.message: "Download tracked successfully"
   - Replace error responses with standard error format
   - Update error codes (VALIDATION_ERROR, INTERNAL_SERVER_ERROR)

5. **Update `handleMulterError` (Lines 429-448):**
   - Replace legacy error responses with standard format
   - Update error codes (FILE_SIZE_EXCEEDED, FILE_UPLOAD_ERROR)

### Phase 2: Frontend API Client Update

**File:** `frontend/src/services/api.ts`

**Current Implementation (Lines 240-250):**
```typescript
// Download tracking
trackDownload: async (os: 'windows' | 'macos' | 'linux') => {
  const response = await apiClient.post('/api/track-download', { os });
  return response.data;
},

// Feedback submission
submitFeedback: async (data: { message: string; email?: string; userId?: string }) => {
  const response = await apiClient.post('/api/feedback', data);
  return response.data;
},
```

**New Implementation:**
```typescript
// Download tracking
trackDownload: async (os: 'windows' | 'macos' | 'linux') => {
  const response = await apiClient.post('/api/track-download', { os });
  return response.data.data; // Unwrap standardized response
},

// Feedback submission
submitFeedback: async (data: { message: string; email?: string; userId?: string }) => {
  const response = await apiClient.post('/api/feedback', data);
  return response.data.data; // Unwrap standardized response
},
```

**Changes:**
- Add `.data` unwrapping to access nested data object
- No other changes needed (consumers already expect `{ downloadUrl, downloadId }` or `{ feedbackId }`)

---

## Error Code Mapping

| Scenario | Current Error | New Error Code |
|----------|--------------|----------------|
| Validation failure | "Validation failed: ..." | `VALIDATION_ERROR` |
| File size exceeded | "File size exceeds 5MB limit" | `FILE_SIZE_EXCEEDED` |
| File upload error | "File upload error: ..." | `FILE_UPLOAD_ERROR` |
| Internal server error | "Internal server error" | `INTERNAL_SERVER_ERROR` |

---

## Rationale for Standardization

**Question:** Why remove the "legacy" format if it's documented as backward-compatible?

**Answer:**
1. **Application Not Launched:** User confirmed the app hasn't launched yet, so there are no external consumers to break
2. **Frontend Integration:** Frontend branding website is part of the same monorepo, can be updated simultaneously
3. **Consistency:** Maintaining two response formats (legacy vs standard) increases maintenance burden
4. **Future-Proofing:** Standardizing now prevents technical debt accumulation
5. **Documentation Clarity:** Having one consistent format simplifies API documentation

---

## Testing Considerations

### Backend Testing
- Verify all 3 endpoints return standardized response format
- Test validation error scenarios
- Test file upload errors (size exceeded, invalid type)
- Verify error codes are correct

### Frontend Testing
- Verify `trackDownload()` returns `{ downloadUrl, downloadId }`
- Verify `submitFeedback()` returns `{ feedbackId }`
- Test error handling in frontend components

### Build Validation
- Backend: `cd backend && npm run build` - must pass with 0 errors
- Frontend: `cd frontend && npm run build` - must pass with 0 errors

---

## Expected Outcomes

**Before Batch 7:**
- Standardized endpoints: 68/90 (76%)
- Legacy branding endpoints using `{ success: true, data: {...} }`

**After Batch 7:**
- Standardized endpoints: 71/90 (79%)
- All branding endpoints use standard format: `{ status: 'success', data: {...}, meta: {...} }`
- Frontend API client updated to unwrap responses
- Builds pass with 0 errors

---

## Files to Modify

### Backend
- `backend/src/controllers/branding.controller.ts` - Standardize all 3 endpoints (Lines 132-448)

### Frontend
- `frontend/src/services/api.ts` - Update response unwrapping (Lines 241-249)

---

## Success Criteria

- ✅ All 3 branding endpoints return standardized format
- ✅ Legacy utility functions removed from controller
- ✅ Frontend API client updated to handle new response format
- ✅ Backend build passes with 0 errors
- ✅ Frontend build passes with 0 errors
- ✅ Error codes standardized and consistent
- ✅ Meta messages added for all success responses

---

## Next Steps

1. Implement backend controller standardization
2. Update frontend API client
3. Run backend build validation
4. Run frontend build validation
5. Create completion report (173-batch7-branding-standardization-complete.md)

---

## References

- API Standards: `docs/reference/156-api-standards.md`
- Branding Controller: `backend/src/controllers/branding.controller.ts`
- Frontend API Client: `frontend/src/services/api.ts`
- Previous Completion Report: `docs/progress/172-api-standardization-project-complete.md`
