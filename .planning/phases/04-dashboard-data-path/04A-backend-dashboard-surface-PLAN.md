# Wave 1: Backend Dashboard Surface

**Status:** Complete
**Goal:** Expose the dashboard, template, and metric data surface from the real backend services.

## Scope

- Dashboard list/get/create/update/layout/share/fork endpoints.
- Template list endpoint.
- Dashboard widget data endpoint.
- DORA and metric endpoints backed by repo/service data.
- Version conflict behavior for stale updates.

## Work Items

1. Add backend handlers for dashboard detail, update, layout update, share, fork, templates, and widget data.
2. Wire the handlers into `cmd/api/main.go`.
3. Replace static DORA/metrics/insights handlers with service-backed implementations.
4. Make dashboard widget data assembly preserve the current widget response shape.
5. Keep optimistic locking behavior visible through HTTP 409 responses.
6. Add tests for backend routes, templates, and stale update conflicts.

## Notes

This wave should not touch frontend mock removal yet.
Its job is to make the real surface available and trustworthy first.
