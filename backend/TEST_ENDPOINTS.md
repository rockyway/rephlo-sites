# API Endpoint Testing Guide

## Prerequisites

1. **Database Setup**: Ensure PostgreSQL is running and credentials are correct in `.env`
2. **Server Running**: Start the backend with `npm run dev`
3. **Database Seeded**: Run `npm run seed` to populate test data

## Testing All 5 Endpoints

### 1. POST /api/track-download

**Purpose**: Log download event and return download URL

**Test Command**:
```bash
curl -X POST http://localhost:3001/api/track-download \
  -H "Content-Type: application/json" \
  -d '{"os":"windows"}'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://releases.rephlo.ai/rephlo-1.2.0-windows.exe",
    "downloadId": "clx..."
  }
}
```

**Test Different OS**:
```bash
# macOS
curl -X POST http://localhost:3001/api/track-download \
  -H "Content-Type: application/json" \
  -d '{"os":"macos"}'

# Linux
curl -X POST http://localhost:3001/api/track-download \
  -H "Content-Type: application/json" \
  -d '{"os":"linux"}'
```

**Test Validation Error**:
```bash
# Invalid OS - should return 400 error
curl -X POST http://localhost:3001/api/track-download \
  -H "Content-Type: application/json" \
  -d '{"os":"android"}'
```

**Expected Error**:
```json
{
  "success": false,
  "error": "Validation failed: OS must be one of: windows, macos, linux"
}
```

---

### 2. POST /api/feedback

**Purpose**: Submit user feedback

**Test Command**:
```bash
curl -X POST http://localhost:3001/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"message":"Great app! Love the text transformation features.","email":"user@example.com"}'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "feedbackId": "clx..."
  }
}
```

**Test Without Email**:
```bash
curl -X POST http://localhost:3001/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"message":"Anonymous feedback"}'
```

**Test With UserId**:
```bash
curl -X POST http://localhost:3001/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"message":"Feedback from desktop app","userId":"user_abc123","email":"user@example.com"}'
```

**Test Validation Errors**:
```bash
# Empty message - should return 400 error
curl -X POST http://localhost:3001/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"message":""}'

# Message too long (>1000 chars) - should return 400 error
curl -X POST http://localhost:3001/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"message":"'$(python -c "print('a' * 1001)")'"}'

# Invalid email format - should return 400 error
curl -X POST http://localhost:3001/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"message":"Test","email":"invalid-email"}'
```

---

### 3. POST /api/diagnostics

**Purpose**: Upload diagnostic file

**Create Test Files**:
```bash
# Create test log file
echo '{"timestamp":"2025-11-03","error":"Test error","stacktrace":"..."}' > test-diagnostic.json

# Create test text log
echo "Application started at 2025-11-03" > test-diagnostic.log
```

**Test Command**:
```bash
curl -X POST http://localhost:3001/api/diagnostics \
  -F "file=@test-diagnostic.json" \
  -F "userId=test-user-123"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "diagnosticId": "clx...",
    "fileSize": 1234
  }
}
```

**Test Different File Types**:
```bash
# JSON file
curl -X POST http://localhost:3001/api/diagnostics \
  -F "file=@test-diagnostic.json"

# Log file
curl -X POST http://localhost:3001/api/diagnostics \
  -F "file=@test-diagnostic.log"

# Text file
echo "Test diagnostic data" > test.txt
curl -X POST http://localhost:3001/api/diagnostics \
  -F "file=@test.txt"
```

**Test Validation Errors**:
```bash
# No file - should return 400 error
curl -X POST http://localhost:3001/api/diagnostics

# Invalid file type - should return 400 error
curl -X POST http://localhost:3001/api/diagnostics \
  -F "file=@image.png"

# File too large (>5MB) - should return 413 error
# Create 6MB file
dd if=/dev/zero of=large-file.log bs=1M count=6
curl -X POST http://localhost:3001/api/diagnostics \
  -F "file=@large-file.log"
```

---

### 4. GET /api/version

**Purpose**: Get latest app version metadata

**Test Command**:
```bash
curl http://localhost:3001/api/version
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "version": "1.2.0",
    "releaseDate": "2025-11-03T00:00:00.000Z",
    "downloadUrl": "https://releases.rephlo.ai/rephlo-1.2.0-windows.exe",
    "changelog": "## v1.2.0\n\n- Fixed text transformation bugs\n- Improved performance\n- Added new features"
  }
}
```

**Test With Pretty Print**:
```bash
curl http://localhost:3001/api/version | jq
```

**Note**: This endpoint requires at least one version in the database with `isLatest = true`.
If no version exists, it will return:
```json
{
  "success": false,
  "error": "No version information available"
}
```

---

### 5. GET /admin/metrics

**Purpose**: Get aggregated metrics for admin dashboard

