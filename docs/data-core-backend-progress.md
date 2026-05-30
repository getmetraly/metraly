# Data Core Backend — Implementation Progress

> Status: historical implementation log with still-relevant backend evidence
> Source of truth for current roadmap state: `../../docs/plans/metraly-roadmap.md`, `../../docs/status/technical-subsystems.md`, `../../docs/tech/data-core-architecture.md`
> Last updated: 2026-05-30

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
| DataQualityContract | ✅ done | QualityContract with coverage%, earliest/latestDataAt (Steps 27, 29) |
| LineageContract | ✅ done | metricId, formulaId, formulaVersion, sourceIds, normalizedEventTypes (Step 29) |
| WidgetDataContract | ✅ done | POST /api/v1/metrics/widget-data, 5 widget shapes (Steps 26, 29) |
| GitHubCollector | ✅ structural MVP | PR opened/merged/closed; review_submitted deferred (Step 28) |
| GitHubActionsCollector | ✅ structural MVP | workflow_run.started/completed with conclusion mapping (Step 28) |
| ActivityFeedContract | ✅ done | activity_feed widget type, real normalized events only (Step 29) |

## Steps 28–30 implementation (2026-05-18)

### Step 28 — Real GitHub and GitHub Actions Collectors

**Files created:**
- `cmd/api/biz/github_collector.go` — `GitHubCollector` (SourceType: github)
- `cmd/api/biz/github_actions_collector.go` — `GitHubActionsCollector` (SourceType: github_actions)
- `cmd/api/biz/github_collector_test.go` — 30 unit tests with fake HTTP servers

**Files modified:**
- `cmd/api/runtime.go` — registers `NewGitHubCollector(nil)` and `NewGitHubActionsCollector(nil)` at startup

**Collected events (GitHub PR):**
- `pull_request.opened` — from PR created_at
- `pull_request.merged` — from PR merged_at; includes `cycle_time_seconds`
- `pull_request.closed` — from PR closed_at (without merge)

**PARTIAL — not collected in this version:**
- `pull_request.review_requested` — requires per-PR Timeline API; deferred (N+1 cost)
- `pull_request.review_submitted` — requires per-PR Reviews API; deferred
- `review_latency_seconds` — set to nil until review_submitted is collected

**Collected events (GitHub Actions):**
- `workflow_run.started` — from run.created_at / run_started_at
- `workflow_run.completed` — when status=completed and conclusion present; includes `conclusion`, `duration_seconds`

**Safety invariants:**
- PR title, body, commit messages, actor emails NEVER in payload
- Authorization header NEVER logged or returned in errors
- Response bodies limited to 4 MB per request
- Per-request timeout: 10 s; client timeout: 30 s
- Pagination: follows Link: rel="next" header
- Rate limits: X-RateLimit-Remaining=0, X-RateLimit-Reset, Retry-After all handled
- Cursor: RFC3339 timestamp; empty = full collect, non-empty = incremental

### Step 29 — Lineage, Quality Contract, GroupBy Rejection, Filter Validation, Activity Feed

**Domain changes (`cmd/api/domain/metrics_catalog.go`):**
- `MetricQueryResult` now has `QualityContract domain.DataQualityContract` and `Lineage domain.LineageContract`
- Backward compatible: existing `Quality` + `QualityNotes` fields still populated

**Domain changes (`cmd/api/domain/activity.go`):**
- Added `ActivityFeedQuery` and `ActivityFeedItem` (no free-form text fields by design)

**New files:**
- `cmd/api/biz/activity_feed_svc.go` — `ActivityFeedSvc` with filter validation, limit clamping
- `cmd/api/biz/errors.go` — added `ErrUnsupportedGroupBy`, `ErrUnsupportedFilter`

**Modified files:**
- `cmd/api/biz/metric_query_svc.go` — populates Lineage + QualityContract; rejects non-empty groupBy with `ErrUnsupportedGroupBy`; rejects unknown filters with `ErrUnsupportedFilter`
- `cmd/api/handlers/metric_query.go` — maps new errors to HTTP 400 UNSUPPORTED_GROUP_BY / UNSUPPORTED_FILTER
- `cmd/api/handlers/widget_data.go` — adds `activity_feed` widget type; maps new errors to 400
- `cmd/api/repo/event_repo.go` — added `QueryActivityFeed` (workspace-scoped via source_connections subquery)
- `cmd/api/main.go` — routes activity_feed through `ActivityFeedSvc`
- `cmd/api/runtime.go` — wires `ActivityFeedSvc`

**GroupBy status:** Non-empty `groupBy` returns 400 `UNSUPPORTED_GROUP_BY`. Planned for Phase 3.

**Filter validation:** Unknown filter keys return 400 `UNSUPPORTED_FILTER`. Allowed: `repository_id`, `team_id`, `author_id`, `reviewer_id`, `source_connection_id`.

**Activity feed data contract:**
```json
{
  "widgetType": "activity_feed",
  "quality": "full|empty",
  "data": {
    "items": [
      {
        "id": "...", "eventType": "pull_request.merged",
        "entityKind": "pull_request", "entityId": "...",
        "occurredAt": "...", "repositoryId": "...",
        "authorId": "...", "reviewerId": "...",
        "authorUnresolved": false, "reviewerUnresolved": false
      }
    ]
  }
}
```
No title, body, commit messages, emails in any item field.

### Step 30 — Production Hardening

