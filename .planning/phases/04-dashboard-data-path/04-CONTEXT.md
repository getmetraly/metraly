# Phase 4 Context: Dashboard Data Path

**Status:** Draft  
**Goal:** Replace mock dashboard flows with backend-backed data and add the minimum auth bridge needed for the UI to consume protected preview APIs.

## Phase Intent

Phase 4 is the point where Metraly stops pretending the dashboard experience is real.
The backend already has the core data model, repos, caches, seed data, and service layer.
The frontend still reads dashboard content through `mockApi`, which makes the product look functional without proving the real data path.

This phase should converge the app on backend-backed dashboards, metrics, templates, and dashboard widget data.
It should also add the smallest possible frontend auth/session bridge so the UI can reach the protected preview routes that already exist from Phase 2.

## Current Reality

- `ui/src/hooks/useDashboard.ts` and `ui/src/hooks/useDashboardOverview.ts` are still mock-backed.
- `ui/src/api/mockApi.ts` generates dashboard definitions, widget data, metrics, insights, and activity locally.
- `cmd/api/runtime.go` already wires `DashboardSvc`, `MetricsSvc`, and `TemplateSvc`.
- `cmd/api/repo/dashboard_repo.go` supports list, get, create, update, layout, share, and templates.
- `cmd/api/repo/metric_repo.go` reads TimescaleDB-backed metric series and breakdowns.
- `cmd/api/biz/metrics_svc.go` and `cmd/api/biz/template_svc.go` already exist.
- `cmd/api/main.go` still exposes static `dora`, `metrics`, `insights`, and legacy dashboard/team endpoints.
- `cmd/api/main.go` currently exposes only `GET/POST /api/v1/dashboards` from the real dashboard handler surface.
- The architecture docs already describe `GET /api/v1/templates`, dashboard CRUD/update/share routes, and dashboard/widget data endpoints.
- The frontend has no real API client or session bridge for dashboard traffic yet.
- The prototype login page exists in `ui/prototype/login.html`, but the live app does not yet use an equivalent auth-aware entry flow.

## What Phase 4 Is Not

- Not the auth redesign itself.
- Not enterprise SSO, SCIM, or broader role policy.
- Not collector ingestion or raw event store reintroduction.
- Not AI insight redesign.
- Not plugin runtime work.
- Not a new dashboard design system.

## Scope Boundary

Use the existing Phase 2 auth surface as the backend foundation.
Add only the minimum frontend auth/session bridge needed to load dashboard data from protected preview routes.
Do not expand auth into a new enterprise initiative.

## Likely API Surface

- `GET /api/v1/templates`
- `GET /api/v1/dashboards`
- `POST /api/v1/dashboards`
- `GET /api/v1/dashboards/{id}`
- `PUT /api/v1/dashboards/{id}`
- `POST /api/v1/dashboards/{id}/fork`
- `PUT /api/v1/dashboards/{id}/layout`
- `PUT /api/v1/dashboards/{id}/share`
- `POST /api/v1/dashboards/{id}/data`
- `POST /api/v1/widgets/data`
- `GET /api/v1/dora`
- `GET /api/v1/metrics/{metricId}`
- `GET /api/v1/metrics/{metricId}/breakdown`

## Risk Notes

- If the UI keeps using `mockApi`, Phase 4 will only look complete.
- If dashboard updates omit version checks, stale writes will silently overwrite data.
- If auth is not bridged into the UI, protected preview routes cannot be exercised end to end.
- If widget data is wired without preserving the existing widget response shape, `DashboardRenderer` will break.
