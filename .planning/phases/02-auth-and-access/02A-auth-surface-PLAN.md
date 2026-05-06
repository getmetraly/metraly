---
phase: 2
plan: 02A-auth-surface
subsystem: api-auth-surface
tags: [auth, jwt, refresh-tokens, runtime-wiring, tests]
requires: [AUTH-01, AUTH-02, AUTH-03]
provides:
  - Public auth routes
  - Login/refresh/logout handler surface
  - Auth runtime dependency wiring
affects:
  - cmd/api/main.go
  - cmd/api/auth/*
  - cmd/api/handlers/*
  - cmd/api/middleware/*
  - cmd/api/router_inspection_test.go
tech-stack:
  added: []
  patterns: [constructor-injection, service-backed-handler, route-group-tests]
key-files:
  created:
    - cmd/api/handlers/auth.go
  modified:
    - cmd/api/main.go
    - cmd/api/main_test.go
    - cmd/api/router_inspection_test.go
    - cmd/api/handlers/handlers_test.go
    - cmd/api/auth/service_test.go
    - cmd/api/middleware/auth_test.go
key-decisions:
  - Auth request parsing belongs in a dedicated handler rather than in `main.go`.
  - Login, refresh, and logout should all use the existing `auth.Service`.
  - Refresh-token rotation must remain single-use and Redis-backed.
  - Protected preview routes should keep using Bearer JWT middleware.
requirements-completed: []
duration: "planned"
---

# Phase 2 Plan 02A: Auth Surface Summary

Build the public auth API on top of the already-implemented auth service so local login and refresh are reachable through the router.

## Tasks

| Task | Status | Intent |
|------|--------|--------|
| 02A-1 Add auth handler constructor and request adapters | Planned | Own login, refresh, logout, and OIDC HTTP parsing in one place |
| 02A-2 Wire auth dependencies through runtime composition | Planned | Pass auth service, token store, and optional OIDC provider into router setup |
| 02A-3 Register `/api/v1/auth/*` routes | Planned | Make auth endpoints visible through the active router |
| 02A-4 Protect current preview routes with the existing auth middleware | Planned | Keep `/me`, `/activity`, and dashboard routes behind Bearer JWT where appropriate |
| 02A-5 Add auth route tests | Planned | Verify login success, bad credentials, refresh rotation, logout, and unauthorized access |

## Verification

The implementation should be checked with:

- `go test ./cmd/api/auth ./cmd/api/middleware ./cmd/api/handlers ./cmd/api`
- `go test ./...`

## Acceptance Evidence

- `cmd/api/main.go` registers `/api/v1/auth/login`, `/api/v1/auth/refresh`, and `/api/v1/auth/logout`.
- Login returns an access token, refresh token, expiry, and user payload.
- Refresh token reuse fails.
- Logout consumes the refresh token.
- Protected routes still reject missing/invalid Bearer tokens.

## Deviations from Plan

None expected. This wave should stay tightly focused on exposing the existing auth service, not redesigning the session model.

## Self-Check

The phase-2 auth surface is only complete when the HTTP routes are live and the route tests prove the actual router behavior, not just the service internals.
