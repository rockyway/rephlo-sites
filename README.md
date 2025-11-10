# Rephlo Branding Website

> **Transform text. Keep your flow.**

Full-stack web application for the Rephlo desktop application branding and marketing website. Features a modern React frontend with TailwindCSS and a Node.js REST API backend powered by PostgreSQL.

---

## Project Overview

**Rephlo** is a professional text transformation tool designed for knowledge workers who need to manipulate text formats quickly without breaking their workflow. This repository contains the official branding website and API backend that supports:

- Product landing page with feature highlights
- Download tracking for Windows, macOS, and Linux
- User feedback collection
- Diagnostic file upload system
- Admin dashboard for metrics and analytics
- Version management API for desktop app updates

### Project Status

🎉 **Frontend Modernization Complete** - Production Ready

- ✅ **Design Maturity**: 9/10 (93% compliance)
- ✅ **QA Score**: 96/100
- ✅ **Accessibility**: WCAG AA compliant (95%)
- ✅ **Performance**: Lighthouse > 90 (estimated)
- ✅ **Build Status**: 0 errors, 0 warnings
- ✅ **TypeScript**: Strict mode, 0 errors

📚 **[View Documentation Index](docs/README.md)** | 📊 **[View Project Status](FRONTEND_MODERNIZATION_STATUS.md)**

---

## Technology Stack

### Frontend
- **React 18+** - Modern UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Accessible component library
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe server code
- **PostgreSQL** - Relational database
- **Prisma ORM** - Database toolkit and migration system
- **Zod** - Schema validation
- **CORS** - Cross-origin resource sharing
- **Multer** - File upload handling
- **Morgan** - HTTP request logging

---

## Project Structure

```
rephlo-sites/
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page components (Landing, Admin, etc.)
│   │   ├── services/            # API client layer
│   │   ├── hooks/               # Custom React hooks
│   │   ├── types/               # TypeScript type definitions
│   │   ├── assets/              # Images, logos, fonts
│   │   ├── App.tsx              # Root component with routing
│   │   ├── main.tsx             # Application entry point
│   │   └── index.css            # Global styles and Tailwind imports
│   ├── public/                  # Static assets
│   ├── package.json             # Frontend dependencies
│   ├── tsconfig.json            # TypeScript configuration
│   ├── tailwind.config.ts       # TailwindCSS configuration
│   ├── vite.config.ts           # Vite build configuration
│   └── .env.example             # Environment variables template
│
├── backend/                     # Node.js + Express API
│   ├── src/
│   │   ├── api/                 # API route handlers
│   │   ├── db/                  # Database client and utilities
│   │   ├── middleware/          # Express middleware (CORS, error handling)
│   │   ├── types/               # TypeScript type definitions
│   │   ├── utils/               # Helper functions
│   │   └── server.ts            # Express application entry point
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema definition
│   │   └── migrations/          # Database migrations
│   ├── package.json             # Backend dependencies
│   ├── tsconfig.json            # TypeScript configuration
│   └── .env.example             # Environment variables template
│
├── docs/                        # Documentation
│   ├── README.md                # Documentation index
│   ├── guides/                  # Developer guides (4 guides)
│   ├── progress/                # Phase completion reports (5 phases)
│   ├── analysis/                # Quality reports (3 reports)
│   ├── research/                # Research reports (1 report)
│   └── plan/                    # Planning and design documents
│
└── README.md                    # This file
```

## External Desktop App project
Location: `D:\sources\demo\text-assistant`

---

## Setup Instructions

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- **PostgreSQL** v14 or higher (for backend database)
- **Git** (for version control)

### 1. Clone Repository

```bash
git clone <repository-url>
cd rephlo-sites
```

### 2. Frontend Setup

```bash
cd frontend

# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
# VITE_API_URL=http://localhost:7150
# VITE_PORT=7152 (optional, default: 7152)

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend (Admin Dashboard) will be available at **http://localhost:7152**

### 3. Backend Setup

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env file with your database credentials
# DATABASE_URL=postgresql://username:password@localhost:5432/rephlo
# PORT=7150
# CORS_ORIGIN=http://localhost:7052

# Install dependencies
npm install

# Generate Prisma client (after Phase 2 database setup)
npm run prisma:generate

# Run database migrations (after Phase 2 database setup)
npm run prisma:migrate

# Start development server
npm run dev
```

Backend API will be available at **http://localhost:7150**

---

## Services Port Mapping

All services run on separate ports for development. Here's the complete port configuration:

