# Phase 4C: Dashboard Editing And Wizard Reuse

**Status:** Draft  
**Goal:** Make dashboard editing real by reusing the existing wizard components, wiring the Customize sidebar to the backend, and persisting create/edit flows through one shared editor model.

## Scope

This wave covers the dashboard create/edit experience that already exists in pieces:

- `Customize` on `DashboardScreen`.
- `DashboardScreen (Overview)` as the canonical dashboard entry point that must share the same flow and models as the other dashboard pages.
- `DashboardWizardScreen` step 2 and step 3.
- shared widget picker, settings, sidebar, preview, and size/reorder controls.
- API-backed dashboard create/update/layout persistence.
- small style extraction where it reduces duplicated shell/sidebar markup.

## Cut List

### Keep As Shared Core

- `ui/src/features/dashboardWizard/components/WizardSidebar.tsx`
- `ui/src/features/dashboardWizard/components/WizardWidgetPicker.tsx`
- `ui/src/features/dashboardWizard/components/WizardSettings.tsx`
- `ui/src/features/dashboardWizard/components/WizardPreviewGrid.tsx`
- `ui/src/features/dashboardWizard/components/WidgetPreviewCard.tsx`
- `ui/src/components/dashboard/widgetRegistry.tsx`
- `ui/src/hooks/useDashboard.ts`
- `ui/src/components/dashboard/DashboardRenderer.tsx`

### Move Into a Shared Editor Layer

- `ui/src/features/dashboardWizard/store/wizardStore.ts` state and helpers for widgets, layout, size, metadata, and serialization
- a new shared editor model/store module for dashboard edit/create flows
- API payload builders for create/update/layout/fork/share
- layout normalization helpers so the wizard and dashboard screen use the same width/position rules

### Remove Or Collapse After Migration

- `ui/src/features/dashboard/DashboardScreen.tsx` local-only edit state
- `mockApi.updateDashboard` usage in dashboard edit flow
- duplicate `WizardSidebar` branches inside `DashboardScreen`
- wizard-local widget/picker/settings markup that duplicates the shared sidebar
- `ui/src/features/dashboardWizard/components/WidgetPalette.tsx`
- `ui/src/features/dashboardWizard/components/SelectedWidgetsList.tsx`
- `ui/src/features/dashboardWizard/components/MiniWidget.tsx`
- `ui/src/components/dashboard/DraggableDashboardRenderer.tsx` if the shared editor covers its edit behavior
- any Overview-specific editor branch that remains after the shared model lands

## Implementation Order

1. Extract the shared editor model and payload helpers from `wizardStore` into a reusable dashboard editor layer.
2. Wire `DashboardWizardScreen` to that shared model so the wizard keeps working while the old local-only assumptions disappear.
3. Wire `DashboardScreen (Overview)` to the same shared model and shared sidebar/editor shell.
4. Add the missing API write helpers in `ui/src/api/client.ts` and connect both create and edit save flows to them.
5. Remove Overview-specific branches, `mockApi.updateDashboard`, and any dead local edit state once the shared flow is proven.
6. Collapse or delete the legacy helper components (`WidgetPalette`, `SelectedWidgetsList`, `MiniWidget`, and `DraggableDashboardRenderer` if no longer needed).
7. Tighten tests around the shared editor model, dashboard save payloads, and Overview parity.

## Patch-Ready Task List

### Task Group A: Shared Editor Model

**Owner:** `editor-core`

**Files**
- `ui/src/features/dashboardWizard/store/wizardStore.ts`
- new shared editor model/store module under `ui/src/features/dashboardEditor/`
- new shared payload/normalization helpers under `ui/src/features/dashboardEditor/`
- `ui/src/types/api.ts` only if the canonical request/response shape needs to be clarified

**Patch Scope**
- extract widget/layout/metadata state from the wizard-only store
- keep wizard-only `step` and template selection separate from the shared model
- add one serializer for create/edit payloads
- normalize widget size and layout in one place

**Done When**
- both wizard and dashboard screen can consume the same editor model without duplicating normalization logic
- payload assembly no longer happens inline in screen components

### Task Group B: Wizard Wiring

**Owner:** `wizard-screen`

**Files**
- `ui/src/features/dashboardWizard/DashboardWizardScreen.tsx`
- `ui/src/features/dashboardWizard/components/WizardSidebar.tsx`
- `ui/src/features/dashboardWizard/components/WizardWidgetPicker.tsx`
- `ui/src/features/dashboardWizard/components/WizardSettings.tsx`
- `ui/src/features/dashboardWizard/components/WizardPreviewGrid.tsx`
- `ui/src/features/dashboardWizard/components/WidgetPreviewCard.tsx`

**Patch Scope**
- switch the wizard screen to the shared editor model
- keep template selection and step navigation local to the wizard
- route widget selection/settings/preview to shared primitives
- keep the wizard save button using the shared payload builder

