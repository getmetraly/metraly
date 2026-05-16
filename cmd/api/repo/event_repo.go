// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package repo

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// InsertResult describes the outcome of a raw event insert attempt.
type InsertResult int

const (
	InsertResultInserted  InsertResult = iota // new row inserted
	InsertResultDuplicate                     // deduplication_key already exists; row skipped
)

// EventRepo handles raw source events, normalized events, and identity mappings.
type EventRepo struct{ pool *pgxpool.Pool }

// NewEventRepo creates an EventRepo backed by the given pool.
func NewEventRepo(pool *pgxpool.Pool) *EventRepo { return &EventRepo{pool: pool} }

// — Raw Source Events —

// InsertRawSourceEvent inserts a raw event, ignoring duplicates by deduplication_key.
// Returns InsertResultDuplicate when the key already exists for the source connection.
func (r *EventRepo) InsertRawSourceEvent(ctx context.Context, ev *domain.RawSourceEvent) (InsertResult, error) {
	payloadJSON, err := json.Marshal(ev.Payload)
	if err != nil {
		return InsertResultInserted, err
	}
	tag, err := r.pool.Exec(ctx, `
		INSERT INTO raw_source_events
		(id, source_connection_id, collector_run_id, source_type, external_id, event_type,
		 payload_hash, deduplication_key, payload, schema_version, received_at, source_updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		ON CONFLICT (source_connection_id, deduplication_key) DO NOTHING
	`, ev.ID, ev.SourceConnectionID, ev.CollectorRunID, string(ev.SourceType),
		ev.ExternalID, ev.EventType, ev.PayloadHash, ev.DeduplicationKey,
		payloadJSON, ev.SchemaVersion, ev.ReceivedAt, ev.SourceUpdatedAt)
	if err != nil {
		return InsertResultInserted, err
	}
	if tag.RowsAffected() == 0 {
		return InsertResultDuplicate, nil
	}
	return InsertResultInserted, nil
}

// InsertRawSourceEventsBatch inserts a batch of raw events.
// Returns the count of newly inserted events (duplicates are silently skipped).
func (r *EventRepo) InsertRawSourceEventsBatch(ctx context.Context, events []*domain.RawSourceEvent) (inserted int, err error) {
	for _, ev := range events {
		result, err := r.InsertRawSourceEvent(ctx, ev)
		if err != nil {
			return inserted, err
		}
		if result == InsertResultInserted {
			inserted++
		}
	}
	return inserted, nil
}

// RawEventInsertOutcome records the result of inserting one raw event.
type RawEventInsertOutcome struct {
	Event    *domain.RawSourceEvent
	Inserted bool // true if newly inserted; false if duplicate
}

// InsertRawSourceEventsBatchWithOutcomes inserts events and returns per-event outcomes.
// Duplicates are silently skipped and reported as Inserted=false.
func (r *EventRepo) InsertRawSourceEventsBatchWithOutcomes(ctx context.Context, events []*domain.RawSourceEvent) ([]RawEventInsertOutcome, error) {
	outcomes := make([]RawEventInsertOutcome, 0, len(events))
	for _, ev := range events {
		result, err := r.InsertRawSourceEvent(ctx, ev)
		if err != nil {
			return outcomes, err
		}
		outcomes = append(outcomes, RawEventInsertOutcome{
			Event:    ev,
			Inserted: result == InsertResultInserted,
		})
	}
	return outcomes, nil
}

// GetRawSourceEvent retrieves a raw event by ID.
func (r *EventRepo) GetRawSourceEvent(ctx context.Context, id string) (*domain.RawSourceEvent, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, source_connection_id, collector_run_id, source_type, external_id, event_type,
		       payload_hash, deduplication_key, payload, schema_version, received_at, source_updated_at
		FROM raw_source_events WHERE id=$1
	`, id)
	return scanRawSourceEvent(row)
}

// ListRawSourceEventsByRun returns all raw events for a given collector run.
func (r *EventRepo) ListRawSourceEventsByRun(ctx context.Context, runID string) ([]*domain.RawSourceEvent, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, source_connection_id, collector_run_id, source_type, external_id, event_type,
		       payload_hash, deduplication_key, payload, schema_version, received_at, source_updated_at
		FROM raw_source_events WHERE collector_run_id=$1 ORDER BY received_at ASC
	`, runID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []*domain.RawSourceEvent
	for rows.Next() {
		ev, err := scanRawSourceEvent(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, ev)
	}
	return result, rows.Err()
}

