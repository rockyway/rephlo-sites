# Database Schema Implementation Documentation

**Version**: 1.0.0
**Agent**: Database Schema Architect
**Created**: 2025-11-05
**Reference**: docs/plan/073-dedicated-api-backend-specification.md

---

## Overview

This document details the implementation of the PostgreSQL database schema for the Dedicated API Backend. The schema supports OAuth 2.0 authentication, subscription management, credit tracking, usage analytics, and LLM model management.

---

## Schema Architecture

### Database Technology Stack

- **Database**: PostgreSQL 16.x
- **ORM**: Prisma 5.x
- **Connection Pool**: pg (node-postgres) + Prisma connection pooling
- **Migration Tool**: Prisma Migrate

### Design Principles

1. **Normalization**: Schema follows 3NF (Third Normal Form) for data integrity
2. **Type Safety**: Prisma generates TypeScript types for compile-time safety
3. **Performance**: Strategic indexes on foreign keys and frequently queried columns
4. **Data Integrity**: Foreign key constraints with appropriate cascading rules
5. **Audit Trail**: All tables include created_at and updated_at timestamps
6. **Soft Deletes**: User table includes deleted_at for data retention

---

## Data Models

### 1. Users Table

**Purpose**: Stores user account information for authentication and profile management.

**Schema**:
```prisma
model User {
  id                 String    @id @default(uuid()) @db.Uuid
  email              String    @unique @db.VarChar(255)
  emailVerified      Boolean   @default(false)
  username           String?   @db.VarChar(100)
  passwordHash       String?   @db.VarChar(255)
  firstName          String?   @db.VarChar(100)
  lastName           String?   @db.VarChar(100)
  profilePictureUrl  String?   @db.Text
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  lastLoginAt        DateTime?
  isActive           Boolean   @default(true)
  deletedAt          DateTime?

  // Relations
  subscriptions   Subscription[]
  credits         Credit[]
  usageHistory    UsageHistory[]
  userPreferences UserPreference?
}
```

**Key Design Decisions**:
- UUID primary key for security (prevents enumeration attacks)
- Email is unique and indexed for fast lookups
- Password hash is nullable to support OAuth-only accounts
- Soft delete via deletedAt preserves user data and referential integrity
- Index on email and createdAt for common query patterns

---

### 2. OAuth Clients Table

**Purpose**: Stores OAuth 2.0 client configurations (desktop app, web app, etc.).

**Schema**:
```prisma
model OAuthClient {
  clientId         String   @id @db.VarChar(255)
  clientName       String   @db.VarChar(255)
  clientSecretHash String?  @db.VarChar(255)
  redirectUris     String[]
  grantTypes       String[]
  responseTypes    String[]
  scope            String?  @db.Text
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
}
```

**Key Design Decisions**:
- Client ID as primary key (human-readable identifier)
- Secret hash is nullable for public clients (e.g., desktop apps with PKCE)
- Array fields for redirect URIs, grant types, and response types
- Pre-seeded with textassistant-desktop client configuration

---

### 3. Subscriptions Table

**Purpose**: Manages user subscription tiers, billing, and status.

**Schema**:
```prisma
enum SubscriptionTier {
  free
  pro
  enterprise
}

enum SubscriptionStatus {
  active
  cancelled
  expired
  suspended
}

model Subscription {
  id                   String             @id @default(uuid()) @db.Uuid
  userId               String             @db.Uuid
  tier                 SubscriptionTier
  status               SubscriptionStatus @default(active)
  creditsPerMonth      Int
  creditsRollover      Boolean            @default(false)
  priceCents           Int
  billingInterval      String             @db.VarChar(20)
  stripeSubscriptionId String?            @db.VarChar(255)
  stripeCustomerId     String?            @db.VarChar(255)
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  trialEnd             DateTime?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  cancelledAt          DateTime?

  // Relations
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  credits Credit[]
}
```

