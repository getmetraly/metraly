# Data Core Backend — Implementation Progress

> Source of truth: `../../docs/tech/data-core-architecture.md`
> Last updated: 2026-05-16

## Current status

| Contract | Status | Notes |
|---|---|---|
| SourceConnection | ✅ done | migration 009, repo, biz, API (Steps 1–9) |
| CredentialRef | ✅ done | AES-256-GCM vault in biz.SourceSvc |
| ConnectionTestResult | ✅ done | POST /api/v1/sources/{id}/test |
| CollectorRun | ✅ done | full lifecycle, API (Steps 19–20) |
| RawSourceEvent | ✅ done | insert with outcomes, dedup (Steps 10–18, 21) |
| NormalizedEvent | ✅ done | 11 event types, identity resolution, all measures (Steps 21–22) |
| IdentityMapping | ✅ done | resolve + upsert-unresolved in NormalizerSvc (Step 22) |
| MetricDefinition | ✅ done | 6 MVP metrics in hard-coded catalog (Step 23) |
| FormulaDefinition | ✅ done | additivity validator API (Step 23) |
| MetricQuery | ✅ done | POST /api/v1/metrics/query with quality (Steps 24–25) |
| MetricQueryResult | ✅ done | DataQualityLevel full/partial/empty, never faked |
| DataQualityContract | ✅ done | quality + qualityNotes on every result |
| LineageContract | planned | wired in types; not propagated from query engine yet |
| WidgetDataContract | ✅ done | POST /api/v1/metrics/widget-data, 4 widget shapes (Step 26) |

## Architectural schism (resolved for MVP)
Collectors write **ClickHouse**. App API reads **normalized_events** in Postgres.
The NormalizerSvc bridges the two: raw events → normalized_events → metric queries.
Full ClickHouse query path deferred to Phase 4/5.

## What Steps 22–27 implemented

### Step 22: Identity Resolution
- `domain.NormalizedEvent` gained `AuthorUnresolved`, `ReviewerUnresolved`, `Conclusion`,
  `PointsCompleted`, `PointsPlanned` fields
- `biz.IdentityResolver` interface + `identityResolverAdapter` in runtime.go
- `NormalizerSvc.resolveIdentities()` runs after normalize, before persist
- GitHub `workflow_run.completed` now extracts `conclusion`
- Jira `sprint.closed` now extracts `completed_points` and `planned_points`
- Migration 011: ADD COLUMN conclusion, points_completed, points_planned + partial index

### Step 23: Metric Catalog API
- `GET /api/v1/metrics/catalog` — list 6 MVP metrics
- `GET /api/v1/metrics/catalog/{metricId}` — single or 404
- `POST /api/v1/formulas/validate` — additivity contract enforcement

### Steps 24–25: Metric Query Engine
- `repo.MetricQueryRepo`: 6 SQL queries with `DATE_TRUNC` granularity, filter whitelist
- `biz.MetricQuerySvc.Execute`: dispatches + classifies quality (full/partial/empty)
- `POST /api/v1/metrics/query` handler with input validation

### Step 26: Widget Data Contract Adapter
- `POST /api/v1/metrics/widget-data` — accepts `widgetType` + metric query spec
- Shapes: `kpi_card`, `line_chart`, `bar_chart`, `table`
- Unknown widget types return 400 `UNSUPPORTED_WIDGET_TYPE`

## Test status
All 12 packages pass (`go test ./cmd/api/... -count=1 -short`)

## Branch
All work on `migration`. Steps 1–27 complete.

## Remaining (Phase 4/5)
- LineageContract propagation from query engine
- DB-backed MetricDefinition management (currently hard-coded)
- ClickHouse query path for collectors
- Multi-workspace identity resolution (MVP uses `"default"` workspace)
- `activity_feed` widget type
