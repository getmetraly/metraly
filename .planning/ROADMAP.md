# Roadmap: Metraly

**Created:** 2026-05-05
**Scope:** full product roadmap
**Nearest milestone:** Community Preview
**Canonical status source:** `../docs/STATUS.md`

## Overview

Metraly should be built in a foundation-first sequence. The first five phases produce an honest Community Preview. Later phases move through Community GA, Pro licensing, AI, plugin runtime, and Enterprise readiness.

| # | Phase | Goal | Requirements | UI Hint |
|---|-------|------|--------------|---------|
| 1 | Runtime Foundation | Make the current app stack real and internally consistent | FOUND-01..FOUND-05 | no |
| 2 | Auth And Access | Expose a usable auth/access surface | AUTH-01..AUTH-05 | partial |
| 3 | Sandbox Onboarding | Deliver first-run demo and measurable first insight | ONBD-01..ONBD-05 | yes |
| 4 | Dashboard Data Path | Replace mock dashboard flows with backend-backed data | DASH-01..DASH-06 | yes |
| 5 | Preview Ingestion | Add minimal source/metric ingestion without ClickHouse dependency | ING-01..ING-05 | partial |
| 6 | Community GA Polish | Add builder/export/alerts/docs polish | CGA-01..CGA-05 | yes |
| 7 | Licensing And Pro Gate | Implement license validation, limits, and tier UX | LIC-01..LIC-04 | yes |
| 8 | Private AI Core | Implement grounded AI and Dual-LLM safety | AI-01..AI-05 | yes |
| 9 | Plugin Runtime | Implement signed plugins and 3-tier runtime | PLUG-01..PLUG-06 | yes |
| 10 | Enterprise Readiness | Add SSO, audit, air-gap, compliance, team scoping | ENT-01..ENT-05 | partial |

## Phase 1: Runtime Foundation

**Status:** Complete (2026-05-05)

**Goal:** Make the current app stack real and internally consistent.

**Requirements:** FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05

**Success criteria:**
1. `make docker-up` starts only the intended Community Preview dependencies: API, UI, Postgres/TimescaleDB, Redis.
2. API startup applies migrations and fails clearly on migration/config/database errors.
3. `cmd/api/main.go` wires config, DB, Redis, repos, caches, services, and handlers through one dependency path.
4. README, Makefile, and moved app documentation no longer imply ClickHouse is required for the default preview.
5. Go source headers and Swagger license metadata use `AGPL-3.0-or-later`.

**Plans:**

**Wave 1**
- `01A-runtime-wiring` — Complete. Runtime composition, migrations, Redis fallback, startup tests. Covers FOUND-01, FOUND-02, FOUND-03.
- `01B-dashboard-handler` — Complete. Replace active in-memory dashboard handler path with service-backed handlers. Covers FOUND-03.
- `01C-license-headers` — Complete. Add required Go headers and align Swagger license metadata. Covers FOUND-05.

**Wave 2** *(blocked on Wave 1 completion)*
- `01D-runtime-docs` — Complete. Clean Makefile, README, CLAUDE.md, moved app docs, and run final verification. Covers FOUND-01, FOUND-04, FOUND-05.

**Cross-cutting constraints:**
- Postgres and migrations are mandatory startup dependencies; Redis is optional only with visible degraded cache behavior.
- ClickHouse must not be required for the default Community Preview runtime.
- Phase 1 must not expand into Sandbox Inc. onboarding, full dashboard data-path migration, ingestion, Pro licensing, AI, plugins, or Enterprise scope.

## Phase 2: Auth And Access

**Goal:** Expose a usable auth/access surface for preview users.

**Status:** Complete (2026-05-06)

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05

**Success criteria:**
1. User can log in with seeded/local credentials and receive access/refresh tokens.
2. Refresh token rotation works and invalid tokens are rejected.
3. Protected routes behave consistently across authenticated and unauthenticated requests.
4. Role middleware gates privileged routes with explicit tests.
5. OIDC remains optional and disabled safely by default.

## Phase 3: Sandbox Onboarding

**Status:** Complete (2026-05-06)

**Goal:** Deliver a first-run demo path that proves the product value quickly.

**Requirements:** ONBD-01, ONBD-02, ONBD-03, ONBD-04, ONBD-05

