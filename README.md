# 🚀 Metraly — Open-Core Engineering Metrics Platform

**⚠️ Current Status: Local preview is wired end-to-end for seeded auth and backend-backed dashboards. Some product surfaces are still under active development.**

> **Your data, your AI, your servers — by design, not as an afterthought.**

**Metraly** is an open-core, self-hosted engineering analytics platform that helps you track team productivity, delivery performance, and developer experience — without sending your data to a third party. It brings together metrics from Git, CI/CD, and project management tools, turns them into actionable dashboards, and is being built to support AI-assisted insights on your own infrastructure.

## 🤔 Why Metraly? (vs. SaaS competitors)

Most engineering metrics tools (LinearB, Waydev, Code Climate Velocity, Swarmia, etc.) are proprietary SaaS products. They force you to ship your entire codebase and project management data to their cloud. Metraly takes a completely different approach:

| Capability | SaaS Solutions | Metraly |
| :--- | :--- | :--- |
| **Data ownership** | Your data lives on the vendor’s cloud; you’re bound by their retention policies and data processing agreements. | You host it yourself. All data stays in your PostgreSQL/Redis, on your infrastructure. Full GDPR / compliance control. |
| **Customization** | Limited to what the vendor allows. Custom metrics and dashboards often require enterprise plans. | Completely extensible. Build **custom plugins**, dashboards, and data sources using simple Go interfaces. White-label the UI. |
| **AI & LLM integration** | AI features are typically closed-source, using your data to train proprietary models (often without clear opt-out). | AI and LLM workflows are designed to run locally against your data. Bring your own LLM or use built-in lightweight models. The design keeps data inside your environment. |
| **Extensibility** | Closed ecosystems. Integrations are slow to add. | A planned plugin architecture covers data sources, widgets, and alert exporters. Plugins are intended to be written in Go or compiled to WASM and executed in a secure sandbox. |
| **Transparency** | You can't see how metrics are calculated or how data is transformed. | Open-core. Every core calculation is visible and auditable. You can fork, modify, and contribute back. |
| **Vendor lock-in** | High. Migrating historical data away is often impossible. | None. Your default Community Preview data is in PostgreSQL/TimescaleDB and Redis. Future raw event ingestion may add ClickHouse as an optional store. |

If you value data privacy, unlimited flexibility, and full control over your engineering intelligence layer — Metraly is built for you.

## ✨ Key Features & Roadmap

Metraly is being designed as the central hub for engineering productivity. Here's what you get now and what’s planned for the near future.

- **Classic metrics** – PR throughput, cycle time, deployment frequency, change failure rate, lead time for changes (DORA).
- **Team-level dashboards** – Per-team overviews, velocity trends, comparison views, and blocked work analysis.
- **Role-based perspectives** – Tailored views for individual contributors, engineering managers, and VPs of Engineering.
- **Extensible plugin system** – A planned plugin surface for custom data sources, widgets, and alert exporters.
- **AI-powered analytics** – A planned AI surface for anomaly detection, natural-language querying, and forecasting.
- **Enterprise readiness** – Planned SSO (OIDC), RBAC, audit logging, air-gapped deployment, and white-labeling.

The roadmap below outlines the major pillars currently in development or fully designed.

### Status Snapshot

**Implemented now**

- Seeded local auth and backend-backed dashboards
- Metrics explorer and dashboard editor flows
- Preview ingestion for Git and PM events
- CSV export from the metrics explorer
- Onboarding progress checklist in the setup wizard
- Local notification-channel configuration for Slack and PagerDuty

**Designed next**

- License-gated Community/Pro boundaries
- Grounded AI assistant flows
- Plugin runtime hardening and marketplace operations
- Enterprise SSO, audit, and compliance surfaces

**Future directions**

- Broader export/report formats
- Additional alert destinations and automation hooks
- Raw event store support for high-volume dirty ingestion

### 🧩 Custom Plugins

Metraly is being designed with an extensible plugin system and a **three-tier runtime** so plugin authors can pick the right trade-off between performance, isolation, and language ecosystem. The full architectural decision (ADR-001) and plugin spec live in the Metraly documentation repository.

