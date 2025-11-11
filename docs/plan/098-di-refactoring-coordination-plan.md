# DI Refactoring - Master Coordination Plan

**Status:** Active
**Created:** 2025-11-05
**Role:** Master Agent Orchestration Document
**Duration:** 20 days (4 weeks)
**Team Size:** 1-3 developers + Claude Code agents

## Executive Summary

This document coordinates the execution of the 7-phase DI refactoring plan. It defines roles, responsibilities, phase dependencies, communication protocols, and success criteria.

---

## Document Hierarchy

```
docs/plan/
├── 090-di-refactoring-master-plan.md        ← Strategic overview
├── 091-di-phase1-implementation-guide.md    ← Phase 1 (Infrastructure)
├── 092-di-phase2-llm-service-refactoring.md ← Phase 2 (LLM Service)
├── 093-di-phase3-core-services-refactoring.md ← Phase 3 (Core Services)
├── 094-di-phase4-routes-controllers-refactoring.md ← Phase 4 (Routes/Controllers)
├── 095-di-phase5-middleware-refactoring.md  ← Phase 5 (Middleware)
├── 096-di-phase6-application-bootstrap.md   ← Phase 6 (Bootstrap)
├── 097-di-phase7-testing-infrastructure.md  ← Phase 7 (Testing)
└── 098-di-refactoring-coordination-plan.md  ← THIS DOCUMENT (Coordination)
```

---

## Phase Overview & Dependencies

```
Phase 1: Infrastructure Setup (2 days) ──────────┐
                                                  ↓
Phase 2: LLM Service Refactoring (3 days) ───────┤
                                                  ↓
Phase 3: Core Services Refactoring (5 days) ─────┤
                                                  ↓
Phase 4: Routes & Controllers (4 days) ──────────┤
                                                  ↓
Phase 5: Middleware Refactoring (2 days) ────────┤
                                                  ↓
Phase 6: Application Bootstrap (1 day) ──────────┤
                                                  ↓
Phase 7: Testing Infrastructure (3 days) ────────┘

Total: 20 days
```

### Critical Path
Phase 1 → Phase 2 → Phase 3 are **sequential** (cannot be parallelized).
Phases 4, 5, 6 can potentially overlap if multiple team members are available.

---

## Team Roles & Responsibilities

### Master Agent (Claude Code)
- **Role:** Orchestrate all phases, delegate to specialist agents
- **Responsibilities:**
  - Track overall progress
  - Verify phase completion
  - Identify blockers and escalate
  - Coordinate between phases
  - Final quality assurance

### Developer (Human)
- **Role:** Execute implementation tasks, review agent output
- **Responsibilities:**
  - Approve phase plans before execution
  - Execute code changes (or delegate to agents)
  - Manual testing and verification
  - Git workflow management (branching, commits, PRs)
  - Resolve merge conflicts

### Specialist Agents (Claude Code Sub-Agents)
- **Phase 1 Agent:** Infrastructure setup
- **Phase 2 Agent:** LLM service refactoring
- **Phase 3 Agent:** Core services refactoring
- **Phase 4 Agent:** Routes/controllers refactoring
- **Phase 5 Agent:** Middleware refactoring
- **Phase 6 Agent:** Application bootstrap
- **Phase 7 Agent:** Testing infrastructure

---

## Phase Execution Protocol

### Pre-Phase Checklist
- [ ] Previous phase verification complete
- [ ] Phase plan reviewed and approved
- [ ] Git branch created: `feature/di-refactoring-phase{N}`
- [ ] Team capacity confirmed
- [ ] Dependencies available (API keys, database, etc.)

### During Phase
1. **Daily Standup (for multi-day phases)**
   - What was completed yesterday?
   - What's the plan for today?
   - Any blockers?

2. **Continuous Verification**
   - Run `npm run build` after each major change
   - Run tests after completing each task
   - Commit frequently with clear messages

3. **Documentation**
   - Update phase guide with discoveries
   - Log issues in phase-specific tracking document

### Post-Phase Checklist
- [ ] All tasks in phase guide completed
- [ ] Verification tests pass
- [ ] Build succeeds with no errors
- [ ] Application starts successfully
- [ ] Code committed to phase branch
- [ ] Phase completion report generated
- [ ] Next phase plan reviewed

---

## Git Workflow

### Branch Structure
```
master (protected)
 ├── feature/di-refactoring-phase1
 ├── feature/di-refactoring-phase2
 ├── feature/di-refactoring-phase3
 ├── feature/di-refactoring-phase4
 ├── feature/di-refactoring-phase5
 ├── feature/di-refactoring-phase6
 └── feature/di-refactoring-phase7
```