**Key Design Decisions**:
- Enum types for tier and status ensure data validity
- Stripe integration fields for payment processing
- Billing period tracking for credit allocation
- Indexes on userId, status, and currentPeriodEnd for queries
- Cascade delete when user is deleted

---

### 4. Credits Table

**Purpose**: Tracks credit allocation and usage per billing period.

**Schema**:
```prisma
model Credit {
  id                  String    @id @default(uuid()) @db.Uuid
  userId              String    @db.Uuid
  subscriptionId      String?   @db.Uuid
  totalCredits        Int
  usedCredits         Int       @default(0)
  billingPeriodStart  DateTime
  billingPeriodEnd    DateTime
  isCurrent           Boolean   @default(true)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  // Relations
  user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription Subscription?  @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)
  usageHistory UsageHistory[]
}
```

**Key Design Decisions**:
- Tracks credits separately from subscriptions for flexibility
- isCurrent flag allows efficient queries for active credit allocation
- Subscription ID can be null (one-time credit purchases)
- Composite index on (userId, isCurrent) for fast current credit lookup
- Note: Specification mentioned a generated column for remaining_credits, but Prisma doesn't support generated columns natively. This is calculated at the application layer.

---

### 5. Usage History Table

**Purpose**: Records detailed usage logs for each API request.

**Schema**:
```prisma
enum UsageOperation {
  completion
  chat
  embedding
  function_call
}

model UsageHistory {
  id                 String          @id @default(uuid()) @db.Uuid
  userId             String          @db.Uuid
  creditId           String?         @db.Uuid
  modelId            String          @db.VarChar(100)
  operation          UsageOperation
  creditsUsed        Int
  inputTokens        Int?
  outputTokens       Int?
  totalTokens        Int?
  requestDurationMs  Int?
  requestMetadata    Json?
  createdAt          DateTime        @default(now())

  // Relations
  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  credit Credit? @relation(fields: [creditId], references: [id], onDelete: SetNull)
  model  Model   @relation(fields: [modelId], references: [id])
}
```

**Key Design Decisions**:
- Comprehensive tracking of token usage and request metrics
- JSONB metadata for flexible storage of request/response snippets
- Indexes on userId, createdAt, modelId for analytics queries
- Composite index on (userId, createdAt DESC) for user-specific history
- Foreign key to Model prevents deletion of models with usage history

---

### 6. Models Table

**Purpose**: Stores available LLM models with pricing and capability information.

**Schema**:
```prisma
enum ModelCapability {
  text
  vision
  function_calling
  code
  long_context
}

model Model {
  id                         String            @id @db.VarChar(100)
  name                       String            @db.VarChar(255)
  displayName                String            @db.VarChar(255)
  provider                   String            @db.VarChar(100)
  description                String?           @db.Text
  capabilities               ModelCapability[]
  contextLength              Int
  maxOutputTokens            Int?
  inputCostPerMillionTokens  Int
  outputCostPerMillionTokens Int
  creditsPer1kTokens         Int
  isAvailable                Boolean           @default(true)
  isDeprecated               Boolean           @default(false)
  version                    String?           @db.VarChar(50)
  createdAt                  DateTime          @default(now())
  updatedAt                  DateTime          @updatedAt

  // Relations
  usageHistory    UsageHistory[]
  userPreferences UserPreference[]
}
```

**Key Design Decisions**:
- Model ID is human-readable (e.g., 'gpt-5', 'claude-3.5-sonnet')
- Array of capabilities for flexible feature filtering
- Pricing stored in cents and credits for precision
- Availability and deprecation flags for lifecycle management
- Indexes on isAvailable and provider for common filters

**Pre-seeded Models**:
1. GPT-5 (OpenAI) - 2 credits/1k tokens
2. Gemini 2.0 Pro (Google) - 1 credit/1k tokens
3. Claude 3.5 Sonnet (Anthropic) - 2 credits/1k tokens

---

### 7. User Preferences Table

