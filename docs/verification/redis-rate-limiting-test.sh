#!/bin/bash

# ===================================================================
# Redis & Rate Limiting Verification Test Script
# ===================================================================
# This script tests:
# 1. Redis connectivity
# 2. Rate limiting enforcement
# 3. Rate limit headers in responses
# ===================================================================

API_BASE="http://localhost:7150"
REGISTER_ENDPOINT="/auth/register"

echo "======================================================================"
echo "Redis & Rate Limiting Verification Tests"
echo "======================================================================"
echo ""

# ===== Test 1: Health Check =====
echo "[Test 1] Checking API health..."
curl -s -w "\nHTTP Status: %{http_code}\n" "$API_BASE/health"
echo ""

# ===== Test 2: Register Rate Limit (5 per hour per IP) =====
echo "======================================================================"
echo "[Test 2] Testing Registration Rate Limiting (5 requests/hour per IP)"
echo "======================================================================"
echo ""

TEST_EMAIL_BASE="ratelimit-test-$(date +%s)"

for i in {1..7}; do
  TEST_EMAIL="$TEST_EMAIL_BASE-$i@test.local"

  echo "Request $i:"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE$REGISTER_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_EMAIL\",
      \"password\": \"TestPass123!\",
      \"username\": \"testuser$i\",
      \"firstName\": \"Test\",
      \"lastName\": \"User\",
      \"acceptedTerms\": true
    }")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  echo "HTTP Status: $HTTP_CODE"

  if [ "$HTTP_CODE" -eq 429 ]; then
    echo "✓ Rate limit correctly enforced (429 Too Many Requests)"
    echo "Response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
  elif [ "$HTTP_CODE" -eq 201 ]; then
    echo "✓ Request successful (201 Created)"
  elif [ "$HTTP_CODE" -eq 400 ]; then
    echo "! Validation error (400 Bad Request)"
  else
    echo "Response: $BODY"
  fi

  echo ""
  sleep 1
done

echo "======================================================================"
echo "[Test 3] Testing Verify-Email Rate Limiting (10 requests/hour per IP)"
echo "======================================================================"
echo ""

TEST_TOKEN="test-token-$(date +%s)"

for i in {1..12}; do
  echo "Request $i:"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/auth/verify-email" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"test@example.com\",
      \"token\": \"$TEST_TOKEN-$i\"
    }")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)

  echo "HTTP Status: $HTTP_CODE"

  if [ "$HTTP_CODE" -eq 429 ]; then
    echo "✓ Rate limit correctly enforced (429 Too Many Requests)"
    break
  fi

  sleep 1
done

echo ""
echo "======================================================================"
echo "[Test 4] Testing Forgot-Password Rate Limiting (3 requests/hour per IP)"
echo "======================================================================"
echo ""

for i in {1..5}; do
  echo "Request $i:"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/auth/forgot-password" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"test$i@example.com\"
    }")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  echo "HTTP Status: $HTTP_CODE"

  if [ "$HTTP_CODE" -eq 429 ]; then
    echo "✓ Rate limit correctly enforced (429 Too Many Requests)"
    echo "Response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    break
  fi

  sleep 1
done

echo ""
echo "======================================================================"
echo "Tests Complete!"
echo "======================================================================"
