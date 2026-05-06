---
phase: 5
plan: 05A-preview-ingestion-surface
status: complete
completed: 2026-05-06
---

# Phase 5 Plan 05A: Preview Ingestion Surface Summary

## Work Completed

- Added a small ingestion service that normalizes Git and PM events.
- Added `/api/v1/ingest/github` and `/api/v1/ingest/pm` routes.
- Persisted incoming events as `activity_events` rows and curated `metric_data_points` rows.
- Kept the preview runtime free of any raw-event-store requirement.
- Added tests for the ingestion service, HTTP handler, and protected route wiring.

## Verification

- `go test ./...`
- `npm -C ui run build`

## Outcome

The preview stack can now accept a minimal live ingestion path and turn it into the data the rest of the product already knows how to read.

