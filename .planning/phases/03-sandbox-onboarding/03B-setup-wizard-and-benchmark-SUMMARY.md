---
phase: 3
plan: 03B-setup-wizard-and-benchmark
status: complete
completed: 2026-05-06
---

# Phase 3 Plan 03B: Setup Wizard And Benchmark Path Summary

## Work Completed

- Added an explicit first-run choice screen that asks whether demo mode should be shown.
- Persisted the first-run choice in localStorage so the chosen path is restored on reload.
- Routed the demo choice to the Overview dashboard and the no-demo choice to the source setup wizard.
- Added a synthetic demo banner and setup CTA to the dashboard shell when demo mode is chosen.
- Added a setup wizard escape hatch back to demo mode.
- Added a focused unit test for the first-run choice state machine.

## Verification

- `node --test ui/src/features/onboarding/firstRun.test.mjs`
- `npm run build`

## Outcome

The first-run flow now makes the user choose demo or setup explicitly, clearly labels demo mode as synthetic, and preserves a path from demo into source setup with a measurable setup target.

