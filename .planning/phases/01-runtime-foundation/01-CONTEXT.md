# Phase 1: Runtime Foundation - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 makes the current `app` stack real and internally consistent for Community Preview. It covers runtime wiring, migration startup, dependency policy, obvious service-backed handler replacement needed by wiring, documentation/runtime mismatch cleanup, and project-wide Go license headers.

This phase does not add new product capabilities beyond the existing foundation. It should not implement Sandbox Inc. demo content, dashboard UI data-path migration, source ingestion, Pro licensing, AI, plugin runtime, or Enterprise features.

</domain>

<decisions>
## Implementation Decisions

### License Header Strategy

- **D-01:** Add the required `AGPL-3.0-or-later` SPDX header to all Go files in the app repository, including `cmd/api` and all `collectors` modules.
- **D-02:** Treat this as a one-time repository hygiene pass in Phase 1, not as changed-files-only cleanup.
- **D-03:** Align Swagger license metadata with `AGPL-3.0-or-later`.

### Documentation Cleanup Scope

- **D-04:** Limit Phase 1 documentation cleanup to runtime mismatches that affect Community Preview truthfulness.
- **D-05:** Clean up raw-event-store/default stack drift in `README.md`, `CLAUDE.md`, `Makefile`, and moved app docs under `../docs/tech/app/` where those docs describe the current default runtime.
- **D-06:** Do not perform a broad "honesty pass" across all strategic docs in this phase. `../docs/STATUS.md` remains canonical when docs disagree.

### Runtime Wiring Boundary

- **D-07:** Wire existing layers into the active runtime: config, Postgres pool, migrations, Redis clients, repositories, caches, services, and handlers.
- **D-08:** Replace obvious in-memory/static handlers with service-backed handlers when doing so is directly required by runtime wiring and existing repo/service code already supports the path.
- **D-09:** Do not attempt a full backend path cleanup of all legacy/static endpoints in Phase 1. Larger endpoint/data-path cleanup belongs to later phases, especially Phase 4.

### Startup Failure Policy

- **D-10:** Postgres is mandatory. If Postgres is unavailable or migrations fail, API startup must fail fast with a clear error.
- **D-11:** Redis is optional for Phase 1 startup. If Redis is unavailable, the API may start with degraded cache/session behavior where safe, and must report/log the degraded state clearly.
- **D-12:** Do not implement a broad degraded mode that hides missing Postgres or lets the preview appear healthy without the required database.

### Verification Depth

- **D-13:** Required Phase 1 verification is `go test ./...` plus focused startup/wiring tests.
- **D-14:** Add or update tests for config, migrations/startup wiring, dependency failure behavior, and service-backed handler behavior touched by the phase.
- **D-15:** Docker Compose smoke testing is useful but not mandatory for Phase 1 completion. It can be documented as a manual/local check if available.

### the agent's Discretion

- Decide exact wiring structure and helper boundaries as long as it follows existing package patterns and keeps the active runtime clear.
- Decide exact Redis fallback mechanism, provided Postgres remains fail-fast and Redis degraded state is visible.
- Decide whether service-backed handler replacement is done by adapting current handlers or adding new handler constructors, as long as scope stays within Phase 1.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Planning

- `.planning/PROJECT.md` — Core value, constraints, and user-confirmed decisions.
- `.planning/REQUIREMENTS.md` — Phase 1 requirement IDs `FOUND-01` through `FOUND-05`.
- `.planning/ROADMAP.md` — Phase 1 goal and success criteria.
- `.planning/STATE.md` — Current workflow state and preserved decisions.

### Codebase Map

- `.planning/codebase/STACK.md` — Current stack, dependencies, config, and raw-event-store drift.
- `.planning/codebase/ARCHITECTURE.md` — Intended backend layers and missing runtime wiring.
- `.planning/codebase/INTEGRATIONS.md` — Postgres/Redis/raw-event-store integration state and API/UI integration drift.
- `.planning/codebase/CONCERNS.md` — Known high-priority issues Phase 1 addresses.
- `.planning/codebase/STRUCTURE.md` — Current app and moved documentation structure.
- `.planning/codebase/CONVENTIONS.md` — Go conventions, header requirement, workflow conventions.
- `.planning/codebase/TESTING.md` — Existing test patterns and Phase 1 coverage gaps.

