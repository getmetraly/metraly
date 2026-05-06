# Phase 2: Auth And Access - Research

**Gathered:** 2026-05-06
**Status:** Ready for planning
**Source:** Local codebase review and phase context pass

## Summary

The auth stack is already mostly present in code, but it is not exposed through the active router. The cleanest Phase 2 shape is to wire a dedicated auth handler surface around the existing `auth.Service`, keep Bearer JWT middleware on protected routes, and add explicit route tests for login, refresh, logout, and role-gated access.

## What Already Exists

- `cmd/api/auth/service.go` already implements local login, refresh, logout, and OIDC login logic.
- `cmd/api/auth/jwt.go` already signs and validates RS256 access tokens.
- `cmd/api/auth/token_store.go` already stores single-use refresh tokens in Redis.
- `cmd/api/auth/oidc.go` already builds an optional OIDC provider and verifies ID tokens.
- `cmd/api/middleware/auth.go` already enforces Bearer JWT auth and role gates.
- `cmd/api/handlers/me.go` already returns identity data from claims.
- `cmd/api/seed/runner.go` already seeds an admin user when preview seed-on-start is enabled.

## Main Gaps

- `cmd/api/main.go` does not expose `/api/v1/auth/*` routes.
- `cmd/api/main.go` does not wire auth service dependencies into the router.
- There is no HTTP handler surface for login, refresh, logout, or OIDC callback/login flows.
- Role middleware exists, but there is no strong route-level coverage showing which endpoints are protected or privileged.
- OIDC is config-aware in code, but the disabled-by-default behavior is not surfaced through active routes.

## Recommended Shape

1. Add a dedicated auth handler package that owns request parsing and response encoding.
2. Wire the auth service, token store, and optional OIDC provider through the runtime dependency path.
3. Register `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`, and the OIDC routes in the router.
4. Keep protected preview routes behind `RequireAuth` and apply `RequireRole` only where the route truly needs a role gate.
5. Make the safe default for missing OIDC config explicit and testable.

## Risks

- Refresh tokens depend on Redis, so a fake fallback would silently break token rotation.
- OIDC can easily drift into a partial implementation if the callback flow is not tied to a clear test contract.
- If route protection is only verified in service tests, it is easy to miss router regressions.

## Verification Focus

- Successful local login returns access token, refresh token, expiry, and user data.
- Refresh tokens are single-use and invalid tokens are rejected.
- Protected routes reject missing/invalid credentials.
- Role-gated routes reject forbidden roles and allow authorized roles.
- OIDC disabled-by-default behavior does not break local login.
