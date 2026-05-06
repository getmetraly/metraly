# Wave 2: Auth Bridge And UI Migration

**Status:** Draft  
**Goal:** Make the UI consume the real dashboard surface through a minimal auth-aware client layer.

## Scope

- Frontend API client for authenticated requests.
- Minimal session bootstrap/login handling.
- `useDashboard` migration off `mockApi`.
- `useDashboardOverview` migration off `mockApi`.
- Dashboard screen and overview loading against backend data.

## Work Items

1. Add or normalize a frontend API client that can attach bearer tokens and target the Go API.
2. Add a minimal auth/session flow so dashboard requests can be made against protected routes.
3. Replace dashboard definition and widget data calls in `useDashboard` with backend requests.
4. Replace overview metrics/insights/activity calls in `useDashboardOverview` with backend requests.
5. Keep the dashboard renderer contract stable during the migration.
6. Add tests that cover authenticated data loading and blocked requests when the session is missing or expired.

## Notes

This wave is intentionally narrow.
It exists to make the dashboard data path real, not to redesign auth or build enterprise login flows.

