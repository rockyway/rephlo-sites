#!/bin/bash

# Rephlo Health Check Script
# Usage: ./health-check.sh [production|staging|local]

set -e

# Configuration
ENVIRONMENT="${1:-production}"

case $ENVIRONMENT in
  production)
    FRONTEND_URL="https://rephlo.ai"
    BACKEND_URL="https://api.rephlo.ai"
    ;;
  staging)
    FRONTEND_URL="https://staging.rephlo.ai"
    BACKEND_URL="https://api-staging.rephlo.ai"
    ;;
  local)
    FRONTEND_URL="http://localhost:5173"
    BACKEND_URL="http://localhost:3000"
    ;;
  *)
    echo "Usage: $0 [production|staging|local]"
    exit 1
    ;;
esac

echo "========================================="
echo "Rephlo Health Check - $ENVIRONMENT"
echo "========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# Test function
test_endpoint() {
  local name="$1"
  local url="$2"
  local expected="$3"

  echo -n "Testing $name... "

  if curl -sf "$url" | grep -q "$expected"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
    return 1
  fi
}

# Frontend Tests
echo "Frontend Tests:"
test_endpoint "Homepage" "$FRONTEND_URL" "Rephlo" || true
test_endpoint "Admin Dashboard" "$FRONTEND_URL/admin" "html" || true
echo ""

# Backend Tests
echo "Backend Tests:"
test_endpoint "Health Endpoint" "$BACKEND_URL/health" "ok" || true
test_endpoint "Version Endpoint" "$BACKEND_URL/api/version" "version" || true
test_endpoint "Admin Metrics" "$BACKEND_URL/admin/metrics" "downloads" || true
echo ""

# Response Time Tests
echo "Response Time Tests:"
echo -n "Frontend load time... "
FRONTEND_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$FRONTEND_URL")
echo "${FRONTEND_TIME}s"

echo -n "Backend API time... "
BACKEND_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$BACKEND_URL/api/version")
echo "${BACKEND_TIME}s"

# Check if response times are acceptable
if (( $(echo "$FRONTEND_TIME < 3.0" | bc -l) )); then
  echo -e "Frontend: ${GREEN}✓ PASS${NC} (< 3s)"
  ((PASS++))
else
  echo -e "Frontend: ${RED}✗ SLOW${NC} (> 3s)"
  ((FAIL++))
fi

if (( $(echo "$BACKEND_TIME < 1.0" | bc -l) )); then
  echo -e "Backend: ${GREEN}✓ PASS${NC} (< 1s)"
  ((PASS++))
else
  echo -e "Backend: ${YELLOW}⚠ SLOW${NC} (> 1s)"
fi

echo ""

# SSL/HTTPS Tests (production only)
if [ "$ENVIRONMENT" = "production" ]; then
  echo "SSL/HTTPS Tests:"

  echo -n "Frontend SSL... "
  if curl -vI "$FRONTEND_URL" 2>&1 | grep -q "SSL certificate verify ok"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
  fi

  echo -n "Backend SSL... "
  if curl -vI "$BACKEND_URL" 2>&1 | grep -q "SSL certificate verify ok"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
  fi

  echo ""
fi

# CORS Tests
echo "CORS Tests:"
echo -n "CORS headers present... "
CORS_HEADER=$(curl -s -I -H "Origin: $FRONTEND_URL" "$BACKEND_URL/health" | grep -i "access-control-allow-origin" || echo "")
if [ -n "$CORS_HEADER" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}"
  ((FAIL++))
fi

echo ""

# Summary
echo "========================================="
echo "Summary:"
echo "  Passed: ${GREEN}$PASS${NC}"
echo "  Failed: ${RED}$FAIL${NC}"
echo "========================================="

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}All checks passed!${NC}"
  exit 0
else
  echo -e "${RED}Some checks failed.${NC}"
  exit 1
fi
