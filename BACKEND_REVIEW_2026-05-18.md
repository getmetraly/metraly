> **SUPERSEDED** — This document is stale. Use `BACKEND_REVIEW_REMEDIATION_REPORT_2026-05-19.md` as the current source of truth.
> All findings from this review have been addressed (either fixed in the session documented by the earlier `BACKEND_REVIEW_REMEDIATION_REPORT_2026-05-19.md`, or fixed in the new remediation session on 2026-05-19).

# Backend Coding Review Report — getmetraly/metraly

**Date**: 2026-05-18  
**Repo**: https://github.com/getmetraly/metraly  
**Branch**: main  
**HEAD**: `4c6e799c834201444c7b8f31f0f58bffd4a0997a`

---

## Executive Verdict

**REQUEST CHANGES** — 5 P0 blockers, 19 P1 high-severity issues

### Critical Issues

- **Multi-tenancy is NOT enforced** at the repo layer for `GetSource`, `GetEncryptedSecret`, and `QueryActivityFeed`. `workspaceID()` in the sources handler returns `"default"` unconditionally. Together these constitute a complete multi-tenant isolation bypass for credential and source reads.
- **Normalized event deduplication is broken**: random IDs mean `ON CONFLICT (id) DO NOTHING` never fires on retry, so pipeline crashes produce duplicate normalized events that silently corrupt every downstream metric.
- **Identity resolution hard-codes workspace `"default"`**: in a multi-tenant deployment all workspaces share one identity mapping bucket, cross-polluting author resolution.
- **CORS is misconfigured**: `AllowedOrigins: ["*"]` + `AllowCredentials: true` allows any origin to make credentialed requests — a full same-origin policy bypass.
- **Critical metric contract bugs**: `build_failure_rate` and `sprint_predictability` return values in [0.0, 1.0] but declare `Unit: "percent"` (100× error); GitHub `neutral` conclusion inflates `build_failure_rate`; `EarliestDataAt`/`LatestDataAt` include empty buckets.
- **Infrastructure is fragile**: the migration runner has no per-migration transaction wrapping; two `CREATE TYPE` statements lack `IF NOT EXISTS`, creating a path where a single failure permanently blocks schema migrations.

---

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `go build ./...` | ✅ PASS | Clean |
| `go test ./cmd/api/... -count=1 -short` | ✅ PASS | 12 packages |
| `go test ./cmd/api/... -race -short` | ✅ PASS | 12 packages |
| `go vet ./cmd/api/...` | ✅ PASS | Clean |
| `gofmt -l $(find cmd/api -name '*.go')` | ✅ PASS | All formatted |
| `git diff --check` | ✅ PASS | No whitespace issues |
| Forbidden paths (tsx/jsx/css/scss/ui/) | ✅ PASS | None in diff |

---

## P0 Blockers (5)

### P0-1: Cross-workspace source reads at repo layer

**File**: `cmd/api/repo/source_repo.go:36,94`  
**Issue**: `GetSource(ctx, id)` and `GetEncryptedSecret(ctx, credID)` filter only by `id` — no `workspace_id` predicate. Any caller with a source ID can retrieve any workspace's source configuration and trigger credential decryption.  
**Impact**: Full cross-workspace credential exfiltration. Workspace A can read workspace B's GitHub tokens by knowing (or guessing) their source ID.  
**Fix**: Add `AND workspace_id=$2` to both queries. Thread `workspaceID` through method signatures.  
**Test**: Create sources in two workspaces; call `GetSource` with workspace-A's ID but workspace-B's source ID; expect `ErrNotFound`.

---

### P0-2: Normalized event deduplication broken; duplicate metrics on retry

**File**: `cmd/api/repo/event_repo.go:161`  
**Issue**: `newNormID()` generates random 16 hex chars. `ON CONFLICT (id) DO NOTHING` never matches on retry because each call produces a new ID. Pipeline crash after raw insert but before normalized commit → duplicate normalized events.  
**Impact**: Every downstream metric is corrupted — PR counts double, cycle-time percentiles skew, build failure rates inflate, sprint points inflate.  
**Fix**: Derive normalized event ID deterministically: `id = "nev_" + sha256(raw_source_event_id)[:16]`. Keep `ON CONFLICT (id) DO NOTHING`.  
**Test**: Insert same raw event twice; assert exactly one normalized event row exists.

