# Swagger-JSDoc Migration Checklist

**Document Type:** Implementation Checklist
**Parent Plan:** docs/plan/194-swagger-jsdoc-migration-strategy.md
**Created:** 2025-11-17
**Status:** Ready for Execution (Pending Approval)

---

## Phase 0: Preparation ✅ (Week 1-2, 10 hours)

### Setup & Configuration

- [ ] **Install Dependencies**
  ```bash
  npm install --save-dev @tspec/generator
  npm install --save-dev @apidevtools/swagger-cli  # Spec validation
  ```

- [ ] **Create Directory Structure**
  ```bash
  mkdir -p backend/specs/routes
  mkdir -p backend/specs/schemas
  mkdir -p backend/specs/components
  ```

- [ ] **Create Build Scripts**
  - [ ] Add `generate:openapi` script to package.json
  - [ ] Add `validate:openapi:generated` script
  - [ ] Add `serve:openapi:generated` script (development)

- [ ] **Configure Tspec Generator**
  - [ ] Create `backend/tspec.config.ts`
  - [ ] Configure output path: `docs/openapi/generated-api.yaml`
  - [ ] Configure schema resolution
  - [ ] Set up component references

### Shared Schema Definitions

- [ ] **Create Core Schemas** in `shared-types/src/`
  - [ ] `UserProfileResponse`
  - [ ] `SubscriptionResponse`
  - [ ] `CreditResponse`
  - [ ] `ApiError`
  - [ ] `PaginationMeta`

- [ ] **Generate Zod Schemas** (optional, for runtime validation)
  ```bash
  npm install --save-dev ts-to-zod
  npx ts-to-zod shared-types/src/response.types.ts shared-types/src/response.schemas.ts
  ```

### Developer Documentation

- [ ] **Create Migration Guide** (`docs/guides/018-tspec-migration-guide.md`)
  - [ ] Before/after examples
  - [ ] Common patterns
  - [ ] Schema reuse examples
  - [ ] Troubleshooting section

- [ ] **Update Code Review Checklist** (`docs/reference/156-api-standards.md`)
  - [ ] Add Tspec requirement for new endpoints
  - [ ] Document spec generation workflow
  - [ ] Add validation requirement

- [ ] **Create Tspec Snippets** for VS Code
  ```json
  {
    "Tspec Route": {
      "prefix": "tspec-route",
      "body": [
        "export const ${1:EndpointName}Spec = Tspec.defineRoute({",
        "  method: '${2:GET}',",
        "  path: '${3:/api/resource}',",
        "  summary: '${4:Short summary}',",
        "  tags: ['${5:Tag}'],",
        "  security: [{ bearerAuth: ['${6:scope}'] }],",
        "  responses: {",
        "    200: Tspec.response({",
        "      description: 'Success',",
        "      schema: ${7:ResponseType},",
        "    }),",
        "  },",
        "});"
      ]
    }
  }
  ```

### Validation & Testing

- [ ] **Set Up Validation Pipeline**
  - [ ] Add OpenAPI validation to CI/CD
  - [ ] Create comparison script (manual vs generated)
  - [ ] Set up Swagger UI preview for PRs

- [ ] **Create Test Cases**
  - [ ] Test spec generation with 1 endpoint
  - [ ] Verify Swagger UI rendering
  - [ ] Validate against OpenAPI 3.0.3 schema

---

## Phase 1: Pilot Migration ⏳ (Week 3-4, 10 hours)

### Pilot Endpoints (15 endpoints)

**Selection Criteria:**
- Recently added (familiar to team)
- Simple schemas (low complexity)
- Representative of different patterns

#### Enhanced API Endpoints (4 endpoints)

- [ ] **GET /api/user/profile** (`api.routes.ts:105`)
  - [ ] Create `UserProfileSpec` in `specs/routes/api/user-profile.spec.ts`
  - [ ] Reference `UserProfileResponse` schema
  - [ ] Test generation
  - [ ] Compare with manual YAML

- [ ] **GET /api/user/credits** (`api.routes.ts:142`)
  - [ ] Create `UserCreditsSpec`
  - [ ] Reference `DetailedCreditsResponse` schema
  - [ ] Document rate limiting (60 req/min)

- [ ] **GET /api/user/invoices** (`api.routes.ts:182`)
  - [ ] Create `UserInvoicesSpec`
  - [ ] Document query parameters (limit)
  - [ ] Add pagination examples

