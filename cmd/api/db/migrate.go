// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package db

import (
	"context"
	"fmt"
	"io/fs"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Migrate runs the SQL migration files embedded in the migrations package.
// The migrations argument should be an fs.FS containing the .sql files (e.g., migrations.FS).
//
// Each migration is executed in its own transaction:
//   - BEGIN
//   - execute migration SQL
//   - INSERT INTO schema_migrations
//   - COMMIT
//
// A failure at any point rolls back that migration. The schema_migrations row is
// only written after the SQL succeeds, so reruns are safe: the migration is
// retried from scratch (not half-applied).
func Migrate(ctx context.Context, pool *pgxpool.Pool, migrations fs.FS) error {
	// Ensure the schema_migrations table exists.
	_, err := pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
	if err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	// List migration files.
	entries, err := fs.ReadDir(migrations, ".")
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}
	var files []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if strings.HasSuffix(name, ".sql") {
			files = append(files, name)
		}
	}
	sort.Strings(files)

	// Apply migrations in order.
	for _, name := range files {
		version := strings.TrimSuffix(name, ".sql")

		// Check if already applied (outside transaction; idempotent read).
		var exists bool
		err = pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=$1)", version).Scan(&exists)
		if err != nil {
			return fmt.Errorf("check migration %s: %w", name, err)
		}
		if exists {
			continue
		}

		// Read migration SQL.
		sqlBytes, err := fs.ReadFile(migrations, name)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", name, err)
		}

		// Execute migration inside a transaction.
		// If either the SQL or the schema_migrations insert fails, the whole thing rolls back.
		if err := applyMigration(ctx, pool, version, string(sqlBytes)); err != nil {
			return fmt.Errorf("apply migration %s: %w", name, err)
		}
	}
	return nil
}

// applyMigration wraps a single migration in a transaction so that partial
// failures cannot leave the schema in an inconsistent state.
func applyMigration(ctx context.Context, pool *pgxpool.Pool, version, sql string) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer func() {
		// Roll back is a no-op after a successful Commit.
		_ = tx.Rollback(ctx)
	}()

	if _, err := tx.Exec(ctx, sql); err != nil {
		return fmt.Errorf("execute: %w", err)
	}

	if _, err := tx.Exec(ctx, "INSERT INTO schema_migrations(version) VALUES($1)", version); err != nil {
		return fmt.Errorf("record: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}
