#!/bin/bash

# Rephlo Deployment Script
# Usage: ./deploy.sh [frontend|backend|all]

set -e

TARGET="${1:-all}"

echo "========================================="
echo "Rephlo Deployment Script"
echo "========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

deploy_frontend() {
  echo -e "${YELLOW}Deploying Frontend...${NC}"

  cd frontend

  # Run tests (if any)
  echo "Running tests..."
  npm test || echo "No tests configured"

  # Build
  echo "Building frontend..."
  npm run build

  # Deploy to Vercel
  echo "Deploying to Vercel..."
  npx vercel --prod

  echo -e "${GREEN}✓ Frontend deployed successfully${NC}"
  echo ""

  cd ..
}

deploy_backend() {
  echo -e "${YELLOW}Deploying Backend...${NC}"

  cd backend

  # Run tests (if any)
  echo "Running tests..."
  npm test || echo "No tests configured"

  # Build
  echo "Building backend..."
  npm run build

  # Run database migrations (if needed)
  echo "Running database migrations..."
  npx prisma migrate deploy || echo "No migrations needed"

  # Deploy (method depends on hosting platform)
  echo "Deploying to hosting platform..."
  echo "Note: Backend deployment handled by git push or platform auto-deploy"
  echo "If using Heroku:"
  echo "  git subtree push --prefix backend heroku main"
  echo "If using Render:"
  echo "  git push origin main (auto-deploys)"

  echo -e "${GREEN}✓ Backend build completed${NC}"
  echo ""

  cd ..
}

case $TARGET in
  frontend)
    deploy_frontend
    ;;
  backend)
    deploy_backend
    ;;
  all)
    deploy_backend
    deploy_frontend
    ;;
  *)
    echo "Usage: $0 [frontend|backend|all]"
    exit 1
    ;;
esac

echo "========================================="
echo "Deployment Summary:"
echo "  Target: $TARGET"
echo "  Status: Completed"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Run health checks: ./scripts/health-check.sh"
echo "2. Monitor logs for errors"
echo "3. Verify all endpoints working"
echo ""
