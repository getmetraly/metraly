// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package db_test

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/db"
	"github.com/getmetraly/metraly/cmd/api/migrations"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

func TestMigrate_Integration(t *testing.T) {
	ctx := context.Background()

	req := testcontainers.ContainerRequest{
		Image:        "timescale/timescaledb:latest-pg16",
		ExposedPorts: []string{"5432/tcp"},
		Env: map[string]string{
			"POSTGRES_PASSWORD": "testpass",
			"POSTGRES_USER":     "testuser",
			"POSTGRES_DB":       "testdb",
		},
		WaitingFor: wait.ForLog("database system is ready to accept connections").
			WithOccurrence(2).
			WithStartupTimeout(60 * time.Second),
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		if strings.Contains(err.Error(), "permission denied") || strings.Contains(err.Error(), "failed to create Docker provider") {
			t.Skipf("skipping integration test: %v", err)
		}
		t.Fatalf("failed to start container: %v", err)
	}
	defer container.Terminate(ctx)

	host, err := container.Host(ctx)
	if err != nil {
		t.Fatalf("failed to get host: %v", err)
	}
	port, err := container.MappedPort(ctx, "5432/tcp")
	if err != nil {
		t.Fatalf("failed to get port: %v", err)
	}

	dsn := fmt.Sprintf("postgres://testuser:testpass@%s:%s/testdb?sslmode=disable", host, port.Port())

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("failed to create pgxpool: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool, migrations.FS); err != nil {
		t.Fatalf("migration failed: %v", err)
	}

	var count int
	err = pool.QueryRow(ctx, "SELECT count(*) FROM schema_migrations").Scan(&count)
	if err != nil {
		t.Fatalf("failed to query schema_migrations: %v", err)
	}

	if count != 7 {
		t.Errorf("expected 7 migration rows, got %d", count)
	}
}