func scanRawSourceEvent(row rowScanner) (*domain.RawSourceEvent, error) {
	var ev domain.RawSourceEvent
	var sourceType string
	var payloadJSON []byte
	err := row.Scan(
		&ev.ID, &ev.SourceConnectionID, &ev.CollectorRunID, &sourceType,
		&ev.ExternalID, &ev.EventType, &ev.PayloadHash, &ev.DeduplicationKey,
		&payloadJSON, &ev.SchemaVersion, &ev.ReceivedAt, &ev.SourceUpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	ev.SourceType = domain.SourceType(sourceType)
	if err := json.Unmarshal(payloadJSON, &ev.Payload); err != nil {
		ev.Payload = map[string]any{}
	}
	return &ev, nil
}

// — Normalized Events —

// InsertNormalizedEvent inserts a normalized event.
func (r *EventRepo) InsertNormalizedEvent(ctx context.Context, ev *domain.NormalizedEvent) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO normalized_events
		(id, raw_source_event_id, source_connection_id, event_type, entity_kind, entity_id,
		 repository_id, team_id, author_id, reviewer_id, author_unresolved, reviewer_unresolved,
		 occurred_at, received_at, cycle_time_seconds, review_latency_seconds, duration_seconds,
		 schema_version)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
		ON CONFLICT (id) DO NOTHING
	`, ev.ID, ev.RawSourceEventID, ev.SourceConnectionID, string(ev.EventType),
		ev.EntityKind, ev.EntityID,
		ev.RepositoryID, ev.TeamID, ev.AuthorID, ev.ReviewerID,
		ev.AuthorID == "", ev.ReviewerID == "",
		ev.OccurredAt, ev.ReceivedAt,
		ev.CycleTimeSeconds, ev.ReviewLatencySeconds, ev.DurationSeconds,
		ev.SchemaVersion,
	)
	return err
}

// ListNormalizedEventsByRawID returns all normalized events derived from a raw event.
func (r *EventRepo) ListNormalizedEventsByRawID(ctx context.Context, rawID string) ([]*domain.NormalizedEvent, error) {
	return r.queryNormalizedEvents(ctx,
		`SELECT id, raw_source_event_id, source_connection_id, event_type, entity_kind, entity_id,
		        repository_id, team_id, author_id, reviewer_id, occurred_at, received_at,
		        cycle_time_seconds, review_latency_seconds, duration_seconds, schema_version
		 FROM normalized_events WHERE raw_source_event_id=$1`, rawID)
}

// ListNormalizedEventsByEntity returns normalized events for a specific entity.
func (r *EventRepo) ListNormalizedEventsByEntity(ctx context.Context, entityKind, entityID string) ([]*domain.NormalizedEvent, error) {
	return r.queryNormalizedEvents(ctx,
		`SELECT id, raw_source_event_id, source_connection_id, event_type, entity_kind, entity_id,
		        repository_id, team_id, author_id, reviewer_id, occurred_at, received_at,
		        cycle_time_seconds, review_latency_seconds, duration_seconds, schema_version
		 FROM normalized_events WHERE entity_kind=$1 AND entity_id=$2 ORDER BY occurred_at ASC`,
		entityKind, entityID)
}

func (r *EventRepo) queryNormalizedEvents(ctx context.Context, q string, args ...any) ([]*domain.NormalizedEvent, error) {
	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []*domain.NormalizedEvent
	for rows.Next() {
		ev, err := scanNormalizedEvent(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, ev)
	}
	return result, rows.Err()
}

func scanNormalizedEvent(row rowScanner) (*domain.NormalizedEvent, error) {
	var ev domain.NormalizedEvent
	var eventType string
	err := row.Scan(
		&ev.ID, &ev.RawSourceEventID, &ev.SourceConnectionID, &eventType,
		&ev.EntityKind, &ev.EntityID,
		&ev.RepositoryID, &ev.TeamID, &ev.AuthorID, &ev.ReviewerID,
		&ev.OccurredAt, &ev.ReceivedAt,
		&ev.CycleTimeSeconds, &ev.ReviewLatencySeconds, &ev.DurationSeconds,
		&ev.SchemaVersion,
	)
	if err != nil {
		return nil, err
	}
	ev.EventType = domain.NormalizedEventType(eventType)
	return &ev, nil
}

// — Identity Mappings —

// IdentityStatus is the lifecycle state of an identity mapping.
type IdentityStatus string

const (
	IdentityStatusMapped     IdentityStatus = "mapped"
	IdentityStatusUnresolved IdentityStatus = "unresolved"
	IdentityStatusIgnored    IdentityStatus = "ignored"
	IdentityStatusConflict   IdentityStatus = "conflict"
)

// IdentityMapping maps a source identity to an internal user/team.
type IdentityMapping struct {
	ID                string
	WorkspaceID       string
	SourceType        domain.SourceType
	ExternalID        string
	ExternalLogin     string
	ExternalEmailHash string // SHA-256(email), never plaintext
	UserID            string
	TeamID            string
	Confidence        float64
	Status            IdentityStatus
}

// ResolveIdentity looks up an identity mapping by source type and external ID.
// Returns ErrNotFound if no mapping exists.
func (r *EventRepo) ResolveIdentity(ctx context.Context, workspaceID string, sourceType domain.SourceType, externalID string) (*IdentityMapping, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, workspace_id, source_type, external_id, external_login, external_email_hash,
		       user_id, team_id, confidence, status
		FROM identity_mappings
		WHERE workspace_id=$1 AND source_type=$2 AND external_id=$3
	`, workspaceID, string(sourceType), externalID)
	return scanIdentityMapping(row)
}

