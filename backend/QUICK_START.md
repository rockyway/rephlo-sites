# Rephlo Backend - Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- PostgreSQL 17 running

## Step 1: Start PostgreSQL

### Option A: Docker (Fastest)
```bash
docker run --name rephlo-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=rephlo -p 5432:5432 -d postgres:17
```

### Option B: Local PostgreSQL
```bash
# Windows
"C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" -D "C:\PostgreSQL\data" start

# macOS/Linux
sudo service postgresql start
```

### Option C: Cloud (Neon/Supabase)
1. Create account at https://neon.tech or https://supabase.com
2. Create new project
3. Copy connection string to `.env`

## Step 2: Install Dependencies
```bash
cd backend
npm install
```

## Step 3: Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Update DATABASE_URL if needed
# Default: postgresql://postgres:postgres@localhost:5432/rephlo
```

## Step 4: Run Database Migration
```bash
npm run prisma:migrate
```

Expected output: ✓ All tables created successfully

## Step 5: Seed Database (Optional)
```bash
npm run seed
```

Expected output: ✓ 5 downloads, 5 feedbacks, 3 diagnostics, 3 versions

## Step 6: Start Development Server
```bash
npm run dev
```

Server runs at: http://localhost:3001

## Verify Installation

### Check Database
```bash
npm run prisma:studio
```
Opens visual database browser at http://localhost:5555

### Test Connection
```bash
npx ts-node -e "
import { prisma } from './src/db';
prisma.download.count().then(count => {
  console.log('✓ Database connected!');
  console.log('Downloads:', count);
  process.exit(0);
});
"
```

## Database Schema

### Tables Created
1. **downloads** - Track app downloads by OS
2. **feedbacks** - User feedback submissions
3. **diagnostics** - Diagnostic log metadata
4. **app_versions** - Release version info

### Common Queries

#### Get Latest App Version
```typescript
import { prisma } from './src/db';

const version = await prisma.appVersion.findFirst({
  where: { isLatest: true }
});
```

#### Track Download
```typescript
const download = await prisma.download.create({
  data: {
    os: 'windows',
    userAgent: 'Mozilla/5.0...',
    ipHash: 'hashed_ip',
  }
});
```

#### Submit Feedback
```typescript
const feedback = await prisma.feedback.create({
  data: {
    message: 'Great app!',
    email: 'user@example.com',
  }
});
```

#### Get Download Stats
```typescript
const stats = await prisma.download.groupBy({
  by: ['os'],
  _count: { id: true }
});
```

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:studio` | Open database browser |
| `npm run seed` | Seed database with test data |
| `npm run db:reset` | Reset and reseed database |

## Troubleshooting

### Can't connect to database
```bash
# Test connection
psql -U postgres -h localhost -p 5432 -d rephlo

# Check if PostgreSQL is running
docker ps | grep rephlo-db  # If using Docker
```

### Migration fails
```bash
# Reset database
npx prisma migrate reset

# Recreate migration
npm run prisma:migrate
```

### Prisma Client not found
```bash
# Generate client
npm run prisma:generate
```

## Documentation

- 📖 [Database Setup Guide](./DATABASE_SETUP.md) - Detailed PostgreSQL setup
- 📖 [Phase 2 Verification](./PHASE2_VERIFICATION.md) - Complete testing guide
- 📖 [Prisma Client Usage](./PRISMA_CLIENT_USAGE.md) - Query examples and patterns
- 📖 [Progress Report](../docs/progress/001-phase2-database-setup-complete.md) - Implementation summary

## Environment Variables

Required in `.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rephlo

# CORS
CORS_ORIGIN=http://localhost:5173

# Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads
```

## Next Steps

1. ✅ PostgreSQL running
2. ✅ Dependencies installed
3. ✅ Database migrated
4. ✅ Test data seeded
5. 🚀 Begin Phase 3 - API Development

See [implementation-orchestration.md](../docs/plan/068-implementation-orchestration.md) for Phase 3 details.

## Support

- Issues: Check troubleshooting sections in documentation
- Schema changes: Update `prisma/schema.prisma` then run `npm run prisma:migrate`
- Reset everything: `npm run db:reset`

---

**Ready to build!** 🚀
