# Backend Review Remediation Report — 2026-05-19

> Supersedes `BACKEND_REVIEW_2026-05-18.md` (now stale).
> That file's P0/P1 findings were either already fixed in `main` before this session,
> or are addressed in this report. See "Fixed in prior session" table below.

---

## Baseline

- **Starting HEAD**: `f6eace46a878f9c7d65f624789bbd68c904239e0`
- **Final HEAD / working tree state**: same commit; all fixes applied as working-tree changes (uncommitted)
- **Branch**: `main`

### Baseline commands

```
go build ./...                                → BUILD OK
go test ./cmd/api/... -count=1 -short         → 12/12 packages PASS
go test ./cmd/api/... -race -short            → 12/12 packages PASS (no data races)
go vet ./cmd/api/...                          → VET OK
gofmt -l $(find cmd/api -name '*.go')         → FMT CLEAN
git diff --check                              → DIFF OK
UI/frontend path check                        → NO UI CHANGES
```

---

## Fixed in prior session (already present in starting HEAD)

| ID | Finding | Status |
|----|---------|--------|
| P0-1 (prior) | `GetSource`/`GetEncryptedSecret` not workspace-scoped | Fixed: SQL `WHERE id=$1 AND workspace_id=$2` |
| P0-2 (prior) | `NormalizeAndStore` hardcoded `"default"` workspace | Fixed: explicit workspaceID parameter |
| P0-3 (prior) | Deterministic normalized event IDs | Fixed: `normID()` = SHA-256 hash |
| P0-4 (prior) | CORS wildcard `AllowedOrigins: ["*"]` | Fixed: `CORSAllowedOrigins` allowlist config |
| P0-5 (prior) | `workspaceID()` hardcoded to `"default"` | Fixed: reads from JWT claims |
| P1-x (prior) | Collector lifecycle context, run-in-flight guard, etc. | 14 P1s fixed; see old report |

---

## P0 findings fixed in this session

### P0-1 — MetricQueryHandler and WidgetDataHandler trusted body workspaceId

**Problem**: `MetricQueryHandler.Query` and `WidgetDataHandler.Query`/`handleActivityFeed` used `workspaceId` from the request body to scope tenant data queries. An authenticated attacker could supply a different tenant's workspace ID to read their metric data.

**Fix**:
- Both handlers now call `workspaceID(r)` (JWT claims) as the first operation; return 401 if missing.
- `WorkspaceID` in request structs is kept for backward-compatibility but explicitly ignored (`// ignored; use JWT claims`).
- Internal 5xx responses no longer expose raw `err.Error()` (P1-8 piggyback fix).

**Files**: `cmd/api/handlers/metric_query.go`, `cmd/api/handlers/widget_data.go`

**Tests added**:
- `TestMetricQueryHandler_UsesWorkspaceFromClaims_NotBody` — malicious body workspace ignored
- `TestMetricQueryHandler_MissingClaimsWorkspace_Returns401`
- `TestMetricQueryHandler_InternalError_DoesNotLeakDetails`
- `TestWidgetDataHandler_MetricWidget_UsesWorkspaceFromClaims_NotBody`
- `TestWidgetDataHandler_ActivityFeed_UsesWorkspaceFromClaims_NotBody`
- `TestWidgetDataHandler_MissingClaimsWorkspace_Returns401`

---

### P0-2 — Collector run reads not workspace-scoped

**Problem**: `GET /api/v1/collector-runs/{id}` and `GET /api/v1/sources/{id}/collector-runs` fetched runs by ID/sourceID only, with no workspace JOIN. An authenticated user could enumerate run metadata for sources in other workspaces.

