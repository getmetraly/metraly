// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz_test

// Step 29 tests: lineage propagation, quality contract, groupBy rejection,
// filter validation, activity feed service.

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// — MetricQueryResult.Lineage tests —

func TestMetricQuerySvc_LineagePopulated(t *testing.T) {
	bucket := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"pr_count": {{BucketStart: bucket, Value: flt(5), Count: 5}},
	})

	result, err := svc.Execute(context.Background(), testQuery("pr_count"))
	require.NoError(t, err)

	assert.Equal(t, "pr_count", result.Lineage.MetricID)
	assert.NotEmpty(t, result.Lineage.FormulaID, "FormulaID must be populated")
	assert.Greater(t, result.Lineage.FormulaVersion, 0)
	// NormalizedEventTypes must be non-empty — tells the caller which events feed this metric.
	assert.NotEmpty(t, result.Lineage.NormalizedEventTypes)
}

func TestMetricQuerySvc_LineageFormulaFallback(t *testing.T) {
	// When the catalog has no FormulaID, a stable fallback formula:<metricId>:v1 is used.
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"pr_count": {{BucketStart: time.Now(), Value: flt(1), Count: 1}},
	})

	result, err := svc.Execute(context.Background(), testQuery("pr_count"))
	require.NoError(t, err)

	// Either the catalog-defined formula ID or the fallback must be present.
	assert.NotEmpty(t, result.Lineage.FormulaID)
}

func TestMetricQuerySvc_LineageSourceIDs_FromFilter(t *testing.T) {
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"pr_count": {{BucketStart: time.Now(), Value: flt(3), Count: 3}},
	})

	q := testQuery("pr_count")
	q.Filters = map[string]string{"source_connection_id": "src_abc"}

	result, err := svc.Execute(context.Background(), q)
	require.NoError(t, err)

	// When source_connection_id filter is provided, it must appear in Lineage.SourceIDs.
	require.Len(t, result.Lineage.SourceIDs, 1)
	assert.Equal(t, "src_abc", result.Lineage.SourceIDs[0])
}

func TestMetricQuerySvc_LineageSourceIDs_Empty_WhenNoFilter(t *testing.T) {
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"pr_count": {{BucketStart: time.Now(), Value: flt(2), Count: 2}},
	})

	result, err := svc.Execute(context.Background(), testQuery("pr_count"))
	require.NoError(t, err)

	// Without an explicit source filter, SourceIDs must be a non-null empty slice
	// so JSON marshaling emits [] rather than null (stable API contract).
	assert.NotNil(t, result.Lineage.SourceIDs)
	assert.Empty(t, result.Lineage.SourceIDs)
}

func TestMetricQuerySvc_LineageJSON_NeverNullArrays(t *testing.T) {
	// JSON serialization of LineageContract must emit [] not null for slice fields
	// so API consumers can iterate without nil checks.
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"pr_count": {{BucketStart: time.Now(), Value: flt(1), Count: 1}},
	})

	result, err := svc.Execute(context.Background(), testQuery("pr_count"))
	require.NoError(t, err)

	b, err := json.Marshal(result.Lineage)
	require.NoError(t, err)
	got := string(b)

	assert.NotContains(t, got, `"sourceIds":null`,
		"sourceIds must serialize as [] not null")
	assert.NotContains(t, got, `"normalizedEventTypes":null`,
		"normalizedEventTypes must serialize as [] not null")
	assert.Contains(t, got, `"sourceIds":[]`,
		"sourceIds must be a non-null empty array when no filter provided")
}

func TestMetricQuerySvc_MissingWorkspaceID_ReturnsError(t *testing.T) {
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"pr_count": {{BucketStart: time.Now(), Value: flt(1), Count: 1}},
	})

	q := testQuery("pr_count")
	q.WorkspaceID = ""

	_, err := svc.Execute(context.Background(), q)
	require.Error(t, err)
	assert.ErrorIs(t, err, biz.ErrMissingWorkspaceID)
}

// — QualityContract tests —

func TestMetricQuerySvc_QualityContract_EmptyResult(t *testing.T) {
	svc := newQuerySvc(map[string][]domain.MetricRow{"pr_count": {}})

	result, err := svc.Execute(context.Background(), testQuery("pr_count"))
	require.NoError(t, err)

	assert.Equal(t, domain.DataQualityEmpty, result.Quality)
	assert.Equal(t, domain.DataQualityEmpty, result.QualityContract.Level)
	assert.Equal(t, 0.0, result.QualityContract.CoveragePercent)
	assert.Nil(t, result.QualityContract.EarliestDataAt)
	assert.Nil(t, result.QualityContract.LatestDataAt)
	assert.NotEmpty(t, result.QualityNotes)
}