### Commit Convention
```
<phase>: <type>: <description>

Examples:
phase1: feat: Add TSyringe DI container setup
phase1: chore: Create service interfaces
phase2: refactor: Extract OpenAI provider to separate class
phase2: test: Add LLMService unit tests
phase3: refactor: Convert WebhookService to class-based
```

### Merge Strategy
**Option 1: Sequential Merges (Recommended)**
- Merge Phase 1 → master
- Merge Phase 2 → master (includes Phase 1)
- Merge Phase 3 → master (includes Phase 1-2)
- ...

**Option 2: Feature Branch**
- All phases merge into single `feature/di-refactoring` branch
- Final merge to master after Phase 7

**Recommendation:** Use Option 1 for incremental deployability.

---

## Communication Protocols

### Progress Reporting

**Daily Update Format:**
```markdown
## DI Refactoring Progress - {Date}

**Current Phase:** {N} - {Phase Name}
**Status:** On Track / At Risk / Blocked
**Completion:** {X}% of phase complete

### Completed Today
- Task 1
- Task 2

### Planned for Tomorrow
- Task 3
- Task 4

### Blockers
- Issue 1
- Issue 2

### Metrics
- Tests passing: X/Y
- Build status: Pass/Fail
- Coverage: X%
```

### Escalation Path

**Level 1 (Minor Issue):**
- Agent attempts resolution
- Logs in phase tracking document
- Proceeds with workaround if available

**Level 2 (Blocking Issue):**
- Agent reports to Master Agent
- Master Agent assesses impact
- Developer notified for decision

**Level 3 (Critical Blocker):**
- Developer immediately notified
- Work pauses on current phase
- Emergency team meeting
- Rollback plan activated if needed

---

## Quality Gates

### Phase Completion Criteria

Each phase must pass ALL of these gates:

#### 1. Code Quality
- [ ] TypeScript compiles with no errors
- [ ] No ESLint errors
- [ ] No deprecated imports or patterns
- [ ] Code follows SOLID principles
- [ ] File sizes < 1,200 lines

#### 2. Functionality
- [ ] All existing features work
- [ ] No regressions detected
- [ ] API endpoints respond correctly
- [ ] Authentication/authorization works

#### 3. Testing
- [ ] All existing tests pass
- [ ] New tests added for refactored code
- [ ] Coverage maintained or improved
- [ ] Integration tests pass

#### 4. Documentation
- [ ] Phase guide updated with actual implementation
- [ ] Code comments added where needed
- [ ] API changes documented
- [ ] Troubleshooting guide updated

#### 5. Performance
- [ ] Build time not degraded >10%
- [ ] Startup time not degraded >10%
- [ ] Request latency unchanged
- [ ] Memory usage comparable

---

## Risk Management

### Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Circular dependencies in DI | Medium | High | Careful interface design, use of lazy injection |
| Breaking changes during refactor | Medium | High | Maintain backward compatibility, deprecate gradually |
| Test coverage drops | Low | Medium | Write tests before refactoring |
| Performance regression | Low | Medium | Benchmark before/after each phase |
| Team capacity issues | Medium | Medium | Prioritize critical path, defer non-essential work |
| Merge conflicts | High | Low | Frequent small commits, clear branch strategy |

### Contingency Plans

**If Phase takes >20% longer than estimated:**
1. Re-evaluate remaining tasks
2. Identify tasks that can be deferred
3. Consider splitting phase into sub-phases
4. Add team capacity if available

**If critical blocker encountered:**
1. Document the issue thoroughly
2. Rollback to last stable state
3. Consult team for resolution strategy
4. Update risk register

**If tests fail after refactoring:**
1. Do NOT proceed to next phase
2. Identify root cause
3. Fix failing tests
4. Verify no regressions
5. Document the fix

---

## Phase-Specific Orchestration

### Phase 1: Infrastructure Setup
**Master Agent Actions:**
- Delegate to Phase 1 agent
- Verify TSyringe installation
- Check interface definitions
- Confirm container initialization
- **Go/No-Go Decision:** Container resolves PrismaClient successfully

### Phase 2: LLM Service Refactoring
**Master Agent Actions:**
- Assign to Phase 2 specialist agent
- Monitor provider implementations
- Verify Strategy Pattern implementation
- Check provider registration
- **Go/No-Go Decision:** All 3 providers working, switch statements eliminated

### Phase 3: Core Services Refactoring
**Master Agent Actions:**
- Coordinate multiple services (can parallelize if team size >1)
- Verify each service's DI compliance
- Check WebhookService class conversion
- Ensure no factory functions remain
- **Go/No-Go Decision:** All 8 services injectable, no global state