**Fix**:
- `CollectorRunFetcher` interface changed to `GetCollectorRun(ctx, workspaceID, id)` and `ListCollectorRuns(ctx, workspaceID, sourceConnectionID, limit)`.
- `SourceRepo.GetCollectorRun` (in `event_repo.go`) now JOINs `source_connections sc` and adds `WHERE sc.workspace_id=$2`.
- `SourceRepo.ListCollectorRuns` (in `source_repo.go`) now JOINs `source_connections` with workspace condition.
- `CollectorHandler.GetRun` and `ListRuns` extract workspace from JWT claims; return 401 if missing.
- `CollectorRunRepo` (biz interface) simplified: `GetCollectorRun` and `ListCollectorRuns` removed since `CollectorSvc.Run` never calls them — read-side is `CollectorRunFetcher` only.

**Files**: `cmd/api/handlers/collectors.go`, `cmd/api/repo/event_repo.go`, `cmd/api/repo/source_repo.go`, `cmd/api/biz/collector_svc.go`

**Tests added**:
- `TestCollectorHandler_ListRuns_NoWorkspace_Returns401`
- `TestCollectorHandler_GetRun_NoWorkspace_Returns401`
- `TestCollectorHandler_ListRuns_UsesWorkspaceFromClaims`
- `TestCollectorHandler_GetRun_CrossWorkspace_Returns404`

---

### P0-3 — Dashboard ownership not enforced

**Problem**: `Get`, `Update`, `UpdateLayout`, `UpdateShare`, and `Fork` used dashboard ID only. Any authenticated user knowing another user's dashboard ID could read, mutate, share, or fork it. `dashboardOwnerID` fell back to `"admin-seed"` when claims were absent.

**Fix**:
- `DashboardSvc.GetByIDForUser(ctx, id, userID)` — allows own or public; 404 otherwise.
- `DashboardSvc.GetByIDOwned(ctx, id, userID)` — must own; 404 otherwise.
- `DashboardSvc.UpdateForUser`, `UpdateLayoutForUser`, `UpdateShareForUser` — enforce ownership before write.
- `DashboardHandler.Get`/`Fork` use `GetByIDForUser`; `Update`/`UpdateLayout`/`UpdateShare` use `GetByIDOwned`.
- `currentUserID(r)` introduced; returns `("", false)` when claims absent — all protected dashboard routes return 401.
- `dashboardOwnerID` (fallback to `"admin-seed"`) removed entirely — was dead code.

**Files**: `cmd/api/handlers/dashboards.go`, `cmd/api/biz/dashboard_svc.go`, `cmd/api/biz/errors.go`

**Tests added** (in `cmd/api/handlers/dashboard_auth_test.go`):
- `TestDashboardHandler_Get_PrivateOtherUser_Returns404`
- `TestDashboardHandler_Get_PublicOtherUser_Allowed`
- `TestDashboardHandler_Update_PrivateOtherUser_Returns404Or403`
- `TestDashboardHandler_UpdateLayout_PrivateOtherUser_Returns404Or403`
- `TestDashboardHandler_UpdateShare_PrivateOtherUser_Returns404Or403`
- `TestDashboardHandler_Fork_PrivateOtherUser_Returns404Or403`
- `TestDashboardHandler_Fork_PublicOtherUser_Allowed`
- `TestDashboardHandler_Get_OwnPrivateDashboard_Allowed`
- `TestDashboardHandler_Get_MissingClaims_Returns401`

---

## P1 findings fixed in this session

### P1-1 — Active-run guard not atomic at DB level

**Problem**: Application-level pre-check (`GetActiveRunForSource` then `CreateCollectorRun`) is race-prone; two concurrent requests could both pass the check and both create active runs.

