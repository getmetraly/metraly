// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package repo

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned by repo methods when a requested record does not exist.
// Callers in the biz layer should wrap this into a domain-specific sentinel.
var ErrNotFound = errors.New("not found")

type SourceRepo struct{ pool *pgxpool.Pool }

func NewSourceRepo(pool *pgxpool.Pool) *SourceRepo { return &SourceRepo{pool: pool} }

func (r *SourceRepo) CreateSource(ctx context.Context, sc *domain.SourceConnection) error {
	configJSON, err := json.Marshal(sc.Config)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `INSERT INTO source_connections (id, workspace_id, source_type, display_name, status, config, credential_id, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, sc.ID, sc.WorkspaceID, string(sc.SourceType), sc.DisplayName, string(sc.Status), configJSON, nilIfEmpty(sc.CredentialID), sc.CreatedAt, sc.UpdatedAt)
	return err
}

// GetSource retrieves a source connection by ID, scoped to workspaceID.
// Returns ErrNotFound when no row matches, preventing cross-workspace reads.
func (r *SourceRepo) GetSource(ctx context.Context, workspaceID, id string) (*domain.SourceConnection, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, workspace_id, source_type, display_name, status, config,
		       COALESCE(credential_id,''), last_tested_at, last_synced_at, created_at, updated_at
		FROM source_connections
		WHERE id=$1 AND workspace_id=$2`,
		id, workspaceID)
	sc, err := scanSourceConnection(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return sc, err
}

func (r *SourceRepo) ListSources(ctx context.Context, workspaceID string) ([]*domain.SourceConnection, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, workspace_id, source_type, display_name, status, config, COALESCE(credential_id,''), last_tested_at, last_synced_at, created_at, updated_at FROM source_connections WHERE workspace_id=$1 ORDER BY created_at ASC`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []*domain.SourceConnection
	for rows.Next() {
		sc, err := scanSourceConnection(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, sc)
	}
	return result, rows.Err()
}

func (r *SourceRepo) UpdateSourceStatus(ctx context.Context, id string, status domain.SourceStatus, testedAt, syncedAt *time.Time) error {
	_, err := r.pool.Exec(ctx, `UPDATE source_connections SET status=$2, last_tested_at=COALESCE($3, last_tested_at), last_synced_at=COALESCE($4, last_synced_at), updated_at=NOW() WHERE id=$1`, id, string(status), testedAt, syncedAt)
	return err
}

func (r *SourceRepo) AttachCredential(ctx context.Context, sourceID, credentialID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE source_connections SET credential_id=$2, status=$3, updated_at=NOW() WHERE id=$1`, sourceID, credentialID, string(domain.SourceStatusPending))
	return err
}

func (r *SourceRepo) CreateCredential(ctx context.Context, cr *domain.CredentialRef, encryptedSecret string) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO credential_refs (id, workspace_id, source_type, kind, hint, scopes, encrypted_secret, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, cr.ID, cr.WorkspaceID, string(cr.SourceType), string(cr.Kind), cr.Hint, cr.Scopes, encryptedSecret, cr.CreatedAt, cr.UpdatedAt)
	return err
}

func (r *SourceRepo) GetCredential(ctx context.Context, id string) (*domain.CredentialRef, error) {
	row := r.pool.QueryRow(ctx, `SELECT id, workspace_id, source_type, kind, hint, scopes, created_at, updated_at FROM credential_refs WHERE id=$1`, id)
	var cr domain.CredentialRef
	var sourceType, kind string
	err := row.Scan(&cr.ID, &cr.WorkspaceID, &sourceType, &kind, &cr.Hint, &cr.Scopes, &cr.CreatedAt, &cr.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	cr.SourceType = domain.SourceType(sourceType)
	cr.Kind = domain.CredentialKind(kind)
	return &cr, nil
}

// GetEncryptedSecret returns the encrypted secret for the given credential,
// scoped to workspaceID. Returns ErrNotFound when no row matches, preventing
// cross-workspace credential reads.
func (r *SourceRepo) GetEncryptedSecret(ctx context.Context, workspaceID, credentialID string) (string, error) {
	var encrypted string
	err := r.pool.QueryRow(ctx, `
		SELECT encrypted_secret
		FROM credential_refs
		WHERE id=$1 AND workspace_id=$2`,
		credentialID, workspaceID).Scan(&encrypted)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return encrypted, err
}

// CreateSourceWithCredential atomically inserts a credential and source connection in one transaction.
// On any failure the transaction is rolled back; no orphan credentials are created.
func (r *SourceRepo) CreateSourceWithCredential(
	ctx context.Context,
	sc *domain.SourceConnection,
	cr *domain.CredentialRef,
	encryptedSecret string,
) error {
	return pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		configJSON, err := json.Marshal(sc.Config)
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO credential_refs
			(id, workspace_id, source_type, kind, hint, scopes, encrypted_secret, created_at, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		`, cr.ID, cr.WorkspaceID, string(cr.SourceType), string(cr.Kind),
			cr.Hint, cr.Scopes, encryptedSecret, cr.CreatedAt, cr.UpdatedAt)
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO source_connections
			(id, workspace_id, source_type, display_name, status, config, credential_id, created_at, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		`, sc.ID, sc.WorkspaceID, string(sc.SourceType), sc.DisplayName,
			string(sc.Status), configJSON, sc.CredentialID, sc.CreatedAt, sc.UpdatedAt)
		return err
	})
}

