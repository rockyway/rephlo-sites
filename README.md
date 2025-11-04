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
│   └── plan/                    # Planning and design documents
│       ├── 063-rephlo-brand-narrative.md
│       ├── 064-rephlo-visual-identity.md
│       ├── 065-rephlo-brand-guidelines.md
│       ├── 066-rephlo-component-library-specs.md
│       ├── 067-rephlo-marketing-copy.md
│       └── 068-implementation-orchestration.md
│
└── README.md                    # This file
```

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
# VITE_API_URL=http://localhost:3001

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at **http://localhost:5173**

### 3. Backend Setup

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env file with your database credentials
# DATABASE_URL=postgresql://username:password@localhost:5432/rephlo
# PORT=3001
# CORS_ORIGIN=http://localhost:5173

# Install dependencies
npm install

# Generate Prisma client (after Phase 2 database setup)
npm run prisma:generate

# Run database migrations (after Phase 2 database setup)
npm run prisma:migrate

# Start development server
npm run dev
```

Backend API will be available at **http://localhost:3001**

---

## Development Workflow

### Running in Development

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

Both servers will hot-reload on file changes.

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
| `VITE_API_URL` | Backend API URL | `http://localhost:3001` |
| `VITE_APP_NAME` | Application name | `Rephlo` |
| `VITE_APP_TAGLINE` | Application tagline | `Transform text. Keep your flow.` |
| `VITE_NODE_ENV` | Environment mode | `development` |

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/rephlo` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |
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

## API Endpoints (Coming in Phase 3)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/track-download` | Track download by OS |
| `POST` | `/api/feedback` | Submit user feedback |
| `POST` | `/api/diagnostics` | Upload diagnostic files |
| `GET` | `/api/version` | Get latest app version |
| `GET` | `/admin/metrics` | Admin dashboard metrics |

---

## Brand Guidelines

All UI components and design follow the **Rephlo Visual Identity System**:

- **Primary Color:** Rephlo Blue (#2563EB)
- **Secondary Color:** Deep Navy (#1E293B)
- **Accent Color:** Electric Cyan (#06B6D4)
- **Typography:** Inter (UI), JetBrains Mono (code)
- **Design System:** See `docs/plan/064-rephlo-visual-identity.md`

---

## Implementation Phases

This project follows a phased implementation approach:

- **Phase 1:** Project Initialization & Setup (Current)
- **Phase 2:** Database Design & Setup
- **Phase 3:** Backend API Development
- **Phase 4:** Frontend Landing Page Development
- **Phase 5:** Integration & Testing
- **Phase 6:** Deployment Configuration

See `docs/plan/068-implementation-orchestration.md` for detailed phase breakdown.

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
3. Check port 5173 is available
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

**Last Updated:** November 2025
**Version:** 1.0.0 (Phase 1 Complete)
