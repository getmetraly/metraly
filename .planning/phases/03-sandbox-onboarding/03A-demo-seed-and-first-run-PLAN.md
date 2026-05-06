---
phase: 3
plan: 03A-demo-seed-and-first-run
subsystem: demo-first-run
tags: [onboarding, demo-data, overview, synthetic-data, tests]
requires: [ONBD-01, ONBD-02]
provides:
  - Sandbox Inc. seed data
  - Overview-first landing behavior
  - Meaningful demo dashboard content
affects:
  - ui/src/api/mockApi.ts
  - ui/src/features/dashboard/DashboardScreen.tsx
  - ui/src/hooks/useDashboard.ts
  - ui/src/features/* landing or shell wiring
tech-stack:
  added: []
  patterns: [seeded-demo-state, default-landing-route, deterministic-mock-data]
key-files:
  created: []
  modified:
    - ui/src/api/mockApi.ts
    - ui/src/features/dashboard/DashboardScreen.tsx
    - ui/src/hooks/useDashboard.ts
    - ui/src/features/dashboard/*tests*
    - ui/src/features/*landing*tests*
key-decisions:
- Demo content should be deterministic and story-driven, not random placeholder noise.
- The overview/dashboard landing path should show value after the user chooses demo mode.
- Sandbox Inc. should be the named synthetic dataset used for the preview demo.
requirements-completed: []
duration: "planned"
---

# Phase 3 Plan 03A: Demo Seed And First-Run Landing Summary

Build the synthetic demo dataset and make it the default first-run value surface.

## Tasks

| Task | Status | Intent |
|------|--------|--------|
| 03A-1 Define Sandbox Inc. seed shape in the demo layer | Planned | Encode teams, services, activities, dashboards, and metric points with coherent storyline data |
| 03A-2 Make overview/dashboard landing deterministic | Planned | Ensure the chosen demo path opens to populated Overview content rather than a blank shell |
| 03A-3 Preserve meaningful demo widgets and insights | Planned | Keep the overview/dashboard content focused on first-useful-insight proof |
| 03A-4 Mark demo data as synthetic in visible product state | Planned | Expose that the user is in demo mode, not a connected-production view |
| 03A-5 Add regression coverage for seed/landing behavior | Planned | Prove the overview path and demo content remain wired together |

## Verification

The implementation should be checked with:

- focused UI/mock-data tests for overview/dashboard rendering
- app-level tests covering default landing behavior
- any existing local verification command for the UI or full repo test pass

## Acceptance Evidence

- Sandbox Inc. data drives the overview dashboard shown to the user.
- The chosen demo path consistently opens a populated overview surface.
- The demo output is recognizably synthetic rather than masquerading as real connected data.
- The overview content remains coherent enough to support first-useful-insight claims.

## Deviations from Plan

None expected. This wave should stay centered on demo seed and landing behavior, not source integration.

## Self-Check

If the first screen still feels like a placeholder or random mock output, Phase 3 is not done.
