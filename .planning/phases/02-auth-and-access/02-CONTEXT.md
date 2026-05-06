# Phase 2: Auth And Access - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning
**Source:** Discuss/context pass for `gsd-plan-phase 2`

<domain>
## Phase Boundary

Phase 2 exposes a usable auth/access surface for preview users. It connects the existing JWT, refresh-token, middleware, and OIDC primitives into the active router and runtime so the app can support local login, refresh rotation, protected routes, and role checks.

This phase does not move into enterprise SSO, audit logging, SCIM, or broader multi-team policy. It is about making the already-present auth layer reachable and trustworthy in the preview stack.

</domain>

<decisions>
## Implementation Decisions

### Auth Route Surface

- **D-01:** Expose the auth API under `/api/v1/auth/*` using the existing auth package and a dedicated handler surface.
- **D-02:** Support local email/password login, refresh, and logout as first-class routes, returning access token, refresh token, expiry, and user data.

### Token Lifecycle

- **D-03:** Keep refresh tokens single-use and Redis-backed; logout consumes the refresh token and invalid tokens must be rejected.
- **D-04:** Do not fake refresh-token success with an in-memory fallback. If token storage is unavailable, auth must fail closed rather than appear functional.

### Protected Routes And Roles

- **D-05:** Keep Bearer JWT auth on protected routes and continue to use middleware for claims propagation.
- **D-06:** Apply `RequireRole` only at route boundaries that genuinely need it, and cover the role gates with explicit allowed/forbidden tests.

### OIDC Safety

- **D-07:** OIDC stays optional and disabled by default.
- **D-08:** When OIDC is disabled, local auth must still work and OIDC routes must fail closed with a clear configuration error or unavailable response.

### Seeded Local Access

- **D-09:** The seeded preview admin path remains the simplest local login path when `SEED_ON_START` is enabled, but it is a real auth path, not a bypass around auth middleware.

### the agent's Discretion

- Decide whether OIDC callback handling should bind users by `oidc_sub` immediately or keep the current email-first behavior and extend it only as required by the phase tests.
- Decide whether auth runtime wiring should treat Redis as a hard startup dependency or surface auth-route unavailability explicitly when Redis is missing.
- Decide the narrowest route set that should be role-gated in Phase 2, keeping later enterprise policy out of scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Planning

- `.planning/PROJECT.md` — Core value, constraints, and user-confirmed decisions.
- `.planning/REQUIREMENTS.md` — Phase 2 requirement IDs `AUTH-01` through `AUTH-05`.
- `.planning/ROADMAP.md` — Phase 2 goal and success criteria.
- `.planning/STATE.md` — Current workflow state and preserved decisions.

### Codebase Map

- `.planning/codebase/ARCHITECTURE.md` — Intended backend layers and current runtime gap.
- `.planning/codebase/INTEGRATIONS.md` — Auth integration status and route exposure gaps.
- `.planning/codebase/TESTING.md` — Existing auth/middleware tests and current coverage gaps.
- `.planning/codebase/STACK.md` — Current stack and auth-related dependencies.

### App Files

- `CLAUDE.md` — Route inventory and backend guidance that already names the intended auth surface.
- `cmd/api/main.go` — Current router/runtime wiring entry point.
- `cmd/api/auth/*.go` — JWT, token store, auth service, and OIDC primitives.
- `cmd/api/middleware/*.go` — Bearer auth and role middleware.
- `cmd/api/handlers/me.go` — Existing protected user-info handler.
- `cmd/api/config/config.go` — Config values for JWT, OIDC, seed, and Redis.
- `cmd/api/seed/*.go` — Seeded admin user path used for local preview login.
- `cmd/api/migrations/001_create_users.sql` — `users` schema and `app_role` enum.
- `cmd/api/migrations/007_create_refresh_tokens.sql` — Refresh-token persistence schema.
- `cmd/api/repo/user_repo.go` — User lookup methods, including `FindByOIDCSub`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `cmd/api/auth/service.go`: already implements `Login`, `Refresh`, `Logout`, and `LoginOIDC`.
- `cmd/api/auth/jwt.go`: already signs and validates RS256 access tokens.
- `cmd/api/auth/token_store.go`: already issues and consumes single-use refresh tokens in Redis.
- `cmd/api/auth/oidc.go`: already verifies ID tokens and exposes OIDC provider construction.
- `cmd/api/middleware/auth.go`: already provides Bearer auth and role middleware.
- `cmd/api/handlers/me.go`: already reads claims from request context and returns user identity.
- `cmd/api/seed/runner.go`: already seeds an admin user when preview seed-on-start is enabled.

### Established Patterns

- The app prefers constructor wiring and explicit dependency structs in `cmd/api/main.go`.
- HTTP handlers should stay thin and delegate into service or middleware layers.
- Route-level tests already exist for router behavior and middleware auth checks.
- Repository and service tests use `testing`, `testify`, and local mocks rather than framework-heavy integration harnesses.

### Integration Points

- `cmd/api/main.go`: current router does not yet expose auth routes.
- `cmd/api/main.go`: currently only passes `KeyManager` and dashboard service into the router.
- `cmd/api/auth/service.go`: service logic is ready, but it is not exposed through HTTP routes.
- `cmd/api/middleware/auth.go`: role middleware exists but is only lightly exercised.
- `cmd/api/config/config.go`: OIDC and seed settings already exist in the config surface.

</code_context>

<specifics>
## Specific Ideas

- Prefer a single auth handler constructor that owns login, refresh, logout, and OIDC endpoints rather than spreading auth request parsing across `main.go`.
- Keep response shapes consistent with `auth.TokenPair` and existing `domain.User` JSON fields.
- Use route-group tests to verify protected routes and role gates instead of relying only on unit tests in auth service code.
- Make the safe default for missing OIDC configuration visible in tests so the phase cannot accidentally regress into a partial local-login lockout.

</specifics>

<deferred>
## Deferred Ideas

- Enterprise SSO hardening beyond OIDC optionality.
- Audit logging for auth events.
- SCIM, SAML, LDAP, and advanced multi-team policy.
- Session UX polish and frontend login page work if it is not required to make the API surface honest.

</deferred>

---

*Phase: 2-Auth And Access*
*Context gathered: 2026-05-06*
