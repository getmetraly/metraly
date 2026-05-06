# Metraly

## What This Is

Metraly is a self-hosted Engineering Intelligence platform for engineering leaders and teams that need metrics, dashboards, and AI insights without sending code or delivery metadata to a third-party SaaS. It is an open-core product: Community provides the self-hosted metrics/dashboard foundation, while Pro and Enterprise add license-gated AI, plugins, compliance, and enterprise deployment capabilities.

The current app is a brownfield early prototype with a Go API, React UI, Postgres/TimescaleDB, Redis, and collector skeletons. The canonical maturity/status source is `../docs/STATUS.md`.

## Core Value

Metraly must give teams a trustworthy self-hosted view of engineering delivery health without leaking sensitive engineering data.

## Requirements

### Validated

- ✓ The repository has a runnable Go API and React/Vite UI scaffold — existing
- ✓ Docker Compose starts the current API/UI/Postgres/Redis stack — existing
- ✓ Backend domain/repo/service/cache layers exist for dashboards, metrics, auth, and templates — existing
- ✓ PostgreSQL/TimescaleDB migrations exist for users, dashboards, metrics, plugins, insights, activity events, and refresh tokens — existing
- ✓ UI screens exist for dashboards, metrics explorer, AI assistant, marketplace, dashboard wizard, and onboarding wizard — existing
- ✓ Strategic/technical specifications exist for AI, license, plugin runtime, monetization, risks, legal, and positioning in `../docs` — existing

### Active

- [ ] Community Preview provides an honest end-to-end self-hosted demo path.
- [ ] API runtime wires config, database, migrations, Redis, repositories, services, auth, and seed data.
- [ ] UI consumes backend data for dashboard and metrics flows instead of mock-only data.
- [ ] Sandbox Inc. demo data produces meaningful first insight in under 5 minutes.
- [ ] Documentation and commands match the actual Community Preview stack.
- [ ] License metadata and Go source headers use `AGPL-3.0-or-later`.
- [ ] Full product roadmap sequences Community, Pro, Plugin, AI, and Enterprise work without losing the privacy-first core.

### Out of Scope

- Deferred raw event store in Community Preview runtime — may return later as raw/dirty event storage feeding TimescaleDB aggregates.
- Individual developer surveillance/scoring — conflicts with product trust and personas.
- Managed SaaS-first architecture — conflicts with self-hosted/privacy positioning.
- Pro AI, plugin runtime, and Enterprise compliance in the first executable phase — planned later after Community Preview foundation.

## Context

- User chose current `app/` workspace for planning, overriding the usual `.worktrees/` instruction for this initialization.
- User chose `../docs/STATUS.md` as the canonical source of truth.
- Nearest milestone is Community Preview, but roadmap scope is the whole product.
- `../docs/decisions/2026-05-04.md` records founder decisions: AGPLv3 remains, US-first market, hybrid plugin runtime, AI benchmark still needed, Developer Preview/Beta Q1'26, Pro GA Q3'26, Enterprise Q1'27.
- Codebase map lives in `.planning/codebase/`.
- Research synthesis from existing docs lives in `.planning/research/`.

## Constraints

- **License**: Use `AGPL-3.0-or-later` in source headers and planning docs — user-confirmed.
- **Canonical status**: Treat `../docs/STATUS.md` as source of truth when local README or moved app documentation disagrees — user-confirmed.
- **Storage**: Use Postgres/TimescaleDB + Redis for Community Preview; defer a raw event store — user-confirmed.
- **Product positioning**: Preserve self-hosted/privacy-first architecture — core product value.
- **Workflow**: GSD settings are YOLO, coarse granularity, parallel execution, commit docs, research, plan check, verifier — user-confirmed.
- **Tooling**: `gsd-sdk` is not available in PATH, so GSD artifacts are maintained manually in this session.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Map codebase before initialization | Existing brownfield code and no prior `.planning/` map | ✓ Good |
| Write planning docs in current `app/` workspace | User explicitly requested it | — Pending |
| Use `../docs/STATUS.md` as canonical | It reconciles docs/code maturity and roadmap truth | — Pending |
| Nearest milestone is Community Preview | Need a runnable, honest preview before Pro/Enterprise | — Pending |
| Roadmap covers full product | User wants full-product planning, not only next slice | — Pending |
| Defer raw event store | Keep Community Preview stack simpler; preserve future raw-event option | — Pending |
| Use `AGPL-3.0-or-later` | User-confirmed project license metadata target | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check -> still the right priority?
3. Audit Out of Scope -> reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-05 after initialization*