---

### P0-3: Identity resolution hard-codes workspace "default"; cross-tenant pollution

**File**: `cmd/api/biz/normalizer_svc.go:59,104,117,121,130`  
**Issue**: `const defaultWorkspaceID = "default"` used at all four identity resolution call sites. `NormalizerSvc` carries no workspace field; source's `workspace_id` is never threaded into the normalizer.  
**Impact**: Every workspace's events resolve identities into the `"default"` bucket. Workspace B's authors resolve to workspace A's identity mappings.  
**Fix**: Add `workspaceID string` to `NormalizerSvc` or as per-call parameter. Replace all `defaultWorkspaceID` uses.  
**Test**: Two workspaces with distinct identity mappings; assert author resolution uses correct workspace.

---

### P0-4: QueryActivityFeed workspace filter is conditional; cross-tenant read on empty WorkspaceID

**File**: `cmd/api/repo/event_repo.go:221`  
**Issue**: `if q.WorkspaceID != "" { /* add subquery */ }` — empty `WorkspaceID` silently omits workspace filter. HTTP handler guards against this, but any non-handler caller (internal tool, future route) bypasses the guard.  
**Impact**: Cross-tenant data leak for unscoped read paths.  
**Fix**: `if q.WorkspaceID == "" { return nil, errors.New("WorkspaceID is required") }`. Make workspace subquery unconditional.  
**Test**: Repo-level: `QueryActivityFeed` with empty `WorkspaceID` returns error.

---

### P0-5: CORS misconfigured; same-origin policy completely bypassed

**File**: `cmd/api/main.go:82,85`  
**Issue**: `AllowedOrigins: ["*"]` + `AllowCredentials: true`. Chi/cors reflects the incoming `Origin` header rather than emitting `*` when credentials are enabled — allowing any origin to make credentialed requests.  
**Impact**: Full CSRF/credential-theft attack surface. Any malicious website can issue authenticated requests to the entire API.  
**Fix**: Use explicit origin allowlist from config. Never combine wildcard with `AllowCredentials: true`.  
**Test**: Preflight with `Origin: https://attacker.example`; assert response does NOT reflect that origin.

---

## P1 High (19 issues)

### P1-1: workspaceID() hardcoded to "default"; entire workspace scoping inert

**File**: `cmd/api/handlers/sources.go:67`  
**Issue**: `func workspaceID(_ *http.Request) string { return "default" }`  
**Impact**: All authenticated users see the same workspace. P0-1 fix is neutralized.  
**Fix**: Extract from JWT claim or session context.  
**Test**: Two JWTs with different workspace claims; each sees only its own sources.

---

### P1-2: credential_id has no FK constraint; dangling credential silently accepted

**File**: `cmd/api/migrations/009_create_source_registry.sql`  
**Issue**: `credential_id TEXT` nullable with no `REFERENCES credential_refs(id)` constraint.  
**Impact**: Deleted credential produces empty string; `TestConnection` reports false `TestResultInvalidCreds`.  
**Fix**: Add `REFERENCES credential_refs(id) ON DELETE SET NULL` + `CHECK` that credential_id IS NOT NULL when status != 'not_configured'.  
**Test**: Migration test — `INSERT` with nonexistent credential_id; expect FK violation.

---

### P1-3: DeriveKey uses plain SHA-256 with no salt; production-unsafe

**File**: `cmd/api/biz/source_svc.go:278-283`  
**Issue**: `DeriveKey(passphrase)` is single `sha256.Sum256()`. Exported and called in production.  
**Impact**: Leaked DB dump brute-forced in nanoseconds/attempt via GPU wordlist.  
**Fix**: Replace with `argon2.IDKey` or `scrypt.Key` with random salt. Rename to `deriveKeyInsecure` or `//go:build dev`.  
**Test**: Confirm production path does not call `DeriveKey` with user passphrase.

---

### P1-4: Run() leaves orphaned collector at status='started' on DB update failure

