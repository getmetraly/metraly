# Phase 4C Research: Dashboard Editing And Wizard Reuse

**Status:** Complete
**Focus:** unify the dashboard editor and dashboard wizard around shared components and API-backed persistence.

## Research Summary

The codebase already contains most of the interaction primitives needed for dashboard editing:

- `DashboardScreen` has a `Customize` button, an existing sidebar surface, and local widget/layout edit state.
- `DashboardScreen (Overview)` is the primary dashboard surface and should not diverge from the same shared model used elsewhere.
- `WizardSidebar` already combines widget picking and settings editing in one shell.
- `WizardWidgetPicker` already provides the widget selection controls.
- `WizardSettings` already provides dashboard name, description, time range, team scope, delete, reorder, and widget size controls.
- `WizardPreviewGrid` already provides a live preview layout.
- `DashboardWizardScreen` already presents a multi-step template -> widgets -> settings flow.

The main problem is duplication:

1. The dashboard screen has its own edit flow state and uses `mockApi.updateDashboard`.
2. The dashboard wizard has its own store and preview flow.
3. The same widget-selection and settings controls are rendered in slightly different shells.
4. Layout normalization is split across local state and store state, which makes persisted layout behavior drift from rendered behavior.
5. Overview currently behaves like a special-case dashboard screen instead of sharing the same editor model as the other dashboard pages, which makes dead branches harder to remove.

## What Already Works

- The sidebar shell already exists and can be reused for both create and edit paths.
- The widget catalog already exists in the wizard store.
- The preview grid already renders selected widgets and supports drag/resizing.
- The dashboard renderer already consumes backend-backed widget data for read paths.
- The backend dashboard repo/service surface already supports create, update, layout, share, and fork operations.

## What Still Needs Consolidation

- A shared editor state model for create and edit flows.
- API write methods in `ui/src/api/client.ts` for dashboard create/update/layout/share/fork.
- A save path in the wizard that persists a new dashboard to the backend.
- A save path in the dashboard screen that persists edits to the backend with version-aware update semantics.
- A small shared style module for repeated editor shell/sidebar layout pieces, if the duplication stays high after the state unification.
- Cleanup of any Overview-only edit branches or fallback paths that become redundant after the shared model lands.

## Recommended Simplification Path

1. Keep the existing wizard components.
2. Extract the shared editor shell and state into a small reusable layer.
3. Move create/edit persistence to the API client.
4. Make `DashboardScreen` and `DashboardWizardScreen` consume the same primitives instead of diverging.
5. Only extract styles where the same layout block repeats in both flows.
6. Remove dead or non-working Overview-specific code once the shared flow fully covers it.

## Files Likely Touched

- `ui/src/features/dashboard/DashboardScreen.tsx`
- `ui/src/features/dashboardWizard/DashboardWizardScreen.tsx`
- `ui/src/features/dashboardWizard/components/WizardSidebar.tsx`
- `ui/src/features/dashboardWizard/components/WizardWidgetPicker.tsx`
- `ui/src/features/dashboardWizard/components/WizardSettings.tsx`
- `ui/src/features/dashboardWizard/components/WizardPreviewGrid.tsx`
- `ui/src/features/dashboardWizard/store/wizardStore.ts`
- `ui/src/api/client.ts`
- `ui/src/components/dashboard/widgetRegistry.tsx`
- `ui/src/components/ui/StatCard.tsx`
- tests next to the affected components, hooks, and client methods

## Risks

- If widget size and layout remain separate sources of truth, saved dashboards will drift from the preview.
- If the dashboard screen and wizard keep their own editor markup, the codebase will continue to fork conceptually.
- If the save flow stays local-only, the Customize button will still feel like a prototype.
- If shared components are extracted too aggressively, the editor will become harder to read instead of simpler.
