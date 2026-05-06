---
phase: 3
plan: 03B-setup-wizard-and-benchmark
subsystem: onboarding-benchmark
tags: [wizard, synthetic-labeling, benchmark, first-insight, tests]
requires: [ONBD-03, ONBD-04, ONBD-05]
provides:
  - Demo-to-real setup path
  - Synthetic/demo labeling
  - Time-to-first-insight measurement hook
affects:
  - ui/src/features/onboarding/WizardScreen.tsx
  - ui/src/features/dashboardWizard/DashboardWizardScreen.tsx
  - ui/src/features/dashboard/DashboardScreen.tsx
  - ui/src/features/aiAssistant/AIScreen.tsx
  - ui/src/api/mockApi.ts
  - benchmark or measurement docs
tech-stack:
  added: []
  patterns: [wizard-flow, explicit-mode-label, benchmark-hook, deterministic-demo-state]
key-files:
  created: []
  modified:
    - ui/src/features/onboarding/WizardScreen.tsx
    - ui/src/features/dashboardWizard/DashboardWizardScreen.tsx
    - ui/src/features/dashboard/DashboardScreen.tsx
    - ui/src/features/aiAssistant/AIScreen.tsx
    - ui/src/api/mockApi.ts
    - docs or benchmark notes for setup-time measurement
requirements-completed: []
duration: "planned"
---

# Phase 3 Plan 03B: Setup Wizard And Benchmark Path Summary

Turn the demo experience into a measurable onboarding flow that can transition toward real setup.

## Tasks

| Task | Status | Intent |
|------|--------|--------|
| 03B-1 Make the setup wizard a full onboarding flow | Planned | Let the user choose initial sources and see a real guided path, not a stub |
| 03B-2 Surface demo/synthetic labeling in the wizard flow | Planned | Make it obvious when the user is still in synthetic demo mode |
| 03B-3 Provide a demo-to-real transition path | Planned | Keep real source setup available from the demo flow |
| 03B-4 Add time-to-first-insight measurement hooks | Planned | Make the `<5 min` target measurable from local startup to visible value |
| 03B-5 Add regression coverage for wizard and benchmark behavior | Planned | Ensure the onboarding path and measurement assumptions do not regress silently |

## Verification

The implementation should be checked with:

- UI tests for the wizard flow and synthetic label visibility
- a benchmark or documented measurement path for first insight timing
- app-level tests that prove demo mode remains available and understandable

## Acceptance Evidence

- The wizard guides the user through a real initial source setup path.
- Demo mode is clearly labeled synthetic in the onboarding experience.
- A first-useful-insight timing path exists and targets about 5 minutes.
- The flow preserves an explicit exit from demo mode toward real setup.

## Deviations from Plan

None expected. This wave should stay focused on onboarding and measurement, not on implementing full backend ingestion.

## Self-Check

Phase 3 is not complete if the wizard is still just a decorative screen or if the first-insight target cannot be measured.