- [ ] **GET /api/user/usage/summary** (`api.routes.ts:237`)
  - [ ] Create `UserUsageSummarySpec`
  - [ ] Document period parameter pattern
  - [ ] Add multiple examples (pro/free)

#### Authentication Endpoints (3 endpoints)

- [ ] **POST /auth/register** (`auth.routes.ts:81`)
  - [ ] Create `RegisterSpec`
  - [ ] Document password requirements
  - [ ] Add validation error examples

- [ ] **POST /auth/verify-email** (`auth.routes.ts:114`)
  - [ ] Create `VerifyEmailSpec`
  - [ ] Document token expiry

- [ ] **POST /auth/forgot-password** (`auth.routes.ts:149`)
  - [ ] Create `ForgotPasswordSpec`

#### V1 REST API (8 endpoints)

- [ ] **GET /v1/users/me** (`v1.routes.ts:55`)
- [ ] **PATCH /v1/users/me** (`v1.routes.ts:67`)
- [ ] **GET /v1/models** (`v1.routes.ts:131`)
- [ ] **POST /v1/chat/completions** (`v1.routes.ts:172`)
- [ ] **GET /v1/subscriptions/me** (`v1.routes.ts:199`)
- [ ] **GET /v1/credits/me** (`v1.routes.ts:247`)
- [ ] **GET /v1/usage** (`v1.routes.ts:259`)
- [ ] **GET /v1/webhooks/config** (`v1.routes.ts:299`)

### Pilot Validation

- [ ] **Generate Spec** from pilot endpoints
  ```bash
  npm run generate:openapi
  ```

- [ ] **Validate Output**
  ```bash
  npm run validate:openapi:generated
  ```

- [ ] **Compare with Manual YAML**
  ```bash
  diff docs/openapi/enhanced-api.yaml docs/openapi/generated-api.yaml
  ```

- [ ] **Test Swagger UI**
  - [ ] Start dev server with generated spec
  - [ ] Test "Try it out" functionality
  - [ ] Verify examples render correctly

### Pilot Retrospective

- [ ] **Gather Developer Feedback**
  - [ ] Survey: ease of use (1-5)
  - [ ] Survey: documentation quality (1-5)
  - [ ] Survey: time spent vs manual YAML
  - [ ] Collect pain points and suggestions

- [ ] **Measure Metrics**
  - [ ] Actual hours spent vs estimate
  - [ ] Lines of code added (Tspec annotations)
  - [ ] Generated YAML size vs manual
  - [ ] Number of schema definitions reused

- [ ] **Decision Checkpoint** 🚦
  - [ ] ✅ Proceed to Phase 2 (success criteria met)
  - [ ] ⚠️ Adjust strategy based on feedback
  - [ ] ❌ Abort migration and enhance status quo

---

## Phase 2: Core API Migration ⏸️ (Week 5-8, 20 hours)

### V1 REST API (22 endpoints)

#### User Endpoints
- [ ] GET /v1/users/me/preferences
- [ ] PATCH /v1/users/me/preferences
- [ ] GET /v1/users/me/preferences/model
- [ ] POST /v1/users/me/preferences/model

#### Model Endpoints
- [ ] GET /v1/models/{modelId}
- [ ] POST /v1/completions

#### Subscription Endpoints
- [ ] GET /v1/subscription-plans
- [ ] PATCH /v1/subscriptions/me
- [ ] POST /v1/subscriptions
- [ ] POST /v1/subscriptions/me/cancel

#### Credits & Usage
- [ ] GET /v1/usage/stats
- [ ] GET /v1/rate-limit

#### Webhooks
- [ ] POST /v1/webhooks/config
- [ ] DELETE /v1/webhooks/config
- [ ] POST /v1/webhooks/test

### Authentication Endpoints (10 endpoints)

- [ ] POST /auth/reset-password
- [ ] POST /auth/mfa/setup
- [ ] POST /auth/mfa/verify-setup
- [ ] POST /auth/mfa/verify-login
- [ ] POST /auth/mfa/disable
- [ ] POST /auth/mfa/backup-code-login
- [ ] GET /auth/mfa/status
- [ ] GET /oauth/google/authorize
- [ ] GET /oauth/google/callback
- [ ] POST /oauth/token/enhance

### Branding Endpoints (4 endpoints)

- [ ] POST /api/track-download
- [ ] POST /api/feedback
- [ ] GET /api/version
- [ ] POST /api/diagnostics

---

## Phase 3: Admin Panel Migration ⏸️ (Week 9-10, 25 hours)

