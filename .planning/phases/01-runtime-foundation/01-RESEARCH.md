# Phase 1: Runtime Foundation - Research

**Researched:** 2026-05-05
**Status:** Complete

## RESEARCH COMPLETE

<objective>
Research how to plan Phase 1 so execution converges the active app runtime around the existing layered code instead of adding new product scope.
</objective>

## Executive Findings

Phase 1 is primarily a convergence phase. The repository already contains most foundation building blocks under `cmd/api`: config loading, Postgres pool creation, embedded migrations, Redis-backed caches, repositories, services, auth primitives, seed runner, and tests. The active executable path in `cmd/api/main.go` does not wire those pieces, so the running API still serves static or in-memory responses.

The highest-value plan should therefore focus on four tracks:

1. Runtime dependency graph and startup lifecycle.
2. Service-backed handler replacement where existing services already support it.
3. Community Preview runtime truthfulness in docs and developer commands.
4. Repository-wide Go license header compliance.

## Current Runtime Facts

### Active Entrypoint

- `cmd/api/main.go` creates only `auth.KeyManager`, `chi.Router`, route registrations, Swagger static serving, and an HTTP server.
- It does not call `config.Load`, `db.New`, `db.Migrate`, Redis setup, repo constructors, service constructors, or `seed.Runner`.
- `/api/v1/dashboards` currently calls package-level in-memory handlers from `cmd/api/handlers/dashboards.go`.
- Several legacy UI endpoints return static JSON from inline closures in `main.go`.

### Existing Building Blocks

- `cmd/api/config/config.go` has `AppConfig` fields for `PORT`, `POSTGRES_DSN`, `REDIS_HOST`, `REDIS_PORT`, JWT, OIDC, seed, and cache TTLs.
- `cmd/api/db/db.go` creates and pings a `pgxpool.Pool`.
- `cmd/api/db/migrate.go` applies embedded SQL files and records versions in `schema_migrations`.
- `cmd/api/migrations/*.sql` define current users, dashboards/templates, Timescale metric points, plugins, AI insights, activity events, and refresh tokens.
- `cmd/api/repo/*.go` has pgx repositories for users, dashboards, metrics, plugins, activity, and insights.
- `cmd/api/biz/*.go` has dashboard, metrics, and template services.
- `cmd/api/cache/*.go` has Redis cache implementations for metrics, dashboards, and templates.
- `cmd/api/auth/*.go` has JWT, refresh token store, auth service, and OIDC provider primitives.
- `cmd/api/seed/runner.go` can seed admin/plugins/insights but currently does not seed dashboards or metrics.

## Planning Implications

### Runtime Wiring

Plan execution should introduce a small runtime composition layer rather than packing all setup logic directly into `main()`. A pragmatic target is:

- `runtimeDeps` or `App` struct in `cmd/api/main.go` or a new `cmd/api/runtime.go`.
- `newRuntime(ctx, cfg)` function that creates Postgres, runs migrations, creates Redis clients, constructs repos/caches/services, and returns route dependencies plus cleanup.
- `NewRouter` should accept a dependency object instead of only `*auth.KeyManager`. To preserve tests, provide a test-friendly constructor or make nil dependency behavior explicit.

Postgres should be fail-fast. Redis should be optional for Phase 1, but cache/session degradation must be visible. Because refresh tokens use Redis, auth endpoints should not be exposed as fully functional unless Redis is available or an alternate store exists. Phase 1 can wire the Redis-backed components and keep Redis failure as a logged degraded state for cache paths, while documenting that local auth route exposure belongs to Phase 2 unless implemented safely.

### Service-backed Handlers

Dashboard service-backed paths are the obvious Phase 1 replacement because repo/service code already exists and `FOUND-03` requires one runtime path. The plan should not attempt to replace every static legacy endpoint. A focused target is:

- Add handler constructors that accept `*biz.DashboardSvc`.
- Implement list/create using `domain.CreateDashboardInput`.
- Derive `owner_id` from auth claims when present, with a safe local fallback only for unauthenticated test/dev routes if needed.
- Update handler tests from global in-memory state to mock service/repo dependencies.

