// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

// Step 30: Integration tests that exercise the full collect → normalize → metric query pipeline
// using fake in-memory repos. No real database is required.

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

// — Fakes for integration pipeline —

// pipelineNormRepo is an in-memory NormalizedEventRepo that acts as both the
// NormalizedEventRepo (for NormalizerSvc) and MetricQueryRepo (for MetricQuerySvc).
type pipelineNormRepo struct {
	events []*domain.NormalizedEvent
}

func (r *pipelineNormRepo) InsertNormalizedEvent(_ context.Context, ev *domain.NormalizedEvent) error {
	r.events = append(r.events, ev)
	return nil
}

func (r *pipelineNormRepo) ListNormalizedEventsByRawID(_ context.Context, _ string) ([]*domain.NormalizedEvent, error) {
	return nil, nil
}

func (r *pipelineNormRepo) ListNormalizedEventsByEntity(_ context.Context, _, _ string) ([]*domain.NormalizedEvent, error) {
	return nil, nil
}

// fakeIntegrationMetricRepo wraps pipelineNormRepo to serve as biz.MetricQueryRepo.
// Only pr_count and build_failure_rate are implemented (sufficient for integration tests).
type fakeIntegrationMetricRepo struct {
	norm *pipelineNormRepo
}

func (r *fakeIntegrationMetricRepo) QueryPRCount(_ context.Context, q domain.MetricQuery) ([]domain.MetricRow, error) {
	var count int64
	for _, ev := range r.norm.events {
		if ev.EventType == domain.NormEventPRMerged &&
			!ev.OccurredAt.Before(q.Start) && ev.OccurredAt.Before(q.End) {
			count++
		}
	}
	if count == 0 {
		return nil, nil
	}
	bucket := q.Start
	return []domain.MetricRow{{BucketStart: bucket, Value: float64ptr(float64(count)), Count: count}}, nil
}

func (r *fakeIntegrationMetricRepo) QueryPRCycleTimeMedian(_ context.Context, _ domain.MetricQuery) ([]domain.MetricRow, error) {
	return nil, nil
}
func (r *fakeIntegrationMetricRepo) QueryReviewLatencyMedian(_ context.Context, _ domain.MetricQuery) ([]domain.MetricRow, error) {
	return nil, nil
}
func (r *fakeIntegrationMetricRepo) QueryBuildFailureRate(_ context.Context, q domain.MetricQuery) ([]domain.MetricRow, error) {
	var total, failed int64
	for _, ev := range r.norm.events {
		if ev.EventType == domain.NormEventWorkflowRunCompleted &&
			ev.Conclusion != "" &&
			!ev.OccurredAt.Before(q.Start) && ev.OccurredAt.Before(q.End) {
			total++
			if ev.Conclusion == "failure" {
				failed++
			}
		}
	}
	if total == 0 {
		return nil, nil
	}
	rate := float64(failed) / float64(total)
	bucket := q.Start
	return []domain.MetricRow{{BucketStart: bucket, Value: &rate, Count: total}}, nil
}
func (r *fakeIntegrationMetricRepo) QueryBuildDurationP95(_ context.Context, _ domain.MetricQuery) ([]domain.MetricRow, error) {
	return nil, nil
}
func (r *fakeIntegrationMetricRepo) QuerySprintPredictability(_ context.Context, _ domain.MetricQuery) ([]domain.MetricRow, error) {
	return nil, nil
}

func float64ptr(f float64) *float64 { return &f }

// — Helpers —

func buildPipelineServices(t *testing.T) (
	*biz.CollectorSvc,
	*pipelineNormRepo,
	*biz.MetricQuerySvc,
	*fakeSourceRepo,
) {
	t.Helper()
	normRepo := &pipelineNormRepo{}
	sr := newFakeSourceRepo()
	runRepo := newFakeCollectorRunRepo()
	evRepo := newFakeRawEventRepo()
	key := biz.DeriveKey("pipeline-test-key")
	reg := biz.NewAdapterRegistry()
	reg.Register(&biz.GitHubAdapter{})
	sourceSvc, err := biz.NewSourceSvc(sr, key, reg)
	require.NoError(t, err)
	colSvc := biz.NewCollectorSvc(sourceSvc, sr, runRepo, evRepo)
	normSvc := biz.NewNormalizerSvc(normRepo)
	colSvc.WithNormalizer(normSvc)
	metricQSvc := biz.NewMetricQuerySvc(&fakeIntegrationMetricRepo{norm: normRepo}, biz.NewMetricCatalog())
	return colSvc, normRepo, metricQSvc, sr
}