| Service | Port | Purpose | OAuth Client ID |
|---------|------|---------|-----------------|
| **Frontend (Admin Dashboard)** | 7152 | React admin dashboard and web interface | `web-app-test` |
| **Backend API** | 7150 | REST API server | N/A |
| **Identity Provider (OIDC)** | 7151 | OAuth 2.0 / OpenID Connect provider | N/A |
| **POC Client** | 8080 | Proof of concept OAuth client | `poc-client-test` |
| **Desktop App (Instance 1)** | 8327 | Rephlo desktop application (test) | `desktop-app-test` |
| **Desktop App (Instance 2)** | 8329 | Rephlo desktop application (test) | `desktop-app-test` |

---

## Development Workflow

### Running All Services (Recommended)

Run all three services (Frontend, Backend, Identity Provider) concurrently:

```bash
npm run dev:all
```

This will start:
- Frontend (Admin Dashboard) on **http://localhost:7152**
- Backend API on **http://localhost:7150**
- Identity Provider on **http://localhost:7151**
- POC Client on **http://localhost:8080**
- Desktop App on **http://localhost:8327** or **http://localhost:8329**

All services will hot-reload on file changes with color-coded output.

### Running Services Individually

**Terminal 1 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 3 - Identity Provider:**
```bash
cd identity-provider
npm run dev
```

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```
Output will be in `frontend/dist/`

**Backend:**
```bash
cd backend
npm run build
```
Output will be in `backend/dist/`

### Running Production Build

**Frontend:**
```bash
cd frontend
npm run preview
```

**Backend:**
```bash
cd backend
npm start
```

---

## Environment Variables

### Frontend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:7150` |
| `VITE_PORT` | Frontend port (optional) | `7152` |
| `VITE_APP_NAME` | Application name | `Rephlo` |
| `VITE_APP_TAGLINE` | Application tagline | `Transform text. Keep your flow.` |
| `VITE_NODE_ENV` | Environment mode | `development` |

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `7150` |
| `NODE_ENV` | Environment mode | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/rephlo` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:7152` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `5242880` (5MB) |
| `UPLOAD_DIR` | Upload directory path | `./uploads` |

---

## Database Setup

### PostgreSQL Installation

