# Phase 3 Research: Sandbox Onboarding

**Phase:** 03 - Sandbox Onboarding  
**Status:** research complete  
**Sources:** `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/phases/03-sandbox-onboarding/03-CONTEXT.md`, `../docs/product/demo-dataset-spec.md`, `../docs/product/first-useful-insights.md`, `../docs/status/open-risks.md`, `../docs/status/technical-subsystems.md`, `ui/src/features/onboarding/WizardScreen.tsx`, `ui/src/features/dashboardWizard/DashboardWizardScreen.tsx`, `ui/src/features/dashboard/DashboardScreen.tsx`, `ui/src/hooks/useDashboard.ts`, `ui/src/api/mockApi.ts`, `ui/src/features/aiAssistant/AIScreen.tsx`

## Research Summary

Phase 3 should reuse the existing demo-oriented UI surfaces instead of inventing a new onboarding subsystem. The codebase already has:

- an onboarding wizard in `ui/src/features/onboarding/WizardScreen.tsx`;
- a dashboard-builder wizard in `ui/src/features/dashboardWizard/DashboardWizardScreen.tsx`;
- a dashboard shell that defaults to `overview` in `ui/src/features/dashboard/DashboardScreen.tsx`;
- a dashboard data hook that currently reads from `mockApi` in `ui/src/hooks/useDashboard.ts`;
- a substantial mock data layer in `ui/src/api/mockApi.ts` that already knows about overview dashboards, role dashboards, wizard widget mappings, dashboard creation, widget data, and placeholder AI output.

That makes the phase a demo-path and seed-path problem, not a data-path rewrite. The real backend-backed dashboard path belongs to Phase 4.

## Key Findings

### 1. Demo data can be anchored in the existing mock layer first

`mockApi.ts` already creates:

- an `Overview` dashboard;
- role dashboards for CTO, VP Engineering, Tech Lead, DevOps, and IC views;
- widget data for DORA, PR, CI/CD, sprint, team, AI, and recent activity surfaces;
- wizard-to-widget mappings for dashboard creation.

This means the shortest path to a first useful demo is likely to reuse the current dashboard/widget modeling and replace the fake/random feel with Sandbox Inc. storyline data and deterministic seeded outputs.

### 2. The onboarding UI already exists but is still generic

`WizardScreen.tsx` currently presents generic source selection, auth, configure, and review steps. It is useful as a structural starting point, but it does not yet reflect the Phase 3 decisions:

- the demo path should be the default after login;
- real source connection should remain an explicit path from demo;
- the wizard should be a true onboarding path, not a preference toggle.

### 3. The dashboard builder already has role/template semantics

`DashboardWizardScreen.tsx` already supports role templates and widget selection. That makes it a likely place to surface a demo-friendly setup wizard that lands users on an Overview dashboard first, then lets them move toward real sources.

### 4. First useful insight should come from visible product surfaces

`AIScreen.tsx` is still a fake chat responder. It is not a good place to satisfy ONBD-02 or ONBD-05 by itself. The phase should prioritize meaningful Overview dashboard content and measurable first-run timing rather than pretending AI chat is the core proof point.

### 5. Phase boundary is clear

The data path rewrite, backend dashboard API, optimistic locking, and backend-backed widget fetches belong to Phase 4. Phase 3 should stay focused on:

- synthetic demo data;
- first-run landing behavior;
- synthetic data labeling;
- a real setup wizard path;
- measurement of time-to-first-insight.

## Implementation Implications

- Prefer augmenting existing demo/mock flows over adding a second parallel demo stack.
- Keep Sandbox Inc. deterministic and story-driven.
- Make the overview/dashboard path feel credible immediately after login.
- Keep the wizard path able to hand off to future real-source setup without claiming full ingestion is already implemented.
- Preserve the synthetic/demo label in the product surface, not just in docs.

## Risks

- If the phase tries to build real ingestion, it will spill into Phase 5.
- If the onboarding flow stays generic, the product still reads like a prototype.
- If the insight proof remains only in docs, the "first useful insight" risk in `status/open-risks.md` stays unresolved.