**Done When**
- the wizard still works end-to-end
- no wizard-local duplicate edit state remains for widgets/layout/metadata

### Task Group C: Overview Shell Wiring

**Owner:** `overview-shell`

**Files**
- `ui/src/features/dashboard/DashboardScreen.tsx`
- `ui/src/components/dashboard/DashboardRenderer.tsx` only if a small contract change is needed
- `ui/src/components/dashboard/DraggableDashboardRenderer.tsx` only if it survives the cut

**Patch Scope**
- remove local edit state from `DashboardScreen`
- connect `Customize` to the shared editor model and shared sidebar
- make Overview use the same flow and models as the other dashboard pages
- delete Overview-specific fallback branches once shared behavior is stable

**Done When**
- Overview no longer has a separate local-only edit implementation
- `mockApi.updateDashboard` is no longer referenced from `DashboardScreen`

### Task Group D: API Write Surface

**Owner:** `api-write`

**Files**
- `ui/src/api/client.ts`
- `ui/src/types/api.ts`

**Patch Scope**
- add create/update/layout/share/fork helpers to the frontend API client
- keep request types aligned with backend contracts
- make the shared editor payload builder feed those helpers

**Done When**
- both wizard create and dashboard edit save through the same API surface
- version-aware updates are represented explicitly

### Task Group E: Legacy Component Cleanup

**Owner:** `legacy-cleanup`

**Files**
- `ui/src/features/dashboardWizard/components/WidgetPalette.tsx`
- `ui/src/features/dashboardWizard/components/SelectedWidgetsList.tsx`
- `ui/src/features/dashboardWizard/components/MiniWidget.tsx`
- `ui/src/features/dashboardWizard/components/index.js`
- `ui/src/components/dashboard/DraggableDashboardRenderer.tsx` if the shared editor fully replaces it

**Patch Scope**
- delete components that are no longer used in production flow
- remove stale exports after deletions
- keep only the pieces still referenced by the shared editor path

**Done When**
- no dead helper component remains in the dashboard edit path
- exports are clean and imports are resolved

### Task Group F: Verification and Regression Tests

**Owner:** `verification`

**Files**
- `ui/src/features/dashboardWizard/store/wizardStore.test.ts`
- `ui/src/features/dashboardWizard/DashboardWizardScreen.test.tsx`
- `ui/src/features/dashboardWizard/components/WizardPreviewGrid.test.tsx`
- `ui/src/features/dashboardWizard/components/WidgetPreviewCard.test.tsx`
- `ui/src/features/dashboardWizard/components/WidgetPalette.test.tsx`
- `ui/src/features/dashboardWizard/components/SelectedWidgetsList.test.tsx`
- `ui/src/features/dashboardWizard/components/MiniWidget.test.tsx`
- new or existing `DashboardScreen` tests

**Patch Scope**
- cover shared model normalization
- cover wizard payload generation
- cover Overview parity and save flow
- delete or rewrite tests tied to removed legacy components

**Done When**
- the shared editor path is tested independently from the removed legacy UI
- Overview and wizard edits are covered by focused regression tests

### Patch Sequencing Rules

- `editor-core` must land before `wizard-screen` and `overview-shell`.
- `api-write` can land in parallel with `editor-core` if the request types are stable.
- `legacy-cleanup` must wait until both `wizard-screen` and `overview-shell` are using the shared model.
- `verification` should run after each mergeable slice, not only at the end.

## Worker-Style Assignment List

### Worker 1: `editor-core`

**Starts first.**

Owns:
- `ui/src/features/dashboardWizard/store/wizardStore.ts`
- new shared editor model/store module under `ui/src/features/dashboardEditor/`
- new shared payload/normalization helpers under `ui/src/features/dashboardEditor/`
- `ui/src/types/api.ts` only if canonical payload contracts need to move

Responsibilities:
- extract the shared dashboard editor model
- separate wizard-only step/template state from shared widget/layout/metadata state
- define one serializer for create/edit payloads
- normalize widget size and layout in one place

Do not touch:
- `DashboardWizardScreen.tsx`
- `DashboardScreen.tsx`
- API client write methods
- legacy component cleanup files

### Worker 2: `api-write`

**Can start in parallel with Worker 1 if the contract is stable.**

Owns:
- `ui/src/api/client.ts`
- `ui/src/types/api.ts`

Responsibilities:
- add create/update/layout/share/fork helpers
- align frontend request/response types with backend contracts
- expose the exact payload shape the shared editor builder will use

Do not touch:
- `DashboardScreen.tsx`
- `DashboardWizardScreen.tsx`
- `wizardStore.ts`
- legacy cleanup files

### Worker 3: `wizard-screen`

