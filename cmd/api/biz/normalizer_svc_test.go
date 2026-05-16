// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz_test

import (
	"context"
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
		"author_login":         "alice",
		"cycle_time_seconds":   float64(3600),
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
