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

Use Makefile targets first.
If a Make target exists for an operation, do not run raw `docker`, `npm`, or `go` commands instead of that target.
Add/update a Make target when common workflow coverage is missing.

## Brandbook build boundary

App consumes built `@metraly/ui` artifacts.
Do not patch brandbook internals from app/docs.
Do not claim app integration of brandbook changes until those changes are built and validated in the brandbook repository.

## Build and dependency order

For UI integration checks, build/update brandbook artifacts first, then run app UI checks.
Do not claim app UI integration success against stale `@metraly/ui` artifacts.
`make dev-preflight` is required before `make up`/`make dev-up`.
If `../brandbook/packages/ui/dist` is missing, build it before claiming UI runtime health.


## GitHub Actions boundary

Do not add GitHub Actions workflows unless explicitly requested by the user.


## Local quality gates

Before claiming implementation-quality completion, prefer:

- `make quality-fast` for the standard local gate
- `make quality-deep` for the local deep gate (`race` + `quality-security` + `knip`)

If `golangci-lint`, `govulncheck`, `osv-scanner`, `gitleaks`, `semgrep`, or `knip` is missing, keep the target failing with an explicit install hint instead of marking PASS.

`make ci` is a local CI-equivalent command only; it is not wired to GitHub Actions.

If UI/build workflow changes, run `make dev-preflight` before claiming the brandbook boundary is healthy.
## Source import boundary

App UI must consume brandbook through `app/ui/src/design-system` and published package entrypoints only.
Do not add direct relative imports from app into `../brandbook/packages/ui/src` or other brandbook source internals.
Do not import `@metraly/ui` source files directly (`../brandbook/packages/ui/src/*`) from app code.
## Verification

All runtime verification must be done with containers running.
Do not write PASS unless the command was actually run.
Do not write APPROVE if any visual widget is empty or if dashboard create/edit/save is not verified.
Do not mark PASS for docker/UI workflow unless `make docker-ui-deps-check` and `make docker-brandbook-dist-check` were run.

## Docs
## Docs-code truth precedence

When changing `docker-compose.yaml`, `ui/Dockerfile`, or Makefile workflow, update dev-workflow docs in `../docs` in the same change.
Update docs only after code/runtime verification.
When docs and code disagree, code/runtime is the source of truth; update docs to match implementation.