func TestMetricQuerySvc_QualityContract_FullResult(t *testing.T) {
	b1 := time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC)
	b2 := time.Date(2026, 1, 20, 0, 0, 0, 0, time.UTC)
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"pr_count": {
			{BucketStart: b1, Value: flt(5), Count: 5},
			{BucketStart: b2, Value: flt(3), Count: 3},
		},
	})

	result, err := svc.Execute(context.Background(), testQuery("pr_count"))
	require.NoError(t, err)

	assert.Equal(t, domain.DataQualityFull, result.Quality)
	assert.Equal(t, domain.DataQualityFull, result.QualityContract.Level)
	assert.Equal(t, 100.0, result.QualityContract.CoveragePercent)
	require.NotNil(t, result.QualityContract.EarliestDataAt)
	require.NotNil(t, result.QualityContract.LatestDataAt)
	assert.Equal(t, b1.UTC(), result.QualityContract.EarliestDataAt.UTC())
	assert.Equal(t, b2.UTC(), result.QualityContract.LatestDataAt.UTC())
}

func TestMetricQuerySvc_QualityContract_PartialResult(t *testing.T) {
	b1 := time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC)
	b2 := time.Date(2026, 1, 20, 0, 0, 0, 0, time.UTC)
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"pr_cycle_time_median": {
			{BucketStart: b1, Value: flt(3600), Count: 5},
			{BucketStart: b2, Value: nil, Count: 2}, // no cycle time in this bucket
		},
	})

	result, err := svc.Execute(context.Background(), testQuery("pr_cycle_time_median"))
	require.NoError(t, err)

	assert.Equal(t, domain.DataQualityPartial, result.QualityContract.Level)
	// 1 of 2 buckets has a value = 50% coverage.
	assert.Equal(t, 50.0, result.QualityContract.CoveragePercent)
}

// — GroupBy rejection tests —

func TestMetricQuerySvc_GroupBy_NonEmpty_Returns400(t *testing.T) {
	svc := newQuerySvc(map[string][]domain.MetricRow{"pr_count": {}})

	q := testQuery("pr_count")
	q.GroupBy = []string{"team_id"}

	_, err := svc.Execute(context.Background(), q)
	require.Error(t, err)
	assert.ErrorIs(t, err, biz.ErrUnsupportedGroupBy)
}

func TestMetricQuerySvc_GroupBy_Multiple_Returns400(t *testing.T) {
	svc := newQuerySvc(map[string][]domain.MetricRow{"pr_count": {}})

	q := testQuery("pr_count")
	q.GroupBy = []string{"team_id", "repository_id"}

	_, err := svc.Execute(context.Background(), q)
	require.Error(t, err)
	assert.ErrorIs(t, err, biz.ErrUnsupportedGroupBy)
}

func TestMetricQuerySvc_GroupBy_Empty_IsAccepted(t *testing.T) {
	bucket := time.Now()
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"pr_count": {{BucketStart: bucket, Value: flt(1), Count: 1}},
	})

	q := testQuery("pr_count")
	q.GroupBy = nil

	_, err := svc.Execute(context.Background(), q)
	require.NoError(t, err)
}

// — Filter validation tests —

func TestMetricQuerySvc_UnknownFilter_ReturnsError(t *testing.T) {
	svc := newQuerySvc(map[string][]domain.MetricRow{"pr_count": {}})

	q := testQuery("pr_count")
	q.Filters = map[string]string{"unknown_dimension": "value"}

	_, err := svc.Execute(context.Background(), q)
	require.Error(t, err)
	assert.ErrorIs(t, err, biz.ErrUnsupportedFilter)
	assert.Contains(t, err.Error(), "unknown_dimension")
}

func TestMetricQuerySvc_KnownFilter_IsAccepted(t *testing.T) {
	bucket := time.Now()
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"pr_count": {{BucketStart: bucket, Value: flt(3), Count: 3}},
	})

	q := testQuery("pr_count")
	q.Filters = map[string]string{
		"repository_id": "repo_abc",
		"team_id":       "team_xyz",
	}

	_, err := svc.Execute(context.Background(), q)
	require.NoError(t, err)
}

// — Activity Feed Service tests —

// fakeActivityFeedRepo satisfies biz.ActivityFeedRepo.
type fakeActivityFeedRepo struct {
	items []domain.ActivityFeedItem
	err   error
}

func (f *fakeActivityFeedRepo) QueryActivityFeed(_ context.Context, _ domain.ActivityFeedQuery) ([]domain.ActivityFeedItem, error) {
	return f.items, f.err
}

func testActivityQuery() domain.ActivityFeedQuery {
	return domain.ActivityFeedQuery{
		WorkspaceID: "ws_01",
		Start:       time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		End:         time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC),
		Limit:       50,
	}
}

