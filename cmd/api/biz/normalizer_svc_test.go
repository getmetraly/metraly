// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeNormalizedEventRepo is an in-memory NormalizedEventRepo for tests.
type fakeNormalizedEventRepo struct {
	events []*domain.NormalizedEvent
}

func (f *fakeNormalizedEventRepo) InsertNormalizedEvent(_ context.Context, ev *domain.NormalizedEvent) error {
	f.events = append(f.events, ev)
	return nil
}

func (f *fakeNormalizedEventRepo) ListNormalizedEventsByRawID(_ context.Context, rawID string) ([]*domain.NormalizedEvent, error) {
	var result []*domain.NormalizedEvent
	for _, ev := range f.events {
		if ev.RawSourceEventID == rawID {
			result = append(result, ev)
		}
	}
	return result, nil
}

func (f *fakeNormalizedEventRepo) ListNormalizedEventsByEntity(_ context.Context, entityKind, entityID string) ([]*domain.NormalizedEvent, error) {
	var result []*domain.NormalizedEvent
	for _, ev := range f.events {
		if ev.EntityKind == entityKind && ev.EntityID == entityID {
			result = append(result, ev)
		}
	}
	return result, nil
}

func rawEvent(sourceType domain.SourceType, externalID, eventType string, payload map[string]any) *domain.RawSourceEvent {
	return &domain.RawSourceEvent{
		ID:                 "raw_test_" + eventType,
		SourceConnectionID: "src_01",
		CollectorRunID:     "run_01",
		SourceType:         sourceType,
		ExternalID:         externalID,
		EventType:          eventType,
		PayloadHash:        biz.BuildPayloadHash(payload),
		DeduplicationKey:   string(sourceType) + ":" + externalID + ":" + eventType,
		Payload:            payload,
		SchemaVersion:      1,
		ReceivedAt:         time.Now().UTC(),
	}
}

func TestNormalizerSvc_GitHubPROpened(t *testing.T) {
	repo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(repo)

	raw := rawEvent(domain.SourceTypeGitHub, "pr_42", "pull_request.opened", map[string]any{
		"author_login": "alice",
		"repo_id":      "repo_001",
	})

	ev, err := svc.NormalizeAndStore(context.Background(), raw)
	require.NoError(t, err)
	assert.Equal(t, domain.NormEventPROpened, ev.EventType)
	assert.Equal(t, "pull_request", ev.EntityKind)
	assert.Equal(t, "pr_42", ev.EntityID)
	assert.Equal(t, "alice", ev.AuthorID)
	assert.Equal(t, "repo_001", ev.RepositoryID)
	assert.Len(t, repo.events, 1)
}

func TestNormalizerSvc_GitHubPRMerged_WithCycleTime(t *testing.T) {
	repo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(repo)

	raw := rawEvent(domain.SourceTypeGitHub, "pr_42", "pull_request.merged", map[string]any{
		"author_login":           "alice",
		"cycle_time_seconds":     float64(3600),
		"review_latency_seconds": float64(900),
	})

	ev, err := svc.NormalizeAndStore(context.Background(), raw)
	require.NoError(t, err)
	assert.Equal(t, domain.NormEventPRMerged, ev.EventType)
	require.NotNil(t, ev.CycleTimeSeconds)
	assert.Equal(t, int64(3600), *ev.CycleTimeSeconds)
	require.NotNil(t, ev.ReviewLatencySeconds)
	assert.Equal(t, int64(900), *ev.ReviewLatencySeconds)
}

func TestNormalizerSvc_WorkflowRunCompleted_WithDuration(t *testing.T) {
	repo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(repo)

	raw := rawEvent(domain.SourceTypeGitHubActions, "run_99", "workflow_run.completed", map[string]any{
		"duration_seconds": float64(120),
		"repo_id":          "repo_001",
	})

	ev, err := svc.NormalizeAndStore(context.Background(), raw)
	require.NoError(t, err)
	assert.Equal(t, domain.NormEventWorkflowRunCompleted, ev.EventType)
	require.NotNil(t, ev.DurationSeconds)
	assert.Equal(t, int64(120), *ev.DurationSeconds)
}

func TestNormalizerSvc_JiraIssueClosed(t *testing.T) {
	repo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(repo)

	raw := rawEvent(domain.SourceTypeJira, "PROJ-42", "issue.closed", map[string]any{
		"reporter_account_id": "uid_123",
	})

	ev, err := svc.NormalizeAndStore(context.Background(), raw)
	require.NoError(t, err)
	assert.Equal(t, domain.NormEventIssueClosed, ev.EventType)
	assert.Equal(t, "issue", ev.EntityKind)
}

func TestNormalizerSvc_JiraSprintClosed(t *testing.T) {
	repo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(repo)

	raw := rawEvent(domain.SourceTypeJira, "sprint_7", "sprint.closed", map[string]any{})
	ev, err := svc.NormalizeAndStore(context.Background(), raw)
	require.NoError(t, err)
	assert.Equal(t, domain.NormEventSprintClosed, ev.EventType)
	assert.Equal(t, "sprint", ev.EntityKind)
}