**macOS (Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Windows:**
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE rephlo;

# Create user (optional)
CREATE USER rephlo_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE rephlo TO rephlo_user;

# Exit psql
\q
```

### Run Migrations

```bash
cd backend
npm run prisma:migrate
```

### View Database (Prisma Studio)

```bash
cd backend
npm run prisma:studio
```
Opens GUI at **http://localhost:5555**

---

## API Features

### Model Tier Access Control

The API supports tier-based access control for LLM models:

- **Free Tier**: Basic models for general use (2,000 credits/month)
- **Pro Tier**: Advanced models for professional use (50,000 credits/month)
- **Enterprise Tier**: Premium models with highest capabilities (250,000 credits/month)

All API endpoints automatically enforce tier restrictions. Users receive clear upgrade prompts when attempting to access models above their subscription level.

**Documentation**:
- [API Reference](docs/reference/017-model-tier-access-api.md) - Complete API documentation
- [Admin Guide](docs/guides/model-tier-management-admin-guide.md) - Tier management for administrators
- [Integration Guide](docs/guides/tier-access-integration-guide.md) - Developer integration instructions
- [Deployment Guide](docs/guides/tier-access-deployment-guide.md) - Production deployment steps

### Core API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/health` | Health check | No |
| `GET` | `/v1/models` | List models with tier metadata | Yes |
| `GET` | `/v1/models/:id` | Get model details with access status | Yes |
| `POST` | `/v1/chat/completions` | Chat completion (tier-validated) | Yes |
| `POST` | `/v1/completions` | Text completion (tier-validated) | Yes |
| `POST` | `/api/track-download` | Track download by OS | No |
| `POST` | `/api/feedback` | Submit user feedback | No |
| `POST` | `/api/diagnostics` | Upload diagnostic files | Yes |
| `GET` | `/api/version` | Get latest app version | No |
| `GET` | `/admin/metrics` | Admin dashboard metrics | Yes |

---

## Brand Guidelines & Design System

All UI components and design follow the **Rephlo Visual Identity System**:

### Brand Colors
- **Primary:** Rephlo Blue (#2563EB)
- **Secondary:** Deep Navy (#1E293B)
- **Accent:** Electric Cyan (#06B6D4)
- **Typography:** Inter (UI), JetBrains Mono (code)

### Design Tokens
- **Shadows:** sm, md, lg, xl (4-level elevation scale)
- **Gradients:** rephlo, rephlo-vertical, navy-blue
- **Animation Timing:** fast (150ms), base (200ms), slow (300ms), slower (500ms)
- **Spacing:** xs-4xl (8 levels on 4px grid)

### Enhanced Components
- **Button:** 4 variants, 4 sizes, elevation feedback
- **Card:** 4 variants (default, interactive, featured, elevated)
- **Input:** Enhanced focus/error states
- **Header:** Active link indicators
- **LoadingSpinner:** Glow effects, 3 sizes

📖 **[Design Token Guide](docs/guides/001-design-token-usage-guide.md)** | 📖 **[Component Guide](docs/guides/002-component-enhancement-guide.md)**

---

## Implementation Phases

### Backend Implementation (Complete)

- ✅ **Phase 1:** Project Initialization & Setup
- ✅ **Phase 2:** Database Design & Setup
- ✅ **Phase 3:** Backend API Development
- ✅ **Phase 4:** Frontend Landing Page Development
- ✅ **Phase 5:** Integration & Testing
- ✅ **Phase 6:** Deployment Configuration

See deployment guides in `docs/` for production deployment instructions.

### Frontend Modernization (Complete)

- ✅ **Phase 1:** Design Token System (shadows, gradients, spacing, animations)
- ✅ **Phase 2:** Core Component Enhancements (5 components with micro-interactions)
- ✅ **Phase 3:** Landing Page Polish (6 sections enhanced)
- ✅ **Phase 4:** SmoothUI Research (skipped - current system sufficient)
- ✅ **Phase 5:** QA Testing & Verification (96/100 quality score)

**Status**: Production Ready | **Documentation**: [View Modernization Status](FRONTEND_MODERNIZATION_STATUS.md)

---

## Contributing

### Code Style

- **TypeScript:** Strict mode enabled
- **Formatting:** ESLint + Prettier (frontend)
- **Naming:** camelCase for variables/functions, PascalCase for components/classes
- **Components:** Functional components with hooks
- **Commits:** Conventional commits format

### Branch Strategy

- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

---

## Deployment

### Frontend Deployment (Vercel)

```bash
cd frontend
vercel deploy
```

### Backend Deployment (Render/Heroku)

```bash
cd backend
# Follow platform-specific deployment instructions
```

Detailed deployment instructions will be added in **Phase 6**.

---

## Troubleshooting

### Frontend won't start

1. Check Node.js version: `node -v` (should be v18+)
2. Clear node_modules: `rm -rf node_modules package-lock.json && npm install`
3. Check port 7152 is available (or configure `VITE_PORT` in `.env`)
4. Verify `.env` file exists and is valid

### Backend won't start

1. Check database connection in `.env`
2. Ensure PostgreSQL is running: `pg_isready`
3. Run migrations: `npm run prisma:migrate`
4. Check port 3001 is available
5. Verify Prisma client is generated: `npm run prisma:generate`

### CORS errors

1. Verify `CORS_ORIGIN` in backend `.env` matches frontend URL
2. Check frontend is running on the expected port
3. Restart backend server after changing CORS settings

---

## License

Proprietary - All rights reserved

---

## Contact

For questions or support, contact the Rephlo development team.

---

## Recent Achievements

### Frontend Modernization (Completed November 3, 2025)

- 🎨 **Design Token System**: Complete token system with shadows, gradients, animations, spacing
- ⚡ **Component Enhancement**: 5 core components enhanced with micro-interactions
- 🌟 **Landing Page Polish**: 6 sections enhanced with design tokens (99.3% compliance)
- 🔍 **SmoothUI Research**: Evaluated and skipped (current system sufficient)
- ✅ **QA Verification**: 96/100 quality score, production ready
- 📚 **Documentation**: 40+ docs created (15,000+ lines)

### Quality Metrics

| Metric | Achievement |
|--------|-------------|
| Design Token Compliance | 99.3% |
| Brand Compliance | 95% |
| WCAG AA Accessibility | 95% |
| TypeScript Errors | 0 |
| Build Errors | 0 |
| ESLint Warnings | 0 |
| Production Ready | ✅ Yes |

---

## Documentation

### Quick Start Guides

- 🚀 **New Developers**: [Onboarding Guide](docs/guides/003-developer-onboarding-guide.md)
- 🎨 **Design System**: [Design Token Guide](docs/guides/001-design-token-usage-guide.md)
- 🧩 **Components**: [Component Enhancement Guide](docs/guides/002-component-enhancement-guide.md)
- 🔧 **Extending System**: [Migration Guide](docs/guides/004-design-system-migration-guide.md)

### Project Reports

- 📊 **Project Status**: [Frontend Modernization Status](FRONTEND_MODERNIZATION_STATUS.md)
- ✅ **QA Report**: [Phase 5 QA Test Report](docs/analysis/002-phase5-comprehensive-qa-test-report.md)
- 🎨 **Brand Compliance**: [Brand Compliance Report](docs/analysis/001-phase3-brand-compliance-report.md)
- 📚 **All Documentation**: [Documentation Index](docs/README.md)

---

**Last Updated:** November 3, 2025
**Version:** 1.0.0 (Production Ready)
**Frontend Status:** ✅ Modernization Complete (96/100 QA Score)
**Backend Status:** ✅ API Complete & Tested