**Fix**: Migration `013_collector_runs_active_unique_idx.sql` adds:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS collector_runs_one_active_per_source_idx
ON collector_runs(source_connection_id)
WHERE status IN ('started', 'running');
```
`CreateCollectorRun` detects unique-index violations and returns `ErrActiveRunExists`. `CollectorSvc.Run` maps this to `ErrRunInFlight` → HTTP 409.

---

### P1-2 — CreateCollectorRun ON CONFLICT silently ignored

**Problem**: `ON CONFLICT (id) DO NOTHING` hid conflicts; if a run ID existed for a different source, the service continued as if it created a new row.

**Fix**: `CreateCollectorRun` now checks `RowsAffected()`. If 0, it queries the existing row's `source_connection_id`:
- Same source → idempotent retry (safe).
- Different source → returns `ErrRunIDConflict` (programming bug detection).
- DB unique-index violation → returns `ErrActiveRunExists`.

---

### P1-3 — No schema constraints on source registry

**Problem**: `source_connections.source_type`, `status`, `credential_id` and `collector_runs.status` were unconstrained TEXT. Invalid values could corrupt business logic.

**Fix**: Migration `014_source_registry_constraints.sql` adds (idempotent `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL END $$`):
- `source_connections_source_type_check` — known SourceType values
- `source_connections_status_check` — known SourceStatus values
- `source_connections_credential_fk` — FK → `credential_refs(id) ON DELETE SET NULL`
- `credential_refs_source_type_check`
- `credential_refs_kind_check`
- `collector_runs_status_check`

---

### P1-4 — Other handlers trusting workspace/ownerID from request

Full audit via `git grep WorkspaceID|workspaceId|workspace_id|OwnerID|owner_id cmd/api`:
- `MetricQueryHandler` → fixed (P0-1)
- `WidgetDataHandler` → fixed (P0-1)
- `DashboardHandler` → fixed (P0-3); `OwnerID` in `Create` comes from `currentUserID(r)`; `Update` preserves `current.OwnerID`
- `SourceHandler`, `CollectorHandler` → already using `workspaceID(r)` from JWT claims (prior session fix)
- `PreviewHandler.Activity` → now uses `workspaceID(r)` for `activityRepo.List`
- No remaining handler trusts workspaceId or ownerID from request body.

---

### P1-5 — Legacy mock endpoints publicly accessible in production

**Problem**: `/api/v1/teams`, `/api/v1/dashboard`, and team sub-routes returned hardcoded mock JSON without auth, publicly accessible in all environments.

**Fix**:
- `AppConfig.EnableLegacyMockEndpoints bool` added; default: `false` in production, `true` in development.
- `RouterDeps.EnableLegacyMockEndpoints` threads config into router.
- In `NewRouter`, all legacy endpoints are wrapped in `if deps.EnableLegacyMockEndpoints { ... }`.
- Env var `ENABLE_LEGACY_MOCK_ENDPOINTS=true` enables them explicitly in any environment.

**Tests**:
- `TestLegacyMockEndpoints_DisabledInProduction` — 404 when disabled
- `TestLegacyMockEndpoints_EnabledInDevelopmentIfConfigured` — 200 when enabled

---

### P1-6 — ActivityRepo global (not workspace-scoped)

**Problem**: `ActivityRepo.List(ctx, limit)` returned global `activity_events` rows with no workspace filter. A call from one workspace could expose another workspace's activity if the same table held real multi-tenant data.

**Fix**:
- Migration `015_activity_events_workspace.sql` adds `workspace_id TEXT NOT NULL DEFAULT ''` and a workspace index.
- `ActivityRepo.List` signature changed to `List(ctx, workspaceID, limit)`: returns `ErrMissingWorkspace` when workspaceID is empty.
- `ActivityRepo.BulkInsert` stores `workspace_id` from `domain.ActivityEvent.WorkspaceID`; empty is accepted for legacy seed rows (not surfaced by `List`).
- `domain.ActivityEvent` gains `WorkspaceID` field.
- All callers updated to pass workspace from JWT claims.

---

### P1-7 — Credential key handling (deferred from prior session)

Already addressed in prior session via `deriveSourceKey` in `runtime.go`:
- Production (`APP_ENV=production`) refuses to start if neither `SOURCE_SECRET_KEY` nor `JWT_PRIVATE_KEY` is set.
- `DeriveKey` is documented as dev-only; production requires explicit key material.

No change required this session.

---

### P1-8 — Error responses leaking internal details

**Problem**: Multiple handler 5xx responses used `err.Error()` directly, potentially exposing SQL relation names, constraint names, table layout, or internal token store details.

**Fix**: All `http.StatusInternalServerError` responses now use static human-readable strings. Affected handlers:
- `auth.go`: AUTH_LOGIN_FAILED, AUTH_REFRESH_FAILED, AUTH_LOGOUT_FAILED
- `ingestion.go`: INGEST_FAILED
- `metrics_catalog.go`: INTERNAL_ERROR (×2)
- `preview.go`: TEMPLATES_LIST_FAILED, DORA_FAILED, METRIC_FAILED, METRIC_BREAKDOWN_FAILED, INSIGHTS_FAILED
- `metric_query.go`: QUERY_FAILED (already fixed when rewriting for P0-1)
- `widget_data.go`: QUERY_FAILED, ADAPT_FAILED (already fixed when rewriting for P0-1)

HTTP 400 validation responses (`INVALID_JSON`, `INVALID_START`/`INVALID_END`, domain validation errors) intentionally retain `err.Error()` since they describe user input, not internal implementation.

---

## Concurrency / async review

Search: `grep -rn "go func|WaitGroup|atomic\.|chan |errgroup" cmd/api/ (non-test)`

**Found**:
- `main.go:301` — `go func()` for signal handler: single goroutine, properly guarded by buffered `chan os.Signal`; `signal.Stop(quit)` called in deferred `Stop`. Clean.
- No `sync.WaitGroup`, `errgroup`, `atomic.*`, unowned goroutines, or channel ownership issues found in production code.
- `CollectorSvc.Run` uses `context.WithoutCancel(ctx)` for final DB writes (prevents client-disconnect orphan); `failRunBackground` uses `context.Background()`. Both correct.

**Race detector result**: 12/12 packages PASS, no data races.

---

## Migration notes

| File | Change |
|------|--------|
| `013_collector_runs_active_unique_idx.sql` | Partial unique index enforcing at most one active run per source (P1-1) |
| `014_source_registry_constraints.sql` | CHECK constraints on source_type/status/kind; FK on credential_id (P1-3) |
| `015_activity_events_workspace.sql` | `workspace_id` column on activity_events with index (P1-6) |

Migration 013 requires no data backfill (new constraint applies only to future inserts).
Migration 014 FK will fail if existing rows have dangling `credential_id` values; add data cleanup step before applying in production with existing data.
Migration 015 adds column with `DEFAULT ''`; existing rows get empty workspace_id and are silently excluded from `List` queries.

---

## Files changed

```
cmd/api/biz/collector_svc.go              — Remove GetCollectorRun/ListCollectorRuns from interface; ErrActiveRunExists mapping
cmd/api/biz/dashboard_svc.go              — GetByIDForUser, GetByIDOwned, UpdateForUser, UpdateLayoutForUser, UpdateShareForUser
cmd/api/biz/errors.go                     — ErrDashboardNotFound, ErrDashboardAccessDenied
cmd/api/config/config.go                  — EnableLegacyMockEndpoints
cmd/api/domain/activity.go                — WorkspaceID on ActivityEvent
cmd/api/handlers/auth.go                  — Remove err.Error() from 5xx responses
cmd/api/handlers/collectors.go            — CollectorRunFetcher workspace-scoped; ListRuns/GetRun use JWT claims
cmd/api/handlers/dashboards.go            — Ownership enforcement; currentUserID(); remove dashboardOwnerID
cmd/api/handlers/ingestion.go             — Remove err.Error() from error response
cmd/api/handlers/metric_query.go          — Workspace from JWT claims; remove body workspace; fix 500 leak
cmd/api/handlers/metrics_catalog.go       — Remove err.Error() from 5xx responses
cmd/api/handlers/preview.go               — Pass workspace to activityRepo.List; remove err.Error() from 5xx
cmd/api/handlers/sources.go               — workspaceIDFromCtx helper
cmd/api/handlers/widget_data.go           — Workspace from JWT claims; remove body workspace; fix 500 leaks
cmd/api/main.go                           — EnableLegacyMockEndpoints in RouterDeps; gate legacy endpoints
cmd/api/repo/activity_repo.go             — Workspace-scoped List; BulkInsert stores workspace_id
cmd/api/repo/event_repo.go                — GetCollectorRun workspace JOIN
cmd/api/repo/source_repo.go               — ListCollectorRuns workspace JOIN; ErrRunIDConflict; ErrActiveRunExists

