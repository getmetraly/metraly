# GSD State: Metraly

**Initialized:** 2026-05-05
**Current focus:** Phase 6 - Community GA Polish

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-05)

**Core value:** Metraly must give teams a trustworthy self-hosted view of engineering delivery health without leaking sensitive engineering data.
**Canonical status:** `../docs/STATUS.md`
**Nearest milestone:** Community Preview
**Roadmap scope:** Full product roadmap

## Workflow Settings

- Mode: YOLO
- Granularity: Coarse
- Execution: Parallel
- Commit planning docs: Yes
- Research: Yes
- Plan check: Yes
- Verifier: Yes
- Nyquist validation: No for coarse granularity
- Model profile: Inherit/current default

## Current Roadmap

| Phase | Status | Goal |
|-------|--------|------|
| 1 | Complete | Runtime Foundation |
| 2 | Complete | Auth And Access |
| 3 | Complete | Sandbox Onboarding |
| 4 | Complete | Dashboard Data Path |
| 5 | Complete | Preview Ingestion |
| 6 | Pending | Community GA Polish |
| 7 | Pending | Licensing And Pro Gate |
| 8 | Pending | Private AI Core |
| 9 | Pending | Plugin Runtime |
| 10 | Pending | Enterprise Readiness |

## Decisions To Preserve

- Use `../docs/STATUS.md` as source of truth when documents conflict.
- Use `AGPL-3.0-or-later`.
- Defer a raw event store for Community Preview.
- Preserve future raw event store role for dirty/raw event ingestion into TimescaleDB aggregates.
- Work in current `app/` workspace for this initialization.

## Next Action

Phase 5 execution is complete. Begin Phase 6 planning or execution:

```text
$gsd-discuss-phase 6
```

## Accumulated Context

### Roadmap Evolution

- 2026-05-05: Phase 1 discussion captured in `.planning/phases/01-runtime-foundation/01-CONTEXT.md`.
- 2026-05-05: Phase 1 research and execution plans created in `.planning/phases/01-runtime-foundation/`.
- 2026-05-05: Phase 1 execution completed; runtime wiring, service-backed dashboard route path, AGPL headers, and runtime docs cleanup implemented.
- 2026-05-06: Phase 2 discussion, research, and planning artifacts created in `.planning/phases/02-auth-and-access/`.
- 2026-05-06: Phase 2 execution completed; auth routes, role gate, auth wiring, and verification tests were implemented.
- 2026-05-06: Phase 3 discuss-phase context captured in `.planning/phases/03-sandbox-onboarding/03-CONTEXT.md`.
- 2026-05-06: Phase 3 research and plan artifacts created in `.planning/phases/03-sandbox-onboarding/`.
- 2026-05-06: Phase 3 execution completed; Sandbox Inc. seed data, first-run choice flow, demo banner, setup wizard exit, and verification artifacts were implemented.
- 2026-05-06: Phase 4 execution completed; dashboard definitions, widget data, metric endpoints, auth-aware UI loading, and shared dashboard editor flows now use backend-backed data.
- 2026-05-06: Phase 5 execution completed; preview ingestion now accepts Git and PM events, writes activity plus curated metric points, and keeps the raw event store out of the default runtime.

### Resume Points

- Stopped at: Phase 5 complete
- Resume with: `$gsd-discuss-phase 6`
