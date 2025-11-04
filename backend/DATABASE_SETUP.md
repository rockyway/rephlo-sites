# PostgreSQL Database Setup Guide

## Current Status
- PostgreSQL 17 is installed at: `C:\Program Files\PostgreSQL\17\bin\psql.exe`
- Service is not running or not configured
- Database: `rephlo` (needs to be created)

## Option 1: Start PostgreSQL Windows Service (Recommended)

### Step 1: Initialize PostgreSQL Data Directory
```bash
# Run as Administrator
"C:\Program Files\PostgreSQL\17\bin\initdb.exe" -D "C:\Program Files\PostgreSQL\17\data" -U postgres
```

### Step 2: Start PostgreSQL Server
```bash
# Run as Administrator
"C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" -D "C:\Program Files\PostgreSQL\17\data" start
```

### Step 3: Create Database
```bash
# Create the rephlo database
"C:\Program Files\PostgreSQL\17\bin\createdb.exe" -U postgres rephlo
```

### Step 4: Verify Connection
```bash
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d rephlo -c "SELECT version();"
```

## Option 2: Use Docker (Easier Alternative)

### Step 1: Install Docker Desktop
Download from: https://www.docker.com/products/docker-desktop

### Step 2: Run PostgreSQL Container
```bash
docker run --name rephlo-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=rephlo \
  -p 5432:5432 \
  -d postgres:17
```

### Step 3: Verify Connection
```bash
docker exec -it rephlo-db psql -U postgres -d rephlo
```

## Option 3: Use Cloud Database (Production-Ready)

### Neon (Recommended for Development)
1. Visit: https://neon.tech
2. Create free account
3. Create new project: "rephlo"
4. Copy connection string
5. Update `.env`:
   ```
   DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/rephlo?sslmode=require
   ```

### Supabase
1. Visit: https://supabase.com
2. Create free account
3. Create new project
4. Go to Settings > Database
5. Copy connection string (Transaction mode)
6. Update `.env`

### AWS RDS
1. Visit AWS Console
2. Create RDS PostgreSQL instance
3. Configure security groups (allow port 5432)
4. Copy endpoint URL
5. Update `.env`

## Current Configuration

### Environment Variables (`.env`)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rephlo
```

**Update credentials if different:**
- Username: `postgres` (default)
- Password: `postgres` (update if you set different password)
- Host: `localhost` (or cloud database host)
- Port: `5432` (default PostgreSQL port)
- Database: `rephlo`

## After Database is Running

### Run Prisma Migration
```bash
cd backend
npx prisma migrate dev --name init
```

This will:
1. Create the `rephlo` database (if it doesn't exist)
2. Create all 4 tables: downloads, feedbacks, diagnostics, app_versions
3. Apply all indexes for performance
4. Generate Prisma Client

### Verify Schema
```bash
npx prisma studio
```

This opens a visual database browser at http://localhost:5555

### Test Connection
```bash
npx prisma db execute --stdin <<EOF
SELECT 'Database connection successful!' as status;
EOF
```

## Troubleshooting

### Error: "Can't reach database server"
- Check if PostgreSQL service is running
- Verify connection string in `.env`
- Check firewall settings (allow port 5432)
- Try connecting with psql manually

### Error: "Database does not exist"
- Prisma will create it automatically during migration
- Or create manually: `createdb -U postgres rephlo`

### Error: "Authentication failed"
- Check username and password in `.env`
- Reset password if needed:
  ```bash
  psql -U postgres -c "ALTER USER postgres PASSWORD 'newpassword';"
  ```

### Error: "Port 5432 already in use"
- Another PostgreSQL instance is running
- Stop it: `pg_ctl stop -D /path/to/data`
- Or use different port in `.env`

## Next Steps

Once database is running:
1. Run migration: `npm run prisma:migrate`
2. Generate client: `npm run prisma:generate`
3. Seed test data: `npm run seed` (optional)
4. Start backend: `npm run dev`

## Database Schema

The migration will create these tables:

### downloads
- id (CUID primary key)
- os (string: "windows", "macos", "linux")
- timestamp (DateTime, auto)
- userAgent (optional string)
- ipHash (optional string)
- Indexes: os, timestamp

### feedbacks
- id (CUID primary key)
- userId (optional string)
- message (varchar 1000)
- email (optional string)
- timestamp (DateTime, auto)
- Indexes: timestamp, email

### diagnostics
- id (CUID primary key)
- userId (optional string)
- filePath (string)
- fileSize (integer, max 5MB)
- timestamp (DateTime, auto)
- Indexes: timestamp, userId

### app_versions
- id (CUID primary key)
- version (string, unique)
- releaseDate (DateTime)
- downloadUrl (string)
- changelog (text)
- isLatest (boolean, default true)
- createdAt (DateTime, auto)
- Index: isLatest
