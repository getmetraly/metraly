# Phase 5: Preview Ingestion

**Status:** Complete

**Goal:** Add minimal source and metric ingestion without requiring a raw event store dependency.

## Delivered Scope

- Git ingestion endpoint for normalized pull-request or push events.
- PM ingestion endpoint for normalized Jira/Linear-style events.
- Activity event persistence through the existing activity repository.
- Curated metric point persistence through the existing metric repository.
- Router tests that confirm the ingestion routes are protected alongside the rest of the preview API.

