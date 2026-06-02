// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/getmetraly/metraly/cmd/api/auth"
	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/cache"
	"github.com/getmetraly/metraly/cmd/api/config"
	"github.com/getmetraly/metraly/cmd/api/db"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/migrations"
	"github.com/getmetraly/metraly/cmd/api/repo"
	"github.com/getmetraly/metraly/cmd/api/seed"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

var (
	newPostgresPool = db.New
	// The default startup path applies embedded SQL with db.Migrate(ctx, pool, migrations.FS).
	migratePostgres = db.Migrate
	newRedisClient  = func(addr string) *redis.Client {
		return redis.NewClient(&redis.Options{Addr: addr})
	}
	pingRedis = func(ctx context.Context, rdb *redis.Client) error {
		return rdb.Ping(ctx).Err()
	}
)

type runtimeDeps struct {
	cfg              config.AppConfig
	pool             *pgxpool.Pool
	redis            *redis.Client
	keyManager       *auth.KeyManager
	dashboardSvc     *biz.DashboardSvc
	metricsSvc       *biz.MetricsSvc
	ingestionSvc     *biz.IngestionSvc
	templateSvc      *biz.TemplateSvc
	sourceSvc        *biz.SourceSvc
	sourceRepo       *repo.SourceRepo
	authSvc          *auth.Service
	activityRepo     repo.ActivityRepo
	insightRepo      repo.AIInsightRepo
	collectorSvc     *biz.CollectorSvc
	normalizerSvc    *biz.NormalizerSvc
	metricCatalog    *biz.MetricCatalog
	formulaValidator *biz.FormulaValidator
	metricQuerySvc   *biz.MetricQuerySvc
	activityFeedSvc  *biz.ActivityFeedSvc
	cleanup          func()
}