// CreateCollectorRun inserts a new collector run record.
// Uses ON CONFLICT (id) DO NOTHING so the same runID can be safely retried after a crash.
func (r *SourceRepo) CreateCollectorRun(ctx context.Context, run *domain.CollectorRun) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO collector_runs
		(id, source_connection_id, collector_type, status, started_at, cursor,
		 raw_event_count, error_category, error_message, rate_limit_state)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		ON CONFLICT (id) DO NOTHING`,
		run.ID, run.SourceConnectionID, run.CollectorType, string(run.Status),
		run.StartedAt, run.Cursor, run.RawEventCount,
		run.ErrorCategory, run.ErrorMessage, string(run.RateLimitState))
	return err
}

func (r *SourceRepo) UpdateCollectorRun(ctx context.Context, run *domain.CollectorRun) error {
	_, err := r.pool.Exec(ctx, `UPDATE collector_runs SET status=$2, finished_at=$3, cursor=$4, raw_event_count=$5, error_category=$6, error_message=$7, rate_limit_state=$8, retry_after=$9, updated_at=NOW() WHERE id=$1`, run.ID, string(run.Status), run.FinishedAt, run.Cursor, run.RawEventCount, run.ErrorCategory, run.ErrorMessage, string(run.RateLimitState), run.RetryAfter)
	return err
}

// GetActiveRunForSource returns the run ID of any in-flight run (started or running) for the source.
// Returns ErrNotFound when no active run exists.
func (r *SourceRepo) GetActiveRunForSource(ctx context.Context, sourceConnectionID string) (string, error) {
	var runID string
	err := r.pool.QueryRow(ctx, `
		SELECT id FROM collector_runs
		WHERE source_connection_id=$1 AND status IN ('started','running')
		ORDER BY started_at DESC LIMIT 1`,
		sourceConnectionID).Scan(&runID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return runID, err
}

func (r *SourceRepo) ListCollectorRuns(ctx context.Context, sourceConnectionID string, limit int) ([]*domain.CollectorRun, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, source_connection_id, collector_type, status, started_at, finished_at, cursor, raw_event_count, error_category, error_message, rate_limit_state, retry_after FROM collector_runs WHERE source_connection_id=$1 ORDER BY started_at DESC LIMIT $2`, sourceConnectionID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []*domain.CollectorRun
	for rows.Next() {
		run, err := scanCollectorRun(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, run)
	}
	return result, rows.Err()
}

type rowScanner interface{ Scan(dest ...any) error }

func scanSourceConnection(row rowScanner) (*domain.SourceConnection, error) {
	var sc domain.SourceConnection
	var sourceType, status string
	var configJSON []byte
	err := row.Scan(&sc.ID, &sc.WorkspaceID, &sourceType, &sc.DisplayName, &status, &configJSON, &sc.CredentialID, &sc.LastTestedAt, &sc.LastSyncedAt, &sc.CreatedAt, &sc.UpdatedAt)
	if err != nil {
		return nil, err
	}
	sc.SourceType = domain.SourceType(sourceType)
	sc.Status = domain.SourceStatus(status)
	if err := json.Unmarshal(configJSON, &sc.Config); err != nil {
		sc.Config = map[string]string{}
	}
	return &sc, nil
}

func scanCollectorRun(row rowScanner) (*domain.CollectorRun, error) {
	var run domain.CollectorRun
	var status, rateLimitState string
	err := row.Scan(&run.ID, &run.SourceConnectionID, &run.CollectorType, &status, &run.StartedAt, &run.FinishedAt, &run.Cursor, &run.RawEventCount, &run.ErrorCategory, &run.ErrorMessage, &rateLimitState, &run.RetryAfter)
	if err != nil {
		return nil, err
	}
	run.Status = domain.CollectorRunStatus(status)
	run.RateLimitState = domain.RateLimitState(rateLimitState)
	return &run, nil
}

func nilIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