// — Tests —

func TestPipeline_CollectThenQuery_PRCount(t *testing.T) {
	colSvc, normRepo, metricQSvc, sr := buildPipelineServices(t)
	key := biz.DeriveKey("pipeline-test-key")
	sourceSvc, _ := biz.NewSourceSvc(sr, key, biz.NewAdapterRegistry())
	sc, _, err := sourceSvc.CreateSource(context.Background(), "ws_01", domain.CreateSourceInput{
		SourceType:  domain.SourceTypeGitHub,
		DisplayName: "pipeline test source",
		Config:      map[string]string{"org": "acme"},
		RawSecret:   "ghp_pipelinetest123",
	})
	require.NoError(t, err)

	mergedAt := time.Date(2026, 1, 15, 12, 0, 0, 0, time.UTC)
	fc := &fakeCollector{
		sourceType: domain.SourceTypeGitHub,
		result: &biz.CollectResult{
			Events: []*domain.RawSourceEvent{
				{
					ID:                 "raw_p01",
					SourceConnectionID: sc.ID,
					SourceType:         domain.SourceTypeGitHub,
					ExternalID:         "pr_42",
					EventType:          "pull_request.merged",
					PayloadHash:        biz.BuildPayloadHash(map[string]any{"repo_id": "r1", "merged": true}),
					DeduplicationKey:   biz.BuildDeduplicationKey(domain.SourceTypeGitHub, "pr_42", "pull_request.merged", &mergedAt),
					Payload:            map[string]any{"repo_id": "r1", "author_login": "alice", "merged_at": mergedAt.Format(time.RFC3339)},
					SchemaVersion:      1,
					ReceivedAt:         time.Now().UTC(),
					SourceUpdatedAt:    &mergedAt,
				},
			},
			RateLimitState: domain.RateLimitStateOK,
		},
	}
	colSvc.RegisterCollector(fc)

	run, err := colSvc.Run(context.Background(), "run_pipe_01", sc.ID)
	require.NoError(t, err)
	assert.Equal(t, domain.CollectorRunStatusSucceeded, run.Status)
	assert.Equal(t, int64(1), run.RawEventCount, "exactly 1 raw event inserted")

	// Normalization must have produced exactly 1 normalized event.
	assert.Len(t, normRepo.events, 1)
	assert.Equal(t, domain.NormEventPRMerged, normRepo.events[0].EventType)

	// Metric query must return quality=full with count=1.
	result, err := metricQSvc.Execute(context.Background(), domain.MetricQuery{
		MetricID:    "pr_count",
		WorkspaceID: "ws_01",
		Granularity: "day",
		Start:       time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		End:         time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC),
	})
	require.NoError(t, err)
	assert.Equal(t, domain.DataQualityFull, result.Quality)
	require.Len(t, result.Data.Rows, 1)
	assert.Equal(t, 1.0, result.Data.Rows[0][1])
}

func TestPipeline_EmptyQuality_WhenNoNormalizedData(t *testing.T) {
	_, _, metricQSvc, _ := buildPipelineServices(t)

	// No collection done — normalized repo is empty.
	result, err := metricQSvc.Execute(context.Background(), domain.MetricQuery{
		MetricID:    "pr_count",
		WorkspaceID: "ws_01",
		Granularity: "day",
		Start:       time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		End:         time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC),
	})
	require.NoError(t, err)
	assert.Equal(t, domain.DataQualityEmpty, result.Quality, "no data = empty quality, never fake values")
}

