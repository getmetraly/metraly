# Phase 4C: Dashboard Editing And Wizard Reuse - Context

**Phase:** 04C - Dashboard Editing And Wizard Reuse  
**Status:** context captured for planning  
**Source of truth:** `.planning/ROADMAP.md`, `.planning/phases/04-dashboard-data-path/04-PLAN.md`, `.planning/phases/04-dashboard-data-path/04-RESEARCH.md`, `.planning/phases/04-dashboard-data-path/04-VERIFICATION.md`, `ui/src/features/dashboard/DashboardScreen.tsx`, `ui/src/features/dashboardWizard/DashboardWizardScreen.tsx`, `ui/src/features/dashboardWizard/*`, `ui/src/api/client.ts`, `ui/src/api/mockApi.ts`, `cmd/api/handlers/dashboards.go`, `cmd/api/handlers/preview.go`, `cmd/api/repo/dashboard_repo.go`, `cmd/api/biz/dashboard_svc.go`

## Purpose

This wave makes dashboard editing real without duplicating the editor twice.
`DashboardScreen` already has a `Customize` entry point and a sidebar surface.
`DashboardWizardScreen` already has the widget picker, settings controls, and a preview grid.
The missing piece is a shared editing model and API-backed persistence so both flows use the same components, the same layout semantics, and the same save payloads.

## Current Reality

- `DashboardScreen` opens `WizardSidebar` today, but it still keeps its own local editing state and saves through `mockApi.updateDashboard`.
- `DashboardScreen (Overview)` is the most important dashboard entry point and should use the same shared flow and the same models as the other dashboard pages, not a separate one-off path.
- `DashboardWizardScreen` already uses `WizardWidgetPicker`, `WizardSettings`, and `WizardPreviewGrid`, but its final save path is still local-only.
- `WizardSidebar` already composes the exact widget/settings controls needed for both create and edit flows.
- `useWizardStore` already owns template selection, widgets, layout, size, and dashboard metadata, but it still has layout normalization quirks that make widget width and layout drift apart.
- `ui/src/api/client.ts` has read helpers, but the dashboard create/update write methods that the editor flow needs are not yet exposed there.
- Once the shared model is in place, dead or non-working Overview-only dashboard edit code should be removed instead of kept around as fallback paths.

## Implementation Boundary

- Reuse the existing wizard/editor components instead of building a separate dashboard editor stack.
- Keep `DashboardScreen (Overview)` on the same shared editor model as the rest of the dashboard pages.
- Keep Phase 2 auth untouched beyond what Phase 4 already needs.
- Keep the default preview backend-backed and avoid reintroducing `mockApi` into the dashboard edit path.
- Do not widen scope into AI, plugins, billing, or collector ingestion.
- Extract shared styles only where it reduces duplication and keeps the code easier to read.

## Specifics To Preserve

- `Customize` should open the same editing affordances that the wizard already exposes.
- Widget add/remove/reorder/resize should behave consistently in both the dashboard screen and the wizard preview.
- Dashboard save payloads must preserve widget instances, widget config, layout, name, description, and default filters.
- Layout normalization must keep persisted width and rendered width aligned.
- The shared editor should stay visually consistent with the existing wizard styling, not introduce a new design language.

## Deferred Ideas

- Do not add a full new design system.
- Do not redesign auth/session behavior.
- Do not implement advanced collaboration, sharing UX, comments, or multi-user editing in this wave.
- Do not rewrite unrelated mock surfaces yet.

---

*Phase: 04C-dashboard-editing-and-wizard-reuse*
*Context captured: 2026-05-06*
