---
phase: 6
plan: 06A-export-and-checklist
status: complete
completed: 2026-05-06
---

# Phase 6 Plan 06A: Export and Checklist Summary

## Work Completed

- Added a real CSV export path for the metrics explorer using the selected metric, time range, team, repo, and values.
- Kept the export menu behavior intact while making the CSV option download an actual file.
- Inserted an onboarding checklist above the wizard step indicator so users can see the demo-to-real-data path at a glance.

## Verification

- `npm -C ui run build`

## Outcome

The metrics explorer export flow is now actionable, and the onboarding wizard gives users a clearer path through first-run setup.