**Starts after Worker 1 has the shared model shape.**

Owns:
- `ui/src/features/dashboardWizard/DashboardWizardScreen.tsx`
- `ui/src/features/dashboardWizard/components/WizardSidebar.tsx`
- `ui/src/features/dashboardWizard/components/WizardWidgetPicker.tsx`
- `ui/src/features/dashboardWizard/components/WizardSettings.tsx`
- `ui/src/features/dashboardWizard/components/WizardPreviewGrid.tsx`
- `ui/src/features/dashboardWizard/components/WidgetPreviewCard.tsx`

Responsibilities:
- connect the wizard to the shared editor model
- keep template selection and step navigation local
- keep widget/settings/preview rendering shared
- switch the save path to the shared payload builder

Do not touch:
- `DashboardScreen.tsx`
- API client write helpers
- legacy cleanup files
- shared model files outside the wizard adapter surface

### Worker 4: `overview-shell`

**Starts after Worker 1 has landed and once Wizard wiring is stable enough to mirror.**

Owns:
- `ui/src/features/dashboard/DashboardScreen.tsx`
- `ui/src/components/dashboard/DashboardRenderer.tsx` only if a small contract change is required
- `ui/src/components/dashboard/DraggableDashboardRenderer.tsx` only if it survives the cut

Responsibilities:
- remove Overview local edit state
- connect `Customize` to the shared editor model and shared sidebar
- make Overview use the same flow and models as the other dashboard pages
- delete Overview-specific fallback branches once shared behavior is stable

Do not touch:
- wizard component files already owned by Worker 3
- API client helpers already owned by Worker 2
- shared editor store/helpers already owned by Worker 1

### Worker 5: `legacy-cleanup`

**Starts only after Worker 3 and Worker 4 are using the shared model.**

Owns:
- `ui/src/features/dashboardWizard/components/WidgetPalette.tsx`
- `ui/src/features/dashboardWizard/components/SelectedWidgetsList.tsx`
- `ui/src/features/dashboardWizard/components/MiniWidget.tsx`
- `ui/src/features/dashboardWizard/components/index.js`
- `ui/src/components/dashboard/DraggableDashboardRenderer.tsx` if no longer needed

Responsibilities:
- delete components that are no longer used in production flow
- remove stale exports after deletions
- keep only components still referenced by the shared editor path

Do not touch:
- shared model files
- API client files
- wizard/overview shell files unless an import cleanup is required

### Worker 6: `verification`

**Runs after each mergeable slice and again at the end.**

Owns:
- `ui/src/features/dashboardWizard/store/wizardStore.test.ts`
- `ui/src/features/dashboardWizard/DashboardWizardScreen.test.tsx`
- `ui/src/features/dashboardWizard/components/WizardPreviewGrid.test.tsx`
- `ui/src/features/dashboardWizard/components/WidgetPreviewCard.test.tsx`
- `ui/src/features/dashboardWizard/components/WidgetPalette.test.tsx`
- `ui/src/features/dashboardWizard/components/SelectedWidgetsList.test.tsx`
- `ui/src/features/dashboardWizard/components/MiniWidget.test.tsx`
- new or existing `DashboardScreen` tests

Responsibilities:
- cover shared model normalization
- cover wizard payload generation
- cover Overview parity and save flow
- delete or rewrite tests tied to removed legacy components

Do not touch:
- production implementation files unless a test-only seam is required

### Non-Overlapping Patch Rules

- Workers 1 and 2 may run in parallel.
- Worker 3 must not patch the same file set as Worker 1.
- Worker 4 must not patch the same file set as Worker 3 or Worker 1.
- Worker 5 must wait until Workers 3 and 4 stop referencing the legacy components.
- Worker 6 should not share write scope with any production worker unless a test seam is needed.
- `wizardStore.ts` is owned by Worker 1 only.
- `DashboardWizardScreen.tsx` is owned by Worker 3 only.
- `DashboardScreen.tsx` is owned by Worker 4 only.
- `client.ts` is owned by Worker 2 only.
- Legacy cleanup files are owned by Worker 5 only.

## Success Criteria

1. The dashboard `Customize` button opens a shared editor sidebar that can add, remove, reorder, and resize widgets.
2. The dashboard wizard reuses the same picker, settings, and preview components instead of keeping a separate copy of the same UI logic.
3. Creating a dashboard from the wizard calls the API with the correct widget instances, widget configs, layout, name, description, and filter defaults.
4. Editing an existing dashboard calls the API with the current version and returns the updated dashboard state through the same shared model.
5. Widget size and layout stay aligned so the saved dashboard matches the rendered preview.
6. Shared editor styles are extracted only where they reduce duplication in the shell/sidebar code.
7. The dashboard edit path no longer depends on `mockApi`.
8. `DashboardScreen (Overview)` uses the same shared models and persistence flow as the other dashboard pages, with no special-case local-only editor state left behind.
9. Dead or non-working dashboard edit code is removed instead of kept as fallback.