func TestNormalizerSvc_UnsupportedSource(t *testing.T) {
	repo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(repo)

	raw := rawEvent(domain.SourceTypePrometheus, "metric_1", "metric.recorded", map[string]any{})
	_, err := svc.NormalizeAndStore(context.Background(), raw)
	require.Error(t, err)
	var normErr *biz.NormalizerError
	assert.ErrorAs(t, err, &normErr)
	assert.Equal(t, "unsupported_source", normErr.Category)
}

func TestNormalizerSvc_UnknownEventType_ReturnsIgnored(t *testing.T) {
	repo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(repo)

	raw := rawEvent(domain.SourceTypeGitHub, "pr_1", "pull_request.locked", map[string]any{})
	_, err := svc.NormalizeAndStore(context.Background(), raw)
	require.Error(t, err)
	var normErr *biz.NormalizerError
	assert.ErrorAs(t, err, &normErr)
	assert.Equal(t, "ignored_known_unsupported", normErr.Category)

	// Nothing stored for unmapped events
	assert.Len(t, repo.events, 0)
}

func TestNormalizerSvc_Normalize_DoesNotPersist(t *testing.T) {
	repo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(repo)

	raw := rawEvent(domain.SourceTypeGitHub, "pr_1", "pull_request.opened", map[string]any{})
	ev, err := svc.Normalize(raw)
	require.NoError(t, err)
	assert.NotNil(t, ev)
	assert.Len(t, repo.events, 0) // Normalize alone does not persist
}

// fakeIdentityResolver implements biz.IdentityResolver for tests.
type fakeIdentityResolver struct {
	mappings   map[string]biz.IdentityResolution // key: externalID
	upserted   []string                          // externalIDs passed to UpsertUnresolved
	resolveErr error
	upsertErr  error
}

func (f *fakeIdentityResolver) ResolveIdentity(_ context.Context, _ string, _ domain.SourceType, externalID string) (biz.IdentityResolution, error) {
	if f.resolveErr != nil {
		return biz.IdentityResolution{}, f.resolveErr
	}
	res, ok := f.mappings[externalID]
	if !ok {
		return biz.IdentityResolution{Resolved: false}, nil
	}
	return res, nil
}

func (f *fakeIdentityResolver) UpsertUnresolved(_ context.Context, _ string, _ domain.SourceType, externalID, _ string) error {
	f.upserted = append(f.upserted, externalID)
	return f.upsertErr
}

func TestNormalizerSvc_AuthorResolved_SetsUserID(t *testing.T) {
	repo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(repo)
	resolver := &fakeIdentityResolver{
		mappings: map[string]biz.IdentityResolution{
			"octocat": {UserID: "usr_abc", TeamID: "team_xyz", Resolved: true},
		},
	}
	svc.WithIdentityResolver(resolver)

	raw := rawEvent(domain.SourceTypeGitHub, "pr_1", "pull_request.opened", map[string]any{
		"author_login": "octocat",
	})
	ev, err := svc.NormalizeAndStore(context.Background(), raw)
	require.NoError(t, err)
	assert.Equal(t, "usr_abc", ev.AuthorID)
	assert.Equal(t, "team_xyz", ev.TeamID)
	assert.False(t, ev.AuthorUnresolved)
	assert.Empty(t, resolver.upserted)
}

func TestNormalizerSvc_AuthorUnresolved_SetsFlag(t *testing.T) {
	repo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(repo)
	svc.WithIdentityResolver(&fakeIdentityResolver{mappings: map[string]biz.IdentityResolution{}})

	raw := rawEvent(domain.SourceTypeGitHub, "pr_2", "pull_request.opened", map[string]any{
		"author_login": "unknown-dev",
	})
	ev, err := svc.NormalizeAndStore(context.Background(), raw)
	require.NoError(t, err)
	assert.True(t, ev.AuthorUnresolved)
	assert.Equal(t, "unknown-dev", ev.AuthorID) // original login preserved
}

func TestNormalizerSvc_ReviewerResolved(t *testing.T) {
	repo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(repo)
	resolver := &fakeIdentityResolver{
		mappings: map[string]biz.IdentityResolution{
			"reviewer99": {UserID: "usr_rev", Resolved: true},
		},
	}
	svc.WithIdentityResolver(resolver)

	raw := rawEvent(domain.SourceTypeGitHub, "pr_3", "pull_request.review_requested", map[string]any{
		"reviewer_login": "reviewer99",
	})
	ev, err := svc.NormalizeAndStore(context.Background(), raw)
	require.NoError(t, err)
	assert.Equal(t, "usr_rev", ev.ReviewerID)
	assert.False(t, ev.ReviewerUnresolved)
}