**File**: `cmd/api/biz/collector_svc.go:130-132`  
**Issue**: `started→running` DB update error returns directly without calling `failRun`.  
**Impact**: Orphaned run records accumulate; monitoring alerts fire; idempotency logic blocked.  
**Fix**: `if err := s.runRepo.UpdateCollectorRun(...); err != nil { return s.failRun(...) }`  
**Test**: Inject repo error on first `UpdateCollectorRun`; assert returned run has `Status=failed`.

---

### P1-5: No guard against concurrent duplicate in-flight runs

**File**: `cmd/api/handlers/collectors.go` + `cmd/api/biz/collector_svc.go`  
**Issue**: Two simultaneous `POST /sources/{id}/collect` spawn two independent collection cycles.  
**Impact**: Doubled API quota; interleaved cursor advancement; missed/doubled event windows.  
**Fix**: Before `CreateCollectorRun`, check for `status IN ('started','running')` for sourceID; return 409 if found. Or add `UNIQUE` partial index.  
**Test**: Goroutines call `Run` concurrently; assert exactly one succeeds.

---

### P1-6: CreateCollectorRun has no ON CONFLICT; idempotency claim unmet

**File**: `cmd/api/repo/source_repo.go` + `cmd/api/biz/collector_svc.go`  
**Issue**: Plain `INSERT` with no `ON CONFLICT`. Docstring claims "safe to retry with same ID after crash" — false.  
**Impact**: Crash recovery via caller-supplied runID impossible.  
**Fix**: `INSERT ... ON CONFLICT (id) DO NOTHING`.  
**Test**: Call `Run` twice with same runID; assert no error and exactly one DB record.

---

### P1-7: GitHub secondary rate-limit 403s misclassified; silent data loss

**File**: `cmd/api/biz/github_collector.go:394-399`  
**Issue**: Secondary rate-limit 403s (no `X-RateLimit-Remaining` header, but has `Retry-After`) fall through to hard permission-error handler.  
**Impact**: Repos skipped instead of graceful backoff. Under load, silent data loss + quota exhaustion.  
**Fix**: Check for `Retry-After` header on 403 before generic permission-error handler.  
**Test**: Fake server returns 403 with `Retry-After: 60`; assert `RateLimitState == Throttled`.

---

### P1-8: Zero cycle-time/duration dropped by > 0 guard; distributions biased

**File**: `cmd/api/biz/normalizer_svc.go:218-229,256-259`  
**Issue**: `int64Field(...) > 0` treats explicit 0 (PR merged in same second) as missing, stores NULL.  
**Impact**: Fast PRs and instant workflows omitted from distributions; percentiles biased upward.  
**Fix**: Replace `int64Field + > 0` with `int64FieldOpt + if ok` for cycle_time, review_latency, duration.  
**Test**: Raw payload with `cycle_time_seconds: 0` explicit key; assert stored as non-nil 0.

---

### P1-9: GitHub neutral conclusion mapped to "failure"; build_failure_rate inflated

**File**: `cmd/api/biz/normalizer_svc.go:440`  
**Issue**: `case "timed_out", "action_required", "neutral":` all mapped to `"failure"`. Neutral is informational.  
**Impact**: Repos with optional matrix legs report inflated failure rates.  
**Fix**: Map `neutral` to `"unknown"` (same as fallback).  
**Test**: `TestNormalizeConclusion_Neutral` — assert != "failure".

---

### P1-10: deployment.* events silently discarded; DORA tracking broken

**File**: `cmd/api/biz/normalizer_svc.go` switch statement  
**Issue**: Domain defines `NormEventDeploymentCreated/Succeeded/Failed` but switch has no deployment case; falls through to `NormCategoryIgnoredKnown`.  
**Impact**: All deployment events dropped. DORA deployment frequency / lead time receive zero data.  
**Fix**: Add cases for deployment.created/succeeded/failed mapping to domain constants.  
**Test**: Raw deployment.succeeded event; assert `EventType == NormEventDeploymentSucceeded`.

---

### P1-11: build_failure_rate/sprint_predictability return [0.0,1.0] but declare Unit="percent"; 100× error