### Admin Analytics (20 endpoints)

- [ ] GET /admin/analytics/dashboard-kpis
- [ ] GET /admin/analytics/recent-activity
- [ ] GET /admin/analytics/revenue/kpis
- [ ] GET /admin/analytics/revenue/mix
- [ ] GET /admin/analytics/revenue/trend
- [ ] GET /admin/analytics/revenue/conversion-funnel
- [ ] GET /admin/analytics/revenue/credit-usage
- [ ] GET /admin/analytics/revenue/coupon-roi
- [ ] GET /admin/analytics/gross-margin
- [ ] GET /admin/analytics/cost-by-provider
- [ ] GET /admin/analytics/margin-trend
- [ ] GET /admin/analytics/cost-distribution
- [ ] POST /admin/analytics/export-csv
- [ ] (7 more analytics endpoints...)

### Admin User Management (15 endpoints)

- [ ] GET /admin/users
- [ ] GET /admin/users/:id
- [ ] PATCH /admin/users/:id
- [ ] POST /admin/users/:id/suspend
- [ ] POST /admin/users/:id/unsuspend
- [ ] PATCH /admin/users/:id/role
- [ ] GET /admin/users/:id/overview
- [ ] GET /admin/users/:id/subscriptions
- [ ] GET /admin/users/:id/credits
- [ ] (6 more user management endpoints...)

### Admin Subscriptions (12 endpoints)

- [ ] GET /admin/subscriptions
- [ ] GET /admin/subscriptions/stats
- [ ] POST /admin/subscriptions/:id/cancel
- [ ] POST /admin/subscriptions/:id/upgrade
- [ ] (8 more subscription endpoints...)

### Admin Billing (10 endpoints)

- [ ] GET /admin/billing/invoices
- [ ] GET /admin/billing/transactions
- [ ] POST /admin/billing/transactions/:id/refund
- [ ] (7 more billing endpoints...)

### Admin Models & Tiers (15 endpoints)

- [ ] GET /admin/models/tiers
- [ ] PATCH /admin/models/:modelId/tier
- [ ] POST /admin/models/tiers/bulk
- [ ] GET /admin/models/providers
- [ ] (11 more model endpoints...)

### Admin Coupons & Campaigns (8 endpoints)

- [ ] GET /admin/coupons
- [ ] GET /admin/coupons/:id
- [ ] POST /admin/coupons
- [ ] PATCH /admin/coupons/:id
- [ ] GET /admin/campaigns
- [ ] GET /admin/campaigns/:id
- [ ] (2 more coupon endpoints...)

---

## Phase 4: Remaining Endpoints ⏸️ (Week 11, 20 hours)

### Health & Info (4 endpoints)

- [ ] GET /
- [ ] GET /health
- [ ] GET /health/ready
- [ ] GET /health/live

### Perpetual Licensing (20 endpoints)

- [ ] POST /api/licenses/purchase
- [ ] POST /api/licenses/activate
- [ ] DELETE /api/licenses/activations/:id
- [ ] GET /api/licenses/:licenseKey
- [ ] (16 more license endpoints...)

### Prorations (8 endpoints)

- [ ] POST /api/subscriptions/:id/proration-preview
- [ ] POST /api/subscriptions/:id/upgrade-with-proration
- [ ] GET /admin/prorations
- [ ] (5 more proration endpoints...)

### Tier Config (6 endpoints)

- [ ] GET /api/admin/tier-config
- [ ] GET /api/admin/tier-config/:tierName
- [ ] PATCH /api/admin/tier-config/:tierName/credits
- [ ] (3 more tier config endpoints...)

### Miscellaneous (10 endpoints)

- [ ] POST /webhooks/stripe
- [ ] (9 other miscellaneous endpoints...)

---

## Phase 5: Cleanup & Finalization ⏸️ (Week 12, 5 hours)

### Pre-Deployment Checklist

- [ ] **Compare Generated vs Manual Spec**
  ```bash
  diff -u docs/openapi/enhanced-api.yaml docs/openapi/generated-api.yaml > spec-diff.txt
  ```
  - [ ] Review all differences
  - [ ] Ensure no missing endpoints
  - [ ] Verify all schemas present
  - [ ] Check examples completeness

- [ ] **Validate Generated Spec**
  ```bash
  swagger-cli validate docs/openapi/generated-api.yaml
  ```

