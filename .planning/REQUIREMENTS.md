# Requirements: Metraly

**Defined:** 2026-05-05
**Core Value:** Metraly must give teams a trustworthy self-hosted view of engineering delivery health without leaking sensitive engineering data.

## v1 Requirements

v1 here means the full planned product roadmap baseline, with Community Preview as the first milestone and later Pro/Enterprise capabilities sequenced after it.

### Foundation

- [x] **FOUND-01**: Developer can run the default local stack with API, UI, PostgreSQL/TimescaleDB, and Redis using Docker Compose.
- [x] **FOUND-02**: API startup applies embedded SQL migrations before serving application routes.
- [x] **FOUND-03**: API startup wires config, Postgres pool, Redis clients, repositories, caches, services, and handlers through one runtime path.
- [x] **FOUND-04**: README, Makefile, and moved app documentation match the actual default stack and do not require a raw event store for Community Preview.
- [x] **FOUND-05**: Every Go source file starts with the required `AGPL-3.0-or-later` SPDX header.

### Authentication And Access

- [x] **AUTH-01**: User can authenticate with local email/password credentials.
- [x] **AUTH-02**: User receives RS256 access tokens and single-use refresh tokens.
- [x] **AUTH-03**: Protected API routes reject missing or invalid credentials.
- [x] **AUTH-04**: Role middleware enforces admin, editor, viewer, and team-lead access where required.
- [x] **AUTH-05**: OIDC can be configured without affecting local auth when disabled.

### Demo And Onboarding

- [x] **ONBD-01**: First-run demo mode loads believable Sandbox Inc. data into Postgres/TimescaleDB.
- [x] **ONBD-02**: User lands on an Overview dashboard with meaningful demo metrics immediately after startup/login.
- [x] **ONBD-03**: Demo mode clearly labels synthetic data and offers a path to connect real sources.
- [x] **ONBD-04**: Setup wizard lets user select and configure initial sources for the preview flow.
- [x] **ONBD-05**: Time-to-first-insight target is measurable and documented.

### Metrics And Dashboards

- [ ] **DASH-01**: UI dashboard screens fetch dashboard definitions from backend API instead of mock-only data.
- [ ] **DASH-02**: UI dashboard widgets fetch metric/widget data from backend API instead of mock-only data.
- [ ] **DASH-03**: Backend exposes DORA and core delivery metric endpoints backed by TimescaleDB data.
- [ ] **DASH-04**: User can list, create, update, and share dashboards through service-backed API handlers.
- [ ] **DASH-05**: Dashboard updates use optimistic locking and return a conflict when the version is stale.
- [ ] **DASH-06**: Community dashboard templates exist for CTO/VP, Engineering Manager, Tech Lead, Developer, and DevOps/SRE views.

### Source Ingestion

- [ ] **ING-01**: Preview source ingestion supports at least one Git provider path for PR/commit events.
- [ ] **ING-02**: Preview source ingestion supports at least one issue/project-management path or an explicit demo substitute.
- [ ] **ING-03**: Ingested or seeded raw activity is transformed into curated TimescaleDB metric points.
- [ ] **ING-04**: A raw event store is not required in the default Community Preview deployment.
- [ ] **ING-05**: Architecture documents preserve future raw event store option for dirty/raw events feeding TimescaleDB aggregates.

### Community GA

- [ ] **CGA-01**: Dashboard builder v1 supports adding, arranging, and resizing widgets.
- [ ] **CGA-02**: User can export core metric data or reports in at least one portable format.
- [ ] **CGA-03**: User can configure at least one alert/notification channel.
- [ ] **CGA-04**: Onboarding progress checklist guides user from demo mode to real data.
- [ ] **CGA-05**: Community docs accurately distinguish implemented, designed, and future features.

### Licensing And Pro

- [ ] **LIC-01**: License manager validates signed license files and defaults safely to Community mode.
- [ ] **LIC-02**: Feature flags and limits are enforced in service-layer code.
- [ ] **LIC-03**: License status API and UI explain current tier, limits, expiry, and grace period.
- [ ] **LIC-04**: License events are auditable.

### AI

- [ ] **AI-01**: AI insight responses are grounded in database-backed metrics, not free-form hallucinated values.
- [ ] **AI-02**: Dual-LLM Planner/Quarantine architecture is implemented for natural-language metric questions.
- [ ] **AI-03**: ToolGuard prevents unsafe tool/data/network combinations.
- [ ] **AI-04**: Data sanitizer protects sensitive identifiers before any external LLM path.
- [ ] **AI-05**: Morning digest, anomaly detection, sprint risk, and build failure diagnosis have measurable evals.