**File**: `cmd/api/biz/metric_catalog_svc.go:89,107`  
**Issue**: SQL returns 0.42 (ratio); Unit="percent" implies 42. Any consumer trusting the unit displays 0.42%.  
**Impact**: 100× display error on metrics dashboards.  
**Fix**: Either change Unit to "ratio" or multiply SQL by 100. Add integration test pinning the unit contract.  
**Test**: Seed 4 failures / 10 runs; assert returned value == 40.0 (if Unit=percent) or 0.4 (if Unit=ratio).

---

### P1-12: EarliestDataAt/LatestDataAt include null-value buckets; contradicts contract

**File**: `cmd/api/biz/metric_query_svc.go:146-156`  
**Issue**: Min/max BucketStart tracked unconditionally across all rows, including null-value rows. Domain promises "earliest/latest non-empty bucket".  
**Impact**: Dashboards show "data from Jan-Dec" when data actually exists only Q1.  
**Fix**: Gate timestamp update on `if rows[i].Value != nil { ... }`.  
**Test**: Partial-result test — extend to assert `EarliestDataAt == b1 && LatestDataAt == b1` when only b1 is non-nil.

---

### P1-13: ActivityFeedSvc.Execute missing workspace guard; biz layer allows unscoped reads

**File**: `cmd/api/biz/activity_feed_svc.go:39-77`  
**Issue**: `Execute` never validates `q.WorkspaceID` before calling repo. Any direct call bypasses handler's 400 guard.  
**Impact**: Unscoped cross-tenant read from any internal caller.  
**Fix**: `if q.WorkspaceID == "" { return ActivityFeedResult{}, biz.ErrMissingWorkspaceID }` as first check.  
**Test**: `Execute` with empty WorkspaceID returns error; repo never called.

---

### P1-14: Latent SQL injection via dynamic column interpolation in QueryActivityFeed

**File**: `cmd/api/repo/event_repo.go:226-233`  
**Issue**: `fmt.Sprintf("AND ne.%s = $%d", col, len(args))` — column name is caller-supplied. Defense-in-depth switch currently safe, but switch and `AllowedFilterKeys` are not co-located and can drift.  
**Impact**: If whitelist diverges from switch, real SQL injection via column name is possible.  
**Fix**: Replace with static lookup map: `var filterColSQL = map[string]string{"repository_id": "AND ne.repository_id = $%d", ...}`. Use `filterColSQL[col]`.  
**Test**: Pass filter key not in `AllowedFilterKeys` directly to repo; assert SQL doesn't contain the key.

---

### P1-15: Structural auth bypass; nil KeyManager silently registers all routes without auth

**File**: `cmd/api/main.go:142-175`  
**Issue**: `else if deps.DashboardSvc != nil` branch registers all sensitive routes without auth middleware when `KeyManager == nil`.  
**Impact**: If KeyManager is nil (test env, future refactor), entire API is unauthenticated. No panic, no warning.  
**Fix**: Remove the nil-KeyManager branch. Add panic guard at function entry.  
**Test**: `TestNewRouter_PanicsWithoutKeyManager` — pass `RouterDeps{DashboardSvc: mockSvc}` with nil KeyManager; expect panic.

---

### P1-16: /api/v1/role/{role} is public route; unauthenticated dashboard access

**File**: `cmd/api/main.go:92`  
**Issue**: `r.Get("/api/v1/role/{role}", roleHandler)` registered before `RequireAuth` group.  
**Impact**: Unauthenticated users query role-scoped engineering dashboards.  
**Fix**: Move route inside `RequireAuth` group.  
**Test**: Add to `TestProtectedRoutesHaveMiddleware`; assert unauthenticated request returns 401.

---

### P1-17: Collection runs bound to r.Context(); client disconnect leaves run permanently 'running'

**File**: `cmd/api/handlers/collectors.go:45`  
**Issue**: `h.svc.Run(r.Context(), ...)` — client disconnect immediately cancels context. `failRun`'s DB update uses cancelled context; error discarded; run stuck at 'running'.  
**Impact**: Ghost 'running' rows accumulate. Idempotency logic blocked. Monitoring false-alerts.  
**Fix**: Option A: launch background goroutine with `context.WithoutCancel(r.Context())`, return 202. Option B: use `context.WithTimeout(context.Background(), 5s)` for final DB write.  
**Test**: Cancel context mid-run; assert DB record ends up with `status='failed'`, not 'running'.

