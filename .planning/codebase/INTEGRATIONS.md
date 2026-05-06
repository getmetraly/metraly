# Codebase Integrations

**Mapped:** 2026-05-05
**Scope:** full repository
**Project:** Metraly

## Summary

The current codebase models integrations for source control, CI/CD, project management, metrics, auth, databases, cache, and future plugins. Most external integrations are skeletal or mock-backed today. The nearest Community Preview path should focus on a small set of real source connections and a reliable demo path rather than implementing the full strategic integration catalog at once.

## Runtime Infrastructure

| Integration | Current Status | Evidence |
|-------------|----------------|----------|
| PostgreSQL/TimescaleDB | Present in compose and migrations | `docker-compose.yaml`, `cmd/api/migrations/*.sql` |
| Redis | Present in compose and cache/token code | `docker-compose.yaml`, `cmd/api/cache/*.go`, `cmd/api/auth/token_store.go` |
| Raw event store (deferred) | Collector code references future raw-event ingestion, compose does not run it | `collectors/git/main.go`, planning docs |
| Docker Compose | Primary local deployment | `docker-compose.yaml` |

## Auth Integrations

Implemented or partially implemented:

- Local email/password auth with bcrypt in `cmd/api/auth/service.go`.
- RS256 JWT signing/validation in `cmd/api/auth/jwt.go`.
- Refresh token store backed by Redis in `cmd/api/auth/token_store.go`.
- Optional OIDC provider setup in `cmd/api/auth/oidc.go`.
- Auth middleware and role middleware in `cmd/api/middleware/auth.go`.

Gaps:

- `cmd/api/main.go` does not expose login/refresh/logout/OIDC routes.
- The router constructs only a `KeyManager`; it does not wire auth service dependencies.
- Enterprise SAML/LDAP/SCIM are documented in `../docs/STATUS.md` as future work, not present in code.

## Source Collectors

Collector services live under `collectors/` as separate Go modules:

- Git: `collectors/git/`
- CI/CD: `collectors/cicd/`
- Project management: `collectors/pm/`
- Metrics: `collectors/metrics/`
- Shared retry helper: `collectors/shared/retry/retry.go`

Adapters present:

- GitHub and GitLab: `collectors/git/adapters/github.go`, `collectors/git/adapters/gitlab.go`
- GitHub Actions, GitLab CI, Jenkins: `collectors/cicd/adapters/*.go`
- Jira, Linear, Asana, Trello: `collectors/pm/adapters/*.go`
- Prometheus: `collectors/metrics/adapters/prometheus.go`

The Git collector has webhook handlers for GitHub and GitLab in `collectors/git/main.go` and exports Prometheus metrics. Other collectors are mostly structural skeletons.

## API/UI Integration

Current frontend integration state:

- `ui/src/hooks/useDashboard.ts` and `ui/src/hooks/useDashboardOverview.ts` still use `ui/src/api/mockApi.ts`.
- `ui/src/api/endpoints/dora.ts` and `ui/src/api/endpoints/dora.js` indicate an API endpoint direction, but UI usage remains mixed.
- `cmd/api/handlers/dashboards.go` uses in-memory dashboard state, while repository-backed dashboard code exists separately in `cmd/api/repo/dashboard_repo.go` and `cmd/api/biz/dashboard_svc.go`.

Near-term integration risk:

- There are parallel API surfaces: mock UI API, public legacy API endpoints, in-memory handlers, and repository/service code. Community Preview should collapse these into one consistent backend contract.

## Plugin And Marketplace Integrations

Current code:

- Minimal plugin domain/repo exists in `cmd/api/domain/plugins.go` and `cmd/api/repo/plugin_repo.go`.
- UI marketplace screen exists at `ui/src/features/marketplace/PluginScreen.tsx`.

Canonical docs:

- `../docs/tech/plugin-system.md`
- `../docs/product/plugin-system.md`
- `../docs/tech/plugin-runtime-decision.md`

Actual plugin runtime, `.mpack`, signatures, WASM, Docker/gRPC, SDK, and Marketplace Hub are future work.

## AI Integrations

Current code:

- AI assistant screen exists at `ui/src/features/aiAssistant/AIScreen.tsx`.
- API insight handler exists at `cmd/api/handlers/insights.go`.
- AI insight migration exists at `cmd/api/migrations/005_create_ai_insights.sql`.

Canonical docs:

- `../docs/tech/ai-system.md`
- `../docs/tech/ai-insights-system.md`

Planner/Quarantine LLM, ToolGuard, DataSanitizer, audit events, Ollama/OpenAI-compatible providers, and insight generation are not implemented in the app code.

## External Documentation Repository

`../docs` is a separate git repository and currently acts as the product/strategy/tech status source. User decision: `../docs/STATUS.md` is canonical for project status.

Important docs consumed by planning:

- `../docs/STATUS.md`
- `../docs/decisions/2026-05-04.md`
- `../docs/product/roadmap.md`
- `../docs/product/onboarding.md`
- `../docs/product/personas.md`
- `../docs/tech/stack.md`
- `../docs/tech/ai-system.md`
- `../docs/tech/license-system.md`
- `../docs/tech/plugin-system.md`

## Integration Decisions For Planning

- Community Preview should defer the raw-event store in the runnable app.
- TimescaleDB should be the near-term metrics query store.
- A future raw event store remains a candidate for dirty ingestion buffers.
- `../docs/STATUS.md` should drive roadmap truth when moved app docs disagree.