- **Six plugin types**: data sources (Jira, GitHub, Linear, Sentry, custom HTTP), processors, AI engines, dashboard widgets, notifiers (Slack, Teams, PagerDuty), and actions (restart CI, create ticket, reassign reviewer).
- **Three execution tiers**:
  - **Tier 1 — Go in-process** for first-party connectors that need bare-metal performance.
  - **Tier 2 — WASM (via [`wazero`](https://wazero.io/))** for community plugins in Go, Rust, or AssemblyScript with built-in memory and CPU isolation.
  - **Tier 3 — Docker + gRPC** for plugins in any language (Python, TypeScript, Ruby, Java) with full process and network isolation.
- **Defense-in-depth security**: Ed25519-signed `.mpack` packages, strict manifest validation, container/sandbox isolation with CPU & memory caps, egress allow-listing, Vault-injected secrets, and a tamper-resistant audit trail for every plugin action.
- **Plugin SDK** ([`getmetraly/plugin-sdk`](https://github.com/getmetraly/plugin-sdk)) — Go and Rust SDKs plus a CLI (`metraly plugin init|build|package|publish`). SDK and CLI details are part of the broader plugin plan.
- **Marketplace Hub** (planned): a community registry to browse, install, and update plugins straight from the UI. Air-gapped deployments can mirror the Hub locally.

### 🤖 AI Features

Metraly is being designed around a transparent, self-hosted AI workflow for engineering analysis.

- **Smart insights**: The planned system will surface delivery bottlenecks, imbalanced review load, and flaky CI/CD steps with natural-language explanations.
- **AI assistant**: The planned assistant will answer questions in plain English about delivery and team performance.
- **Predictive analytics**: Future AI work may forecast sprint completion probability and highlight risky release trains before they derail.
- **BYO-LLM**: The design supports plugging in your own LLM endpoint (OpenAI-compatible) or running local models.

### 🏢 Enterprise Capabilities

For organizations rolling Metraly out to hundreds of teams, the “Enterprise” feature set is planned to cover compliant, production-grade operations.

- **Authentication & authorization**: Local seeded admin login is wired for compose-based preview; Single Sign-On via OIDC (Okta, Azure AD, Keycloak) and full RBAC (Admin, Editor, Viewer) with team-level scoping remain part of the enterprise path.
- **Audit & compliance**: An immutable activity log and exportable SIEM integration are part of the planned enterprise surface.
- **White-labeling**: White-label controls and private dashboard templates are part of the enterprise roadmap.
- **High availability**: The architecture is designed around TimescaleDB for time-series data and Kubernetes-native deployment with Helm. ClickHouse is deferred as a future raw-event ingestion option.

## 🚧 Future Directions

Beyond the immediate roadmap, we’re actively exploring several strategic initiatives:

1. **DevSecOps Scorecard** – Pull vulnerability data from Trivy, Snyk, and Semgrep. Track mean time to remediate security issues and test coverage directly alongside delivery metrics.
2. **Team Health & Gamification** – Introduce a system of positive “engineering kudos” based on healthy practices (timely code reviews, stable releases, documentation quality) to encourage the right behaviours without weaponizing metrics.
3. **Flow Metrics & Sprint Planning** – Deep monitoring of Flow Metrics (Velocity, Time, Load, Efficiency, Distribution) and calendar-aware release forecasting so teams can answer “When will this feature ship?” with confidence.
4. **Metraly Hub** – A marketplace for community-built plugins, dashboards, AI prompts, and alert templates, turning Metraly into a truly open ecosystem.

## 🐳 Quick Start (Docker Compose)

The fastest way to get a local Metraly instance up and running.

```bash
# from a fresh clone
git clone https://github.com/getmetraly/metraly.git
cd metraly
make up
```

This builds and starts the API, React UI, Postgres/TimescaleDB, and Redis in one command. The UI waits for the API healthcheck, so the first browser load should not race backend startup.

- **UI**: [http://localhost:3000](http://localhost:3000)
- **API Health**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- **Local login**: `admin@metraly.local` / `admin123`

If you want a clean stop/restart cycle:

```bash
make down
make up
```

## 🛠️ Development

### Prerequisites

- Go 1.26+
- Node.js 20+
- Docker & Docker Compose

### Common Make Commands

```bash
make help        # Show all available commands
make build       # Build the API binary
make test        # Run tests (19 tests currently)
make lint        # Run linter
make run         # Build and run API locally (without Docker)
make up          # Build and start the full Docker stack
make down        # Stop the Docker stack
make logs        # Follow Docker logs
make ps          # Show Docker service status
```

## 💻 Tech Stack

- **Backend**: Go 1.26+, Chi router, JSON‑iterator, Zerolog, OpenTelemetry (future gRPC)
- **Database**: PostgreSQL 16 + TimescaleDB (time-series). ClickHouse is deferred for future raw/dirty event ingestion feeding curated TimescaleDB aggregates.
- **Cache**: Redis 7 (metrics 5 min TTL, dashboards 30 s TTL)
- **Auth**: JWT RS256, optional OIDC, bcrypt for passwords
- **UI**: React 18, TypeScript, Vite, Recharts, custom widget system
- **Infrastructure**: Docker, Docker‑Compose, Helm (future), Kubernetes‑ready

**Backend‑to‑Frontend flow**
> The Go API stores dashboard definitions (widgets and layout) as JSONB in PostgreSQL. The UI uses the seeded local admin session, fetches dashboards via `GET /api/v1/dashboards/{id}`, deserialises them into the TypeScript `Dashboard` model, and renders each widget according to the `layout` grid. Widget-specific data is served by the backend preview surface, which dispatches widget processors through a registry and fans out data fetches in parallel.

**License header note**
> Every Go source file must begin with the SPDX‑AGPL‑3.0‑or‑later header (`// SPDX‑License-Identifier: AGPL‑3.0‑or‑later`). See `AGENTS.md` for the exact header text.

## Community
- 💬 [Discord server](https://discord.gg/XGkFfMFTV7) – help, ideas, discussions.
- 🐞 [GitHub Issues](https://github.com/getmetraly/metraly/issues) – bugs and feature requests.
- 📖 [Documentation](https://docs.metraly.io) (coming soon).

## 📜 License

This project is licensed under `AGPL-3.0-or-later`. See the [LICENSE](LICENSE) file for details.
