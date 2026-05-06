# Phase 5 Context: Preview Ingestion

**Status:** Complete

**Source of truth:** `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `cmd/api/repo/activity_repo.go`, `cmd/api/repo/metric_repo.go`, `cmd/api/biz/ingestion_svc.go`, `cmd/api/handlers/ingestion.go`, `cmd/api/migrations/003_create_metric_data_points.sql`, `cmd/api/migrations/006_create_activity_events.sql`

Phase 5 connects the preview stack to a minimal ingestion surface without introducing a raw event store into the default Community Preview deployment.

The collectors still exist as separate modules, but the preview runtime now has a direct ingestion path that can accept normalized Git and PM events and persist them as activity rows and curated metric points in Postgres/TimescaleDB.

