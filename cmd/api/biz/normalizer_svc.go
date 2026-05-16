// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
)

// NormalizerError categorizes normalization failures.
type NormalizerError struct {
	Category string // ignored_known_unsupported | invalid_payload | unsupported_source | mapping_error
	Msg      string
}

func (e *NormalizerError) Error() string { return e.Category + ": " + e.Msg }

// NormalizedEventRepo persists normalized events.
type NormalizedEventRepo interface {
	InsertNormalizedEvent(ctx context.Context, ev *domain.NormalizedEvent) error
	ListNormalizedEventsByRawID(ctx context.Context, rawID string) ([]*domain.NormalizedEvent, error)
	ListNormalizedEventsByEntity(ctx context.Context, entityKind, entityID string) ([]*domain.NormalizedEvent, error)
}

// NormalizerSvc converts raw source events into canonical normalized events.
type NormalizerSvc struct {
	repo NormalizedEventRepo
}

// NewNormalizerSvc creates a NormalizerSvc.
func NewNormalizerSvc(repo NormalizedEventRepo) *NormalizerSvc {
	return &NormalizerSvc{repo: repo}
}

// NormalizeAndStore normalizes a raw event and persists the result.
// Returns a NormalizerError for unknown/unmapped events — callers should log and skip, not fail the run.
func (s *NormalizerSvc) NormalizeAndStore(ctx context.Context, raw *domain.RawSourceEvent) (*domain.NormalizedEvent, error) {
	ev, err := s.Normalize(raw)
	if err != nil {
		return nil, err
	}
	if err := s.repo.InsertNormalizedEvent(ctx, ev); err != nil {
		return nil, fmt.Errorf("persist normalized event: %w", err)
	}
	return ev, nil
}

// Normalize converts a raw event into a normalized event without persisting.
func (s *NormalizerSvc) Normalize(raw *domain.RawSourceEvent) (*domain.NormalizedEvent, error) {
	switch raw.SourceType {
	case domain.SourceTypeGitHub, domain.SourceTypeGitHubActions:
		return normalizeGitHub(raw)
	case domain.SourceTypeJira:
		return normalizeJira(raw)
	default:
		return nil, &NormalizerError{
			Category: "unsupported_source",
			Msg:      "no normalizer for source type " + string(raw.SourceType),
		}
	}
}

// — GitHub normalizer —

