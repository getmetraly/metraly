# Phase 4 Research: Dashboard Data Path

**Status:** Draft  
**Focus:** backend-backed dashboard data, metrics, templates, and minimal UI auth bridge.

## Research Summary

The dashboard experience currently splits into two realities:

1. The backend already has the right layered architecture for dashboards, metrics, templates, and caches.
2. The frontend still pulls dashboard definitions and widget data from `mockApi`.

That means Phase 4 is not about inventing a dashboard stack. It is about exposing the real stack that already exists and migrating the UI onto it.

## What Already Exists

- `DashboardRepo` supports list/get/create/update/updateLayout/updateShare/listTemplates.
- `DashboardSvc` already wraps the repo and cache layer.
- `MetricsSvc` already wraps `MetricRepo` and `MetricsCache`.
- `TemplateSvc` already wraps dashboard templates.
- `MetricRepo` already reads TimescaleDB data points and breakdowns.
- Seed data from Phase 3 already populates dashboards, templates, activity, and metric points.
- The app runtime already wires Postgres, Redis, repos, services, and seed data.

## What Is Still Mocked or Static

- Dashboard reads in the UI.
- Dashboard widget data in the UI.
- Overview metrics and insights in the UI.
- Static `dora`, `metrics`, and `insights` HTTP handlers.
- Legacy dashboard/team endpoints in `cmd/api/main.go`.

## Architectural Implication

The UI should not talk directly to the repo layer.
Instead, Phase 4 should expose a stable HTTP surface that matches the architecture docs and then move the dashboard hooks onto that surface.

The dashboard widget payloads should preserve the current shape expected by the renderer so the UI migration stays mechanical.

## Auth Finding

The backend dashboard routes are already protected in the active router.
The frontend currently has no token/session bridge, so Phase 4 needs a minimal auth-aware API client and login/session bootstrap path.

This should stay small:

- persist tokens;
- attach bearer headers;
- refresh or rehydrate the session when needed;
- allow the dashboard path to fetch real backend data.

Do not turn that into a broader auth revamp.

## Practical Path

1. Expose dashboard/template/metrics/widget routes in the backend handler layer.
2. Replace static metric and insight responses with repo/service-backed ones.
3. Add a frontend client layer that understands auth headers and backend base URLs.
4. Migrate dashboard hooks off `mockApi`.
5. Keep non-dashboard mock surfaces intact until their own phase.

