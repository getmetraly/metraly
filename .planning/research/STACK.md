# Research: Stack

**Defined:** 2026-05-05
**Sources:** local codebase map, `../docs/STATUS.md`, `../docs/tech/stack.md`, `README.md`

## Current Stack

- Backend: Go 1.26.1, Chi, pgx, Redis, JWT/OIDC, direct SQL.
- Frontend: React 18, Vite 5, partial TypeScript, custom UI components.
- Persistence: PostgreSQL 16 with TimescaleDB for metric time-series and dashboard/config OLTP data.
- Cache/session: Redis for cached metric/dashboard/template responses and refresh tokens.
- Deployment: Docker Compose for local Community Preview.
- Collectors: separate Go modules for Git, CI/CD, PM, and metrics sources.

## Stack Decisions For Roadmap

- Keep Community Preview on PostgreSQL/TimescaleDB + Redis only.
- Do not require a raw event store in the default preview stack.
- Preserve future raw event store option for raw event ingestion and dirty event buffering.
- Keep Go backend and React frontend; do not introduce a new primary framework for Community Preview.
- Prefer wiring existing repo/service/cache code before adding new platform abstractions.

## Known Drift

- Local README and Makefile references still need review where they describe a raw event store as if it is currently part of the default stack.
- `../docs/tech/stack.md` treats a raw event store as OLAP storage, but user decision defers it for now.
- UI dependency list is minimal and does not include drag/drop grid or chart libraries despite roadmap language around dashboard builder.

## Recommendation

Community Preview should prove the existing stack end to end before implementing Pro systems: Postgres/Timescale migrations, Redis cache/session paths, seeded demo data, real API contracts, and UI consumption of backend data.