**Success criteria:**
1. Sandbox Inc. seed data creates teams, dashboards, activities, and metric points.
2. First login lands on a populated Overview dashboard.
3. Demo mode is clearly labeled as synthetic.
4. Setup wizard exists as a path from demo mode to source connection.
5. Time-to-first-insight is measurable from `docker compose up` to first meaningful dashboard/insight.

## Phase 4: Dashboard Data Path

**Goal:** Replace mock dashboard flows with backend-backed data.

**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06

**Success criteria:**
1. Dashboard definitions load from the backend API.
2. Widget/metric data loads from TimescaleDB-backed endpoints.
3. DORA/core metrics return real seeded or ingested values.
4. Dashboard CRUD/share operations use service-backed handlers, not in-memory slices.
5. Stale dashboard updates return version conflict.
6. Persona templates render in UI from backend seed/template data.

## Phase 5: Preview Ingestion

**Goal:** Add minimal source and metric ingestion without requiring ClickHouse.

**Requirements:** ING-01, ING-02, ING-03, ING-04, ING-05

**Success criteria:**
1. At least one Git provider event path can feed preview metrics.
2. At least one PM path or explicit demo substitute supports task/blocker metrics.
3. Metric aggregation writes curated points to TimescaleDB.
4. Default compose and tests pass without ClickHouse.
5. Architecture docs describe future ClickHouse raw-event role without making it current scope.

## Phase 6: Community GA Polish

**Goal:** Turn preview into a useful Community GA product surface.

**Requirements:** CGA-01, CGA-02, CGA-03, CGA-04, CGA-05

**Success criteria:**
1. Dashboard builder v1 supports basic add/move/resize workflows.
2. User can export metric data or reports.
3. At least one alert/notification channel is configurable.
4. Onboarding checklist guides users from demo to real setup.
5. Docs clearly label implemented vs designed vs future features.

## Phase 7: Licensing And Pro Gate

**Goal:** Implement the open-core commercial boundary.

**Requirements:** LIC-01, LIC-02, LIC-03, LIC-04

**Success criteria:**
1. License manager validates signed license data and defaults to Community when no license exists.
2. Service-layer feature flags and limits enforce Community/Pro boundaries.
3. UI/API explain active tier, limits, expiration, and grace period.
4. License events are auditable.

## Phase 8: Private AI Core

**Goal:** Implement trustworthy, private AI features grounded in Metraly data.

**Requirements:** AI-01, AI-02, AI-03, AI-04, AI-05

**Success criteria:**
1. AI insight output cites or references actual metric data.
2. Dual-LLM Planner/Quarantine flow handles natural-language metric questions.
3. ToolGuard blocks unsafe tool/data/network combinations.
4. Data sanitizer protects sensitive identifiers before any external LLM call.
5. AI insight tasks have evals for quality and safety.

## Phase 9: Plugin Runtime

**Goal:** Build the signed, sandboxed plugin ecosystem.

**Requirements:** PLUG-01, PLUG-02, PLUG-03, PLUG-04, PLUG-05, PLUG-06

**Success criteria:**
1. Plugin model, manifest parser, status machine, and repository exist.
2. `.mpack` signatures are verified before install.
3. Trusted Go runtime supports first-party plugins.
4. WASM runtime supports sandboxed community plugins.
5. Docker/gRPC runtime supports complex isolated plugins.
6. Marketplace UI supports install/configure/monitor/update/remove workflows.

## Phase 10: Enterprise Readiness

**Goal:** Prepare Metraly for regulated multi-team deployments.

**Requirements:** ENT-01, ENT-02, ENT-03, ENT-04, ENT-05

**Success criteria:**
1. OIDC-based enterprise SSO is productionized and tested.
2. Audit log records user, license, AI, and plugin security events.
3. Air-gapped install path is documented and verified.
4. Compliance evidence supports first regulated pilots.
5. Team scoping and advanced RBAC work for multi-team organizations.

## Coverage

- v1 requirements: 52
- mapped requirements: 52
- unmapped requirements: 0

## Next Phase

**Phase 1: Runtime Foundation** should be planned first.

Recommended next command:

```text
$gsd-plan-phase 1
```
