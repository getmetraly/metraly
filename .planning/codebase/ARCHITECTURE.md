# Codebase Architecture

**Mapped:** 2026-05-05
**Scope:** full repository
**Project:** Metraly

## Summary

The repository is organized as a Go API plus React UI plus standalone collector services. The intended backend architecture is layered: HTTP handlers, middleware, business services, repositories, cache, domain structs, migrations, and seed data. The current executable path only partially uses that architecture; many handlers still bypass services and return in-memory or static data.

## Main Entry Points

- API server: `cmd/api/main.go`
- API Docker image: `Dockerfile`
- UI app: `ui/src/index.jsx`, `ui/src/App.jsx`
- UI Docker image: `ui/Dockerfile`
- Git collector: `collectors/git/main.go`
- CI/CD collector: `collectors/cicd/main.go`
- PM collector: `collectors/pm/main.go`
- Metrics collector: `collectors/metrics/main.go`

## Intended Backend Layers

| Layer | Files | Role |
|-------|-------|------|
| Router/wiring | `cmd/api/main.go` | HTTP route registration and server lifecycle |
| Middleware | `cmd/api/middleware/*.go` | Auth, RBAC, request logging |
| Handlers | `cmd/api/handlers/*.go` | HTTP request/response adapters |
| Business services | `cmd/api/biz/*.go` | Use-case logic, cache/repo orchestration |
| Repositories | `cmd/api/repo/*.go` | PostgreSQL access through pgx |
| Cache | `cmd/api/cache/*.go` | Redis-backed response caches |
| Domain | `cmd/api/domain/*.go` | API/domain structs |
| Migrations | `cmd/api/migrations/*.sql` | Database schema |
| Seed | `cmd/api/seed/*.go` | Demo/bootstrap data |

## Current Runtime Data Flow

Current `cmd/api/main.go` flow:

1. Creates JWT `KeyManager`.
2. Creates Chi router with CORS, logger, recoverer.
3. Registers public endpoints such as `/api/v1/health`, `/api/v1/dora`, `/api/v1/metrics`, `/api/v1/insights`.
4. Protects only `/api/v1/dashboards`, `/api/v1/me`, and `/api/v1/activity` when a key manager is present.
5. Registers legacy public team/dashboard endpoints used by older UI flows.
6. Serves optional Swagger static files.
7. Starts HTTP server on `:8000`.

Missing in current runtime flow:

- Config loading through `cmd/api/config.Load`.
- PostgreSQL pool creation from `cmd/api/db/db.go`.
- Migration execution through `cmd/api/db/migrate.go`.
- Redis client setup.
- Repository/service dependency injection.
- Auth route registration.
- Seed runner execution.

## Database Architecture

Migrations create:

- `users`
- `dashboards`
- `dashboard_templates`
- `metric_data_points` as a Timescale hypertable
- `plugins`
- `ai_insights`
- `activity_events`
- `refresh_tokens`
- `schema_migrations`

The repository layer uses pgxpool and SQL directly. Examples:

- `cmd/api/repo/dashboard_repo.go` stores widgets/layout as JSONB and uses optimistic locking via `WHERE id=$6 AND version=$7`.
- `cmd/api/repo/metric_repo.go` queries daily buckets with `time_bucket('1 day', time)`.

## Frontend Architecture

The UI is a single-page React app without a router library. Navigation is local state in `ui/src/App.jsx`.

Main screens:

- Dashboards: `ui/src/features/dashboard/DashboardScreen.tsx`
- Dashboard wizard: `ui/src/features/dashboardWizard/DashboardWizardScreen.tsx`
- Metrics explorer: `ui/src/features/metricsExplorer/MetricsScreen.tsx`
- AI assistant: `ui/src/features/aiAssistant/AIScreen.tsx`
- Plugin marketplace: `ui/src/features/marketplace/PluginScreen.tsx`
- Onboarding wizard: `ui/src/features/onboarding/WizardScreen.tsx`

Dashboard rendering:

- `ui/src/hooks/useDashboard.ts` loads dashboard definitions and widget data.
- `ui/src/components/dashboard/DashboardRenderer.tsx` renders a dashboard.
- `ui/src/components/dashboard/widgetRegistry.tsx` maps widget types to components.

## Collector Architecture

Collectors are separate Go services and modules. The Git collector is the most concrete:

- Reads YAML config from `collectors/git/config.yaml`.
- Exposes `/webhook/github`, `/webhook/gitlab`, and `/metrics`.
- Transforms webhook payloads into generic `Event` records.
- Writes events to the current downstream sink and DLQ tables in `collectors/git/main.go`.

Planning decision: the current Community Preview roadmap should not require a raw event store in the app runtime. A future event pipeline can add one as the raw event store and keep TimescaleDB as the curated metric store.

## Architectural Tensions

- There are two backend realities: planned layered architecture and current in-memory/static handler implementation.
- UI reads mostly mock data even though backend repos/services exist.
- README/docs promise broader capabilities than the current executable app.
- A deferred raw-event-store concept appears in collector planning but not in compose.
- `../docs/STATUS.md` is more accurate than moved app README for maturity and should govern planning.

## Recommended Direction

For Community Preview, converge the app around a minimal real vertical slice:

1. Wire config, Postgres, migrations, Redis, repos, services, and seed data in `cmd/api/main.go`.
2. Replace in-memory dashboard handlers with service-backed handlers.
3. Move UI dashboard/overview hooks off `mockApi`.
4. Implement Sandbox Inc. demo data in Timescale/Postgres.
5. Keep any deferred raw-event-store out of the default compose until raw event ingestion becomes a committed phase.