func TestPipeline_DuplicateRawEvents_DoNotInflateCount(t *testing.T) {
	colSvc, normRepo, metricQSvc, sr := buildPipelineServices(t)
	key := biz.DeriveKey("pipeline-test-key")
	sourceSvc, _ := biz.NewSourceSvc(sr, key, biz.NewAdapterRegistry())
	sc, _, err := sourceSvc.CreateSource(context.Background(), "ws_01", domain.CreateSourceInput{
		SourceType:  domain.SourceTypeGitHub,
		DisplayName: "dup test",
		Config:      map[string]string{"org": "dup-org"},
		RawSecret:   "ghp_duptest1234567",
	})
	require.NoError(t, err)

	mergedAt := time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC)
	dedupKey := biz.BuildDeduplicationKey(domain.SourceTypeGitHub, "pr_dup", "pull_request.merged", &mergedAt)
	ev := &domain.RawSourceEvent{
		ID:                 "raw_dup1",
		SourceConnectionID: sc.ID,
		SourceType:         domain.SourceTypeGitHub,
		ExternalID:         "pr_dup",
		EventType:          "pull_request.merged",
		PayloadHash:        biz.BuildPayloadHash(map[string]any{"r": 1}),
		DeduplicationKey:   dedupKey,
		Payload:            map[string]any{"repo_id": "r1", "author_login": "bob", "merged_at": mergedAt.Format(time.RFC3339)},
		SchemaVersion:      1,
		ReceivedAt:         time.Now().UTC(),
		SourceUpdatedAt:    &mergedAt,
	}

	fc := &fakeCollector{
		sourceType: domain.SourceTypeGitHub,
		result: &biz.CollectResult{
			Events:         []*domain.RawSourceEvent{ev, ev}, // same event twice
			RateLimitState: domain.RateLimitStateOK,
		},
	}
	colSvc.RegisterCollector(fc)

	run, err := colSvc.Run(context.Background(), "run_dup_pipe", sc.ID)
	require.NoError(t, err)
	assert.Equal(t, int64(1), run.RawEventCount, "duplicate raw event must not be counted twice")

	// Normalized repo must have exactly 1 event (duplicate not normalized again).
	assert.Len(t, normRepo.events, 1)

	// Metric query must count exactly 1.
	result, err := metricQSvc.Execute(context.Background(), domain.MetricQuery{
		MetricID:    "pr_count",
		WorkspaceID: "ws_01",
		Granularity: "day",
		Start:       time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		End:         time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC),
	})
	require.NoError(t, err)
	require.Len(t, result.Data.Rows, 1)
	assert.Equal(t, 1.0, result.Data.Rows[0][1], "duplicate events must not inflate metric count")
}

