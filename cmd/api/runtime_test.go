// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package main

import (
	"context"
	"errors"
	"io/fs"
	"strings"
	"testing"

	"github.com/getmetraly/metraly/cmd/api/config"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func restoreRuntimeSeams(t *testing.T) {
	t.Helper()

	origNewPostgresPool := newPostgresPool
	origMigratePostgres := migratePostgres
	origNewRedisClient := newRedisClient
	origPingRedis := pingRedis

	t.Cleanup(func() {
		newPostgresPool = origNewPostgresPool
		migratePostgres = origMigratePostgres
		newRedisClient = origNewRedisClient
		pingRedis = origPingRedis
	})
}

func TestNewRuntime_PostgresFailure(t *testing.T) {
	restoreRuntimeSeams(t)

	newPostgresPool = func(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
		return nil, errors.New("dial failed")
	}

	_, err := newRuntime(context.Background(), config.Load())
	if err == nil {
		t.Fatal("expected postgres failure")
	}
	if !strings.Contains(err.Error(), "connect postgres") {
		t.Fatalf("expected connect postgres error, got %v", err)
	}
}

func TestNewRuntime_MigrationFailure(t *testing.T) {
	restoreRuntimeSeams(t)

	newPostgresPool = func(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
		return nil, nil
	}
	migratePostgres = func(ctx context.Context, pool *pgxpool.Pool, migrations fs.FS) error {
		return errors.New("bad migration")
	}

	_, err := newRuntime(context.Background(), config.Load())
	if err == nil {
		t.Fatal("expected migration failure")
	}
	if !strings.Contains(err.Error(), "migrate postgres") {
		t.Fatalf("expected migrate postgres error, got %v", err)
	}
}

func TestNewRuntime_RedisDegraded(t *testing.T) {
	restoreRuntimeSeams(t)

	newPostgresPool = func(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
		return nil, nil
	}
	migratePostgres = func(ctx context.Context, pool *pgxpool.Pool, migrations fs.FS) error {
		return nil
	}
	newRedisClient = func(addr string) *redis.Client {
		return redis.NewClient(&redis.Options{Addr: addr})
	}
	pingRedis = func(ctx context.Context, rdb *redis.Client) error {
		return errors.New("redis down")
	}

	deps, err := newRuntime(context.Background(), config.Load())
	if err != nil {
		t.Fatalf("expected degraded redis startup, got %v", err)
	}
	t.Cleanup(deps.Close)

	if deps.redis != nil {
		t.Fatal("expected redis client to be nil in degraded mode")
	}
	if deps.dashboardSvc == nil || deps.metricsSvc == nil || deps.templateSvc == nil {
		t.Fatal("expected services to be constructed with no-op caches")
	}
	if deps.authSvc != nil {
		t.Fatal("expected auth service to be disabled when redis is unavailable")
	}
}

func TestNewRuntime_AuthWiredWhenRedisAvailable(t *testing.T) {
	restoreRuntimeSeams(t)

	newPostgresPool = func(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
		return nil, nil
	}
	migratePostgres = func(ctx context.Context, pool *pgxpool.Pool, migrations fs.FS) error {
		return nil
	}
	newRedisClient = func(addr string) *redis.Client {
		return redis.NewClient(&redis.Options{Addr: addr})
	}
	pingRedis = func(ctx context.Context, rdb *redis.Client) error {
		return nil
	}

	deps, err := newRuntime(context.Background(), config.Load())
	if err != nil {
		t.Fatalf("expected auth wiring startup, got %v", err)
	}
	t.Cleanup(deps.Close)

	if deps.authSvc == nil {
		t.Fatal("expected auth service when redis is available")
	}
}