- [ ] **Test Swagger UI**
  - [ ] All endpoints render correctly
  - [ ] All "Try it out" buttons work
  - [ ] All examples display properly
  - [ ] Authentication flow works

### Deployment

- [ ] **Update Swagger Routes** (`backend/src/routes/swagger.routes.ts`)
  - [ ] Change from loading YAML file to serving generated spec
  - [ ] Update path from `enhanced-api.yaml` to `generated-api.yaml`

- [ ] **Update CI/CD** (`.github/workflows/`)
  - [ ] Add spec generation step to build pipeline
  - [ ] Add spec validation to PR checks
  - [ ] Add Swagger UI deployment for preview

- [ ] **Archive Manual YAML**
  ```bash
  git tag archive/manual-openapi-spec-v3.0.0
  git mv backend/docs/openapi/enhanced-api.yaml backend/docs/openapi/archived/enhanced-api-manual-v3.0.0.yaml
  git commit -m "Archive manual OpenAPI spec, migrate to generated"
  ```

### Documentation Updates

- [ ] **Update README Files**
  - [ ] backend/README.md (document new workflow)
  - [ ] docs/README.md (update documentation process)

- [ ] **Update CLAUDE.md**
  - [ ] Remove manual YAML maintenance instructions
  - [ ] Add Tspec annotation requirements
  - [ ] Update API development standards section

- [ ] **Create Migration Completion Report**
  - [ ] Total hours spent
  - [ ] Endpoints migrated (should be 228)
  - [ ] Issues encountered and resolved
  - [ ] Recommendations for future

### Post-Deployment Validation

- [ ] **Smoke Tests**
  - [ ] Swagger UI loads without errors
  - [ ] All endpoint categories visible
  - [ ] Sample "Try it out" requests work

- [ ] **Monitor for Issues**
  - [ ] Check error logs (first 24 hours)
  - [ ] Gather developer feedback
  - [ ] Fix any reported issues

---

## Success Criteria

### Pilot Phase (Phase 1)

- ✅ 15 endpoints successfully migrated
- ✅ Generated spec validates with 0 errors
- ✅ Swagger UI renders all pilot endpoints
- ✅ Developer satisfaction > 3.5/5
- ✅ Time per endpoint < 1 hour

### Migration Completion (All Phases)

- ✅ 228 endpoints (100%) documented via Tspec
- ✅ Generated spec size ≤ manual YAML size
- ✅ Zero missing endpoints vs manual spec
- ✅ Zero documentation drift incidents
- ✅ CI/CD builds spec automatically
- ✅ Manual YAML archived (not in active use)

---

## Rollback Plan

**If migration fails at any phase:**

1. **Stop Migration**
   - Don't proceed to next phase
   - Keep existing manual YAML as primary

2. **Root Cause Analysis**
   - Document what went wrong
   - Identify specific issues

3. **Decision Point**
   - Fix issues and retry phase
   - Adjust strategy (e.g., use swagger-jsdoc instead of Tspec)
   - Abort migration, enhance status quo

4. **Preserve Work**
   - Tag git commit with phase number
   - Document lessons learned
   - Archive Tspec specs for future attempt

---

## Tracking & Reporting

### Weekly Progress Report

Submit to team every Friday:

```markdown
## Migration Progress Report - Week [X]

**Phase:** [Current phase]
**Endpoints Migrated This Week:** [X]
**Total Endpoints Migrated:** [X/228]
**Completion:** [X%]

**Blockers:**
- [Issue 1]
- [Issue 2]

**Next Week Plan:**
- [Task 1]
- [Task 2]
```

### Final Completion Report

Template: `docs/progress/[NNN]-swagger-migration-completion.md`

**Sections:**
- Executive summary
- Total effort (hours)
- Deviations from plan
- Lessons learned
- Future recommendations

---

## Tools & Resources

### Required Tools

- [ ] `@tspec/generator` - TypeScript to OpenAPI
- [ ] `swagger-cli` - Spec validation
- [ ] `swagger-ui-express` - Already installed
- [ ] `yamljs` - Already installed

### Helpful Resources

- [ ] [Tspec Documentation](https://github.com/ts-spec/tspec)
- [ ] [OpenAPI 3.0.3 Spec](https://spec.openapis.org/oas/v3.0.3)
- [ ] [swagger-jsdoc Examples](https://github.com/Surnet/swagger-jsdoc/tree/master/examples)
- [ ] Migration guide (to be created)

---

**Last Updated:** 2025-11-17
**Next Review:** After Pilot Phase completion
