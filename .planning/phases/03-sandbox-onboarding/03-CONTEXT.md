# Phase 3 Context: Sandbox Onboarding

**Phase:** 03 - Sandbox Onboarding  
**Status:** context captured after discuss-phase  
**Source of truth:** `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `../docs/product/demo-dataset-spec.md`, `../docs/product/first-useful-insights.md`, `../docs/status/open-risks.md`, `../docs/status/technical-subsystems.md`

## Purpose

Phase 3 exists to make first run feel real quickly. The goal is not generic onboarding polish. The goal is to get a new user into believable Sandbox Inc. data, a meaningful Overview dashboard, and at least one first useful insight with a measurable path to a setup target.

## Decisions Locked

1. **First-run default**
   - The app should ask the user whether to show demo mode or not on first run.
   - The user must make an explicit choice before entering demo or skipping it.
   - Real source connection remains available as an explicit path from the demo flow.

2. **Setup wizard scope**
   - The setup wizard is a full onboarding path for initial source configuration.
   - It should not be reduced to a lightweight stub that only records a preference.
   - The wizard must let the user move from synthetic demo data toward real source connection.

3. **Time-to-first-insight target**
   - The project should treat **5 minutes** as the target for time-to-first-insight.
   - This phase must make the measurement path explicit, even if the benchmark result is still being established.
   - The metric should be measured from `docker compose up` to the first meaningful dashboard or insight being visible.

## Canonical Inputs

### Roadmap and requirements

- `ONBD-01`: first-run demo mode loads believable Sandbox Inc. data into Postgres/TimescaleDB.
- `ONBD-02`: user lands on an Overview dashboard with meaningful demo metrics immediately after startup/login.
- `ONBD-03`: demo mode clearly labels synthetic data and offers a path to connect real sources.
- `ONBD-04`: setup wizard lets user select and configure initial sources for the preview flow.
- `ONBD-05`: time-to-first-insight target is measurable and documented.

### Product docs

- `../docs/product/demo-dataset-spec.md` defines Sandbox Inc. as the synthetic dataset and requires coherent storylines, deterministic setup, and safe demo content.
- `../docs/product/first-useful-insights.md` defines what counts as a useful insight and what baseline insights the demo data must support.
- `../docs/status/open-risks.md` identifies "First useful insight not proven" as a critical risk and points to demo data plus setup benchmark work as the next action.
- `../docs/status/technical-subsystems.md` treats demo dataset and first useful insight as designed/spec'd work that still needs proof in the app.

## Implementation Boundaries

- Keep the scope within Sandbox Onboarding. Do not drift into the dashboard data-path rewrite from Phase 4.
- Demo data should be synthetic only. No real company, developer, or incident data.
- The onboarding flow should prove product value, not add new product surface area such as search, comments, or collaboration.
- The phase should make the demo mode visibly synthetic and easy to exit into real setup.

## Specifics To Preserve

- Sandbox Inc. is the working dataset name.
- The dataset should support team-level stories rather than individual blame.
- The first useful insight must be evidence-backed and actionable, not a fake KPI card or generic welcome message.
- The Overview dashboard is the first post-login value surface.
- The demo experience should be user-selected, with real source setup available from it.

## Deferred Ideas

- This phase does not add new dashboard capabilities beyond what is needed to make first-run value visible.
- More advanced source onboarding, broader ingestion, and backend-backed dashboard data belong to later phases.
- If the setup wizard needs richer source-specific flows, defer that depth until the relevant ingestion or dashboard phases.

## Guidance For Downstream Planning

- Treat `5 minutes` as the working benchmark target for planning and verification.
- Plan around a full onboarding flow, not a placeholder screen.
- Ensure the demo flow, demo data, and first-insight measurement are all part of the same phase narrative.
- Preserve the synthetic/demo labeling requirement as a first-class product behavior, not a docs-only note.