---

### P1-18: Migration runner has no per-migration transaction; partial failure leaves schema stuck

**File**: `cmd/api/db/migrate.go:43-65`  
**Issue**: Migrations applied as raw `Exec()` calls with no `BEGIN`/`COMMIT` wrapper. Partial failure leaves DB in inconsistent state; `schema_migrations` never updated; next run fails on already-created object.  
**Impact**: Single migration failure can permanently block schema migrations without manual DB intervention.  
**Fix**: Wrap each migration in transaction: `BEGIN; [statements]; INSERT INTO schema_migrations; COMMIT`. Roll back on error.  
**Test**: Inject migration with valid first statement + invalid second; assert `schema_migrations` not updated; re-run returns error.

---

### P1-19: CREATE TYPE in migrations 001 and 006 lack IF NOT EXISTS

**File**: `cmd/api/migrations/001_create_users.sql:1` and `cmd/api/migrations/006_create_activity_events.sql:1`  
**Issue**: `CREATE TYPE app_role AS ENUM` and `CREATE TYPE activity_type AS ENUM` have no guard. All CREATE TABLE/INDEX in those files use `IF NOT EXISTS`.  
**Impact**: Partial failure (type created, table not yet, schema_migrations not updated) → next run errors on duplicate type.  
**Fix**: Wrap in idempotent block: `DO $$ BEGIN CREATE TYPE app_role AS ENUM (...); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`  
**Test**: Run `Migrate()` twice; assert second run returns nil (idempotency).

---

## P2 Medium (26 issues)

### Summary of P2 Findings

