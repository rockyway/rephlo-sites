# Text Assistant Backend API

Backend API server for Text Assistant desktop application, providing OAuth authentication, credit management, user profiles, and LLM inference endpoints.

## Features

- **OAuth 2.0 Authentication** with PKCE for desktop applications
- **Credit Management** with detailed breakdown (free vs. pro credits)
- **User Profile & Preferences** with subscription tier information
- **LLM Inference API** supporting multiple model providers
- **Usage Tracking & Analytics** with comprehensive statistics
- **Rate Limiting & Security** with tier-based limits
- **Dependency Injection** architecture using TSyringe

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Authentication**: OIDC Provider (OAuth 2.0 with PKCE)
- **Database**: PostgreSQL with Prisma ORM
- **Dependency Injection**: TSyringe
- **Testing**: Jest with integration tests
- **API Documentation**: OpenAPI 3.0 (Swagger)

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- PostgreSQL 14+
- Access to OpenAI, Anthropic, or other LLM provider APIs

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
npm run db:migrate
npm run db:seed

# Build TypeScript
npm run build

# Start development server
npm run dev
```

### Environment Variables

See `.env.example` for required configuration:

- **Database**: `DATABASE_URL`
- **OAuth**: `OIDC_ISSUER`, `OIDC_JWKS_URI`, `CLIENT_ID`, `CLIENT_SECRET`
- **API Keys**: Provider-specific keys (OpenAI, Anthropic, etc.)
- **Server**: `PORT`, `NODE_ENV`, `CORS_ORIGIN`

## API Endpoints

### Enhanced API (v1.1)

New endpoints for desktop application integration:

#### GET /api/user/credits

Get detailed credit information with separate breakdown of free and pro credits.

**Response:**
```json
{
  "freeCredits": {
    "remaining": 1500,
    "monthlyAllocation": 2000,
    "used": 500,
    "resetDate": "2025-12-01T00:00:00Z",
    "daysUntilReset": 25
  },
  "proCredits": {
    "remaining": 5000,
    "purchasedTotal": 10000,
    "lifetimeUsed": 5000
  },
  "totalAvailable": 6500,
  "lastUpdated": "2025-11-06T14:30:00Z"
}
```

**Features:**
- Separate free/pro credit breakdown
- Monthly reset dates for free credits
- Lifetime usage tracking for pro credits
- Rate limit: 60 requests/minute

#### GET /api/user/profile

Get complete user profile with subscription information.

**Response:**
```json
{
  "userId": "usr_abc123xyz",
  "email": "user@example.com",
  "displayName": "John Doe",
  "subscription": {
    "tier": "pro",
    "status": "active",
    "currentPeriodStart": "2025-11-01T00:00:00Z",
    "currentPeriodEnd": "2025-12-01T00:00:00Z",
    "cancelAtPeriodEnd": false
  },
  "preferences": {
    "defaultModel": "gpt-5",
    "emailNotifications": true,
    "usageAlerts": true
  },
  "accountCreatedAt": "2024-01-15T10:30:00Z",
  "lastLoginAt": "2025-11-06T08:00:00Z"
}
```

**Features:**
- Complete user profile with subscription tier/status
- User preferences (model, notifications, alerts)
- Account timestamps
- Rate limit: 30 requests/minute

#### POST /oauth/token/enhance

Enhance OAuth token response with user data and/or credits in a single request.

**Request:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "include_user_data": "true",
  "include_credits": "false"
}
```

**Response:**
```json
{
  "user": {
    "userId": "usr_abc123xyz",
    "email": "user@example.com",
    "displayName": "John Doe",
    "subscription": {
      "tier": "pro",
      "status": "active"
    },
    "credits": {
      "freeCredits": {
        "remaining": 2000,
        "monthlyAllocation": 2000,
        "resetDate": "2025-12-01T00:00:00Z"
      },
      "proCredits": {
        "remaining": 5000,
        "purchasedTotal": 10000
      },
      "totalAvailable": 7000
    }
  }
}
```

**Benefits:**
- Reduces initial login round trips from 3 to 2 API calls
- Faster user onboarding experience
- Backward compatible (opt-in via parameters)
- Rate limit: 30 requests/minute

### Core API Endpoints (v1)

#### Authentication
- `GET /oauth/authorize` - Start OAuth authorization flow
- `POST /oauth/token` - Exchange authorization code for tokens
- `POST /oauth/token` (refresh) - Refresh access token
- `POST /oauth/revoke` - Revoke tokens

#### Credits & Usage
- `GET /v1/credits/me` - Get current user credits
- `GET /v1/usage` - Get usage history with filtering
- `GET /v1/usage/stats` - Get usage statistics
- `GET /v1/rate-limit` - Get rate limit status

#### User Management
- `GET /v1/users/me` - Get current user profile
- `PATCH /v1/users/me` - Update user profile
- `GET /v1/users/me/preferences` - Get user preferences
- `PATCH /v1/users/me/preferences` - Update user preferences
- `POST /v1/users/me/preferences/model` - Set default model
- `GET /v1/users/me/preferences/model` - Get default model

#### Models
- `GET /v1/models` - List available models
- `GET /v1/models/:id` - Get model details