**Purpose**: Stores user-specific preferences and default settings.

**Schema**:
```prisma
model UserPreference {
  userId               String   @id @db.Uuid
  defaultModelId       String?  @db.VarChar(100)
  enableStreaming      Boolean  @default(true)
  maxTokens            Int      @default(4096)
  temperature          Decimal  @default(0.7) @db.Decimal(3, 2)
  preferencesMetadata  Json?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  // Relations
  user         User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  defaultModel Model? @relation(fields: [defaultModelId], references: [id])
}
```

**Key Design Decisions**:
- User ID as primary key (one preference record per user)
- JSONB metadata for extensibility (theme, language, etc.)
- Default values match API specification
- Cascade delete when user is deleted

---

## Preserved Legacy Tables

The following tables from the branding website remain intact and functional:

1. **Download** - Tracks download events by OS platform
2. **Feedback** - Stores user feedback submissions
3. **Diagnostic** - Tracks diagnostic log file metadata
4. **AppVersion** - Manages release version information

These tables use CUID for IDs (different from UUID used in new tables) to maintain backward compatibility.

---

## Indexes Strategy

### Primary Indexes (Automatically Created)
- All primary keys have implicit indexes
- Unique constraints on `users.email`

### Secondary Indexes (Explicit)

**Users Table**:
- `users_email_idx` - Email lookup for authentication
- `users_created_at_idx` - User registration analytics

**Subscriptions Table**:
- `subscriptions_user_id_idx` - User's subscription lookup
- `subscriptions_status_idx` - Filter by status (active, cancelled, etc.)
- `subscriptions_current_period_end_idx` - Billing period queries

**Credits Table**:
- `credits_user_id_idx` - User's credits lookup
- `credits_user_id_is_current_idx` - Composite index for current credits
- `credits_billing_period_idx` - Billing period range queries

**Usage History Table**:
- `usage_history_user_id_idx` - User's usage history
- `usage_history_created_at_idx` - Time-based analytics
- `usage_history_model_id_idx` - Model usage statistics
- `usage_history_user_id_created_at_idx` - Composite for user timeline (DESC)

**Models Table**:
- `models_is_available_idx` - Filter available models
- `models_provider_idx` - Filter by provider

---

## Foreign Key Constraints

### Cascading Rules

**ON DELETE CASCADE** (delete child records when parent is deleted):
- `subscriptions.userId → users.id`
- `credits.userId → users.id`
- `usage_history.userId → users.id`
- `user_preferences.userId → users.id`

**ON DELETE SET NULL** (preserve child record, nullify reference):
- `credits.subscriptionId → subscriptions.id`
- `usage_history.creditId → credits.id`
- `user_preferences.defaultModelId → models.id`

**ON DELETE RESTRICT** (prevent deletion if children exist):
- `usage_history.modelId → models.id`

### Rationale

- **CASCADE on userId**: When a user is deleted, all associated data should be removed (GDPR compliance)
- **SET NULL on subscriptionId/creditId**: Preserve usage history even if subscription/credit record is deleted
- **RESTRICT on modelId**: Prevent deletion of models that have usage history (data integrity)

---

## Migration Strategy

### Migration Files

```
prisma/migrations/
├── 20251103000000_init/                    # Initial branding website schema
│   └── migration.sql
└── 20251106012158_add_dedicated_api_backend_schema/  # New API backend schema
    └── migration.sql
```

### Migration Process

1. **Development**:
   ```bash
   npx prisma migrate dev --name <migration-name>
   ```

2. **Production**:
   ```bash
   npx prisma migrate deploy
   ```

3. **Rollback** (if needed):
   - Prisma Migrate doesn't support automatic rollback
   - Create a new migration to reverse changes
   - Always backup production database before migration

### Data Migration Considerations

- **No breaking changes**: Existing tables remain unchanged
- **No data migration needed**: New tables start empty
- **Backward compatible**: Old APIs continue to work with legacy tables

