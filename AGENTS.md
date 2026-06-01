# Metraly Agent Instructions

## Current stage

Metraly is in a pre-MVP phase. Runtime dashboard APIs, frontend hooks, seed data, dashboard contracts and connector setup flows may change if that helps produce a working MVP faster.

Do not preserve legacy compatibility by default. Remove obsolete role dashboards, mappings, preview-only flows and compatibility shims unless they are clearly useful.

## Current phase

Current work is **Phase 2.5 — Dashboard Runtime MVP and Source Setup Bridge**.

Phase 1 is complete.
Phase 2 UI/brandbook cutover is complete or treated as complete enough for runtime work.
Phase 3 source runtime is next, but this phase should only implement the minimum source connector bridge needed for a working MVP.

## Architecture direction

Dashboard runtime must be backend-driven.

Use BFF-style endpoints inside the existing Go API.
Do not create a separate BFF service.

Main app runtime should use:
- `GET /api/v1/app/bootstrap`
- `GET /api/v1/dashboards/{id}/view`

Frontend must not generate runtime dashboard widget values.
Frontend may use preview mocks only for wizard preview.

## Dashboard MVP

There must be one canonical Demo dashboard:
- id: `sandbox-all-widgets`
- name: `Demo`
- sourceTemplateId: `all-widgets`
- icon: valid existing icon, preferably `sparkles`

Demo dashboard must contain all supported visual widgets.
Every visual widget must receive backend-generated data and render meaningful content.

## Dashboard editing

Dashboard creation, settings, widget configuration, drag/drop, resize, reorder and save must work against backend persistence.

No local-only saved dashboard state as the source of truth.

## Source connector bridge

Connector setup must begin using real backend source APIs:
- create source
- test source
- trigger collect
- display status/error/loading state

Do not claim full Phase 3 source health unless durable sync state and health endpoints are implemented and verified.

## Brandbook

Brandbook is the source of truth for UI primitives.
Use `app/ui/src/design-system` as the app import boundary unless there is a documented exception.
Do not create a second local design system.

## Makefile-first workflow

Use Makefile targets for all common operations.
If a required operation has no target, add it.
Do not use raw docker/npm/go commands as the primary workflow when a Makefile target exists.

## Verification

All runtime verification must be done with containers running.
Do not write PASS unless the command was actually run.
Do not write APPROVE if any visual widget is empty or if dashboard create/edit/save is not verified.

## Docs

Update docs only after code/runtime verification.
When docs and code disagree, trust code, then update docs.
