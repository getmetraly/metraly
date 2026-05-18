# Data Core Steps 28–30 Execution Report

Generated: 2026-05-18

## Step 28 — Real GitHub and GitHub Actions Collectors

### Files created
- `cmd/api/biz/github_collector.go` (345 lines)
- `cmd/api/biz/github_actions_collector.go` (230 lines)
- `cmd/api/biz/github_collector_test.go` (582 lines, 24 tests)

### Files modified
- `cmd/api/runtime.go` — +3 lines: register GitHub and GitHub Actions collectors

### Tests added
24 unit tests (all green):
- `TestGitHubCollector_CollectsOpenedAndMergedEvents`
- `TestGitHubCollector_CollectsClosedWithoutMerge`
- `TestGitHubCollector_ComputesCycleTimeSeconds`
- `TestGitHubCollector_NoForbiddenFields`
- `TestGitHubCollector_401_ReturnsAuthError`
- `TestGitHubCollector_403_ReturnsPermissionError`
- `TestGitHubCollector_RateLimit_Returns429`
- `TestGitHubCollector_RetryAfterHeader`
- `TestGitHubCollector_Pagination`
- `TestGitHubCollector_MissingOrg_ReturnsError`
- `TestGitHubActionsCollector_CollectsStartedAndCompletedEvents`
- `TestGitHubActionsCollector_InProgressRun_OnlyStartedEvent`
- `TestGitHubActionsCollector_ConclusionMapping` (7 sub-tests)
- `TestGitHubActionsCollector_ComputesDurationSeconds`
- `TestGitHubActionsCollector_NoForbiddenFields`
- `TestGitHubActionsCollector_MissingOrg_ReturnsError`
- `TestRuntime_GitHubCollectorsRegistered`

### Risks
- `pull_request.review_submitted` not collected (N+1 API cost). `review_latency_seconds` = nil.
- `pull_request.review_requested` not collected (Timeline API required).
- Collectors use default HTTP client (nil); production should use a client with connection pooling.

---

## Step 29 — Lineage, Quality Contract, GroupBy Rejection, Filter Validation, Activity Feed

### Files created
- `cmd/api/biz/activity_feed_svc.go`
- `cmd/api/biz/metric_query_svc_step29_test.go` (19 tests)
- `cmd/api/biz/pipeline_integration_test.go` (5 integration tests)

### Files modified
- `cmd/api/domain/metrics_catalog.go` — QualityContract + Lineage added to MetricQueryResult
- `cmd/api/domain/activity.go` — ActivityFeedQuery + ActivityFeedItem added
- `cmd/api/biz/metric_query_svc.go` — lineage/quality build; groupBy + filter validation
- `cmd/api/biz/errors.go` — ErrUnsupportedGroupBy, ErrUnsupportedFilter
- `cmd/api/handlers/metric_query.go` — maps new errors to 400
- `cmd/api/handlers/widget_data.go` — activity_feed support; new error codes
- `cmd/api/repo/event_repo.go` — QueryActivityFeed method (fmt, strings imports)
- `cmd/api/main.go` — ActivityFeedSvc in RouterDeps; WithActivityFeed wiring
- `cmd/api/runtime.go` — activityFeedSvc field + wiring

### Tests added
19 unit tests + 5 integration tests (all green):
- Lineage: metricId, formulaId, formulaVersion, sourceIds from filter, normalizedEventTypes
- QualityContract: coverage%, earliestDataAt, latestDataAt for empty/full/partial
- GroupBy: ErrUnsupportedGroupBy on non-empty groupBy
- Filter: ErrUnsupportedFilter on unknown keys; known keys accepted
- ActivityFeedSvc: full, empty, no free-form text, filter rejection, limit default/max
- Pipeline integration: collect→normalize→query flow; duplicate dedup; build failure rate; activity feed

### API changes (additive)
- `POST /api/v1/metrics/query` response: new `qualityContract` and `lineage` fields
- `POST /api/v1/metrics/widget-data`: now accepts `activity_feed` widget type
- `POST /api/v1/metrics/query` and widget-data: new 400 codes `UNSUPPORTED_GROUP_BY`, `UNSUPPORTED_FILTER`

---

## Step 30 — Production Hardening

### Files created
- `cmd/api/migrations/012_add_query_indexes.sql`
- `cmd/api/biz/workspace_isolation_test.go` (3 audit tests)
- `cmd/api/DATA_CORE_PROGRESS_STEPS_28_30.md` (this file)

### Files modified
- `cmd/api/biz/collector_svc.go` — slog structured logging at 5 lifecycle points

### Indexes added (migration 012)
- `normalized_events(source_connection_id, occurred_at DESC)`
- `normalized_events(event_type, occurred_at DESC)`
- `collector_runs(source_connection_id, started_at DESC)`

### Workspace isolation gaps documented
- MetricQuerySvc: no SQL workspace scoping ⚠️ TODO Phase 3
- NormalizerSvc: hard-coded 'default' workspace ⚠️ TODO Phase 3

---

## Final verification

```
go test ./cmd/api/... -count=1 -short   → all 12 packages PASS
go build ./...                           → exit 0
```
