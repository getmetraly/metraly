---
phase: 2
plan: 02B-role-and-oidc
subsystem: api-access-policy
tags: [rbac, oidc, middleware, config, tests]
requires: [AUTH-04, AUTH-05]
provides:
  - Route-level role enforcement
  - Safe default-off OIDC behavior
  - Authorization regression tests
affects:
  - cmd/api/main.go
  - cmd/api/middleware/*
  - cmd/api/auth/*
  - cmd/api/handlers/*
  - cmd/api/config/*
  - cmd/api/main_test.go
tech-stack:
  added: []
  patterns: [route-group-tests, policy-middleware, config-gated-runtime]
key-files:
  created: []
  modified:
    - cmd/api/main.go
    - cmd/api/main_test.go
    - cmd/api/middleware/auth.go
    - cmd/api/middleware/auth_test.go
    - cmd/api/auth/oidc.go
    - cmd/api/auth/service.go
    - cmd/api/auth/service_test.go
    - CLAUDE.md
    - README.md
key-decisions:
  - `RequireRole` should gate only genuinely privileged routes.
  - OIDC stays optional and must fail closed when disabled.
  - Local auth must remain usable even when OIDC config is absent.
  - If OIDC binding is expanded, preserve user identity stability through `oidc_sub` rather than creating duplicate users.
requirements-completed: []
duration: "planned"
---

# Phase 2 Plan 02B: Role Gates And OIDC Safety Summary

Harden the auth surface so role checks are explicit and OIDC can be turned off without breaking preview login.

## Tasks

| Task | Status | Intent |
|------|--------|--------|
| 02B-1 Apply role middleware at route boundaries | Planned | Add `RequireRole` only where the route genuinely needs admin/editor/team-lead gating |
| 02B-2 Add positive and negative role tests | Planned | Prove allowed roles pass and forbidden roles fail |
| 02B-3 Make OIDC config-gated | Planned | Keep OIDC optional and disabled by default without interfering with local auth |
| 02B-4 Cover the OIDC-disabled path with tests | Planned | Verify fail-closed behavior when issuer/client config is absent |
| 02B-5 Align auth docs with the implemented surface | Planned | Remove any ambiguity between intended and active auth routes if needed |

## Verification

The implementation should be checked with:

- `go test ./cmd/api/middleware ./cmd/api/auth ./cmd/api`
- `go test ./...`

## Acceptance Evidence

- Routes that require elevated access return 403 for forbidden roles.
- Routes that do not need roles remain usable with standard Bearer auth.
- OIDC disabled-by-default does not prevent local email/password login.
- Tests cover the config-off path so the behavior cannot regress silently.

## Deviations from Plan

None expected. This wave should stay focused on policy and safety, not on broad enterprise auth expansion.

## Self-Check

Phase 2 is not complete until the OIDC-off path is explicit and tested, because that is the easiest place for the preview auth surface to regress into a partial state.