### Phase 4: Routes & Controllers
**Master Agent Actions:**
- Verify controller DI compliance
- Check route parameter removal
- Test API endpoints
- **Go/No-Go Decision:** All routes use container, no prisma parameters

### Phase 5: Middleware
**Master Agent Actions:**
- Verify middleware parameter removal
- Check container resolution
- Test middleware functionality
- **Go/No-Go Decision:** All middleware use container

### Phase 6: Application Bootstrap
**Master Agent Actions:**
- Verify reflect-metadata import
- Check graceful shutdown
- Test health check endpoint
- **Go/No-Go Decision:** Application starts cleanly, shutdown works

### Phase 7: Testing Infrastructure
**Master Agent Actions:**
- Coordinate test writing (can parallelize)
- Verify mock implementations
- Check test coverage
- Run full test suite
- **Go/No-Go Decision:** >80% coverage, all tests pass

---

## Success Metrics

### Quantitative Metrics

| Metric | Baseline | Target | Current |
|--------|----------|--------|---------|
| Test Coverage | 60% | >80% | - |
| Build Time | X min | <1.1X min | - |
| Startup Time | Y sec | <1.1Y sec | - |
| Lines of Code | - | <1,200 per file | - |
| Circular Dependencies | 0 | 0 | - |
| Factory Functions | 15+ | 0 | - |
| Global Instances | 10+ | 0 (except container) | - |

### Qualitative Metrics

- [ ] Code is easier to understand
- [ ] Services are easier to test
- [ ] Adding new provider takes <1 hour
- [ ] New developers can onboard faster
- [ ] Confidence in code quality increased

---

## Timeline

### Week 1
- **Day 1-2:** Phase 1 (Infrastructure Setup)
- **Day 3-5:** Phase 2 (LLM Service Refactoring)

### Week 2
- **Day 6-10:** Phase 3 (Core Services Refactoring)

### Week 3
- **Day 11-14:** Phase 4 (Routes & Controllers Refactoring)
- **Day 15-16:** Phase 5 (Middleware Refactoring)

### Week 4
- **Day 17:** Phase 6 (Application Bootstrap)
- **Day 18-20:** Phase 7 (Testing Infrastructure)

### Milestones
- **End of Week 1:** DI infrastructure + LLM Service complete
- **End of Week 2:** All services DI-compliant
- **End of Week 3:** All routes/middleware refactored
- **End of Week 4:** Testing complete, ready for production

---

## Post-Completion Activities

### Phase 7+ (After all phases complete)
1. **Code Review:** Full team review of all changes
2. **Performance Benchmarking:** Compare before/after metrics
3. **Documentation Update:** Update main README, architecture docs
4. **Team Training:** Share learnings, best practices
5. **Retrospective:** What went well? What can improve?
6. **Production Deployment:** Gradual rollout with monitoring

### Future Enhancements
- Add more LLM providers (Mistral, Cohere, etc.) - now takes <1 hour
- Implement request-scoped containers for multi-tenancy
- Add distributed tracing with DI-injected tracer
- Migrate to NestJS framework (already DI-compliant)

---

## Appendix

### Useful Commands

```bash
# Check for global instances
grep -r "const.*= new.*Client" backend/src/ --exclude-dir=node_modules

# Check for factory functions
grep -r "export function create.*Service" backend/src/

# Verify TypeScript compilation
npm run build

# Run tests with coverage
npm test -- --coverage

# Check file sizes
find backend/src -name "*.ts" -exec wc -l {} \; | sort -rn | head -20

# Verify DI container
node -e "require('./dist/container'); console.log('Container OK');"
```

### Troubleshooting

See `docs/reference/di-patterns-quick-reference.md` for common patterns and solutions.

---

## Sign-Off

### Phase Completion Sign-Off Template

```markdown
## Phase {N} Completion Report

**Phase:** {N} - {Phase Name}
**Date Completed:** {Date}
**Duration:** {X} days (Estimated: {Y} days)
**Completed By:** {Name/Agent}

### Objectives Met
- [x] Objective 1
- [x] Objective 2

### Quality Gates Passed
- [x] Code Quality
- [x] Functionality
- [x] Testing
- [x] Documentation
- [x] Performance

### Metrics
- Build Time: {X}ms
- Test Coverage: {X}%
- Tests Passing: X/Y

### Issues Encountered
1. Issue 1 - Resolution: ...
2. Issue 2 - Resolution: ...

### Recommendations for Next Phase
- Suggestion 1
- Suggestion 2

**Approved for Next Phase:** ✅ Yes / ❌ No

**Signature:** {Name}, {Date}
```

---

**Document Metadata:**
- Author: Claude Code (Master Agent)
- Version: 1.0
- Last Updated: 2025-11-05
- Status: Active
- Related: All phase guides (091-097)
