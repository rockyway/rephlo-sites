# Port Configuration Summary

All services have been configured with the following ports:

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 7052 | http://localhost:7052 |
| Backend API | 7150 | http://localhost:7150 |
| Identity Provider | 7151 | http://localhost:7151 |

## Running All Services

To start all three services concurrently with a single command:

```bash
npm run dev:all
```

This will:
- Start the frontend on port 7052 (Vite dev server)
- Start the backend API on port 7150 (Express server)
- Start the identity provider on port 7151 (OIDC provider)
- Display color-coded output for easy log distinction
- Enable hot-reload for all services

## Configuration Files Updated

### Frontend
- `frontend/vite.config.ts` - Port 7052
- `frontend/.env` - API URL points to http://localhost:7150

### Backend
- `backend/.env` - PORT=7150
- `backend/.env` - CORS_ORIGIN includes http://localhost:7052,http://localhost:7151
- `backend/src/server.ts` - Default port 7150

### Identity Provider
- `identity-provider/.env` - PORT=7151
- `identity-provider/.env` - ALLOWED_ORIGINS includes http://localhost:7052,http://localhost:7150
- `identity-provider/src/server.ts` - Default port 7151

### Root Package.json
- Added `concurrently` dependency
- Added `dev:all` script to run all services
- Added individual service scripts (`dev:frontend`, `dev:backend`, `dev:idp`)
- Added `build:all` and individual build scripts
- Added `install:all` for installing all dependencies

## CORS Configuration

All services are properly configured for cross-origin requests:

- **Backend** allows requests from:
  - Frontend: http://localhost:7052
  - Identity Provider: http://localhost:7151

- **Identity Provider** allows requests from:
  - Frontend: http://localhost:7052
  - Backend: http://localhost:7150

## Verification

All services were tested and confirmed to start successfully:
- ✅ Frontend running on port 7052
- ✅ Backend API running on port 7150
- ✅ Identity Provider running on port 7151
- ✅ All services communicate correctly
- ✅ CORS configured properly

## Additional Scripts

- `npm run dev:frontend` - Run frontend only
- `npm run dev:backend` - Run backend only
- `npm run dev:idp` - Run identity provider only
- `npm run build:all` - Build all services
- `npm run install:all` - Install dependencies for all services

