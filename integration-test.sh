#!/bin/bash
# Comprehensive Integration Test Suite for Rephlo
# Tests all API endpoints with mock backend

BASE_URL="http://localhost:3002"
FRONTEND_URL="http://localhost:5175"

echo "========================================="
echo "REPHLO INTEGRATION TEST SUITE"
echo "========================================="
echo ""
echo "Test Environment:"
echo "  Backend: $BASE_URL"
echo "  Frontend: $FRONTEND_URL"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((PASS_COUNT++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    ((FAIL_COUNT++))
  fi
}

echo "========================================="
echo "1. BACKEND API TESTS"
echo "========================================="
echo ""

# Test 1: Health Check
echo "Test 1.1: Health Check Endpoint"
RESPONSE=$(curl -s $BASE_URL/health)
if echo "$RESPONSE" | grep -q '"status":"ok"'; then
  test_result 0 "Health check returns OK"
else
  test_result 1 "Health check failed"
fi
echo ""

# Test 2: Download Tracking - Valid
echo "Test 1.2: Download Tracking (Windows - Valid)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/track-download \
  -H "Content-Type: application/json" \
  -d '{"os":"windows"}')
if echo "$RESPONSE" | grep -q '"success":true'; then
  test_result 0 "Download tracking (windows) successful"
else
  test_result 1 "Download tracking (windows) failed"
fi
echo ""

# Test 3: Download Tracking - macOS
echo "Test 1.3: Download Tracking (macOS - Valid)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/track-download \
  -H "Content-Type: application/json" \
  -d '{"os":"macos"}')
if echo "$RESPONSE" | grep -q '"success":true'; then
  test_result 0 "Download tracking (macos) successful"
else
  test_result 1 "Download tracking (macos) failed"
fi
echo ""

# Test 4: Download Tracking - Linux
echo "Test 1.4: Download Tracking (Linux - Valid)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/track-download \
  -H "Content-Type: application/json" \
  -d '{"os":"linux"}')
if echo "$RESPONSE" | grep -q '"success":true'; then
  test_result 0 "Download tracking (linux) successful"
else
  test_result 1 "Download tracking (linux) failed"
fi
echo ""

# Test 5: Download Tracking - Invalid OS
echo "Test 1.5: Download Tracking (Invalid OS - Should Fail)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/track-download \
  -H "Content-Type: application/json" \
  -d '{"os":"android"}')
if echo "$RESPONSE" | grep -q '"success":false'; then
  test_result 0 "Invalid OS correctly rejected"
else
  test_result 1 "Invalid OS not rejected"
fi
echo ""

# Test 6: Feedback Submission - Valid
echo "Test 1.6: Feedback Submission (Valid)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"message":"Test feedback","email":"test@example.com"}')
if echo "$RESPONSE" | grep -q '"success":true'; then
  test_result 0 "Feedback submission successful"
else
  test_result 1 "Feedback submission failed"
fi
echo ""

# Test 7: Feedback - No Email
echo "Test 1.7: Feedback Submission (No Email - Valid)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"message":"Anonymous feedback"}')
if echo "$RESPONSE" | grep -q '"success":true'; then
  test_result 0 "Feedback without email successful"
else
  test_result 1 "Feedback without email failed"
fi
echo ""

# Test 8: Feedback - Empty Message
echo "Test 1.8: Feedback Submission (Empty Message - Should Fail)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"message":""}')
if echo "$RESPONSE" | grep -q '"success":false'; then
  test_result 0 "Empty message correctly rejected"
else
  test_result 1 "Empty message not rejected"
fi
echo ""

# Test 9: Feedback - Invalid Email
echo "Test 1.9: Feedback Submission (Invalid Email - Should Fail)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"message":"Test","email":"invalid-email"}')
if echo "$RESPONSE" | grep -q '"success":false'; then
  test_result 0 "Invalid email correctly rejected"
else
  test_result 1 "Invalid email not rejected"
fi
echo ""

# Test 10: Version API
echo "Test 1.10: Version API"
RESPONSE=$(curl -s $BASE_URL/api/version)
if echo "$RESPONSE" | grep -q '"version":"1.2.0"'; then
  test_result 0 "Version API returns correct version"
else
  test_result 1 "Version API failed"
fi
echo ""

# Test 11: Admin Metrics
echo "Test 1.11: Admin Metrics API"
RESPONSE=$(curl -s $BASE_URL/admin/metrics)
if echo "$RESPONSE" | grep -q '"downloads"'; then
  test_result 0 "Admin metrics returns download data"
else
  test_result 1 "Admin metrics failed"
fi
echo ""

# Test 12: 404 Error Handling
echo "Test 1.12: 404 Error Handling"
RESPONSE=$(curl -s $BASE_URL/api/nonexistent)
if echo "$RESPONSE" | grep -q 'not found'; then
  test_result 0 "404 error handled correctly"
else
  test_result 1 "404 error not handled"
fi
echo ""

echo "========================================="
echo "2. PERFORMANCE TESTS"
echo "========================================="
echo ""

# Performance Test 1: Health Check
echo "Test 2.1: Health Check Response Time"
TIME=$(curl -s -w "%{time_total}" -o /dev/null $BASE_URL/health)
if (( $(echo "$TIME < 0.3" | bc -l) )); then
  test_result 0 "Health check under 300ms (${TIME}s)"
else
  test_result 1 "Health check over 300ms (${TIME}s)"
fi
echo ""

# Performance Test 2: Download Tracking
echo "Test 2.2: Download Tracking Response Time"
TIME=$(curl -s -w "%{time_total}" -o /dev/null -X POST $BASE_URL/api/track-download \
  -H "Content-Type: application/json" \
  -d '{"os":"windows"}')
if (( $(echo "$TIME < 0.3" | bc -l) )); then
  test_result 0 "Download tracking under 300ms (${TIME}s)"
else
  test_result 1 "Download tracking over 300ms (${TIME}s)"
fi
echo ""

# Performance Test 3: Feedback
echo "Test 2.3: Feedback Submission Response Time"
TIME=$(curl -s -w "%{time_total}" -o /dev/null -X POST $BASE_URL/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"message":"Performance test"}')
if (( $(echo "$TIME < 0.3" | bc -l) )); then
  test_result 0 "Feedback submission under 300ms (${TIME}s)"
else
  test_result 1 "Feedback submission over 300ms (${TIME}s)"
fi
echo ""

# Performance Test 4: Version API
echo "Test 2.4: Version API Response Time"
TIME=$(curl -s -w "%{time_total}" -o /dev/null $BASE_URL/api/version)
if (( $(echo "$TIME < 0.3" | bc -l) )); then
  test_result 0 "Version API under 300ms (${TIME}s)"
else
  test_result 1 "Version API over 300ms (${TIME}s)"
fi
echo ""

# Performance Test 5: Admin Metrics
echo "Test 2.5: Admin Metrics Response Time"
TIME=$(curl -s -w "%{time_total}" -o /dev/null $BASE_URL/admin/metrics)
if (( $(echo "$TIME < 0.3" | bc -l) )); then
  test_result 0 "Admin metrics under 300ms (${TIME}s)"
else
  test_result 1 "Admin metrics over 300ms (${TIME}s)"
fi
echo ""

echo "========================================="
echo "3. FRONTEND TESTS"
echo "========================================="
echo ""

# Test Frontend Homepage
echo "Test 3.1: Frontend Homepage Loads"
RESPONSE=$(curl -s $FRONTEND_URL)
if echo "$RESPONSE" | grep -q '<div id="root">'; then
  test_result 0 "Frontend homepage loads successfully"
else
  test_result 1 "Frontend homepage failed to load"
fi
echo ""

# Test Frontend Admin Page
echo "Test 3.2: Frontend Admin Page Loads"
RESPONSE=$(curl -s $FRONTEND_URL/admin)
if echo "$RESPONSE" | grep -q '<div id="root">'; then
  test_result 0 "Frontend admin page loads successfully"
else
  test_result 1 "Frontend admin page failed to load"
fi
echo ""

echo "========================================="
echo "TEST SUMMARY"
echo "========================================="
echo ""
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo "Total: $TOTAL"
echo ""

PASS_RATE=$((PASS_COUNT * 100 / TOTAL))
echo "Pass Rate: $PASS_RATE%"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}ALL TESTS PASSED!${NC}"
  exit 0
else
  echo -e "${RED}SOME TESTS FAILED${NC}"
  exit 1
fi
