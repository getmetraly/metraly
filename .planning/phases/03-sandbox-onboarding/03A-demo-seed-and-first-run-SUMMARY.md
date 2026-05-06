---
phase: 3
plan: 03A-demo-seed-and-first-run
status: complete
completed: 2026-05-06
---

# Phase 3 Plan 03A: Demo Seed And First-Run Landing Summary

## Work Completed

- Added Sandbox Inc. seed data to the backend runtime path.
- Seeded overview and role dashboards for the admin preview user.
- Seeded baseline activity events that match the Sandbox Inc. demo stories.
- Seeded deterministic metric series for the core engineering metrics used by the preview experience.
- Updated the repo dashboard insert path to be idempotent for seed reruns.

## Verification

- `go test ./...`
- `node --test ui/src/features/onboarding/firstRun.test.mjs`

## Outcome

The preview stack now has a backend seed path for Sandbox Inc. demo content, with believable dashboards, activity events, insights, and metric points available in Postgres/TimescaleDB for the first-run experience.