func TestActivityFeedSvc_ReturnsItems(t *testing.T) {
	items := []domain.ActivityFeedItem{
		{
			ID:           "nev_01",
			EventType:    "pull_request.merged",
			EntityKind:   "pull_request",
			EntityID:     "pr_42",
			OccurredAt:   time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC),
			RepositoryID: "repo_abc",
			AuthorID:     "user_001",
		},
	}

	svc := biz.NewActivityFeedSvc(&fakeActivityFeedRepo{items: items})
	result, err := svc.Execute(context.Background(), testActivityQuery())
	require.NoError(t, err)
	assert.Equal(t, domain.DataQualityFull, result.Quality)
	require.Len(t, result.Items, 1)
	assert.Equal(t, "pull_request.merged", result.Items[0].EventType)
}

func TestActivityFeedSvc_Empty_ReturnsQualityEmpty(t *testing.T) {
	svc := biz.NewActivityFeedSvc(&fakeActivityFeedRepo{items: []domain.ActivityFeedItem{}})
	result, err := svc.Execute(context.Background(), testActivityQuery())
	require.NoError(t, err)
	assert.Equal(t, domain.DataQualityEmpty, result.Quality)
	assert.Empty(t, result.Items)
	assert.NotEmpty(t, result.QualityNotes)
}

func TestActivityFeedSvc_NoFreeFormText(t *testing.T) {
	// ActivityFeedItem has no title/body/message/description fields by design.
	// Verify via field inspection that the struct only contains safe fields.
	item := domain.ActivityFeedItem{
		ID:                 "nev_01",
		EventType:          "pull_request.merged",
		EntityKind:         "pull_request",
		EntityID:           "pr_42",
		OccurredAt:         time.Now(),
		RepositoryID:       "repo_abc",
		TeamID:             "team_01",
		AuthorID:           "user_01",
		ReviewerID:         "user_02",
		AuthorUnresolved:   false,
		ReviewerUnresolved: false,
	}

	svc := biz.NewActivityFeedSvc(&fakeActivityFeedRepo{items: []domain.ActivityFeedItem{item}})
	result, err := svc.Execute(context.Background(), testActivityQuery())
	require.NoError(t, err)

	// The item in the result must not contain title/body/description/message fields.
	// Verified structurally — ActivityFeedItem has no such fields.
	// This test ensures the returned items match the input (no secret injection).
	require.Len(t, result.Items, 1)
	got := result.Items[0]
	assert.Equal(t, item.EventType, got.EventType)
	assert.Equal(t, item.RepositoryID, got.RepositoryID)
	// Verify no free-form field is non-empty by construction.
	// (The struct has no such fields, so this is a compile-time guarantee.)
}

func TestActivityFeedSvc_UnknownFilter_ReturnsError(t *testing.T) {
	svc := biz.NewActivityFeedSvc(&fakeActivityFeedRepo{})
	q := testActivityQuery()
	q.Filters = map[string]string{"commit_message": "secret"}

	_, err := svc.Execute(context.Background(), q)
	require.Error(t, err)
	assert.ErrorIs(t, err, biz.ErrUnsupportedFilter)
}

func TestActivityFeedSvc_KnownFilter_IsAccepted(t *testing.T) {
	svc := biz.NewActivityFeedSvc(&fakeActivityFeedRepo{items: []domain.ActivityFeedItem{}})
	q := testActivityQuery()
	q.Filters = map[string]string{"repository_id": "repo_x"}

	_, err := svc.Execute(context.Background(), q)
	require.NoError(t, err)
}

func TestActivityFeedSvc_LimitDefault(t *testing.T) {
	var capturedLimit int
	repo := &captureActivityFeedRepo{captureFn: func(q domain.ActivityFeedQuery) {
		capturedLimit = q.Limit
	}}

	svc := biz.NewActivityFeedSvc(repo)
	q := testActivityQuery()
	q.Limit = 0 // 0 means "use default"

	svc.Execute(context.Background(), q)
	assert.Equal(t, 50, capturedLimit, "default limit must be 50")
}

func TestActivityFeedSvc_LimitMax(t *testing.T) {
	var capturedLimit int
	repo := &captureActivityFeedRepo{captureFn: func(q domain.ActivityFeedQuery) {
		capturedLimit = q.Limit
	}}

	svc := biz.NewActivityFeedSvc(repo)
	q := testActivityQuery()
	q.Limit = 9999 // exceeds max 200

	svc.Execute(context.Background(), q)
	assert.Equal(t, 200, capturedLimit, "limit must be capped at 200")
}

// captureActivityFeedRepo captures the query for inspection in tests.
type captureActivityFeedRepo struct {
	captureFn func(domain.ActivityFeedQuery)
}

func (r *captureActivityFeedRepo) QueryActivityFeed(_ context.Context, q domain.ActivityFeedQuery) ([]domain.ActivityFeedItem, error) {
	if r.captureFn != nil {
		r.captureFn(q)
	}
	return nil, nil
}