### Plugins

- [ ] **PLUG-01**: Plugin domain model, manifest parser, and status machine are implemented.
- [ ] **PLUG-02**: Signed `.mpack` packages are verified before install.
- [ ] **PLUG-03**: Tier 1 Go in-process runtime supports trusted first-party plugins.
- [ ] **PLUG-04**: Tier 2 WASM runtime supports sandboxed community plugins.
- [ ] **PLUG-05**: Tier 3 Docker/gRPC runtime supports complex plugins with isolation.
- [ ] **PLUG-06**: Marketplace UI lets admin browse, install, configure, monitor, update, and remove plugins.

### Enterprise

- [ ] **ENT-01**: Enterprise auth supports SSO beyond local login, with OIDC as the first path.
- [ ] **ENT-02**: Audit log records security-relevant user, license, AI, and plugin actions.
- [ ] **ENT-03**: Air-gapped installation path is documented and tested.
- [ ] **ENT-04**: Enterprise deployment supports compliance evidence needed for first regulated pilots.
- [ ] **ENT-05**: Advanced RBAC and team scoping support multi-team organizations.

## v2 Requirements

Deferred beyond the first full roadmap baseline.

### Managed Cloud

- **CLOUD-01**: Customer can use a managed Metraly Cloud option.
- **CLOUD-02**: Customer can use BYOC or managed self-hosted deployment.

### Advanced Analytics

- **ADV-01**: System supports broader SPACE and flow metrics beyond initial DORA/delivery metrics.
- **ADV-02**: AI assistant can propose process improvements with evidence and guardrails.

### Ecosystem

- **ECO-01**: Public plugin SDK and CLI support verified third-party authors.
- **ECO-02**: Marketplace Hub supports private mirrors for air-gapped customers.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Deferred raw event store in Community Preview runtime | Deferred by user; future role is raw/dirty event storage feeding TimescaleDB aggregates |
| Individual developer scoring | Conflicts with trust, personas, and anti-surveillance positioning |
| SaaS-first architecture | Conflicts with self-hosted/privacy-first core value |
| Full Enterprise compliance before Community Preview | Requires stable product surface first |
| Black-box AI without grounding | Conflicts with privacy/trust moat and technical risk docs |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| ONBD-01 | Phase 3 | Complete |
| ONBD-02 | Phase 3 | Complete |
| ONBD-03 | Phase 3 | Complete |
| ONBD-04 | Phase 3 | Complete |
| ONBD-05 | Phase 3 | Complete |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| DASH-05 | Phase 4 | Pending |
| DASH-06 | Phase 4 | Pending |
| ING-01 | Phase 5 | Pending |
| ING-02 | Phase 5 | Pending |
| ING-03 | Phase 5 | Pending |
| ING-04 | Phase 5 | Pending |
| ING-05 | Phase 5 | Pending |
| CGA-01 | Phase 6 | Pending |
| CGA-02 | Phase 6 | Pending |
| CGA-03 | Phase 6 | Pending |
| CGA-04 | Phase 6 | Pending |
| CGA-05 | Phase 6 | Pending |
| LIC-01 | Phase 7 | Pending |
| LIC-02 | Phase 7 | Pending |
| LIC-03 | Phase 7 | Pending |
| LIC-04 | Phase 7 | Pending |
| AI-01 | Phase 8 | Pending |
| AI-02 | Phase 8 | Pending |
| AI-03 | Phase 8 | Pending |
| AI-04 | Phase 8 | Pending |
| AI-05 | Phase 8 | Pending |
| PLUG-01 | Phase 9 | Pending |
| PLUG-02 | Phase 9 | Pending |
| PLUG-03 | Phase 9 | Pending |
| PLUG-04 | Phase 9 | Pending |
| PLUG-05 | Phase 9 | Pending |
| PLUG-06 | Phase 9 | Pending |
| ENT-01 | Phase 10 | Pending |
| ENT-02 | Phase 10 | Pending |
| ENT-03 | Phase 10 | Pending |
| ENT-04 | Phase 10 | Pending |
| ENT-05 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 52 total
- Mapped to phases: 52
- Unmapped: 0

---
*Requirements defined: 2026-05-05*
*Last updated: 2026-05-05 after initialization*