// UpsertIdentityMapping creates or updates an identity mapping.
func (r *EventRepo) UpsertIdentityMapping(ctx context.Context, m *IdentityMapping) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO identity_mappings
		(id, workspace_id, source_type, external_id, external_login, external_email_hash,
		 user_id, team_id, confidence, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		ON CONFLICT (workspace_id, source_type, external_id) DO UPDATE SET
		    external_login=EXCLUDED.external_login,
		    external_email_hash=EXCLUDED.external_email_hash,
		    user_id=EXCLUDED.user_id,
		    team_id=EXCLUDED.team_id,
		    confidence=EXCLUDED.confidence,
		    status=EXCLUDED.status,
		    updated_at=NOW()
	`, m.ID, m.WorkspaceID, string(m.SourceType), m.ExternalID, m.ExternalLogin,
		m.ExternalEmailHash, m.UserID, m.TeamID, m.Confidence, string(m.Status))
	return err
}

// ListUnresolvedIdentities returns all unresolved identity mappings for a workspace.
func (r *EventRepo) ListUnresolvedIdentities(ctx context.Context, workspaceID string) ([]*IdentityMapping, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, workspace_id, source_type, external_id, external_login, external_email_hash,
		       user_id, team_id, confidence, status
		FROM identity_mappings
		WHERE workspace_id=$1 AND status='unresolved'
		ORDER BY external_login ASC
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []*IdentityMapping
	for rows.Next() {
		m, err := scanIdentityMapping(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, m)
	}
	return result, rows.Err()
}

// MarkIdentityMappingIgnored sets an identity mapping's status to ignored.
func (r *EventRepo) MarkIdentityMappingIgnored(ctx context.Context, workspaceID, externalID string, sourceType domain.SourceType) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE identity_mappings SET status='ignored', updated_at=NOW()
		WHERE workspace_id=$1 AND source_type=$2 AND external_id=$3
	`, workspaceID, string(sourceType), externalID)
	return err
}

func scanIdentityMapping(row rowScanner) (*IdentityMapping, error) {
	var m IdentityMapping
	var sourceType, status string
	err := row.Scan(
		&m.ID, &m.WorkspaceID, &sourceType, &m.ExternalID, &m.ExternalLogin, &m.ExternalEmailHash,
		&m.UserID, &m.TeamID, &m.Confidence, &status,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	m.SourceType = domain.SourceType(sourceType)
	m.Status = IdentityStatus(status)
	return &m, nil
}

// GetCollectorRun retrieves a single collector run by ID.
func (sr *SourceRepo) GetCollectorRun(ctx context.Context, id string) (*domain.CollectorRun, error) {
	row := sr.pool.QueryRow(ctx, `
		SELECT id, source_connection_id, collector_type, status, started_at, finished_at,
		       cursor, raw_event_count, error_category, error_message, rate_limit_state, retry_after
		FROM collector_runs WHERE id=$1
	`, id)
	run, err := scanCollectorRun(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return run, err
}
