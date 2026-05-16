# Metraly Data Core Backend Progress — Steps 19–27

**Last updated:** 2026-05-16 (session checkpoint)
**Branch:** `migration`
**Mode:** Subagent-driven development with spec + quality reviews

---

## Status Summary

| Step | Title | Status | Commit |
|------|-------|--------|--------|
| 19–20 | Wire CollectorSvc into runtime + Collector API handlers | ✅ DONE | f000cde + f95fd9d (fixes) |
| 21 | Wire NormalizerSvc into collector pipeline | ✅ DONE | 30f0851 + 9f0fea3 (fixes) |
| 22 | Implement Identity Resolution in NormalizerSvc | ⏳ PENDING | — |
| 23 | Add Metric Catalog and Formula Validator API | ⏳ PENDING | — |
| 24–25 | Implement Metric Query Engine MVP + Data Quality/Lineage | ⏳ PENDING | — |
| 26 | Add backend WidgetDataContract adapter | ⏳ PENDING | — |
| 27 | Final verification, safety audit, and report | ⏳ PENDING | — |

**Test status:** All 13 packages pass (`go test ./cmd/api/... -count=1 -short`)

---

## What's Been Implemented (Steps 19–21)

### Step 19–20: Collector Runtime Wiring + API Handlers
**Commits:** `f000cde` (main) + `f95fd9d` (quality fixes)

#### Changes:
- **runtime.go**: Added `collectorSvc *biz.CollectorSvc` and `normalizerSvc *biz.NormalizerSvc` to `runtimeDeps`; instantiated after `sourceSvc` using shared `eventRepo := repo.NewEventRepo(pool)`
- **main.go**: Added `CollectorSvc` to `RouterDeps`; registered 3 collector routes in both protected (auth) and public router groups
- **handlers/collectors.go** (new): `CollectorHandler` with three endpoints:
  - `POST /api/v1/sources/{id}/collect` → 202 with `CollectorRun`
  - `GET /api/v1/sources/{id}/collector-runs?limit=N` → list with default 20, max 100
  - `GET /api/v1/collector-runs/{id}` → single run or 404
- **biz/collector_svc.go**: Added `ErrNoCollectorRegistered` sentinel error; wrapped with `%w` for robust error checking
- **handlers/collectors_test.go** (new): 8 tests including secret-leak assertion

#### Quality fixes applied:
1. **Error codes**: Changed all error codes from `lower_snake_case` to `SCREAMING_SNAKE_CASE` (SOURCE_NOT_FOUND, NO_COLLECTOR_REGISTERED, etc.) to match project convention
2. **Error detection**: Replaced fragile `strings.Contains(err.Error(), "no collector registered")` with `errors.Is(err, biz.ErrNoCollectorRegistered)` sentinel
3. **Test quality**: Strengthened `TestCollectorHandler_ListRuns_MaxLimit` to seed 101 runs and assert exactly 100 are returned (proves clamping works)

---

### Step 21: NormalizerSvc Into Collector Pipeline
**Commits:** `30f0851` (main) + `9f0fea3` (quality fixes)

#### Changes:
- **biz/collector_svc.go**: Added optional `normalizer *NormalizerSvc` field; introduced `WithNormalizer()` setter; extended `Run()` to normalize only newly-inserted events (skips duplicates)
- **repo/event_repo.go**: Added `InsertRawSourceEventsBatchWithOutcomes(ctx, events) ([]domain.RawEventInsertOutcome, error)` returning per-event insert outcomes
- **biz/collector_svc.go**: Extended `RawEventIngestRepo` interface with `InsertRawSourceEventsBatchWithOutcomes` method
- **runtime.go**: Calls `collectorSvc.WithNormalizer(normalizerSvc)` after both services are created
- **domain/events.go**: Moved `RawEventInsertOutcome` struct here (contains `Event *domain.RawSourceEvent` + `Inserted bool`)
- **biz/collector_svc_test.go**: Added 3 new tests:
  - `TestCollectorSvc_NormalizedEventsInsertedOnce` — raw inserted once → normalized once
  - `TestCollectorSvc_DuplicateRawEvent_NoNormalized` — duplicate raw → no second normalized
  - `TestCollectorSvc_NormalizerIgnoredEvent_RunSucceeds` — ignored normalization error → run succeeds