---

## Seeding Strategy

### Seed Data

The seed script (`prisma/seed.ts`) populates:

1. **OAuth Clients**:
   - `textassistant-desktop` (public client with PKCE)

2. **Models**:
   - GPT-5 (OpenAI)
   - Gemini 2.0 Pro (Google)
   - Claude 3.5 Sonnet (Anthropic)

### Running Seeds

```bash
# Seed database
npm run seed

# Or with Prisma directly
npx prisma db seed

# Reset database and re-seed
npm run db:reset
```

### Idempotency

The seed script uses `upsert` operations to ensure idempotency:
- Can be run multiple times without duplicating data
- Updates existing records if they already exist
- Safe for development and staging environments

---

## Connection Pooling Configuration

### Configuration (`src/config/database.ts`)

```typescript
// Prisma Client with logging
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  errorFormat: 'pretty',
});

// PostgreSQL connection pool
export const pgPool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,                      // Max connections
  idleTimeoutMillis: 30000,     // 30s idle timeout
  connectionTimeoutMillis: 10000, // 10s connection timeout
});
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/rephlo-dev
DATABASE_POOL_SIZE=20
DATABASE_POOL_TIMEOUT=10000
```

### Pool Sizing Guidelines

| Environment | Pool Size | Rationale |
|-------------|-----------|-----------|
| Development | 5-10 | Low concurrent requests |
| Staging | 10-20 | Moderate load testing |
| Production | 20-50 | High concurrency, adjust based on load |

**Formula**: `connections = ((core_count * 2) + effective_spindle_count)`

For most applications: Start with 20, monitor, and adjust.

---

## Database Utilities

### Transaction Management

```typescript
// Execute transaction with automatic rollback on error
import { executeTransaction } from '@/config/database';

await executeTransaction(async (tx) => {
  const user = await tx.user.create({ data: { email: '...' } });
  const subscription = await tx.subscription.create({ data: { userId: user.id, ... } });
  return { user, subscription };
});
```

### Health Check

```typescript
// Get database health status
import { getDatabaseHealth } from '@/config/database';

const health = await getDatabaseHealth();
// { status: 'healthy', responseTime: '15ms', pool: { total: 20, idle: 15, waiting: 0, utilization: '25%' } }
```

### Error Handling

```typescript
import { isUniqueConstraintError, getUniqueConstraintFields } from '@/config/database';

try {
  await prisma.user.create({ data: { email: 'duplicate@example.com' } });
} catch (error) {
  if (isUniqueConstraintError(error)) {
    const fields = getUniqueConstraintFields(error);
    console.log(`Duplicate value for: ${fields.join(', ')}`);
  }
}
```

---

## Performance Optimization

### Query Optimization

1. **Use indexes**: All foreign keys and frequently queried columns are indexed
2. **Select specific fields**: Use Prisma's `select` to fetch only needed columns
3. **Batch queries**: Use `findMany` with pagination instead of multiple `findUnique`
4. **Avoid N+1**: Use Prisma's `include` for eager loading related data

### Caching Strategy

- **Model metadata**: Cache in Redis (rarely changes)
- **User preferences**: Cache in Redis with TTL
- **Usage statistics**: Cache aggregated results
- **Subscription status**: Cache with 5-minute TTL

### Database Maintenance

```sql
-- Analyze tables for query planner
ANALYZE users, subscriptions, credits, usage_history;

-- Vacuum to reclaim space
VACUUM ANALYZE;

-- Reindex if needed
REINDEX TABLE usage_history;
```

---

## Testing

### Database Testing Setup

```typescript
// tests/helpers/db.ts
import { PrismaClient } from '@prisma/client';

export const testDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
});

// Clean up before each test
export async function resetDatabase() {
  await testDb.$transaction([
    testDb.usageHistory.deleteMany(),
    testDb.credit.deleteMany(),
    testDb.subscription.deleteMany(),
    testDb.userPreference.deleteMany(),
    testDb.user.deleteMany(),
  ]);
}
```

