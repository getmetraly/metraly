# Research: Architecture

**Defined:** 2026-05-05
**Sources:** `.planning/codebase/ARCHITECTURE.md`, `../docs/STATUS.md`, `../docs/tech/app/BACKEND_PLAN.md`, `../docs/tech/app/docs/architecture.md`

## Current Architecture

Metraly is structured as:

- Go API in `cmd/api`.
- React/Vite UI in `ui`.
- Go collectors in `collectors`.
- PostgreSQL/TimescaleDB + Redis runtime in `docker-compose.yaml`.
- Sibling documentation repo `../docs` as canonical strategy/status input.

The intended backend architecture is layered: handlers, middleware, business services, repositories, caches, domain structs, migrations, and seed data. The current executable server does not yet wire the complete layer stack.

## Target Community Preview Architecture

For Community Preview, the architecture should be:

```text
React UI
  -> HTTP API
  -> handlers/respond
  -> biz services
  -> repos/cache
  -> PostgreSQL/TimescaleDB + Redis
```

Collectors should either be deferred or connected through a small stable ingestion path. A raw event store should not be required in this milestone.

## Future Event Architecture

Future storage direction from user decision:

```text
Collectors/webhooks
  -> raw/dirty events in a deferred raw event store or equivalent event store
  -> normalization/aggregation jobs
  -> curated metrics in TimescaleDB
  -> API dashboards and AI insights
```

This gives room for high-volume raw ingestion later without blocking Community Preview.

## Build Order Implications

1. Backend runtime wiring comes before new features.
2. Seed/demo data comes before real onboarding polish.
3. UI must move off mock data before claiming preview readiness.
4. License, AI, and plugin systems should build on a stable API/data foundation.
5. Enterprise readiness should follow Pro core implementation, not precede it.
