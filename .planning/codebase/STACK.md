# Codebase Stack

**Mapped:** 2026-05-05
**Scope:** full repository
**Project:** Metraly

## Summary

Metraly is a brownfield open-core engineering metrics platform with a Go backend, React/Vite frontend, PostgreSQL/TimescaleDB persistence, Redis caching, and separate Go collector services. The current app is an early prototype: it has real package structure, migrations, auth/cache/repo/service layers, UI screens, and collector skeletons, but several runtime paths still use in-memory or mock data.

## Languages And Runtimes

| Area | Runtime | Evidence |
|------|---------|----------|
| Backend API | Go 1.26.1 | `go.mod` |
| Frontend | React 18, Vite 5, partial TypeScript | `ui/package.json`, `ui/src/*.tsx`, `ui/src/App.jsx` |
| Collectors | Go modules per collector | `collectors/git/go.mod`, `collectors/cicd/go.mod`, `collectors/pm/go.mod`, `collectors/metrics/go.mod` |
| Infrastructure | Docker Compose | `docker-compose.yaml`, `Dockerfile`, `ui/Dockerfile` |

## Backend Dependencies

Core API dependencies from `go.mod`:

- `github.com/go-chi/chi/v5` and `github.com/go-chi/cors` for HTTP routing/CORS.
- `github.com/jackc/pgx/v5` for PostgreSQL/TimescaleDB access.
- `github.com/redis/go-redis/v9` for Redis-backed caches and refresh token storage.
- `github.com/golang-jwt/jwt/v5` for RS256 JWTs.
- `github.com/coreos/go-oidc/v3` and `golang.org/x/oauth2` for optional OIDC.
- `github.com/json-iterator/go` in response helpers.
- `github.com/rs/zerolog` is present, though the active router currently uses Chi's logger.
- `github.com/stretchr/testify` and `github.com/testcontainers/testcontainers-go` for tests.

## Frontend Dependencies

`ui/package.json` is intentionally small:

- Runtime: `react`, `react-dom`, `axios`.
- Build/dev: `vite`, `@vitejs/plugin-react`, `typescript`, React type packages.

There is no installed charting library, grid-layout library, router, state manager, or UI component library. The UI uses custom components and inline styles in files such as `ui/src/components/charts/AreaChart.tsx`, `ui/src/components/ui/Widget.tsx`, and `ui/src/features/dashboard/DashboardScreen.tsx`.

## Database And Cache

Current runtime target:

- PostgreSQL 16 with TimescaleDB image in `docker-compose.yaml`.
- Redis 7 Alpine in `docker-compose.yaml`.
- Timescale hypertable for aggregated metric points in `cmd/api/migrations/003_create_metric_data_points.sql`.

Current project decision from initialization:

- Raw/dirty event ingestion is deferred from Community Preview.
- Future architecture may add a separate raw-event store, with curated aggregates copied into TimescaleDB for API/dashboard queries.

## Build And Run Commands

Primary commands are in `Makefile`:

- `make build` builds `./cmd/api`.
- `make test` runs `go test -v ./...`.
- `make lint` runs `go vet ./...` and `staticcheck` when installed.
- `make up` starts Redis, TimescaleDB/Postgres, API, and UI.
- The old data-target command from earlier planning is stale relative to the current compose file.

## Configuration

Backend config is loaded from env in `cmd/api/config/config.go`. Important variables:

- `PORT`
- `POSTGRES_DSN`
- `REDIS_HOST`, `REDIS_PORT`
- `JWT_PRIVATE_KEY`
- `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`
- `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URL`
- `SEED_ON_START`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`
- `METRICS_CACHE_TTL`, `DASHBOARDS_CACHE_TTL`, `TEMPLATES_CACHE_TTL`

The main entry point `cmd/api/main.go` currently constructs only the JWT key manager and router. It does not yet wire config loading, database pool, Redis clients, repositories, services, migrations, or seed runner into the production server path.

## Important Stack Drift

- `README.md` still needs periodic alignment with the current compose stack and the deferred raw-event-store decision.
- `../docs/STATUS.md` is the canonical external project status; it identifies the code as an early prototype with several fully designed but unimplemented systems.
- `../docs/tech/app/docs/architecture.md` and `../docs/tech/app/BACKEND_PLAN.md` describe a more complete backend than the currently wired `cmd/api/main.go`.
- `AGENTS.md` requires Go source files to use `AGPL-3.0-or-later`; some existing Go files are missing the required SPDX header.
