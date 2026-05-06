# Phase 1: Runtime Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 1-Runtime Foundation
**Areas discussed:** License Header Strategy, Documentation Cleanup Scope, Runtime Wiring Boundary, Startup Failure Policy, Verification Depth

---

## License Header Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| All Go files | One-time pass across app, including collectors, to close AGPL-3.0-or-later compliance | ✓ |
| cmd/api only | Smaller diff, collectors remain non-compliant | |
| Changed files only | Minimal diff, systemic requirement remains open | |

**User's choice:** All Go files.
**Notes:** User selected repository-wide Go header alignment for Phase 1.

---

## Documentation Cleanup Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Runtime mismatch only | Clean only factual runtime drift affecting Community Preview truthfulness | ✓ |
| Full honesty pass | Broader implemented/designed/future labeling across docs | |
| App docs only | Touch only app repo docs, leave moved docs as archive | |

**User's choice:** Runtime mismatch only.
**Notes:** Phase 1 should not become a full documentation audit.

---

## Runtime Wiring Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Wire existing layers only | Connect config, DB, Redis, repos/services/caches without endpoint behavior cleanup | |
| Replace obvious in-memory handlers | Also replace obvious in-memory/static handlers when existing service-backed code supports it | ✓ |
| Full backend path cleanup | Bring all legacy/static endpoints to new architecture | |

**User's choice:** Replace obvious in-memory handlers.
**Notes:** Service-backed replacement is allowed when directly related to runtime wiring and already supported by current layers.

---

## Startup Failure Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Fail fast on Postgres and Redis | API refuses startup when either dependency is unavailable | |
| Fail fast on Postgres, Redis optional | Database is mandatory; Redis can degrade with clear logging/status | ✓ |
| Degraded mode | API starts without DB/Redis and reports degraded health | |

**User's choice:** Fail fast on Postgres, Redis optional.
**Notes:** Postgres/migrations must be fail-fast; Redis fallback must not hide broken critical behavior.

---

## Verification Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Go tests + startup tests | `go test ./...` plus focused config/migration/wiring/handler tests | ✓ |
| Add Docker Compose smoke | Also run Docker Compose and health check | |
| Full local preview smoke | Docker Compose plus UI/API endpoint smoke checks | |

**User's choice:** Go tests + startup tests.
**Notes:** Docker smoke can remain optional/manual for Phase 1.

## the agent's Discretion

- Exact wiring structure and helper boundaries.
- Exact Redis fallback implementation, as long as degradation is visible.
- Exact handler adaptation approach for obvious service-backed replacements.

## Deferred Ideas

- Full backend path cleanup.
- Sandbox Inc. demo path.
- UI migration off mock data.
- Source ingestion and future raw-event architecture.
- Broad documentation honesty pass.
