---
phase: 2
plan: 02B-role-and-oidc
status: complete
completed: 2026-05-06
---

# Phase 2 Plan 02B: Role Gates And OIDC Safety Summary

## Work Completed

- Added a real route-level privileged endpoint protected by `RequireRole("admin")`.
- Kept protected preview routes behind `RequireAuth`.
- Ensured OIDC routes fail closed by default instead of pretending to be supported.
- Wired auth service creation to Redis availability so auth does not appear healthy when refresh storage is absent.

## Verification

- Viewer token to admin route returns 403.
- Admin token to admin route returns 200.
- Missing auth service returns 503 for auth routes.
- Redis-unavailable runtime disables auth service wiring.

## Outcome

The auth surface is now policy-aware instead of just token-aware, and the safe default-off behavior for OIDC is explicit.