| # | File/Location | Issue | Impact | Fix |
|---|---|---|---|---|
| P2-1 | `biz/source_svc.go:193-200` | All non-OK results collapse to `SourceStatusAuthFailed` | Rate-limited and bad-token sources indistinguishable | Switch on result.Status; map rate-limit → SourceStatusRateLimited |
| P2-2 | `biz/source_svc.go:122` | `SourceStatusTesting` never set; concurrent tests race on final status | Status flip-flop; no in-progress visibility | Set `SourceStatusTesting` before adapter call |
| P2-3 | `biz/source_svc.go` | `TestConnection` runs against deleted/disabled sources; can reactivate them | Deleted sources reactivated via test endpoint | Return `ErrSourceNotFound` if status == deleted |
| P2-4 | `biz/source_adapter.go:118-144` | GitHubActionsAdapter validates PAT but not config keys (org/repo) | Source set to ready but fails at collection | Check for required config keys |
| P2-5 | `handlers/sources.go` | Internal error strings forwarded to HTTP 500 responses | Information disclosure: DB schema, table names visible | Log full error internally; return generic message |
| P2-6 | `biz/source_svc.go` | Secret zeroing via string reassignment; heap remains polluted | Plaintext secrets in memory dumps | Use []byte with explicit zeroing |
| P2-7 | `biz/collector_svc.go:236` | `failRun` uses cancelled context; error discarded | Cancelled runs stay 'running' in DB | Use `context.Background()` for final write |
| P2-8 | `biz/collector_svc.go` | `SkippedRepos` logged but not persisted | Partial collection runs invisible via API | Add `SkippedRepos int` to CollectorRun; persist to DB |
| P2-9 | `biz/collector_svc.go:222-224` | Final success `UpdateCollectorRun` error silently swallowed | Cursor not advanced; run shows 'running' in DB | Return error from final DB write |
| P2-10 | `handlers/collectors.go` | No `Retry-After` header on rate-limited 202 response | Callers retry immediately; no standard HTTP backoff | Set `Retry-After` header from `run.RetryAfter` |
| P2-11 | `biz/github_collector.go:408-424` | No cap on Retry-After delay; no RFC 7231 HTTP-date parsing | Source frozen 24h+ | Cap at 3600s; add HTTP-date fallback |
| P2-12 | `biz/github_collector.go:380-383` | Silent 4MB body truncation → opaque JSON error | Legitimate large responses fail with misleading error | Check `len(body) == githubBodyLimit`; return descriptive error |
| P2-13 | `biz/normalizer_svc.go:116-117,129-130` | Jira `UpsertUnresolved` uses account_id not display_name | Admin identity-mapping UI shows opaque IDs | Pass display_name as externalLogin for Jira |
| P2-14 | `migrations/010_create_event_pipeline.sql` | `normalized_events` is plain table; no `create_hypertable` | Time-range scans degrade at scale | Add `SELECT create_hypertable(...)` call |
| P2-15 | `repo/event_repo.go` | No composite index on `(source_connection_id, occurred_at DESC)` | Activity feed hot path degrades under load | Add composite index for workspace+time queries |
| P2-16 | `repo/metric_query_repo.go:174-183` | `granularityTrunc` silently defaults unknown input to "day" | Defense-in-depth gap; future caller bypasses handler validation | Return (string, error); propagate error |
| P2-17 | `repo/activity_repo.go:23-41` | `pgActivityRepo.List` has no workspace_id filter | Any consumer reads cross-tenant events | Add workspaceID param; enforce WHERE workspace_id = $N |
| P2-18 | `auth/jwt.go:37-42` | Empty `JWT_PRIVATE_KEY` generates ephemeral key; silent restart loop | All tokens invalidated on every deploy | Return error when empty; gate ephemeral key on explicit env var |
| P2-19 | `runtime.go:145-149` | Fallback to `DeriveKey("source-key-v1")` when both secret keys empty | All credentials decryptable by reading codebase | Fail startup if both keys empty; never static literal |
| P2-20 | `main.go:132-137` | Collector trigger/run routes behind RequireAuth but not RequireRole("admin") | Non-admin users trigger collection against any source | Wrap with `RequireRole("admin")` |
| P2-21 | `router_inspection_test.go` | Only 3 of ~20 protected routes verified; all Data Core routes unchecked | Auth regression on new routes goes undetected | Expand protected slice to cover all sensitive routes |
| P2-22 | `biz/workspace_isolation_test.go:64-77` | Two workspace isolation tests assert static map membership not SQL | False confidence that isolation is tested end-to-end | Replace with capturer-based tests verifying propagation |
| P2-23 | `Makefile` + no CI | No `-race` flag; no `.github/workflows/` | Data races ship silently | Add `-race` to Makefile; add CI workflow |
| P2-24 | `docs/data-core-backend-progress.md:129` | States metric query workspace scoping NOT implemented (TODO Phase 3); factually wrong | Security property misrepresented; engineers may add conflicts | Update docs to reflect implemented SQL subquery |
| P2-25 | `main.go:327-332` | `srv.Shutdown(ctx)` error discarded; `signal.Stop` never called | Silent incomplete shutdown; no log evidence | Log shutdown error; add `signal.Stop(quit)` defer |
| P2-26 | `runtime.go:117-130` | Manual `cancel()` instead of `defer cancel()` for Redis context | Maintenance trap; early-return inside block leaks timer goroutine | Change to `defer cancel()` immediately after WithTimeout |

---

## P3 Low (17 issues)

| # | File/Location | Issue |
|---|---|---|
| P3-1 | `handlers/sources.go:Create` | `DisplayName` not validated for empty string |
| P3-2 | `migrations/009_create_source_registry.sql` | `source_type`/`status` unconstrained TEXT; no CHECK; typos accepted |
| P3-3 | `biz/source_adapter.go:DefaultRegistry` | GitLab/Linear/Prometheus types accepted but have no adapter |
| P3-4 | `biz/collector_svc.go:122-132` | Gratuitous two-step `started→running` write |
| P3-5 | `domain/collector.go` | `CollectorRunStatusCancelled` dead constant |
| P3-6 | `biz/github_collector.go` | Malformed cursor fallback has no `CursorDegraded` signal |
| P3-7 | `biz/github_collector.go` | `sanitizeSecret` defined but never called; misleading signature |
| P3-8 | `biz/github_actions_collector.go` | No total-requests-per-run budget cap |
| P3-9 | `biz/normalizer_svc.go` | `UpsertUnresolved` error discarded; no WARN log |
| P3-10 | `biz/metric_query_svc.go` | `FormulaVersion` hardcoded to literal 1 |
| P3-11 | `handlers/widget_data.go` | Typed-nil reflect guard only handles pointer types |
| P3-12 | `handlers/widget_data.go` | Constructs `ActivityFeedQuery` directly; bypasses biz invariants |
| P3-13 | `main.go:243-279` | Four dead handler functions with stale swagger annotations |
| P3-14 | `main.go:42` | `healthHandler` bypasses respond package |
| P3-15 | `router_inspection_test.go` | Tests header rather than HTTP 401 status |
| P3-16 | `biz/pipeline_integration_test.go` | All tests single-workspace; no cross-workspace isolation coverage |
| P3-17 | `main_test.go:24-29` | Racy `time.Sleep(100ms)`; unowned goroutine |