**Structured logging (`cmd/api/biz/collector_svc.go`):**
Uses `log/slog`. Events logged:
- `collector_run.started` — run_id, source_id
- `collector_run.collect_failed` — run_id, source_id, error_category (no secret, no response body)
- `collector_run.normalization_error` — run_id, source_id, raw_event_id (skipped, not fatal)
- `collector_run.succeeded` — run_id, source_id, events_fetched, events_inserted, events_duplicated
- `collector_run.failed` — run_id, source_id, error_category (no error_message to prevent secret leakage)

**Migration 012 (`cmd/api/migrations/012_add_query_indexes.sql`):**
- `normalized_events(source_connection_id, occurred_at DESC)` — activity feed workspace-scoped queries
- `normalized_events(event_type, occurred_at DESC)` — composite for metric query range scans
- `collector_runs(source_connection_id, started_at DESC)` — per-source run listing

**Workspace isolation audit:**
- source_connections: workspace_id column ✓ isolated
- collector_runs: tied to source_connection ✓ transitively isolated
- raw_source_events: tied to source_connection ✓ transitively isolated
- normalized_events: tied to source_connection ✓ transitively isolated
- identity_mappings: workspace_id column ✓ isolated
- metric queries: NOT workspace-scoped in SQL — aggregates across all workspaces ⚠️ TODO Phase 3
- activity feed: workspace-scoped via subquery ✓
- NormalizerSvc identity resolution: uses hard-coded 'default' workspace ⚠️ TODO Phase 3

## Test commands run and results

```
go test ./cmd/api/... -count=1 -short
```
All 12 packages pass (see Step 30 verification).

## No UI files modified

Confirmed: no changes to `ui/`, `*.tsx`, `*.jsx`, `*.css`, `*.scss`, or Storybook files.

## Security and privacy checks

- Authorization header: never logged, never in error messages (github_collector.go, safeStatusMsg())
- Secrets: zeroed immediately after Collect() returns (collector_svc.go line ~146)
- PR title/body: not decoded in ghPR struct (github_collector.go)
- Commit messages: not decoded in ghWorkflowRun struct (github_actions_collector.go)
- Emails: not stored (identity_mappings.external_email_hash enforced by schema, constraint present in migration 010)
- ActivityFeedItem: no free-form text fields by domain type design
- slog: only error_category (not error_message) logged in collector_run.failed

## Remaining production gaps after Steps 28–30

1. **review_requested / review_submitted**: Not collected. Requires Timeline API (N+1 cost). → Phase 3
2. **review_latency_seconds**: Not computed (requires review_requested timestamp). → Phase 3
3. **Metric query workspace isolation**: MetricQuerySvc does not filter by workspaceID in SQL. → Phase 3 priority
4. **NormalizerSvc multi-workspace**: Hard-coded 'default' workspace for identity resolution. → Phase 3
5. **GroupBy dimensions**: Returns 400 for any non-empty groupBy. → Phase 3
6. **Live source adapter verification**: GitHubAdapter.TestConnection still structural (no live HTTP). → Phase 2 upgrade
7. **ClickHouse analytical path**: Deferred. Postgres-based normalized_events used for all queries.
8. **DB-backed MetricDefinition**: Hard-coded catalog. → Phase 4
9. **Retry/backoff in collector**: Rate-limit handling stops the run; no automatic retry schedule.
10. **Integration tests with real Postgres**: Covered by testcontainers in existing db package; collector tests use fake HTTP servers only.

## Recommended next roadmap-aligned work

**Roadmap Phase 2 — Source runtime cutover:**
1. Add durable source sync state and source-health endpoints on the Postgres-backed app path
2. Upgrade source-management UI to real `/sources`, `/sources/{id}/test`, and `/sources/{id}/collect` flows
3. Keep the runtime path explicit as Postgres-first until any ClickHouse bridge is intentionally implemented
4. Re-verify collector rate-limit and deployment-normalization claims before stronger docs wording

**Roadmap Phase 3 — Metric/query hardening:**
1. Thread workspaceID into MetricQuerySvc SQL if current query path still lacks it
2. Thread workspaceID into NormalizerSvc identity resolution if the default-workspace limitation still exists
3. Implement groupBy for whitelisted dimensions
4. Add review_submitted via GitHub Reviews API with per-PR batching and rate-limit budgeting
5. Add stronger observability for collector run latency, event counts and failure rates

## What Steps 1–27 implemented (prior work)

### Steps 1–9: Source Registry
- `domain.SourceConnection`, `domain.CredentialRef`
- AES-256-GCM credential vault in `biz.SourceSvc`
- `GET/POST /api/v1/sources`, `GET /api/v1/sources/{id}`, `POST /api/v1/sources/{id}/test`
- Structural adapters: GitHubAdapter, GitHubActionsAdapter, JiraAdapter

### Steps 10–21: Event Pipeline
- `RawSourceEvent` persistence with deduplication key
- `CollectorSvc` lifecycle: started → running → succeeded/failed
- `POST /api/v1/sources/{id}/collect`, `GET /api/v1/collector-runs/{id}`

### Step 22: Identity Resolution
- `NormalizerSvc` with identity resolver hook
- `identity_mappings` table with hash-only emails

### Steps 23–27: Metric Catalog + Query Engine + Widget Adapter
- 6 MVP metrics: pr_count, pr_cycle_time_median, review_latency_median, build_failure_rate, build_duration_p95, sprint_predictability
- `POST /api/v1/metrics/query` with quality classification
- `POST /api/v1/metrics/widget-data` with kpi_card, line_chart, bar_chart, table shapes
