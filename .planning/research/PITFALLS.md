# Research: Pitfalls

**Defined:** 2026-05-05
**Sources:** `.planning/codebase/CONCERNS.md`, `../docs/STATUS.md`, `../docs/risks/technical-risks-and-mitigations.md`

## Critical Pitfalls

### Prototype Looks Done But Is Mock-Backed

Risk: UI screens and handlers look complete while data still comes from `mockApi`, JSON literals, or in-memory slices.

Prevention: every Community Preview requirement should include source-of-data criteria.

### Stack Drift Around a Deferred Raw Event Store

Risk: docs, Makefile, collectors, and compose disagree on whether a raw event store is required.

Prevention: update roadmap and implementation plans to defer the raw event store for Community Preview and document future raw-event role.

### License Metadata Drift

Risk: `AGPL-3.0-only` and missing source headers conflict with user-confirmed `AGPL-3.0-or-later`.

Prevention: make license/header alignment an early phase.

### Overbuilding Pro Before Preview Foundation

Risk: implementing AI/plugin/license features before the basic self-hosted dashboard loop works.

Prevention: roadmap gates Pro work behind Community Preview data and UI readiness.

### Docs Overpromise Current Code

Risk: README/marketing language claims features that are only designed.

Prevention: use `../docs/STATUS.md` as canonical maturity source and keep moved app documentation honest.

### No Frontend Verification Harness

Risk: dashboard/onboarding UI regressions go unnoticed.

Prevention: add Playwright smoke tests when replacing mock API usage.

## Planning Guardrails

- Treat current code as brownfield early prototype.
- Keep Community Preview small enough to run and verify locally.
- Separate "designed in docs" from "implemented in app".
- Preserve self-hosted/privacy positioning in every technical decision.