func newRuntime(ctx context.Context, cfg config.AppConfig) (*runtimeDeps, error) {
	// P2-18: In production, refuse to start with an ephemeral JWT key.
	// In dev/test, allow ephemeral key with a loud warning.
	allowEphemeralKey := !cfg.IsProduction()
	keyManager, err := auth.NewKeyManager(cfg.JWTPrivateKey, allowEphemeralKey)
	if err != nil {
		return nil, fmt.Errorf("init jwt key manager: %w", err)
	}

	// P2-19: In production, refuse to start if neither secret key is set.
	// A static literal fallback ("source-key-v1") would make all credentials
	// decryptable by anyone who can read the source code.
	sourceSecretKey, err := deriveSourceKey(cfg)
	if err != nil {
		return nil, err
	}

	pool, err := newPostgresPool(ctx, cfg.PostgresDSN)
	if err != nil {
		return nil, fmt.Errorf("connect postgres: %w", err)
	}

	if err := migratePostgres(ctx, pool, migrations.FS); err != nil {
		if pool != nil {
			pool.Close()
		}
		return nil, fmt.Errorf("migrate postgres: %w", err)
	}

	dashboardRepo := repo.NewDashboardRepo(pool)
	metricRepo := repo.NewMetricRepo(pool)
	userRepo := repo.NewUserRepo(pool)
	pluginRepo := repo.NewPluginRepo(pool)
	insightRepo := repo.NewAIInsightRepo(pool)
	activityRepo := repo.NewActivityRepo(pool)

	seedStateRepo := repo.NewSeedStateRepo(pool)
	redisAddr := cfg.RedisHost + ":" + cfg.RedisPort
	rdb := newRedisClient(redisAddr)

	accessTTL, err := parseTTLSeconds(cfg.AccessTokenTTL, 900)
	if err != nil {
		if rdb != nil {
			_ = rdb.Close()
		}
		if pool != nil {
			pool.Close()
		}
		return nil, fmt.Errorf("parse access token ttl: %w", err)
	}
	refreshTTL, err := parseTTLSeconds(cfg.RefreshTokenTTL, 604800)
	if err != nil {
		if rdb != nil {
			_ = rdb.Close()
		}
		if pool != nil {
			pool.Close()
		}
		return nil, fmt.Errorf("parse refresh token ttl: %w", err)
	}

	dashboardCache := cache.NewNoopDashboardCache()
	metricsCache := cache.NewNoopMetricsCache()
	templateCache := cache.NewNoopTemplateCache()
	var tokenStore auth.TokenStore

	// P2-26: use defer cancel() immediately after WithTimeout.
	redisCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	if err := pingRedis(redisCtx, rdb); err != nil {
		slog.WarnContext(ctx, "redis unavailable; using degraded cache mode", "error", err)
		if rdb != nil {
			_ = rdb.Close()
		}
		rdb = nil
	} else {
		dashboardCache = cache.NewDashboardCache(rdb, time.Duration(cfg.DashboardsCacheTTL)*time.Second)
		metricsCache = cache.NewMetricsCache(rdb, time.Duration(cfg.MetricsCacheTTL)*time.Second)
		templateCache = cache.NewTemplateCache(rdb, time.Duration(cfg.TemplatesCacheTTL)*time.Second)
		tokenStore = auth.NewTokenStore(rdb, refreshTTL)
	}

	deps := &runtimeDeps{
		cfg:          cfg,
		pool:         pool,
		redis:        rdb,
		keyManager:   keyManager,
		dashboardSvc: biz.NewDashboardSvc(dashboardRepo, seedStateRepo, dashboardCache),
		metricsSvc:   biz.NewMetricsSvc(metricRepo, metricsCache),
		ingestionSvc: biz.NewIngestionSvc(activityRepo, metricRepo),
		templateSvc:  biz.NewTemplateSvc(dashboardRepo, templateCache),
		activityRepo: activityRepo,
		insightRepo:  insightRepo,
	}

	sourceRepo := repo.NewSourceRepo(pool)
	deps.sourceRepo = sourceRepo
	deps.sourceSvc, err = biz.NewSourceSvc(sourceRepo, sourceSecretKey, biz.DefaultRegistry())
	if err != nil {
		if rdb != nil {
			_ = rdb.Close()
		}
		pool.Close()
		return nil, fmt.Errorf("create source service: %w", err)
	}

	eventRepo := repo.NewEventRepo(pool)
	deps.collectorSvc = biz.NewCollectorSvc(deps.sourceSvc, sourceRepo, sourceRepo, eventRepo)
	deps.normalizerSvc = biz.NewNormalizerSvc(eventRepo)
	deps.normalizerSvc.WithIdentityResolver(&identityResolverAdapter{repo: eventRepo})
	deps.collectorSvc.WithNormalizer(deps.normalizerSvc)
	// Register concrete collectors — each handles its own source type.
	deps.collectorSvc.RegisterCollector(biz.NewGitHubCollector(nil))
	deps.collectorSvc.RegisterCollector(biz.NewGitHubActionsCollector(nil))
	deps.metricCatalog = biz.NewMetricCatalog()
	deps.formulaValidator = biz.NewFormulaValidator(deps.metricCatalog)
	deps.metricQuerySvc = biz.NewMetricQuerySvc(repo.NewMetricQueryRepo(pool), deps.metricCatalog)
	deps.activityFeedSvc = biz.NewActivityFeedSvc(eventRepo)

	if tokenStore != nil {
		deps.authSvc = auth.NewService(keyManager, tokenStore, userRepo, accessTTL, nil, cfg.DefaultWorkspaceID)
	}

	deps.cleanup = func() {
		if deps.redis != nil {
			_ = deps.redis.Close()
		}
		if deps.pool != nil {
			deps.pool.Close()
		}
	}

	if cfg.SeedOnStart {
		runner := seed.NewRunner(userRepo, dashboardRepo, seedStateRepo, pluginRepo, insightRepo, activityRepo, metricRepo)
		if cfg.SeedRestoreDemo {
			if err := runner.RestoreDemo(ctx); err != nil {
				deps.Close()
				return nil, fmt.Errorf("restore demo: %w", err)
			}
		} else if err := runner.Run(ctx, cfg.SeedAdminEmail, cfg.SeedAdminPassword); err != nil {
			deps.Close()
			return nil, fmt.Errorf("seed data: %w", err)
		}
	}

	return deps, nil
}

