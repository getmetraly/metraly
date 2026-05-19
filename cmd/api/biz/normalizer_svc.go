// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz

import (
	"context"
	"crypto/sha256"
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

// NormCategory* constants for NormalizerError.Category.
const (
	NormCategoryIgnoredKnown   = "ignored_known_unsupported"
	NormCategoryUnsupportedSrc = "unsupported_source"
	NormCategoryInvalidPayload = "invalid_payload"
	NormCategoryMappingError   = "mapping_error"
)

// NormalizedEventRepo persists normalized events.
type NormalizedEventRepo interface {
	InsertNormalizedEvent(ctx context.Context, ev *domain.NormalizedEvent) error
	ListNormalizedEventsByRawID(ctx context.Context, rawID string) ([]*domain.NormalizedEvent, error)
	ListNormalizedEventsByEntity(ctx context.Context, entityKind, entityID string) ([]*domain.NormalizedEvent, error)
}

// IdentityResolution is the result of a successful identity lookup.
type IdentityResolution struct {
	UserID   string // internal user id; empty when unresolved
	TeamID   string // internal team id; empty when unresolved
	Resolved bool   // true when a mapping with status=mapped exists
}

// IdentityResolver resolves source logins / account IDs to internal identities.
// Implementations must be safe for concurrent use.
type IdentityResolver interface {
	// ResolveIdentity returns a resolution for the given external id in the given workspace.
	// Returns Resolved=false (not an error) when no mapping exists.
	ResolveIdentity(ctx context.Context, workspaceID string, sourceType domain.SourceType, externalID string) (IdentityResolution, error)
	// UpsertUnresolved records an unresolved identity so operators can map it later.
	UpsertUnresolved(ctx context.Context, workspaceID string, sourceType domain.SourceType, externalID, externalLogin string) error
}

// NormalizerSvc converts raw source events into canonical normalized events.
type NormalizerSvc struct {
	repo     NormalizedEventRepo
	resolver IdentityResolver // optional; nil disables identity resolution
}

// NewNormalizerSvc creates a NormalizerSvc.
func NewNormalizerSvc(repo NormalizedEventRepo) *NormalizerSvc {
	return &NormalizerSvc{repo: repo}
}

// WithIdentityResolver sets an optional identity resolver.
// Must be called before the service processes any events.
func (s *NormalizerSvc) WithIdentityResolver(r IdentityResolver) {
	s.resolver = r
}

// NormalizeAndStore normalizes a raw event, runs identity resolution, and persists.
// workspaceID must be the workspace that owns the source; it is used for all identity
// resolution calls — no hardcoded workspace is ever used.
// Returns a NormalizerError for unknown/unmapped events — callers should log and skip, not fail the run.
func (s *NormalizerSvc) NormalizeAndStore(ctx context.Context, raw *domain.RawSourceEvent, workspaceID string) (*domain.NormalizedEvent, error) {
	ev, err := s.Normalize(raw)
	if err != nil {
		return nil, err
	}
	if s.resolver != nil {
		if err := s.resolveIdentities(ctx, workspaceID, raw.SourceType, ev); err != nil {
			return nil, fmt.Errorf("resolve identities: %w", err)
		}
	}
	if err := s.repo.InsertNormalizedEvent(ctx, ev); err != nil {
		return nil, fmt.Errorf("persist normalized event: %w", err)
	}
	return ev, nil
}

// resolveIdentities mutates ev by replacing external logins with internal user IDs.
// workspaceID is required; cross-workspace identity pollution is impossible by construction.
func (s *NormalizerSvc) resolveIdentities(ctx context.Context, workspaceID string, sourceType domain.SourceType, ev *domain.NormalizedEvent) error {
	if ev.AuthorID != "" {
		res, err := s.resolver.ResolveIdentity(ctx, workspaceID, sourceType, ev.AuthorID)
		if err != nil {
			return fmt.Errorf("resolve author %q: %w", ev.AuthorID, err)
		}
		if res.Resolved {
			ev.AuthorID = res.UserID
			if ev.TeamID == "" {
				ev.TeamID = res.TeamID
			}
		} else {
			login := ev.AuthorID // preserve original login before marking unresolved
			ev.AuthorUnresolved = true
			_ = s.resolver.UpsertUnresolved(ctx, workspaceID, sourceType, login, login)
		}
	}
	if ev.ReviewerID != "" {
		res, err := s.resolver.ResolveIdentity(ctx, workspaceID, sourceType, ev.ReviewerID)
		if err != nil {
			return fmt.Errorf("resolve reviewer %q: %w", ev.ReviewerID, err)
		}
		if res.Resolved {
			ev.ReviewerID = res.UserID
		} else {
			login := ev.ReviewerID
			ev.ReviewerUnresolved = true
			_ = s.resolver.UpsertUnresolved(ctx, workspaceID, sourceType, login, login)
		}
	}
	return nil
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
			Category: NormCategoryUnsupportedSrc,
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
			ID:                 normID(raw.ID, string(domain.NormEventPROpened), "pull_request", raw.ExternalID),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventPROpened,
			EntityKind:         "pull_request",
			EntityID:           raw.ExternalID,
			RepositoryID:       strField(p, "repo_id"),
			AuthorID:           strField(p, "author_login"),
			OccurredAt:         timeField(p, "created_at", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}, nil

	case "pull_request.review_requested":
		return &domain.NormalizedEvent{
			ID:                 normID(raw.ID, string(domain.NormEventPRReviewRequested), "pull_request", raw.ExternalID),
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
			ID:                 normID(raw.ID, string(domain.NormEventPRReviewSubmitted), "pull_request", raw.ExternalID),
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
			ID:                 normID(raw.ID, string(domain.NormEventPRMerged), "pull_request", raw.ExternalID),
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
		// P1-8: use int64FieldOpt so explicit zero is preserved (zero means same-second merge).
		if ct, ok := int64FieldOpt(p, "cycle_time_seconds"); ok {
			ev.CycleTimeSeconds = &ct
		}
		if rl, ok := int64FieldOpt(p, "review_latency_seconds"); ok {
			ev.ReviewLatencySeconds = &rl
		}
		return ev, nil

	case "pull_request.closed":
		return &domain.NormalizedEvent{
			ID:                 normID(raw.ID, string(domain.NormEventPRClosed), "pull_request", raw.ExternalID),
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
			ID:                 normID(raw.ID, string(domain.NormEventWorkflowRunStarted), "workflow_run", raw.ExternalID),
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
			ID:                 normID(raw.ID, string(domain.NormEventWorkflowRunCompleted), "workflow_run", raw.ExternalID),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventWorkflowRunCompleted,
			EntityKind:         "workflow_run",
			EntityID:           raw.ExternalID,
			RepositoryID:       strField(p, "repo_id"),
			Conclusion:         normalizeConclusion(strField(p, "conclusion")),
			OccurredAt:         timeField(p, "completed_at", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}
		// P1-8: use int64FieldOpt so explicit zero duration is preserved.
		if d, ok := int64FieldOpt(p, "duration_seconds"); ok {
			ev.DurationSeconds = &d
		}
		return ev, nil

	// P1-10: deployment events previously fell through to IgnoredKnown; now mapped.
	case "deployment.created":
		return &domain.NormalizedEvent{
			ID:                 normID(raw.ID, string(domain.NormEventDeploymentCreated), "deployment", raw.ExternalID),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventDeploymentCreated,
			EntityKind:         "deployment",
			EntityID:           raw.ExternalID,
			RepositoryID:       strField(p, "repo_id"),
			OccurredAt:         timeField(p, "created_at", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}, nil

	case "deployment.succeeded":
		return &domain.NormalizedEvent{
			ID:                 normID(raw.ID, string(domain.NormEventDeploymentSucceeded), "deployment", raw.ExternalID),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventDeploymentSucceeded,
			EntityKind:         "deployment",
			EntityID:           raw.ExternalID,
			RepositoryID:       strField(p, "repo_id"),
			Conclusion:         "success",
			OccurredAt:         timeField(p, "deployed_at", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}, nil

	case "deployment.failed":
		return &domain.NormalizedEvent{
			ID:                 normID(raw.ID, string(domain.NormEventDeploymentFailed), "deployment", raw.ExternalID),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventDeploymentFailed,
			EntityKind:         "deployment",
			EntityID:           raw.ExternalID,
			RepositoryID:       strField(p, "repo_id"),
			Conclusion:         "failure",
			OccurredAt:         timeField(p, "failed_at", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}, nil

	default:
		return nil, &NormalizerError{
			Category: NormCategoryIgnoredKnown,
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
			ID:                 normID(raw.ID, string(domain.NormEventIssueCreated), "issue", raw.ExternalID),
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
			ID:                 normID(raw.ID, string(domain.NormEventIssueStatusChanged), "issue", raw.ExternalID),
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
			ID:                 normID(raw.ID, string(domain.NormEventIssueClosed), "issue", raw.ExternalID),
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
			ID:                 normID(raw.ID, string(domain.NormEventSprintStarted), "sprint", raw.ExternalID),
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
		ev := &domain.NormalizedEvent{
			ID:                 normID(raw.ID, string(domain.NormEventSprintClosed), "sprint", raw.ExternalID),
			RawSourceEventID:   raw.ID,
			SourceConnectionID: raw.SourceConnectionID,
			EventType:          domain.NormEventSprintClosed,
			EntityKind:         "sprint",
			EntityID:           raw.ExternalID,
			OccurredAt:         timeField(p, "end_date", raw.SourceUpdatedAt, now),
			ReceivedAt:         raw.ReceivedAt,
			SchemaVersion:      1,
		}
		if c, ok := int64FieldOpt(p, "completed_points"); ok {
			ev.PointsCompleted = &c
		}
		if pl, ok := int64FieldOpt(p, "planned_points"); ok {
			ev.PointsPlanned = &pl
		}
		return ev, nil

	default:
		return nil, &NormalizerError{
			Category: NormCategoryIgnoredKnown,
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

// int64FieldOpt returns (value, true) when the key is present (including zero),
// and (0, false) when absent. Use for numeric measures where 0 is a meaningful value.
func int64FieldOpt(p map[string]any, key string) (int64, bool) {
	v, ok := p[key]
	if !ok {
		return 0, false
	}
	switch n := v.(type) {
	case int64:
		return n, true
	case float64:
		return int64(n), true
	case int:
		return int64(n), true
	}
	return 0, false
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

// normID generates a deterministic normalized event ID from the raw event ID and
// event characterization fields. Stable across retries: the same raw event always
// produces the same normID, so ON CONFLICT (id) DO NOTHING correctly deduplicates.
//
// Format: "nev_" + hex(sha256(rawID:normEventType:entityKind:entityID))[:24]
func normID(rawID, normEventType, entityKind, entityID string) string {
	h := sha256.Sum256([]byte(rawID + ":" + normEventType + ":" + entityKind + ":" + entityID))
	return "nev_" + hex.EncodeToString(h[:12]) // 24 hex chars; collision probability negligible
}

// normalizeConclusion maps raw source conclusion strings to the canonical set.
// Returns "" if the input is empty or unrecognized (stored as NULL in the DB).
// P1-9: "neutral" is informational — it is mapped to "unknown", not "failure".
func normalizeConclusion(raw string) string {
	switch raw {
	case "success", "failure", "cancelled":
		return raw
	case "timed_out", "action_required":
		return "failure"
	case "neutral":
		// neutral means the check did not make a pass/fail determination.
		// Mapping it to "failure" would inflate build_failure_rate.
		return "unknown"
	default:
		if raw != "" {
			return "unknown"
		}
		return ""
	}
}

// int64Field is kept for backward compatibility with callers that use non-optional semantics.
var _ = int64Field
