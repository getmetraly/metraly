# Phase 5 Research: Preview Ingestion

**Status:** Complete

The codebase already had the right persistence seams:

- `activity_events` for preview activity.
- `metric_data_points` for curated metric series.
- repository bulk insert methods for both tables.
- seeded sandbox metric series to keep the preview honest even before live ingestion lands.

The missing piece was an API-backed ingestion path that can translate a normalized Git or PM event into those existing tables without depending on ClickHouse or a raw event store.

