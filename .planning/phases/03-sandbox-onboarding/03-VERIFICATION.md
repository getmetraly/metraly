---
phase: 3
status: passed
verified: 2026-05-06
requirements: [ONBD-01, ONBD-02, ONBD-03, ONBD-04, ONBD-05]
---

# Phase 3 Verification

## Result

Phase 3 passes verification. The app now asks the user whether demo mode should be shown on first run, routes the demo choice to a populated Overview dashboard, labels the demo experience as synthetic, keeps a path from demo into source setup, and seeds Sandbox Inc. data into the backend runtime path.

## Evidence

| Check | Result |
|-------|--------|
| First-run explicit demo choice screen exists | PASS |
| Demo choice opens the Overview dashboard | PASS |
| Demo mode displays a synthetic-data banner and setup CTA | PASS |
| Setup wizard provides an escape hatch back to demo | PASS |
| Sandbox Inc. dashboards, activity, insights, and metric points are seeded in backend startup | PASS |
| First-useful-insight timing target is documented in the phase plan | PASS |

## Commands

| Command | Result |
|---------|--------|
| `node --test ui/src/features/onboarding/firstRun.test.mjs` | PASS |
| `npm run build` in `ui/` | PASS |
| `go test ./...` | PASS |

## Notes

The phase intentionally stops short of the Phase 4 backend dashboard data-path rewrite. The new seed path is enough to support the preview/demo experience now, while later phases can switch the UI off mock data and onto backend-backed dashboard and metric APIs.

