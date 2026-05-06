# Phase 4 Verification

**Status:** Draft  
**Goal:** Prove that dashboard data now comes from the backend and that the UI can reach it through a minimal auth bridge.

## Verification Gates

1. `GET /api/v1/templates` returns backend template data.
2. `GET /api/v1/dashboards` returns backend-backed dashboard definitions.
3. `GET /api/v1/dashboards/{id}` returns a real dashboard with widget layout.
4. `PUT /api/v1/dashboards/{id}` returns `409` when the version is stale.
5. `PUT /api/v1/dashboards/{id}/layout` preserves optimistic locking.
6. `PUT /api/v1/dashboards/{id}/share` updates share state through the service layer.
7. `POST /api/v1/dashboards/{id}/data` or `POST /api/v1/widgets/data` returns widget data from the backend, not `mockApi`.
8. `GET /api/v1/dora` and metric endpoints return TimescaleDB-backed values.
9. `useDashboard` and `useDashboardOverview` no longer depend on `mockApi` for the dashboard surface.
10. The frontend can authenticate well enough to load the backend dashboard surface.

## Test/Check Expectations

- backend handler tests for list/get/create/update/share/layout/templates/data;
- service tests for version conflict and template caching behavior;
- metric service tests for backend-backed timeseries and breakdowns;
- UI hook/client tests for authenticated dashboard loads;
- build verification for the UI after the mock replacement.

