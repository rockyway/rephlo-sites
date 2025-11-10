# Backend & Identity Provider Architecture Analysis

**Document:** 030-architecture.md  
**Date:** November 2025  
**Scope:** Backend (port 7150) and Identity Provider (port 7151) architectural design

---

## Executive Summary

The Rephlo system is built on a microservices architecture with clear separation of concerns:

- **Backend (Port 7150):** Resource API providing LLM access, credits, subscriptions, admin features
- **Identity Provider (Port 7151):** OAuth 2.0/OpenID Connect server for authentication

Both services are Node.js/Express applications using TypeScript, PostgreSQL, and follow enterprise patterns.

---

## 1. Backend Architecture (Port 7150)

### 1.1 Technology Stack

- **Runtime:** Node.js + TypeScript
- **Web Framework:** Express.js
- **Database:** PostgreSQL via Prisma ORM (1750 lines schema)
- **DI Container:** TSyringe (decorator-based)
- **Logging:** Winston
- **HTTP Logging:** Morgan
- **Security:** Helmet.js, CORS, Rate limiting (Redis)
- **Testing:** Jest + ts-jest
- **Build:** TypeScript compiler

### 1.2 Project Structure

```
src/
├── server.ts              # Entry point, lifecycle management
├── app.ts                 # Express app configuration
├── container.ts           # TSyringe DI container (500+ lines)
├── config/                # Configuration files
│   ├── security.ts        # Helmet, CORS, CSP (400+ lines)
│   ├── database.ts        # Prisma & PostgreSQL setup
│   └── downloads.ts
├── routes/                # 27 route modules
│   ├── v1.routes.ts       # REST API v1 (/v1/*)
│   ├── admin.routes.ts    # Admin endpoints (/admin/*)
│   ├── auth.routes.ts     # User auth (/auth/*)
│   ├── mfa.routes.ts      # MFA (/auth/mfa/*)
│   ├── branding.routes.ts # Branding API (/api/*)
│   └── [more specialized routes]
├── controllers/           # 27 controller classes
├── services/              # 38 service classes
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── credit.service.ts
│   ├── subscription-management.service.ts
│   ├── token-introspection.service.ts
│   ├── llm.service.ts
│   └── [domain-specific services]
├── middleware/            # 8 middleware components
│   ├── error.middleware.ts
│   ├── auth.middleware.ts
│   ├── permission.middleware.ts
│   ├── credit.middleware.ts
│   ├── ratelimit.middleware.ts
│   ├── audit.middleware.ts
│   └── [other middleware]
├── interfaces/            # TypeScript interfaces
├── providers/             # LLM provider integrations
│   ├── openai.provider.ts
│   ├── anthropic.provider.ts
│   ├── google.provider.ts
│   └── azure-openai.provider.ts
└── utils/                 # Logger, helpers
```