#### Subscriptions
- `GET /v1/subscriptions/me` - Get current subscription
- `POST /v1/subscriptions/checkout` - Create checkout session
- `POST /v1/subscriptions/portal` - Get customer portal URL
- `POST /v1/webhooks/stripe` - Handle Stripe webhooks

## Documentation

Full API documentation is available in the `docs` directory:

- **[API Reference](docs/api/enhanced-endpoints.md)** - Complete endpoint documentation with examples
- **[OpenAPI Specification](docs/openapi/enhanced-api.yaml)** - Machine-readable API spec
- **[Postman Collection](docs/postman/enhanced-api-collection.json)** - Import into Postman for testing
- **[Integration Guide](docs/guides/desktop-app-integration.md)** - Step-by-step integration guide for desktop apps

### Quick Links

- [Authentication Flow](docs/guides/desktop-app-integration.md#oauth-20-flow)
- [Error Handling](docs/api/enhanced-endpoints.md#error-handling)
- [Rate Limiting](docs/api/enhanced-endpoints.md#rate-limiting)
- [Best Practices](docs/api/enhanced-endpoints.md#best-practices)

## Development

### Project Structure

```
backend/
├── src/
│   ├── controllers/       # HTTP request handlers
│   ├── services/          # Business logic
│   ├── middleware/        # Express middleware
│   ├── routes/            # Route definitions
│   ├── interfaces/        # TypeScript interfaces
│   ├── types/             # Type definitions
│   ├── utils/             # Utility functions
│   └── container.ts       # DI container setup
├── docs/
│   ├── api/               # API documentation
│   ├── openapi/           # OpenAPI specifications
│   ├── postman/           # Postman collections
│   └── guides/            # Integration guides
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
└── tests/
    ├── unit/              # Unit tests
    └── integration/       # Integration tests
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server with auto-reload
npm run build            # Build TypeScript to JavaScript
npm run start            # Start production server

# Database
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with test data
npm run db:reset         # Reset database (drop + migrate + seed)
npm run db:studio        # Open Prisma Studio

# Testing
npm run test             # Run all tests
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run typecheck        # Check TypeScript types
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- credits.service.test.ts

# Run tests in watch mode
npm run test:watch
```

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name add_new_field

# Apply migrations to production
npx prisma migrate deploy

# Reset database (development only)
npm run db:reset
```

## Architecture

### Dependency Injection

This project uses TSyringe for dependency injection, providing:

- **Testability**: Easy mocking of dependencies
- **Maintainability**: Clear dependency graphs
- **Flexibility**: Easy to swap implementations

Example:

```typescript
@injectable()
export class CreditsController {
  constructor(
    @inject('ICreditService') private readonly creditService: ICreditService,
    @inject('IUsageService') private readonly usageService: IUsageService
  ) {}

  async getDetailedCredits(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const credits = await this.creditService.getDetailedCredits(userId);
    res.json(credits);
  }
}
```

### Error Handling

Centralized error handling with custom error types:

```typescript
import { notFoundError, unauthorizedError, validationError } from './middleware/error.middleware';

// Usage in controllers
if (!user) {
  throw notFoundError('User not found');
}

if (!isValid) {
  throw validationError('Invalid input', { field: 'email' });
}
```

### Logging

Structured logging with Winston:

```typescript
import logger from './utils/logger';

logger.info('User logged in', { userId, email });
logger.error('Failed to process request', { error: error.message });
```

## Deployment

### Docker

```bash
# Build Docker image
docker build -t textassistant-backend .

# Run container
docker run -p 3000:3000 --env-file .env textassistant-backend
```

### Environment Configuration

Production environment variables:

- `NODE_ENV=production`
- `DATABASE_URL` - PostgreSQL connection string
- `OIDC_ISSUER` - OAuth issuer URL
- `CORS_ORIGIN` - Allowed origins (comma-separated)
- Provider API keys (OpenAI, Anthropic, etc.)

### Health Checks

- `GET /health` - Server health status
- `GET /health/db` - Database connectivity check

## Security

### Authentication

- OAuth 2.0 with PKCE for desktop applications
- JWT access tokens with RSA256 signing
- Refresh tokens with secure rotation
- Scope-based authorization

### Rate Limiting

Tier-based rate limits:

| Tier | Requests/Minute | Tokens/Minute |
|------|----------------|---------------|
| Free | 30 | 50,000 |
| Pro | 60 | 200,000 |
| Enterprise | 120 | 1,000,000 |

### Data Protection

- Encrypted tokens in database
- PII (email) not logged
- Secure session management
- CORS configured for specific origins

## Monitoring

### Metrics

- API response times (p50, p95, p99)
- Error rates by endpoint
- Credit usage tracking
- Rate limit violations

### Logging

- Structured JSON logs
- Request/response logging with Morgan
- Error tracking with stack traces
- User actions audit log

## Contributing

1. Create a feature branch from `master`
2. Make your changes with tests
3. Run `npm test` and `npm run lint`
4. Submit a pull request

### Code Standards

- Use TypeScript strict mode
- Follow ESLint configuration
- Write unit tests for business logic
- Write integration tests for endpoints
- Document public APIs with JSDoc

## License

Proprietary - Text Assistant

## Support

For questions or issues:

- Email: support@textassistant.com
- Documentation: https://docs.textassistant.com
- Status Page: https://status.textassistant.com
