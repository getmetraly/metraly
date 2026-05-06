# Phase 1: Runtime Foundation - Patterns

**Mapped:** 2026-05-05
**Status:** Complete

## Pattern Mapping Complete

## Files To Modify

| Target | Role | Closest Existing Analog | Notes |
|--------|------|-------------------------|-------|
| `cmd/api/main.go` | Runtime composition, router setup, server lifecycle | Existing `NewRouter`, `main`, route closures | Keep Chi/CORS/recoverer pattern; replace narrow global handler wrappers with injected handlers. |
| `cmd/api/runtime.go` | Dependency composition helper | `cmd/api/db/db.go`, `cmd/api/config/config.go` | New helper should keep `main()` small and make startup behavior testable. |
| `cmd/api/runtime_test.go` | Startup failure/degraded behavior tests | `cmd/api/main_test.go`, `cmd/api/db/migrate_test.go` | Prefer injectable setup functions over Docker-only tests for fail-fast behavior. |
| `cmd/api/cache/*.go` | No-op cache fallback | Existing Redis cache interfaces | Add no-op implementations behind existing interfaces. |
| `cmd/api/handlers/dashboards.go` | HTTP adapter for dashboard service | `cmd/api/handlers/me.go`, `cmd/api/respond/respond.go` | Replace package-level state with constructor-based handler using `biz.DashboardSvc`. |
| `cmd/api/handlers/handlers_test.go` | Handler behavior tests | Existing handler tests | Remove dependence on global `dashboards` slice. |
| `cmd/api/repo/dashboard_repo.go` | JSON marshal/unmarshal error handling if touched | Existing repo methods | If execution touches this file, stop ignoring JSON errors. |
| `Makefile` | Developer command truthfulness | Existing targets | Remove default raw-event-store wait/test-data path. Keep compose targets. |
| `README.md`, `CLAUDE.md` | Community Preview runtime docs | Existing quickstart text | Default stack should be API, UI, Postgres/TimescaleDB, Redis. |
| `../docs/tech/app/*` | Moved app docs cleanup | Existing historical app docs | Update only runtime mismatch claims; preserve future raw-event-store mentions as deferred. |
| all `*.go` | SPDX header compliance | `AGENTS.md` header rule | Header must be first bytes before package or Swagger comments. |

## Existing Code Patterns

### Config

Use `config.Load()` as the single env source. It already contains:

- `Port`
- `PostgresDSN`
- `RedisHost`
- `RedisPort`
- `JWTPrivateKey`
- token TTL values
- OIDC fields
- seed fields
- cache TTL values

### Database Startup

Use:

```go
pool, err := db.New(ctx, cfg.PostgresDSN)
if err != nil {
    return nil, fmt.Errorf("connect postgres: %w", err)
}
if err := db.Migrate(ctx, pool, migrations.FS); err != nil {
    return nil, fmt.Errorf("migrate postgres: %w", err)
}
```

Postgres errors must propagate to `main()` and prevent `ListenAndServe`.

### Redis Cache Fallback

Services depend on cache interfaces. Add no-op types that satisfy:

- `DashboardCache`
- `MetricsCache`
- `TemplateCache`

Pattern:

```go
func (noopDashboardCache) Get(ctx context.Context, id string) (*domain.Dashboard, error) {
    return nil, ErrCacheMiss
}
func (noopDashboardCache) Set(ctx context.Context, d *domain.Dashboard) error {
    return nil
}
```

### Router Construction

Current `NewRouter(km *auth.KeyManager) *chi.Mux` supports tests by allowing nil auth. Replace with an options/deps shape that still keeps tests simple, for example:

```go
type RouterDeps struct {
    KeyManager *auth.KeyManager
    Dashboards *handlers.DashboardHandler
}

func NewRouter(deps RouterDeps) *chi.Mux
```

Tests should explicitly pass empty deps for public route tests.

### Handler Constructors

Prefer constructor-injected handlers:

```go
type DashboardHandler struct {
    svc *biz.DashboardSvc
}

func NewDashboardHandler(svc *biz.DashboardSvc) *DashboardHandler
func (h *DashboardHandler) List(w http.ResponseWriter, r *http.Request)
func (h *DashboardHandler) Create(w http.ResponseWriter, r *http.Request)
```

Keep package-level wrappers only if needed for legacy tests, but do not let the active router use global in-memory state.

### Response Helpers

When touching handlers, prefer `cmd/api/respond/respond.go` over ad hoc `json.NewEncoder` unless the existing helper lacks needed behavior.

### Tests

Existing tests use:

- Go `testing`
- `httptest`
- `testify/assert`
- Testcontainers for DB integration tests

Do not introduce a new test framework.

## Landmines

- `POSTGRES_DSN` in compose lacks `sslmode=disable`; pgx can still connect, but tests/docs should use one canonical DSN if touched.
- `Makefile health` should target `/api/v1/health`.
- `cmd/api/main.go` Swagger comments must remain discoverable after adding SPDX header.
- Adding auth routes in Phase 1 is tempting but belongs to Phase 2 unless Redis/session behavior is fully handled.
- Collectors are separate Go modules; license header pass must include their `.go` files, but runtime wiring should not import collector code.
