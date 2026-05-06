# Research Summary

**Defined:** 2026-05-05
**Canonical status source:** `../docs/STATUS.md`

## Key Findings

**Stack:** Go API, React/Vite UI, PostgreSQL/TimescaleDB, Redis, Docker Compose. A raw event store is deferred for Community Preview but remains a future raw-event storage candidate.

**Current maturity:** early prototype with strong architecture docs. Some backend layers and UI screens exist, but runtime wiring and data flow are incomplete.

**Table stakes:** installable self-hosted preview, believable demo data, real dashboard/metrics API, onboarding path, privacy posture, and honest docs.

**Differentiators:** self-hosted by architecture, Dual-LLM AI security, and 3-tier plugin runtime. These are strategic moats but mostly future implementation.

**Watch out for:** mock data drift, raw-event-store confusion, license metadata inconsistency, missing Go headers, incomplete runtime wiring, and overbuilding Pro before Community Preview.

## Roadmap Consequence

The roadmap should cover the full product but start with Community Preview foundation phases. Pro and Enterprise phases should be explicitly sequenced after the self-hosted dashboard loop is real.