func normalizeGitHub(raw *domain.RawSourceEvent) (*domain.NormalizedEvent, error) {
	now := time.Now().UTC()
	p := raw.Payload

	switch raw.EventType {
	case "pull_request.opened":
		return &domain.NormalizedEvent{
			ID:                 newNormID(),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventPROpened,
			EntityKind:         "pull_request",
			EntityID:           raw.ExternalID,
			RepositoryID:       strField(p, "repo_id"),
			AuthorID:           strField(p, "author_login"), // pre-resolution: set to login, resolved later
			OccurredAt:         timeField(p, "created_at", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}, nil

	case "pull_request.review_requested":
		return &domain.NormalizedEvent{
			ID:                 newNormID(),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventPRReviewRequested,
			EntityKind:         "pull_request",
			EntityID:           raw.ExternalID,
			RepositoryID:       strField(p, "repo_id"),
			AuthorID:           strField(p, "author_login"),
			ReviewerID:         strField(p, "reviewer_login"),
			OccurredAt:         timeField(p, "requested_at", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}, nil

	case "pull_request.review_submitted":
		return &domain.NormalizedEvent{
			ID:                 newNormID(),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventPRReviewSubmitted,
			EntityKind:         "pull_request",
			EntityID:           raw.ExternalID,
			RepositoryID:       strField(p, "repo_id"),
			ReviewerID:         strField(p, "reviewer_login"),
			OccurredAt:         timeField(p, "submitted_at", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}, nil

	case "pull_request.merged":
		ev := &domain.NormalizedEvent{
			ID:                 newNormID(),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventPRMerged,
			EntityKind:         "pull_request",
			EntityID:           raw.ExternalID,
			RepositoryID:       strField(p, "repo_id"),
			AuthorID:           strField(p, "author_login"),
			OccurredAt:         timeField(p, "merged_at", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}
		if ct := int64Field(p, "cycle_time_seconds"); ct > 0 {
			ev.CycleTimeSeconds = &ct
		}
		if rl := int64Field(p, "review_latency_seconds"); rl > 0 {
			ev.ReviewLatencySeconds = &rl
		}
		return ev, nil

	case "pull_request.closed":
		return &domain.NormalizedEvent{
			ID:                 newNormID(),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventPRClosed,
			EntityKind:         "pull_request",
			EntityID:           raw.ExternalID,
			RepositoryID:       strField(p, "repo_id"),
			OccurredAt:         timeField(p, "closed_at", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}, nil

	case "workflow_run.started":
		return &domain.NormalizedEvent{
			ID:                 newNormID(),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventWorkflowRunStarted,
			EntityKind:         "workflow_run",
			EntityID:           raw.ExternalID,
			RepositoryID:       strField(p, "repo_id"),
			OccurredAt:         timeField(p, "started_at", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}, nil

	case "workflow_run.completed":
		ev := &domain.NormalizedEvent{
			ID:                 newNormID(),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventWorkflowRunCompleted,
			EntityKind:         "workflow_run",
			EntityID:           raw.ExternalID,
			RepositoryID:       strField(p, "repo_id"),
			OccurredAt:         timeField(p, "completed_at", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}
		if d := int64Field(p, "duration_seconds"); d > 0 {
			ev.DurationSeconds = &d
		}
		return ev, nil

	default:
		return nil, &NormalizerError{
			Category: "ignored_known_unsupported",
			Msg:      "GitHub event type not mapped: " + raw.EventType,
		}
	}
}

// — Jira normalizer —

func normalizeJira(raw *domain.RawSourceEvent) (*domain.NormalizedEvent, error) {
	now := time.Now().UTC()
	p := raw.Payload

	switch raw.EventType {
	case "issue.created":
		return &domain.NormalizedEvent{
			ID:                 newNormID(),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventIssueCreated,
			EntityKind:         "issue",
			EntityID:           raw.ExternalID,
			AuthorID:           strField(p, "reporter_account_id"),
			OccurredAt:         timeField(p, "created_at", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}, nil

	case "issue.status_changed":
		return &domain.NormalizedEvent{
			ID:                 newNormID(),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventIssueStatusChanged,
			EntityKind:         "issue",
			EntityID:           raw.ExternalID,
			OccurredAt:         timeField(p, "changed_at", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}, nil

	case "issue.closed":
		return &domain.NormalizedEvent{
			ID:                 newNormID(),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventIssueClosed,
			EntityKind:         "issue",
			EntityID:           raw.ExternalID,
			OccurredAt:         timeField(p, "resolved_at", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}, nil

	case "sprint.started":
		return &domain.NormalizedEvent{
			ID:                 newNormID(),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventSprintStarted,
			EntityKind:         "sprint",
			EntityID:           raw.ExternalID,
			OccurredAt:         timeField(p, "start_date", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}, nil

	case "sprint.closed":
		return &domain.NormalizedEvent{
			ID:                 newNormID(),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventSprintClosed,
			EntityKind:         "sprint",
			EntityID:           raw.ExternalID,
			OccurredAt:         timeField(p, "end_date", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}, nil

	default:
		return nil, &NormalizerError{
			Category: "ignored_known_unsupported",
			Msg:      "Jira event type not mapped: " + raw.EventType,
		}
	}
}

// — Payload field extraction helpers —

func strField(p map[string]any, key string) string {
	v, ok := p[key]
	if !ok {
		return ""
	}
	s, _ := v.(string)
	return s
}

func int64Field(p map[string]any, key string) int64 {
	v, ok := p[key]
	if !ok {
		return 0
	}
	switch n := v.(type) {
	case int64:
		return n
	case float64:
		return int64(n)
	case int:
		return int64(n)
	}
	return 0
}

func timeField(p map[string]any, key string, fallback *time.Time, def time.Time) time.Time {
	if v, ok := p[key]; ok {
		if s, ok := v.(string); ok {
			if t, err := time.Parse(time.RFC3339, s); err == nil {
				return t.UTC()
			}
		}
	}
	if fallback != nil {
		return fallback.UTC()
	}
	return def
}

func newNormID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return "nev_" + hex.EncodeToString(b)
}