### Test Database

- Use separate database for testing: `rephlo-test`
- Reset schema before test suite: `npx prisma migrate reset --force`
- Clean data between tests: Use transaction rollback or manual cleanup

---

## Monitoring & Metrics

### Key Metrics to Track

1. **Connection Pool**:
   - Active connections
   - Idle connections
   - Connection wait time
   - Connection errors

2. **Query Performance**:
   - Slow query log (> 100ms)
   - Most frequent queries
   - Index usage statistics

3. **Database Size**:
   - Table sizes
   - Index sizes
   - Growth rate

### Monitoring Tools

- **Prisma Studio**: Visual database browser (`npx prisma studio`)
- **pg_stat_statements**: PostgreSQL extension for query statistics
- **Sentry**: Error tracking and performance monitoring
- **DataDog/NewRelic**: APM for production monitoring

---

## Security Considerations

### Data Protection

1. **Password hashing**: Use bcrypt with cost factor 12
2. **Sensitive data**: Never log passwords, tokens, or API keys
3. **SQL injection**: Prisma parameterizes all queries automatically
4. **Data encryption**: Consider column-level encryption for sensitive fields

### Access Control

1. **Database user**: Use least privilege principle
2. **Connection string**: Store in environment variables, never commit
3. **SSL/TLS**: Enable for production database connections
4. **Audit logging**: Track schema changes and migrations

---

## Deployment Checklist

### Pre-Deployment

- [ ] Backup production database
- [ ] Test migration on staging with production-like data
- [ ] Review migration SQL for potential locks or performance impact
- [ ] Verify rollback plan exists
- [ ] Check connection pool size for production load

### Deployment

- [ ] Run migration during low-traffic window
- [ ] Monitor error logs during migration
- [ ] Verify all tables and indexes created successfully
- [ ] Run seed script (if applicable)
- [ ] Test critical API endpoints

### Post-Deployment

- [ ] Monitor database performance metrics
- [ ] Check connection pool utilization
- [ ] Verify slow query log for new bottlenecks
- [ ] Run ANALYZE on new tables
- [ ] Update documentation if schema differs

---

## Troubleshooting

### Common Issues

**Issue**: Migration fails with "relation already exists"
**Solution**: Drop and recreate database, or manually remove conflicting tables

**Issue**: Connection pool exhausted
**Solution**: Increase `DATABASE_POOL_SIZE` or investigate connection leaks

**Issue**: Slow queries on usage_history
**Solution**: Add composite indexes, partition table by date

**Issue**: Prisma Client out of sync
**Solution**: Run `npx prisma generate` to regenerate client

---

## Future Considerations

### Schema Evolution

1. **Partitioning**: Partition `usage_history` by month for large datasets
2. **Archiving**: Move old usage records to cold storage after 90 days
3. **Materialized Views**: Create for complex analytics queries
4. **Generated Columns**: Use PostgreSQL generated columns for computed values (when Prisma supports it)

### Scalability

1. **Read Replicas**: Add read-only replicas for analytics queries
2. **Sharding**: Shard by user_id if single database becomes bottleneck
3. **Time-Series DB**: Consider TimescaleDB for usage_history table
4. **Caching Layer**: Add Redis caching for frequently accessed data

---

## References

- **Prisma Documentation**: https://www.prisma.io/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/16/
- **API Specification**: docs/plan/073-dedicated-api-backend-specification.md
- **Agent Coordination**: docs/plan/074-agents-backend-api.md

---

## Conclusion

The database schema implementation provides a robust, scalable foundation for the Dedicated API Backend. It follows best practices for data integrity, performance, and maintainability while preserving backward compatibility with existing branding website tables.

All tables, indexes, constraints, and relationships have been implemented according to the specification. The schema is production-ready and includes comprehensive tooling for connection pooling, transaction management, seeding, and monitoring.
