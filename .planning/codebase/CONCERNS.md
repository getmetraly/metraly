# Codebase Concerns

**Mapped:** 2026-05-05
**Scope:** full repository
**Project:** Metraly

## Summary

The main risk is not lack of design; the project has extensive design in `../docs`. The risk is implementation drift: README/docs, backend layers, UI mock data, collectors, and compose describe different maturity levels. Community Preview should prioritize convergence into one runnable, honest, real-data slice.

## High Priority Concerns

### 1. Runtime Wiring Is Incomplete

`cmd/api/main.go` does not wire:

- `cmd/api/config.Load`
- Postgres pool from `cmd/api/db/db.go`
- migrations from `cmd/api/db/migrate.go`
- Redis clients/caches
- repository implementations
- business services
- seed runner
- auth service routes

Impact: repository/service code can pass unit tests while the actual server still serves static or in-memory responses.

### 2. UI Still Uses Mock Data

Files such as `ui/src/hooks/useDashboard.ts`, `ui/src/hooks/useDashboardOverview.ts`, and `ui/src/api/mockApi.ts` keep the dashboard experience mock-backed.

Impact: Community Preview can look functional while not proving the backend data path.

### 3. Multiple Dashboard Implementations

`cmd/api/handlers/dashboards.go` uses package-level in-memory state, while `cmd/api/repo/dashboard_repo.go` and `cmd/api/biz/dashboard_svc.go` implement database-backed patterns.

Impact: behavior, tests, and UI expectations can diverge.

### 4. Deferred Raw Event Store Drift

A future raw-event store is referenced in:

- `README.md`
- `collectors/git/main.go`

But `docker-compose.yaml` starts Redis, Postgres/TimescaleDB, API, and UI only.

User decision: keep raw/dirty event ingestion out of Community Preview. Future option: add a separate raw-event store and aggregate into TimescaleDB.

### 5. License Header Non-Compliance

`AGENTS.md` requires every Go source file to start with the `AGPL-3.0-or-later` SPDX header. Existing Go files generally do not have the required header.

Impact: repository violates its own licensing convention and creates recurring review noise.

### 6. Swagger License Drift

User decision: canonical SPDX is `AGPL-3.0-or-later`. Current `cmd/api/main.go` uses Swagger annotation `AGPL-3.0-only`.

Impact: license metadata conflicts with project instruction.

### 7. Canonical Status Lives Outside App Repo

The user confirmed `../docs/STATUS.md` as canonical. Local README and app-origin docs under `../docs/tech/app/` may disagree.

Impact: future agents may plan from stale README or moved app docs unless `.planning/PROJECT.md` points to `../docs/STATUS.md`.

## Medium Priority Concerns

### 8. Repository Code Ignores Some JSON Errors

`cmd/api/repo/dashboard_repo.go` ignores `json.Unmarshal` and `json.Marshal` errors in several places.

Impact: corrupt dashboard JSON can silently become zero-value state or writes can fail unclearly.

### 9. Auth Surface Is Partial

Auth core exists, but API routes are not fully exposed in `cmd/api/main.go`. Login, refresh, logout, and OIDC endpoints from `../docs/tech/app/BACKEND_PLAN.md` are absent from the active router.

Impact: protected endpoints exist without a complete user-facing auth flow.

### 10. Collector Shutdown And Connection Patterns

`collectors/git/main.go` writes each saved event through a direct collector sink path and uses `context.Background()` inside `saveEvent`. The HTTP server is not gracefully shut down through the root context.

Impact: inefficient ingestion and harder graceful shutdown once collectors are productionized.

### 11. Makefile Has Stale Targets

An old data-target command still appears in historical planning context even though it no longer matches current compose.

Impact: developer onboarding commands can fail or mislead.

### 12. Frontend Has No Test Harness

`ui/package.json` has no test scripts or browser automation.

Impact: UI-heavy phases need manual verification until a test harness is added.

## Security Concerns

- CORS allows `AllowedOrigins: []string{"*"}` with `AllowCredentials: true` in `cmd/api/main.go`, which is risky for authenticated endpoints.
- Swagger/static docs serve from `../docs/tech/app/docs/swagger` or `../docs/swagger`; ensure no sensitive docs are accidentally exposed.
- OIDC and refresh token handling need full route-level integration tests before exposure.
- Plugin and AI systems are security-sensitive but currently unimplemented; follow `../docs/risks/technical-risks-and-mitigations.md` when planning those phases.

## Product/Planning Concerns

- `../docs/product/roadmap.md` dates are older than current decisions in `../docs/decisions/2026-05-04.md`; user chose `../docs/STATUS.md` as canonical, so roadmap generation should reconcile through STATUS.
- Community Preview should be scoped to prove the core loop: install, seed/demo, connect source or simulate source, view meaningful metrics/dashboard, and understand privacy posture.
- Full Pro/Enterprise roadmap can be planned, but implementation should start with the Community Preview foundation.

## Immediate Remediation Candidates

1. Align license annotations and Go file headers to `AGPL-3.0-or-later`.
2. Wire `cmd/api/main.go` through config, db, migrations, Redis, repos, services, and seed data.
3. Replace in-memory dashboard handlers with service-backed handlers.
4. Replace UI mock data for dashboard overview with real API endpoints.
5. Implement Sandbox Inc. seed data in Postgres/TimescaleDB.
6. Update README/Makefile to reflect raw-event-store deferral.
7. Add backend integration and frontend smoke tests for the Community Preview path.
