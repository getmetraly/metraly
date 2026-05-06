# Phase 2: Auth And Access

**Status:** Draft
**Goal:** Expose a usable auth/access surface for preview users.

## Requirements

- `AUTH-01`
- `AUTH-02`
- `AUTH-03`
- `AUTH-04`
- `AUTH-05`

## Success Criteria

1. User can log in with seeded/local credentials and receive access and refresh tokens.
2. Refresh token rotation works and invalid tokens are rejected.
3. Protected routes behave consistently across authenticated and unauthenticated requests.
4. Role middleware gates privileged routes with explicit tests.
5. OIDC remains optional and disabled safely by default.

## Execution Plan

### Wave 1: Auth Surface

**Plan file:** `02A-auth-surface-PLAN.md`

Deliver a real HTTP auth surface on top of the existing auth service.

- Add a dedicated auth handler constructor and request/response adapters.
- Wire auth dependencies through `cmd/api/main.go`.
- Register `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`, and the OIDC endpoints.
- Keep `RequireAuth` on the preview protected routes that already depend on claims.
- Add tests for local login success, invalid credentials, refresh rotation, logout, and protected-route denial.

### Wave 2: Role Gates And OIDC Safety

**Plan file:** `02B-role-and-oidc-PLAN.md`

Lock in route-level authorization and the safe default-off OIDC behavior.

- Apply `RequireRole` only where role-specific access is actually needed.
- Add explicit allowed/forbidden tests for role-gated routes.
- Make OIDC optional in runtime wiring and ensure disabled-by-default behavior does not break local auth.
- Add tests that prove the OIDC-disabled path fails closed and leaves local login intact.
- Align any route inventory docs that still describe the auth surface only as planned.

## Cross-Cutting Constraints

- Keep refresh tokens single-use and Redis-backed.
- Do not introduce in-memory token fallback behavior that would make refresh appear healthy when it is not.
- Keep local auth functional when OIDC is disabled.
- Do not expand into enterprise SSO, SCIM, audit logging, or broad multi-team policy.

## Verification Loop

Plan quality should be checked against these gates before implementation starts:

- Auth routes are reachable through the active router.
- Local login uses the existing seeded/local credential path.
- Refresh token reuse fails.
- Protected routes return 401 for missing or invalid credentials.
- Privileged routes return 403 for wrong roles.
- Missing OIDC config does not disable local auth.

## Implementation Files Likely Touched

- `cmd/api/main.go`
- `cmd/api/auth/*.go`
- `cmd/api/middleware/*.go`
- `cmd/api/handlers/*.go`
- `cmd/api/config/config.go`
- `cmd/api/seed/*.go`
- `cmd/api/router_inspection_test.go`
- `cmd/api/main_test.go`
- `cmd/api/auth/service_test.go`
- `cmd/api/middleware/auth_test.go`
- `cmd/api/handlers/handlers_test.go`

## Notes

The existing auth code is a usable base, not a rewrite target. Phase 2 should wire, expose, and harden what is already there rather than designing a new session system.