---

## Security and Privacy Checklist

| Check | Status | Notes |
|---|---|---|
| Raw secrets never logged | ✅ PASS | `slog` calls log only IDs, error categories — never token values |
| Authorization header not leaked | ✅ PASS | `middleware/logger.go` does not log headers |
| No PR title/body/commit message stored | ✅ PASS | All free-form fields excluded; verified by tests |
| No plaintext email stored | ✅ PASS | Only SHA-256 hashes in `identity_mappings.external_email_hash` |
| Workspace isolation: metric queries | ⚠️ PARTIAL | SQL path correct; `ActivityFeedSvc` missing biz guard |
| Workspace isolation: sources | ❌ FAIL | No `workspace_id` filter at repo layer; handler hardcodes "default" |
| CORS configured securely | ❌ FAIL | Wildcard + credentials = full origin reflection |
| JWT key from config | ⚠️ PARTIAL | Falls back to static `DeriveKey("source-key-v1")` literal |
| Credential encryption key | ❌ FAIL | Plain SHA-256, no salt |
| Goroutine/channel/WaitGroup safe | ⚠️ PARTIAL | No leaks; critical: run lifecycle tied to `r.Context()` |
| No SQL injection | ⚠️ PARTIAL | Current paths safe; latent risk in column interpolation |
| Admin routes protected | ❌ FAIL | Collector routes not restricted to admin role |

---

## Area-by-Area Review Summary

### Source Registry and Credentials — **INCORRECT**
Two issues together = complete multi-tenant credential bypass. `GetSource`/`GetEncryptedSecret` have no `workspace_id` filter (P0-1); handler hardcodes workspace to "default" (P1-1). `DeriveKey` uses plain SHA-256 (P1-3). Schema lacks FK and CHECK constraints. Multiple test result states collapse to auth-failed status.

### Collector Lifecycle — **INCORRECT**
Three correctness bugs: orphaned run on DB failure (P1-4), no concurrency guard (P1-5), missing `ON CONFLICT` idempotency (P1-6). Context cancellation bypasses final write (P2-7). `SkippedRepos` not persisted (P2-8). Secrets correctly excluded from logs.

### GitHub Collectors — **NEEDS ATTENTION**
Secondary rate-limit 403s misclassified (P1-7). Free-form text correctly excluded; pagination bounded; body reads limited. Two P2 issues: uncapped retry delay, silent truncation.

### Normalizer and Identity Mapping — **INCORRECT**
Two P0 defects: hard-coded workspace (P0-3), random dedup ID (P0-2). Three P1 issues: zero cycle-time dropped (P1-8), neutral→failure (P1-9), deployment events discarded (P1-10). Email privacy correct throughout. Missing hypertable conversion (P2-14).

### Metric Query Engine — **NEEDS ATTENTION**
Workspace isolation correctly implemented. `groupBy` rejected. Filter keys whitelisted. Two P1 issues: unit mismatch 100× error (P1-11), quality contract violation (P1-12). Granularity default is P2 defense-in-depth gap.

### Widget Data and Activity Feed — **NEEDS ATTENTION**
Widget response path correct: no free-form text, limit clamping, filter validation. Three workspace isolation gaps: conditional repo filter (P0-4), missing biz guard (P1-13), unscoped legacy repo (P2-17). Latent SQL injection in column interpolation (P1-14).

