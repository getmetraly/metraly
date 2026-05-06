# Phase 3: Sandbox Onboarding

**Status:** Draft  
**Goal:** Deliver a first-run demo path that proves the product value quickly.

## Requirements

- `ONBD-01`
- `ONBD-02`
- `ONBD-03`
- `ONBD-04`
- `ONBD-05`

## Success Criteria

1. Sandbox Inc. seed data creates teams, dashboards, activities, and metric points.
2. First run presents an explicit choice to show demo mode or skip it.
3. Demo mode, when chosen, lands on a populated Overview dashboard.
4. Demo mode is clearly labeled as synthetic.
5. Setup wizard exists as a path from demo mode to source connection.
6. Time-to-first-insight is measurable from `docker compose up` to first meaningful dashboard/insight.

## Execution Plan

### Wave 1: Demo Seed And First-Run Landing

**Plan file:** `03A-demo-seed-and-first-run-PLAN.md`

Make the first-run experience ask the user whether to enter demo mode and then make the chosen path believable and visibly useful.

- Introduce Sandbox Inc. seed/story data that covers teams, services, activities, dashboards, and metric points.
- Make the first-run path present an explicit demo choice before entering the demo surface or skipping it.
- Keep the overview dashboard populated with meaningful metrics and insights when demo mode is chosen.
- Ensure the demo path lands on a real Overview surface instead of an empty shell or placeholder screen.
- Make the synthetic nature of the demo state explicit in the visible product surface.
- Add tests that prove the demo landing path and the seeded overview content stay wired together.

### Wave 2: Setup Wizard And Benchmark Path

**Plan file:** `03B-setup-wizard-and-benchmark-PLAN.md`

Turn the demo experience into an onboarding path with a measurable setup target.

- Make the setup wizard a full onboarding flow for initial source connection, not a stub.
- Provide an explicit demo-to-real-source transition path from the demo experience.
- Surface the synthetic/demo label in the setup journey so users understand the mode they are in.
- Add benchmark instrumentation or documented measurement hooks for time-to-first-insight.
- Add tests that cover the wizard path, the synthetic label, and the measurement-friendly first-run flow.

## Cross-Cutting Constraints

- Keep Phase 3 synthetic and demo-focused; do not introduce the backend dashboard rewrite from Phase 4.
- Do not require a raw event store for the default community preview flow.
- Do not turn the setup wizard into real source ingestion plumbing; it should guide the user toward setup, not implement the whole integration stack.
- Keep the first useful insight grounded in visible data and avoid fake placeholder commentary.
- Preserve the current app’s local/demo ergonomics so the phase remains quick to verify.

## Verification Loop

Plan quality should be checked against these gates before implementation starts:

- Sandbox Inc. seed data produces believable teams, dashboards, activities, and metric points.
- The app asks the user to choose whether demo mode should be shown on first run.
- The demo path opens to a populated Overview dashboard when chosen.
- Demo mode is clearly labeled synthetic in the visible product flow.
- The setup wizard gives the user a path from demo into real source configuration.
- Time-to-first-insight can be measured from local startup to visible product value.

## Implementation Files Likely Touched

- `ui/src/features/onboarding/WizardScreen.tsx`
- `ui/src/features/dashboardWizard/DashboardWizardScreen.tsx`
- `ui/src/features/dashboard/DashboardScreen.tsx`
- `ui/src/hooks/useDashboard.ts`
- `ui/src/api/mockApi.ts`
- `ui/src/features/aiAssistant/AIScreen.tsx`
- `ui/src/features/*` routing or shell wiring if the first-run choice path needs adjustment
- tests next to the affected UI and mock-data modules

## Notes

Phase 3 should prove product value with the current demo architecture, not replace the dashboard data model. The work is complete only when a new user can see believable Sandbox Inc. data, understand that it is synthetic, and move toward a real setup path with an explicit benchmark target.