New migration files:
cmd/api/migrations/013_collector_runs_active_unique_idx.sql
cmd/api/migrations/014_source_registry_constraints.sql
cmd/api/migrations/015_activity_events_workspace.sql

Test files updated/created:
cmd/api/biz/ingestion_svc_test.go         — List signature updated
cmd/api/handlers/collectors_test.go       — Workspace context; new P0-2 tests
cmd/api/handlers/dashboard_auth_test.go   — NEW: P0-3 ownership tests
cmd/api/handlers/handlers_test.go         — Auth context in dashboard tests
cmd/api/handlers/metric_query_test.go     — Auth context; P0-1 auth tests
cmd/api/handlers/widget_data_test.go      — Auth context; P0-1 auth tests; rename helpers
cmd/api/router_inspection_test.go         — P1-5 legacy endpoint tests
cmd/api/seed/runner_test.go               — List signature updated
```

---

## Security / privacy checklist

| Area | Status |
|------|--------|
| Tenant isolation — metric queries | ✅ Workspace from JWT claims only; body value silently ignored |
| Tenant isolation — widget data | ✅ Same as above |
| Tenant isolation — collector runs | ✅ SQL JOIN enforces workspace; cross-workspace reads return 404 |
| Tenant isolation — dashboards | ✅ Ownership checked before any read or mutation |
| Tenant isolation — activity feed | ✅ workspace_id column added; List requires non-empty workspace |
| Auth/CORS | ✅ (prior session) |
| Secrets / key derivation | ✅ (prior session) |
| Concurrent run guard | ✅ DB partial unique index + ErrActiveRunExists mapping |
| Run ID idempotency | ✅ Same-source retry OK; cross-source conflict returns explicit error |
| Schema constraints | ✅ CHECK + FK constraints in migration 014 |
| Legacy mock endpoints | ✅ Disabled by default in production; opt-in via env var |
| Error response leakage | ✅ All 5xx responses use static messages |
| Owner ID from body | ✅ `Create` uses `currentUserID(r)`; `Update` preserves current owner |
| No UI files modified | ✅ Confirmed via git diff filter |

---

## Final validation commands

```
gofmt -w $(find cmd/api -name '*.go')             → FMT CLEAN
go build ./...                                     → BUILD OK
go test ./cmd/api/... -count=1 -short              → 12/12 PASS
go test ./cmd/api/... -race -short                 → 12/12 PASS, no data races
go vet ./cmd/api/...                               → VET OK
git diff --check                                   → DIFF OK
git diff --name-only | grep -E '\.tsx|\.jsx|^ui/'  → (empty — no UI changes)
```

---

## Production readiness verdict

**ACCEPT WITH FOLLOW-UP**

All P0 findings are closed. All P1 findings are fixed or deferred with documented rationale.

### Follow-up items (next sprint)

| Item | Risk | Action |
|------|------|--------|
| Migration 014 FK backfill | Medium — FK will fail if existing rows have dangling credential_id | Run data cleanup SQL before `014` in production |
| Activity events workspace backfill | Low — existing rows have empty workspace_id, invisible to List | Backfill script for existing rows in desired workspace |
| `DashboardSvc.Update` (unrestricted variant) | Low — only called via `UpdateForUser` which pre-validates ownership | Can remove unrestricted variant once admin tooling migrates |
| Source secret: require base64-encoded 32 random bytes in production | Medium — `DeriveKey` with SHA-256 remains brute-forceable | Add `SOURCE_SECRET_KEY_B64` validation or argon2id in next hardening pass |