#### Quality fixes applied:
1. **Dead code elimination**: Restructured normalizer error handling to make category check meaningful (not shadowed by outer unconditional continue)
2. **Dependency direction**: Moved `RawEventInsertOutcome` to `domain` package to avoid `biz` importing `repo` package
3. **String constants**: Added `NormCategoryIgnoredKnown`, `NormCategoryUnsupportedSrc`, `NormCategoryInvalidPayload`, `NormCategoryMappingError` constants; replaced all raw string literals
4. **Interface cleanup**: Removed dead `InsertRawSourceEventsBatch` from `RawEventIngestRepo` interface (concrete method stays on `EventRepo`)

---

## API Endpoints Now Available (Steps 19–20)

### Collector Trigger & Run Inspection
```
POST   /api/v1/sources/{id}/collect
       Returns 202 with CollectorRun
       Errors: 404 (source not found), 422 (no collector registered)

GET    /api/v1/sources/{id}/collector-runs?limit=N
       Returns list; default 20, max 100

GET    /api/v1/collector-runs/{id}
       Returns CollectorRun or 404
```

---

## Data Flow Now Implemented (Steps 19–21)

```
SourceConnection (id={id})
  ↓
POST /api/v1/sources/{id}/collect
  ↓
CollectorSvc.Run()
  ├─ Load source + decrypt credential
  ├─ Dispatch to registered Collector (none registered yet; returns error)
  ├─ Persist raw events (idempotent; duplicates silently skipped)
  ├─ For each newly-inserted event:
  │   └─ NormalizerSvc.NormalizeAndStore()
  │       ├─ Maps GitHub PR/Actions, Jira events to canonical types
  │       ├─ Persists NormalizedEvent (cycle_time, review_latency, duration fields)
  │       └─ Non-fatal errors (ignored_known_unsupported, unsupported_source) → skip
  └─ Persist CollectorRun state (started → running → succeeded/failed)
       Return CollectorRun to API
  ↓
GET /api/v1/sources/{id}/collector-runs/{runID}
  Returns CollectorRun with status, raw_event_count, error details
```

---

## Not Yet Implemented (Steps 22–27)

### Step 22: Identity Resolution
**Purpose:** Stop treating external logins/account IDs as final internal IDs

**Spec:**
- Normalizer must call `IdentityResolver.ResolveIdentity(workspace, sourceType, externalID)`
- If unresolved: persist with `status='unresolved'`; leave `AuthorID`/`ReviewerID` empty
- If mapped: use internal `user_id`; propagate `TeamID`
- Add unresolved flags to `domain.NormalizedEvent` if schema supports them

**Blocking on:** `domain.NormalizedEvent` may need `AuthorUnresolved`, `ReviewerUnresolved` fields (check if already present)

### Step 23: Metric Catalog & Formula Validator API
**Endpoints:**
```
GET  /api/v1/metrics/catalog            → list all metrics
GET  /api/v1/metrics/catalog/{metricId} → single metric or 404
POST /api/v1/formulas/validate          → validate expression; return errors or empty
```

**Note:** `biz.MetricCatalog` (6 MVP metrics) and `biz.FormulaValidator` exist; just need handler layer

### Step 24–25: Metric Query Engine MVP + Data Quality
**Endpoints:**
```
POST /api/v1/metrics/query → execute query; return MetricQueryResult with:
  - data: MetricDataFrame (columns + rows)
  - quality: DataQualityLevel (full | partial | estimate | empty)
  - qualityNotes: []string (caveats, missing sources, etc.)
  - lineage: MetricID, FormulaID, SourceIDs, NormalizedEventTypes
```

**MVP metrics:** `pr_count`, `pr_cycle_time_median`, `review_latency_median`, `build_failure_rate`, `build_duration_p95`, `sprint_predictability`

**Important:** Never fake results; return `quality=empty` with notes if data insufficient

### Step 26: WidgetDataContract Adapter
**Purpose:** Convert `MetricQueryResult` into widget-safe response shapes

**Endpoint:**
```
POST /api/v1/widgets/data → WidgetSpec input → WidgetDataContract output
```

Supported widget types: `kpi_card`, `line_chart`, `bar_chart`, `table`, `activity_feed`

### Step 27: Final Verification
**Checklist:**
- [ ] No UI files modified (`ui/`, `*.tsx`, `*.jsx`, `*.css`)
- [ ] All backend packages pass tests
- [ ] All files have SPDX header
- [ ] Error handling is explicit (no silent failures)
- [ ] No credentials in responses
- [ ] Migration count matches `db/migrate_test.go` expectations

---

## Key Architecture Decisions Made