func TestPipeline_BuildFailureRate_ActionsCollector(t *testing.T) {
	colSvc, normRepo, metricQSvc, sr := buildPipelineServices(t)
	key := biz.DeriveKey("pipeline-test-key")
	sourceSvc, _ := biz.NewSourceSvc(sr, key, biz.NewAdapterRegistry())

	// Register a GitHub Actions adapter to satisfy the source type validation.
	reg2 := biz.NewAdapterRegistry()
	reg2.Register(&biz.GitHubActionsAdapter{})
	sourceSvc2, _ := biz.NewSourceSvc(sr, key, reg2)
	sc, _, err := sourceSvc2.CreateSource(context.Background(), "ws_01", domain.CreateSourceInput{
		SourceType:  domain.SourceTypeGitHubActions,
		DisplayName: "actions test",
		Config:      map[string]string{"org": "ci-org"},
		RawSecret:   "ghp_actiontoken12345",
	})
	require.NoError(t, err)
	_ = sourceSvc

	completedAt := time.Date(2026, 1, 20, 10, 5, 0, 0, time.UTC)
	startedAt := time.Date(2026, 1, 20, 10, 0, 0, 0, time.UTC)
	fc := &fakeCollector{
		sourceType: domain.SourceTypeGitHubActions,
		result: &biz.CollectResult{
			Events: []*domain.RawSourceEvent{
				{
					ID:                 "raw_wf1",
					SourceConnectionID: sc.ID,
					SourceType:         domain.SourceTypeGitHubActions,
					ExternalID:         "run_001",
					EventType:          "workflow_run.completed",
					PayloadHash:        biz.BuildPayloadHash(map[string]any{"c": "failure"}),
					DeduplicationKey:   biz.BuildDeduplicationKey(domain.SourceTypeGitHubActions, "run_001", "workflow_run.completed", &completedAt),
					Payload:            map[string]any{"repo_id": "r2", "workflow_id": "w1", "started_at": startedAt.Format(time.RFC3339), "completed_at": completedAt.Format(time.RFC3339), "conclusion": "failure"},
					SchemaVersion:      1,
					ReceivedAt:         time.Now().UTC(),
					SourceUpdatedAt:    &completedAt,
				},
				{
					ID:                 "raw_wf2",
					SourceConnectionID: sc.ID,
					SourceType:         domain.SourceTypeGitHubActions,
					ExternalID:         "run_002",
					EventType:          "workflow_run.completed",
					PayloadHash:        biz.BuildPayloadHash(map[string]any{"c": "success"}),
					DeduplicationKey:   biz.BuildDeduplicationKey(domain.SourceTypeGitHubActions, "run_002", "workflow_run.completed", &completedAt),
					Payload:            map[string]any{"repo_id": "r2", "workflow_id": "w1", "started_at": startedAt.Format(time.RFC3339), "completed_at": completedAt.Format(time.RFC3339), "conclusion": "success"},
					SchemaVersion:      1,
					ReceivedAt:         time.Now().UTC(),
					SourceUpdatedAt:    &completedAt,
				},
			},
			RateLimitState: domain.RateLimitStateOK,
		},
	}
	colSvc.RegisterCollector(fc)

	run, err := colSvc.Run(context.Background(), "run_wf_pipe", sc.ID)
	require.NoError(t, err)
	assert.Equal(t, int64(2), run.RawEventCount)
	// 2 normalized events (one per completed run).
	completedNorm := 0
	for _, ev := range normRepo.events {
		if ev.EventType == domain.NormEventWorkflowRunCompleted {
			completedNorm++
		}
	}
	assert.Equal(t, 2, completedNorm)

	// build_failure_rate: 1 failure / 2 total = 0.5
	result, err := metricQSvc.Execute(context.Background(), domain.MetricQuery{
		MetricID:    "build_failure_rate",
		WorkspaceID: "ws_01",
		Granularity: "day",
		Start:       time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		End:         time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC),
	})
	require.NoError(t, err)
	assert.Equal(t, domain.DataQualityFull, result.Quality)
	require.Len(t, result.Data.Rows, 1)
	assert.InDelta(t, 0.5, result.Data.Rows[0][1], 0.001)
}

func TestPipeline_ActivityFeedSvc_ReturnsNormalizedEvents(t *testing.T) {
	// Wire ActivityFeedSvc over the pipelineNormRepo via a small adapter.
	normRepo := &pipelineNormRepo{}

	// Manually insert a normalized event.
	normRepo.events = []*domain.NormalizedEvent{
		{
			ID:                 "nev_af1",
			SourceConnectionID: "src_01",
			EventType:          domain.NormEventPRMerged,
			EntityKind:         "pull_request",
			EntityID:           "pr_01",
			RepositoryID:       "repo_abc",
			AuthorID:           "user_01",
			OccurredAt:         time.Date(2026, 1, 15, 12, 0, 0, 0, time.UTC),
		},
	}

	// Wrap normRepo in a fake ActivityFeedRepo.
	afRepo := &fakeActivityFeedRepo{
		items: []domain.ActivityFeedItem{
			{
				ID:           "nev_af1",
				EventType:    "pull_request.merged",
				EntityKind:   "pull_request",
				EntityID:     "pr_01",
				RepositoryID: "repo_abc",
				AuthorID:     "user_01",
				OccurredAt:   time.Date(2026, 1, 15, 12, 0, 0, 0, time.UTC),
			},
		},
	}
	svc := biz.NewActivityFeedSvc(afRepo)

	result, err := svc.Execute(context.Background(), domain.ActivityFeedQuery{
		WorkspaceID: "ws_01",
		Start:       time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		End:         time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC),
		Limit:       50,
	})
	require.NoError(t, err)
	assert.Equal(t, domain.DataQualityFull, result.Quality)
	require.Len(t, result.Items, 1)
	// Verify no free-form text fields exist on the item.
	item := result.Items[0]
	assert.Equal(t, "pull_request.merged", item.EventType)
	assert.Equal(t, "repo_abc", item.RepositoryID)
}
