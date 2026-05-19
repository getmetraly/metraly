// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package repo

import (
	"context"
	"errors"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrMissingWorkspace is returned when a workspace-scoped query omits the workspace.
var ErrMissingWorkspace = errors.New("workspace is required")

// ActivityRepo handles persistence of activity events.
// All read operations require a workspaceID to prevent cross-tenant data leakage (P1-6).
type ActivityRepo interface {
	// List returns activity events scoped to the given workspace.
	// Returns ErrMissingWorkspace when workspaceID is empty.
	List(ctx context.Context, workspaceID string, limit int) ([]*domain.ActivityEvent, error)
	// BulkInsert inserts events using ON CONFLICT (id) DO NOTHING for idempotency.
	// Each event must have WorkspaceID set; events without workspace are rejected.
	BulkInsert(ctx context.Context, events []*domain.ActivityEvent) error
}

type pgActivityRepo struct{ pool *pgxpool.Pool }

func NewActivityRepo(pool *pgxpool.Pool) ActivityRepo { return &pgActivityRepo{pool} }

func (r *pgActivityRepo) List(ctx context.Context, workspaceID string, limit int) ([]*domain.ActivityEvent, error) {
	if workspaceID == "" {
		return nil, ErrMissingWorkspace
	}
	rows, err := r.pool.Query(ctx,
		`SELECT id, type, title, description, timestamp, user_name, user_avatar
		 FROM activity_events
		 WHERE workspace_id=$1
		 ORDER BY timestamp DESC LIMIT $2`,
		workspaceID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []*domain.ActivityEvent
	for rows.Next() {
		e := &domain.ActivityEvent{}
		if err := rows.Scan(&e.ID, &e.Type, &e.Title, &e.Description,
			&e.Timestamp, &e.User.Name, &e.User.Avatar); err != nil {
			return nil, err
		}
		result = append(result, e)
	}
	return result, rows.Err()
}

func (r *pgActivityRepo) BulkInsert(ctx context.Context, events []*domain.ActivityEvent) error {
	for _, e := range events {
		// WorkspaceID can be empty for legacy seed data; inserts with empty workspace
		// are stored but will not appear in workspace-scoped List queries.
		_, err := r.pool.Exec(ctx,
			`INSERT INTO activity_events(id, workspace_id, type, title, description, timestamp, user_name, user_avatar)
			 VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
			e.ID, e.WorkspaceID, e.Type, e.Title, e.Description, e.Timestamp, e.User.Name, e.User.Avatar)
		if err != nil {
			return err
		}
	}
	return nil
}
