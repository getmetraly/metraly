# Codebase Testing

**Mapped:** 2026-05-05
**Scope:** full repository
**Project:** Metraly

## Test Command

Primary test command:

```bash
make test
```

This runs:

```bash
go test -v ./...
```

Lint command:

```bash
make lint
```

This runs `go vet ./...` and `staticcheck ./...` if `staticcheck` is installed.

## Current Test Inventory

Tests exist across backend packages and Git adapters:

- Auth JWT tests: `cmd/api/auth/jwt_test.go`
- Auth service tests: `cmd/api/auth/service_test.go`
- Middleware auth/RBAC tests: `cmd/api/middleware/auth_test.go`
- Config tests: `cmd/api/config/config_test.go`
- Cache tests: `cmd/api/cache/cache_test.go`
- Migration integration test: `cmd/api/db/migrate_test.go`
- Repository mock behavior tests: `cmd/api/repo/repo_test.go`
- Business service tests: `cmd/api/biz/*_test.go`
- Handler tests: `cmd/api/handlers/handlers_test.go`
- Router tests: `cmd/api/main_test.go`, `cmd/api/router_inspection_test.go`
- Response helper tests: `cmd/api/respond/respond_test.go`
- Seed PRNG parity tests: `cmd/api/seed/prng_test.go`
- Git adapter tests: `collectors/git/adapters/adapters_test.go`

`rg -n 'func Test' -g '*_test.go'` reports 50+ test functions.

## Test Patterns

Backend tests use:

- Standard `testing`.
- `github.com/stretchr/testify/assert` / `require`.
- `github.com/stretchr/testify/mock`.
- Local mock structs for repositories and caches.
- `httptest.ResponseRecorder` for handlers/middleware.
- Testcontainers for migration integration coverage.

Examples:

- `cmd/api/biz/dashboard_svc_test.go` validates cache hit/miss and version conflict behavior.
- `cmd/api/auth/service_test.go` validates login, refresh, logout, and OIDC login flows.
- `cmd/api/middleware/auth_test.go` validates missing/invalid/valid token handling and role enforcement.

## Integration Testing

`cmd/api/db/migrate_test.go` uses Testcontainers, so it may require Docker access. In sandboxed or CI environments this can fail if Docker is unavailable.

There is not yet a full end-to-end test that starts API + Postgres + Redis + UI and verifies the Community Preview flow.

## Frontend Testing

No frontend test framework is configured in `ui/package.json`. There is no Vitest, React Testing Library, Playwright, or Cypress setup.

For frontend phases, add browser-level verification for:

- Dashboard renders with real API data.
- Onboarding wizard flow.
- Demo/Sandbox Inc. first-run path.
- Responsive layout and no text overlap.

## Coverage Gaps

Key gaps for Community Preview:

- `cmd/api/main.go` wiring is not tested against real Postgres/Redis.
- Repository implementations have limited real database coverage outside migrations.
- UI still depends on mock API paths; no contract tests tie UI types to Go responses.
- Collector services are not tested as deployable services.
- No tests currently enforce SPDX headers across Go files.
- No tests enforce that the current compose stack remains aligned with the deferred raw-event-store decision.
- No test covers Time-to-First-Insight or the onboarding KPI from `../docs/product/onboarding.md`.

## Recommended Test Strategy

For the next roadmap:

1. Add a backend integration test that runs migrations and verifies seed data can power dashboard/metrics endpoints.
2. Add route tests for auth endpoints once wired.
3. Add UI smoke tests with Playwright after replacing mock API usage.
4. Add a license/header test to enforce `AGPL-3.0-or-later` file headers.
5. Keep unit tests around biz/repo/cache boundaries for fast feedback.
6. Mark Docker/Testcontainers tests separately if local developer ergonomics suffer.