// deriveSourceKey determines the AES-256 key for credential encryption.
//
// Priority:
//  1. SOURCE_SECRET_KEY env var (preferred: externally managed, not derived)
//  2. JWT_PRIVATE_KEY + suffix (dev fallback: key changes if JWT key rotates)
//  3. Error in production mode (prevents codebase-known static literal)
//
// In development/test, the fallback is allowed with a warning.
// In production (APP_ENV=production), both keys must be explicitly set.
func deriveSourceKey(cfg config.AppConfig) ([]byte, error) {
	if cfg.SourceSecretKey != "" {
		return biz.DeriveKey(cfg.SourceSecretKey), nil
	}
	if cfg.JWTPrivateKey != "" {
		slog.Warn("SOURCE_SECRET_KEY not set; deriving from JWT_PRIVATE_KEY — set SOURCE_SECRET_KEY explicitly in production")
		return biz.DeriveKey(cfg.JWTPrivateKey + ":source-key-v1"), nil
	}
	if cfg.IsProduction() {
		return nil, fmt.Errorf(
			"SOURCE_SECRET_KEY (or JWT_PRIVATE_KEY as fallback) must be set in production (APP_ENV=production); " +
				"refusing to use a static literal key that would make all credentials readable from source code")
	}
	// Development/test only: use a predictable but non-empty key.
	slog.Warn("SOURCE_SECRET_KEY and JWT_PRIVATE_KEY are both unset; using dev-only derived key — NOT for production")
	return biz.DeriveKey("dev-only-source-key-do-not-use-in-production"), nil
}

func (d *runtimeDeps) Close() {
	if d == nil || d.cleanup == nil {
		return
	}
	d.cleanup()
}

func parseTTLSeconds(raw string, def int) (time.Duration, error) {
	if raw == "" {
		return time.Duration(def) * time.Second, nil
	}
	secs, err := strconv.Atoi(raw)
	if err != nil {
		return 0, err
	}
	return time.Duration(secs) * time.Second, nil
}

// identityResolverAdapter bridges repo.EventRepo to biz.IdentityResolver.
// Kept in runtime.go to maintain the dependency direction: biz never imports repo.
type identityResolverAdapter struct {
	repo *repo.EventRepo
}

func (a *identityResolverAdapter) ResolveIdentity(ctx context.Context, workspaceID string, sourceType domain.SourceType, externalID string) (biz.IdentityResolution, error) {
	m, err := a.repo.ResolveIdentity(ctx, workspaceID, sourceType, externalID)
	if errors.Is(err, repo.ErrNotFound) {
		return biz.IdentityResolution{Resolved: false}, nil
	}
	if err != nil {
		return biz.IdentityResolution{}, err
	}
	return biz.IdentityResolution{
		UserID:   m.UserID,
		TeamID:   m.TeamID,
		Resolved: m.Status == repo.IdentityStatusMapped && m.UserID != "",
	}, nil
}

func (a *identityResolverAdapter) UpsertUnresolved(ctx context.Context, workspaceID string, sourceType domain.SourceType, externalID, externalLogin string) error {
	return a.repo.UpsertUnresolvedIdentityMapping(ctx, &repo.IdentityMapping{
		ID:            "idm_" + workspaceID + "_" + string(sourceType) + "_" + externalID,
		WorkspaceID:   workspaceID,
		SourceType:    sourceType,
		ExternalID:    externalID,
		ExternalLogin: externalLogin,
		Status:        repo.IdentityStatusUnresolved,
	})
}
