# Phase 4: Dashboard Data Path

**Status:** Draft  
**Goal:** Replace mock dashboard flows with backend-backed data and add the minimum auth bridge needed for the UI to consume protected preview APIs.

## Requirements

- `DASH-01`
- `DASH-02`
- `DASH-03`
- `DASH-04`
- `DASH-05`
- `DASH-06`

## Success Criteria

1. Dashboard definitions load from the backend API.
2. Widget and metric data load from backend-backed endpoints instead of `mockApi`.
3. DORA and core delivery metrics return seeded or ingested TimescaleDB data.
4. Dashboard CRUD/share/layout operations use service-backed handlers.
5. Stale dashboard updates return a version conflict.
6. Persona templates come from backend template data, not frontend-only seed arrays.
7. The frontend can authenticate to the preview API with a minimal token/session bridge.

## Execution Plan

### Wave 1: Backend Dashboard Surface

**Plan file:** `04A-backend-dashboard-surface-PLAN.md`

Expose the real dashboard and metric surface behind the active router.

- Add handlers for dashboard detail, update, layout update, share update, fork, templates, and dashboard/widget data.
- Route `GET /api/v1/templates` through the backend template service.
- Route dashboard list/get/create/update/share/layout through the service layer instead of in-memory or static implementations.
- Replace the static DORA, metrics, and insights handlers with repository/service-backed responses.
- Preserve version conflict behavior on stale dashboard updates and layout writes.
- Keep widget data response shapes compatible with the current renderer.
- Add backend tests for template listing, dashboard CRUD/update conflicts, share behavior, and metric-backed responses.

### Wave 2: Auth Bridge And UI Migration

**Plan file:** `04B-auth-bridge-and-ui-migration-PLAN.md`

Move the UI onto the backend surface and make the preview shell auth-aware.

- Add a small frontend API client layer that can attach auth headers and talk to the Go API.
- Add login/session bootstrap in the UI using the existing auth surface, with storage and refresh handling only as needed for the dashboard flow.
- Replace `useDashboard` and `useDashboardOverview` mock calls with real dashboard/template/metric API calls.
- Keep the dashboard renderer contract stable while data moves from mock generators to backend responses.
- Make the overview and dashboard tabs load backend definitions and widget data without depending on `mockApi`.
- Add UI tests that cover authenticated dashboard loading and the no-token/expired-token behavior that blocks backend access cleanly.

## Cross-Cutting Constraints

- Use the existing Phase 2 auth surface; do not redesign auth or expand into enterprise SSO.
- Keep ClickHouse out of the default community preview data path.
- Do not change the first-run onboarding flow from Phase 3 unless it is strictly needed to reach backend-backed dashboards.
- Preserve the existing widget response shape so the renderer does not need a rewrite.
- Keep the dashboard update conflict semantics explicit and testable.
- Leave AI, plugin runtime, and collector ingestion for their own phases.

## Verification Loop

Plan quality should be checked against these gates before implementation starts:

- Dashboard lists and details come from the backend API.
- Templates come from the backend template service.
- DORA and metric endpoints use TimescaleDB-backed services.
- Dashboard update and layout update return 409 on stale versions.
- Dashboard/widget data no longer depends on `mockApi`.
- The UI can authenticate to the preview API well enough to load dashboard data.

## Implementation Files Likely Touched

- `cmd/api/main.go`
- `cmd/api/runtime.go`
- `cmd/api/handlers/dashboards.go`
- `cmd/api/handlers/dora.go`
- `cmd/api/handlers/metrics.go`
- `cmd/api/handlers/insights.go`
- `cmd/api/handlers/templates.go` or equivalent new handler file
- `cmd/api/handlers/widgets.go` or equivalent new handler file
- `cmd/api/biz/dashboard_svc.go`
- `cmd/api/biz/metrics_svc.go`
- `cmd/api/biz/template_svc.go`
- `cmd/api/repo/dashboard_repo.go`
- `cmd/api/repo/metric_repo.go`
- `cmd/api/repo/repo_test.go`
- `cmd/api/handlers/handlers_test.go`
- `cmd/api/biz/*_test.go`
- `ui/src/api/client.*` or equivalent new API client module
- `ui/src/api/endpoints/*`
- `ui/src/hooks/useDashboard.ts`
- `ui/src/hooks/useDashboardOverview.ts`
- `ui/src/features/dashboard/DashboardScreen.tsx`
- `ui/src/features/onboarding/*` only if the auth entry point needs a small adjustment
- frontend tests next to the affected hooks and client modules

## Notes

Phase 4 should make the dashboard experience real without turning into a full product rewrite.
The measure of success is simple: the same screens and interactions should now be driven by the backend, and the UI should be able to authenticate and load them without `mockApi`.