## Execution Plan

### Wave 1: Shared Editor Core

**Plan file:** `04C-dashboard-editing-and-wizard-reuse-PLAN.md`

Create one editor model that both the wizard and the dashboard screen can consume.

- Reuse the existing `WizardSidebar`, `WizardWidgetPicker`, `WizardSettings`, `WizardPreviewGrid`, and widget preview pieces as the shared editor surface.
- Move the shared editor state into one store or hook so create and edit flows work from the same widget/layout source of truth.
- Define one serialization path for widget instances, widget configs, default filters, and layout.
- Normalize widget size and layout handling so resizing in the preview, changing size in settings, and saving to the backend all agree.
- Keep the existing visual language and only extract shared styles where the same shell/layout block repeats.
- Add focused tests around the shared editor model and layout normalization.

### Wave 2: API-Backed Save Flows

**Plan file:** `04C-dashboard-editing-and-wizard-reuse-PLAN.md`

Wire the shared editor model to the real backend write surface.

- Add missing dashboard write helpers to `ui/src/api/client.ts` for create/update/layout/share/fork as needed by the editor.
- Make the wizard save a new dashboard through the backend with the selected widgets, layout, and dashboard properties.
- Make the dashboard `Customize` flow update the existing dashboard through the backend with version-aware persistence.
- Make the shared editor payload builder the single source of truth for create and edit saves.
- Preserve widget config shape so backend writes and backend reads stay compatible with the existing renderer.
- Add API tests or client tests for the create/update payloads and version conflict handling.

### Wave 3: Screen Integration And Cleanup

**Plan file:** `04C-dashboard-editing-and-wizard-reuse-PLAN.md`

Finish the integration and remove the duplicate dashboard-editing paths.

- Replace any remaining dashboard-editing local-only paths with the shared editor model.
- Remove Overview-specific editor branches once the shared model covers them.
- Make the sidebar visible in the dashboard shell and the wizard preview without duplicating the same controls.
- Ensure the dashboard screen and wizard both render saved layouts and widget sets correctly after refresh.
- Remove dead local editing code and keep `mockApi` out of the dashboard edit flow.
- Remove `DraggableDashboardRenderer` only if the shared editor plus dashboard renderer fully cover its editable behavior.
- Collapse or delete `WidgetPalette`, `SelectedWidgetsList`, and `MiniWidget` if no production path still uses them.
- Add component tests for the sidebar, preview, and save flow so the simplified codebase stays stable.

## Cross-Cutting Constraints

- Keep the Phase 2 auth surface unchanged except for the minimum needed to save dashboard edits.
- Do not expand into AI, plugins, billing, or collector ingestion.
- Do not introduce a new design system or a broad CSS rewrite.
- Keep the editor shell small enough that `DashboardScreen` and `DashboardWizardScreen` remain readable after reuse.
- Preserve optimistic locking behavior on dashboard updates.

## Verification Loop

Plan quality should be checked against these gates before implementation starts:

- `Customize` opens the shared editor sidebar.
- Widget add/remove/reorder/resize behavior is consistent between wizard and dashboard editing.
- Wizard create saves a dashboard with the right widgets, layout, and properties.
- Dashboard edit saves through the backend with version-aware update semantics.
- Shared styles/components are reused instead of duplicated.
- The dashboard edit path does not rely on `mockApi`.
- `DashboardScreen (Overview)` follows the same shared flow and models as the rest of the dashboard surfaces.
- Dead or non-working editor code has been removed rather than left behind as a fallback path.

## Implementation Files Likely Touched

- `ui/src/features/dashboard/DashboardScreen.tsx`
- `ui/src/features/dashboardWizard/DashboardWizardScreen.tsx`
- `ui/src/features/dashboardWizard/components/WizardSidebar.tsx`
- `ui/src/features/dashboardWizard/components/WizardWidgetPicker.tsx`
- `ui/src/features/dashboardWizard/components/WizardSettings.tsx`
- `ui/src/features/dashboardWizard/components/WizardPreviewGrid.tsx`
- `ui/src/features/dashboardWizard/components/SelectedWidgetsList.tsx`
- `ui/src/features/dashboardWizard/store/wizardStore.ts`
- `ui/src/api/client.ts`
- `ui/src/components/dashboard/widgetRegistry.tsx`
- `ui/src/components/ui/StatCard.tsx`
- optional shared editor styles module under `ui/src/features/dashboard*`
- tests next to the affected hooks, components, and API client methods

## Notes

This wave is intentionally narrow.
Its job is to turn the partially built dashboard editing UI into one shared, API-backed editor path rather than two separate prototype flows.