### Runtime/Router/Auth — **INCORRECT**
CORS bypass (P0-5). Structural auth bypass on nil KeyManager (P1-15). Public `/role/{role}` route (P1-16). Static encryption key fallback (P2-19). Ephemeral JWT key causes silent logout loop (P2-18). Both collectors correctly registered.

### Async/Concurrency Safety — **NEEDS ATTENTION**
No leaks from channels/tickers/WaitGroups. HTTP bodies correctly closed/limited. Critical issue: run lifecycle bound to `r.Context()` (P1-17). Manual cancel vs defer cancel (P2-26). Shutdown error discarded (P2-25).

### DB/Migrations — **NEEDS ATTENTION**
Well-ordered and numbered. All `ADD COLUMN` use `IF NOT EXISTS`. Two critical gaps: no per-migration transaction (P1-18), bare `CREATE TYPE` (P1-19). Missing hypertable and composite index.

### Tests/CI/Docs — **NEEDS ATTENTION**
38+ test files; good coverage. Two false-positive workspace isolation tests (P2-22). No CI (P2-23). Progress doc inaccurate (P2-24).

---

## Recommended Next Actions

### MUST FIX (Production Multi-Tenant Use)

1. **P0-1**: Add `workspace_id` filter to `GetSource` and `GetEncryptedSecret`
2. **P0-5**: Fix CORS — explicit allowlist or drop `AllowCredentials: true`
3. **P0-2**: Make normalized event IDs deterministic
4. **P0-4**: Make `QueryActivityFeed` workspace filter unconditional
5. **P0-3**: Thread workspace into NormalizerSvc
6. **P1-1**: Extract workspace from JWT claim; remove hardcoded "default"
7. **P1-15**: Remove nil-KeyManager auth-bypass branch; add panic
8. **P1-16**: Move `/api/v1/role/{role}` inside RequireAuth group
9. **P1-11**: Fix build_failure_rate/sprint_predictability Unit mismatch
10. **P1-17**: Decouple collection from `r.Context()`
11. **P1-18 + P1-19**: Wrap migrations in transactions; idempotent CREATE TYPE
12. **P1-9**: Map `neutral` → `"unknown"`, not `"failure"`
13. **P1-10**: Implement deployment event handling
14. **P2-19**: Fail startup when both secret keys empty

### Fix in Next Backend Pass (15+ issues)

15. **P1-4 + P1-5 + P1-6**: Collector run orphan, concurrency guard, idempotency
16. **P1-7**: Secondary rate-limit 403 handling
17. **P1-8**: Zero cycle-time/duration via `int64FieldOpt`
18. **P1-12**: Gate EarliestDataAt/LatestDataAt on non-nil values
19. **P1-13 + P1-14**: ActivityFeedSvc workspace guard; SQL injection mitigation
20. **P2-1 through P2-26**: All medium-priority issues (26 total)

### Defer to Phase 3/4

31. **P2-14**: TimescaleDB hypertable for normalized_events
32. **P2-15**: Composite index for activity feed workspace+time
33. **P3-x**: All low-priority issues (17 total)

---

## Conclusion

This codebase contains a functional metrics API with solid architectural foundations — structured logging, proper error handling, bounded pagination, credential encryption, and comprehensive test coverage. However, **it is not ready for multi-tenant production deployment** due to five P0 blockers and nineteen P1 high-severity issues concentrated in credential isolation, collector lifecycle correctness, event deduplication, and authentication architecture.

The most critical blockers are:
- Multi-tenancy bypass at the repo layer (sources and activity feed)
- Normalized event deduplication failure → metric corruption
- CORS misconfiguration → CSRF attack surface
- Metric unit/value mismatches → display errors
- Migration infrastructure fragility → deployment risk

All of these are fixable through targeted changes to specific files. The review team should prioritize the P0 and P1 lists before production rollout or before adding a second workspace.

---

**Reviewed by**: Senior Backend Engineer  
**Review Date**: 2026-05-18  
**Baseline**: `go test -count=1 -short` ✅ `go test -race -short` ✅ `go build ./...` ✅