### Identity & Secrets
- ✅ Credentials decrypted in service scope, zeroed immediately after use
- ✅ No plaintext email stored in `identity_mappings` (SHA-256 hash only)
- ✅ Raw secrets never logged or returned in API responses

### Idempotency
- ✅ Raw event deduplication: `ON CONFLICT DO NOTHING` on `(source_connection_id, deduplication_key)`
- ✅ Duplicate raw events → no duplicate normalized events (checked by `Inserted bool`)

### Error Handling
- ✅ Normalizer errors with known categories (`ignored_known_unsupported`, `unsupported_source`) are non-fatal
- ✅ Collector run lifecycle captures error category for diagnosis without leaking secrets
- ✅ Adapter registry panics on duplicate registration (programming error, not runtime)

### Dependency Direction
- ✅ `biz` does not import concrete `repo` package types (avoided import cycle)
- ✅ Interfaces segregated by responsibility (`CollectorRunRepo`, `RawEventIngestRepo`, `NormalizedEventRepo`)

### Constants Over Strings
- ✅ Normalizer error categories defined as constants (`NormCategoryIgnoredKnown`, etc.)
- ✅ Error codes in API responses use `SCREAMING_SNAKE_CASE` (matches project convention)

---

## Files Modified (Summary)

### Created
- `cmd/api/handlers/collectors.go` — collector API handler
- `cmd/api/handlers/collectors_test.go` — handler tests
- `.subagent-context.md` — shared context for subagents

### Modified
- `cmd/api/runtime.go` — added collectorSvc, normalizerSvc, eventRepo
- `cmd/api/main.go` — added RouterDeps.CollectorSvc, registered 3 routes
- `cmd/api/biz/collector_svc.go` — added WithNormalizer, normalization logic, ErrNoCollectorRegistered, category constants
- `cmd/api/biz/normalizer_svc.go` — added error category constants
- `cmd/api/repo/event_repo.go` — added InsertRawSourceEventsBatchWithOutcomes
- `cmd/api/domain/events.go` — added RawEventInsertOutcome struct

---

## Test Coverage
- 13/13 backend packages pass
- Handler layer: 8 new tests (happy path, source not found, no collector, list/get/max-limit, secret leak)
- Service layer: 3 new tests (normalized once, dedup suppression, ignored error non-failure)
- Existing tests: all pass (no regressions)

---

## To Resume: Next Subagent Tasks

After this checkpoint, dispatch in order:

1. **Step 22** — Identity Resolution in NormalizerSvc
   - Check `domain.NormalizedEvent` for unresolved fields
   - Export `IdentityResolver` interface from biz
   - Update `NormalizerSvc` to resolve authors/reviewers
   - Add repo methods for identity lookup/upsert
   - Tests: 6 scenarios (mapped/unresolved authors, reviewers, Jira reporters)

2. **Step 23** — Metric Catalog API
   - Create `handlers/metrics_catalog.go`
   - Route 3 endpoints to existing biz.MetricCatalog + FormulaValidator
   - Tests: 6 scenarios (list, get, not found, valid/invalid formula)

3. **Step 24–25** — Metric Query Engine + Quality
   - Create `biz/metric_query_svc.go` + `repo/metric_query_repo.go`
   - Query normalized_events; compute aggregations per metric
   - Tests: 6 scenarios (counts, medians, percentiles, empty data, unsupported metric)

4. **Step 26** — WidgetDataContract Adapter
   - Create `handlers/widget_data.go`
   - Map query result to widget shapes
   - Tests: 5 scenarios (KPI, chart types, unsupported widget)

5. **Step 27** — Final audit
   - Run safety checks, forbidden paths, build, tests
   - Generate final report

---

## Session Notes

- **Turn 1:** Implemented Steps 1–9 (source registry) → merged to migration
- **Turn 2:** Implemented Steps 10–18 (collector pipeline + normalizer + catalog) → merged to migration
- **Turn 3 (current):** Implementing Steps 19–27 (wiring + APIs)
  - Completed: 19, 20, 21 (with quality review loops)
  - Pending: 22–27
  - Session aborted at Step 22 prep; checkpoint saved here

**Branch status:** All work on `migration` (not main yet); Steps 1–21 ready to merge

---

## Commands to Resume

```bash
# Verify clean state
cd /home/zubarev/Projects/metraly/app
git status
go build ./...
go test ./cmd/api/... -count=1 -short

# View recent commits
git log --oneline -6

# Inspect latest step
git show --stat HEAD
```