Metrics/DORA service-backed endpoints can be deferred to Phase 4 unless the executor finds a small safe wiring path already present. The phase boundary explicitly says not to do full data-path cleanup.

### Redis Fallback

Existing cache interfaces do not include no-op implementations. To make Redis optional without spreading nil checks, execution should add no-op cache implementations or wrappers:

- `cache.NewNoopDashboardCache()`
- `cache.NewNoopMetricsCache()`
- `cache.NewNoopTemplateCache()`

These should return `redis.Nil` or `cache.ErrCacheMiss` on `Get` and no error on `Set`, allowing services to continue with Postgres.

### Migration and Startup Tests

Existing migration tests use Testcontainers. Phase 1 should add focused tests that do not require Docker where possible:

- Config parsing tests for default and env-derived values already exist; update if new config keys are added.
- Runtime construction tests can use dependency seams or fake functions so Postgres fail-fast and Redis-degraded behavior are testable without a full compose stack.
- Existing Testcontainers migration tests should remain the integration proof for SQL application.

### Documentation Drift

Current stale runtime references:

- `Makefile` previously set a raw event store host/port in `run`.
- `Makefile up` waits for a raw event store even though compose does not define it.
- `Makefile` previously had a test-data target that wrote into a missing runtime service.
- `README.md` previously said Docker started a raw event store and listed a raw-event service HTTP link.
- `README.md` previously described a raw event store as part of the default database stack.
- `CLAUDE.md` previously said the start command included a raw event store.

Docs should preserve the future raw event store role only as deferred ingestion architecture, not as a Community Preview dependency.

### License Compliance

No Go files currently contain the required SPDX header. There are 72 Go files under the app repository. Phase 1 should add exactly:

```go
// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors
```

at the top of every `.go` file before `package` or Swagger annotations. For `cmd/api/main.go`, the file header must precede Swagger comments, and Swagger license metadata must be changed to `// @license.name AGPL-3.0-or-later`.

## Threat Model Notes

Phase 1 touches startup, auth-adjacent middleware, CORS, Redis/session dependencies, and public route exposure.

Key risks to plan around:

- **Silent partial startup:** API appears healthy without Postgres or migrations. Mitigation: fail fast before serving routes.
- **Hidden cache/session degradation:** Redis failures silently break refresh-token/auth behavior. Mitigation: no-op caches only for cache paths; do not present unavailable auth paths as working.
- **Overbroad CORS with credentials:** current CORS allows wildcard origins and credentials. Phase 1 should at least make CORS config explicit and testable, even if strict origin policy is deferred.
- **Sensitive docs exposure:** Swagger static serving from `../docs` paths should be bounded to generated Swagger assets only.

## Recommended Plan Breakdown

### Wave 1

- Plan 01: Runtime composition and startup lifecycle.
- Plan 02: Service-backed dashboard handler path.
- Plan 03: License header compliance.

These can proceed mostly independently if the handler plan reads the runtime dependency shape before final route registration.

### Wave 2

- Plan 04: Docker/docs runtime cleanup and final verification.

This depends on runtime behavior and license metadata decisions from Wave 1.

## Validation Strategy

Required verification:

- `go test ./...`
- `go vet ./...`
- `rg -L "^// SPDX-License-Identifier: AGPL-3.0-or-later" -g '*.go'` returns no Go files, or an equivalent script confirms every Go file starts with the required header.
- `rg -n "raw event store|old test data target" README.md CLAUDE.md Makefile ../docs/tech/app -g '*.md'` shows only explicit deferred/future raw-event references, not default Community Preview runtime claims.
- Startup tests prove Postgres/migration errors block server startup.
- Handler tests prove dashboards use service/repo path rather than package-level in-memory state.

Docker Compose smoke is useful but can remain manual if local Docker is unavailable:

- `make up`
- `curl -f http://localhost:8000/api/v1/health`
- `make down`

## Out Of Scope

- Sandbox Inc. demo data and first-run onboarding.
- UI migration off mock APIs.
- Full metrics/DORA service-backed dashboard data path.
- raw event store collector rewrite.
- License manager or Pro feature gates.
- AI, plugin runtime, and Enterprise readiness.