### Canonical Product/Status Docs

- `../docs/STATUS.md` — Canonical source of truth for implemented vs designed vs future status.
- `../docs/decisions/2026-05-04.md` — Founder decisions, including AGPLv3, roadmap reality, and raw-event-store-related product context.
- `../docs/tech/stack.md` — Broader target stack context; do not let it override Phase 1 decision to defer a raw event store.
- `../docs/tech/app/BACKEND_PLAN.md` — Historical detailed backend plan; useful but not canonical when it conflicts with current roadmap/context.
- `../docs/tech/app/docs/architecture.md` — Historical app architecture notes.

### App Files

- `AGENTS.md` — Required Go license header and project workflow rules.
- `README.md` — Root user-facing docs retained in app; clean only runtime mismatches in this phase.
- `CLAUDE.md` — Retained agent-facing docs; clean runtime mismatches in this phase.
- `Makefile` — Developer commands, including stale raw-event-store target.
- `Dockerfile` — API image build/runtime behavior.
- `docker-compose.yaml` — Current default Community Preview service composition.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `cmd/api/config/config.go`: environment config loader already has Postgres, Redis, JWT, OIDC, seed, and cache TTL fields.
- `cmd/api/db/db.go`: Postgres pool creation helper.
- `cmd/api/db/migrate.go`: embedded SQL migration runner.
- `cmd/api/migrations/*.sql`: current schema for users, dashboards, metric points, plugins, insights, activity, refresh tokens.
- `cmd/api/cache/*.go`: Redis-backed caches for metrics, dashboards, templates.
- `cmd/api/repo/*.go`: pgx repositories for dashboard, metrics, plugins, activity, users.
- `cmd/api/biz/*.go`: service layer for dashboards, metrics, templates.
- `cmd/api/auth/*.go`: JWT key manager, auth service, token store, OIDC provider.
- `cmd/api/middleware/*.go`: auth and role middleware.
- `cmd/api/respond/respond.go`: response helper that should be preferred where handler rewiring touches responses.

### Established Patterns

- Backend packages are layer-oriented under `cmd/api`: `handlers -> biz -> repo/cache -> db/redis`.
- Tests use Go `testing` plus `testify`; integration migration tests already use Testcontainers.
- SQL is direct pgx/raw SQL rather than ORM.
- Dashboard updates already use optimistic locking in repository code.
- Current `cmd/api/main.go` is the main gap: it constructs only a `KeyManager` and registers routes, but does not wire the complete dependency graph.

### Integration Points

- `cmd/api/main.go`: primary target for runtime dependency wiring.
- `cmd/api/handlers/dashboards.go`: in-memory dashboard handler that may be replaced if service-backed wiring is straightforward.
- `Makefile`: stale raw-event-store-oriented test-data target and documentation text.
- `README.md` and `CLAUDE.md`: retained documentation with runtime mismatch risk.
- `../docs/tech/app/*`: moved app-origin docs; update only runtime mismatch claims in this phase.
- `cmd/api/main.go` Swagger annotation and docs path: align with docs move and license decision.

</code_context>

<specifics>
## Specific Ideas

- Phase 1 should prefer fixing the active runtime path over designing new architecture.
- Redis should not block local API startup if only cache behavior is affected, but auth/session impacts must be handled carefully and visibly.
- Broad docs cleanup is intentionally deferred; only runtime mismatch cleanup belongs here.
- Docker smoke can be suggested as manual verification but should not block completion unless already available and cheap.

</specifics>

<deferred>
## Deferred Ideas

- Full endpoint/data-path cleanup across legacy/static endpoints — belongs to Phase 4 Dashboard Data Path or later backend cleanup.
- Sandbox Inc. seed/demo behavior — belongs to Phase 3 Sandbox Onboarding.
- UI migration off `mockApi` — belongs to Phase 4.
- Source ingestion and future raw-event architecture — belongs to Phase 5 or later.
- Broad documentation honesty pass across all strategy/product docs — outside Phase 1.

</deferred>

---

*Phase: 1-Runtime Foundation*
*Context gathered: 2026-05-05*