**Test Command**:
```bash
curl http://localhost:3001/admin/metrics
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "downloads": {
      "windows": 15,
      "macos": 8,
      "linux": 3,
      "total": 26
    },
    "feedback": {
      "total": 5,
      "recentCount": 2
    },
    "diagnostics": {
      "total": 3,
      "totalSize": 45678
    },
    "timestamps": {
      "firstDownload": "2025-11-01T00:00:00.000Z",
      "lastDownload": "2025-11-03T23:59:59.000Z"
    }
  }
}
```

**Test With Pretty Print**:
```bash
curl http://localhost:3001/admin/metrics | jq
```

---

## Performance Testing

Test response time for each endpoint:

```bash
# Test download endpoint performance
time curl -X POST http://localhost:3001/api/track-download \
  -H "Content-Type: application/json" \
  -d '{"os":"windows"}' \
  -w "\nTime: %{time_total}s\n"

# Test feedback endpoint performance
time curl -X POST http://localhost:3001/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"message":"Performance test"}' \
  -w "\nTime: %{time_total}s\n"

# Test version endpoint performance
time curl http://localhost:3001/api/version \
  -w "\nTime: %{time_total}s\n"

# Test metrics endpoint performance
time curl http://localhost:3001/admin/metrics \
  -w "\nTime: %{time_total}s\n"
```

**Expected Performance**: All endpoints should respond in < 300ms as per PRD requirements.

---

## Error Testing

### Test Server Errors

**Invalid JSON**:
```bash
curl -X POST http://localhost:3001/api/track-download \
  -H "Content-Type: application/json" \
  -d '{invalid json}'
```

**Missing Content-Type**:
```bash
curl -X POST http://localhost:3001/api/feedback \
  -d 'message=test'
```

**Test 404 Route**:
```bash
curl http://localhost:3001/api/nonexistent
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Route not found"
}
```

---

## Health Check

**Test Server Health**:
```bash
curl http://localhost:3001/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-03T12:00:00.000Z",
  "environment": "development"
}
```

---

## Bulk Testing Script

Create a file `test-all-endpoints.sh`:

```bash
#!/bin/bash

echo "Testing Rephlo Backend API Endpoints"
echo "====================================="

echo "\n1. Testing Health Check..."
curl -s http://localhost:3001/health | jq

echo "\n2. Testing Download Tracking (Windows)..."
curl -s -X POST http://localhost:3001/api/track-download \
  -H "Content-Type: application/json" \
  -d '{"os":"windows"}' | jq

echo "\n3. Testing Download Tracking (macOS)..."
curl -s -X POST http://localhost:3001/api/track-download \
  -H "Content-Type: application/json" \
  -d '{"os":"macos"}' | jq

echo "\n4. Testing Feedback Submission..."
curl -s -X POST http://localhost:3001/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"message":"Test feedback from script","email":"test@example.com"}' | jq

echo "\n5. Testing Version API..."
curl -s http://localhost:3001/api/version | jq

echo "\n6. Testing Admin Metrics..."
curl -s http://localhost:3001/admin/metrics | jq

echo "\n7. Testing Validation Error (Invalid OS)..."
curl -s -X POST http://localhost:3001/api/track-download \
  -H "Content-Type: application/json" \
  -d '{"os":"invalid"}' | jq

echo "\n8. Testing 404 Error..."
curl -s http://localhost:3001/api/nonexistent | jq

echo "\n====================================="
echo "All tests completed!"
```

Make executable and run:
```bash
chmod +x test-all-endpoints.sh
./test-all-endpoints.sh
```

---

## Database Verification

After running tests, verify data is stored correctly:

```bash
# Connect to PostgreSQL
psql -U postgres -d rephlo

# Check downloads
SELECT os, COUNT(*) as count FROM downloads GROUP BY os;

# Check feedback
SELECT COUNT(*) as total,
       COUNT(email) as with_email
FROM feedbacks;

# Check diagnostics
SELECT COUNT(*) as total,
       SUM(file_size) as total_size
FROM diagnostics;

# Check versions
SELECT version, is_latest FROM app_versions;
```

---

## Troubleshooting

### Database Connection Issues

If you get authentication errors:

1. Check PostgreSQL is running:
   ```bash
   # Windows
   sc query postgresql-x64-15

   # Linux/Mac
   sudo systemctl status postgresql
   ```

2. Verify credentials in `.env`:
   ```
   DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/rephlo
   ```

3. Test database connection:
   ```bash
   npx prisma db push
   ```

4. Seed the database:
   ```bash
   npm run seed
   ```

### Port Already in Use

If port 3001 is occupied:
```bash
npx kill-port 3001
```

Or change port in `.env`:
```
PORT=3002
```

### TypeScript Compilation Errors

Rebuild the project:
```bash
npm run build
```

---

## Success Criteria Checklist

- [ ] All 5 endpoints return successful responses
- [ ] Validation errors handled correctly (400 status)
- [ ] File upload validation works (size and type)
- [ ] Database records created successfully
- [ ] Response format consistent across endpoints
- [ ] Performance < 300ms for all endpoints
- [ ] Error messages are clear and helpful
- [ ] TypeScript types enforced
- [ ] Server logs show request details