func TestNormalizerSvc_ReviewerUnresolved_UpsertsCalled(t *testing.T) {
	repo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(repo)
	resolver := &fakeIdentityResolver{mappings: map[string]biz.IdentityResolution{}}
	svc.WithIdentityResolver(resolver)

	raw := rawEvent(domain.SourceTypeGitHub, "pr_4", "pull_request.review_requested", map[string]any{
		"reviewer_login": "new-reviewer",
	})
	ev, err := svc.NormalizeAndStore(context.Background(), raw)
	require.NoError(t, err)
	assert.True(t, ev.ReviewerUnresolved)
	assert.Contains(t, resolver.upserted, "new-reviewer")
}

func TestNormalizerSvc_JiraAuthorResolved(t *testing.T) {
	repo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(repo)
	resolver := &fakeIdentityResolver{
		mappings: map[string]biz.IdentityResolution{
			"5b10a2844c20165700ede21g": {UserID: "usr_jira1", Resolved: true},
		},
	}
	svc.WithIdentityResolver(resolver)

	raw := rawEvent(domain.SourceTypeJira, "PROJ-10", "issue.created", map[string]any{
		"reporter_account_id": "5b10a2844c20165700ede21g",
	})
	ev, err := svc.NormalizeAndStore(context.Background(), raw)
	require.NoError(t, err)
	assert.Equal(t, "usr_jira1", ev.AuthorID)
	assert.False(t, ev.AuthorUnresolved)
}

func TestNormalizerSvc_NoResolver_NoResolution(t *testing.T) {
	repo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(repo) // no resolver set

	raw := rawEvent(domain.SourceTypeGitHub, "pr_5", "pull_request.opened", map[string]any{
		"author_login": "somebody",
	})
	ev, err := svc.NormalizeAndStore(context.Background(), raw)
	require.NoError(t, err)
	// Without resolver the raw login is kept, no unresolved flag
	assert.Equal(t, "somebody", ev.AuthorID)
	assert.False(t, ev.AuthorUnresolved)
}

func TestNormalizerSvc_WorkflowRunCompleted_Conclusion(t *testing.T) {
	repo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(repo)

	raw := rawEvent(domain.SourceTypeGitHubActions, "run_200", "workflow_run.completed", map[string]any{
		"conclusion":       "failure",
		"duration_seconds": float64(45),
	})
	ev, err := svc.NormalizeAndStore(context.Background(), raw)
	require.NoError(t, err)
	assert.Equal(t, "failure", ev.Conclusion)
}

func TestNormalizerSvc_JiraSprintClosed_WithPoints(t *testing.T) {
	repo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(repo)

	raw := rawEvent(domain.SourceTypeJira, "sprint_8", "sprint.closed", map[string]any{
		"completed_points": float64(34),
		"planned_points":   float64(40),
	})
	ev, err := svc.NormalizeAndStore(context.Background(), raw)
	require.NoError(t, err)
	require.NotNil(t, ev.PointsCompleted)
	require.NotNil(t, ev.PointsPlanned)
	assert.Equal(t, int64(34), *ev.PointsCompleted)
	assert.Equal(t, int64(40), *ev.PointsPlanned)
}

func TestNormalizerSvc_ResolveIdentityError_PropagatesError(t *testing.T) {
	// When ResolveIdentity returns a transient error (not "no mapping"), NormalizeAndStore
	// must propagate the error. The event must NOT be persisted and must NOT be marked
	// AuthorUnresolved — doing so would permanently corrupt attribution data.
	eventRepo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(eventRepo)
	resolver := &fakeIdentityResolver{
		resolveErr: errors.New("identity store unavailable"),
	}
	svc.WithIdentityResolver(resolver)

	raw := rawEvent(domain.SourceTypeGitHub, "pr_10", "pull_request.opened", map[string]any{
		"author_login": "alice",
	})
	ev, err := svc.NormalizeAndStore(context.Background(), raw)
	require.Error(t, err)
	assert.Nil(t, ev)
	assert.Empty(t, eventRepo.events)  // must not persist
	assert.Empty(t, resolver.upserted) // must not call UpsertUnresolved on transient error
}

func TestNormalizerSvc_JiraSprintClosed_ZeroPointsCompleted(t *testing.T) {
	// completed_points=0 is a meaningful value (sprint delivered nothing).
	// It must be stored as 0, not NULL. Regression test for the > 0 guard bug.
	eventRepo := &fakeNormalizedEventRepo{}
	svc := biz.NewNormalizerSvc(eventRepo)

	raw := rawEvent(domain.SourceTypeJira, "sprint_fail", "sprint.closed", map[string]any{
		"completed_points": float64(0),
		"planned_points":   float64(20),
	})
	ev, err := svc.NormalizeAndStore(context.Background(), raw)
	require.NoError(t, err)
	require.NotNil(t, ev.PointsCompleted, "completed_points=0 must be stored, not dropped")
	assert.Equal(t, int64(0), *ev.PointsCompleted)
	require.NotNil(t, ev.PointsPlanned)
	assert.Equal(t, int64(20), *ev.PointsPlanned)
}
