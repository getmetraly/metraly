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

// fakeMetricQueryRepo implements biz.MetricQueryRepo for tests.
type fakeMetricQueryRepo struct {
	rows map[string][]domain.MetricRow
	err  error
}

func (f *fakeMetricQueryRepo) QueryPRCount(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error) {
	return f.rows["pr_count"], f.err
}
func (f *fakeMetricQueryRepo) QueryPRCycleTimeMedian(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error) {
	return f.rows["pr_cycle_time_median"], f.err
}
func (f *fakeMetricQueryRepo) QueryReviewLatencyMedian(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error) {
	return f.rows["review_latency_median"], f.err
}
func (f *fakeMetricQueryRepo) QueryBuildFailureRate(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error) {
	return f.rows["build_failure_rate"], f.err
}
func (f *fakeMetricQueryRepo) QueryBuildDurationP95(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error) {
	return f.rows["build_duration_p95"], f.err
}
func (f *fakeMetricQueryRepo) QuerySprintPredictability(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error) {
	return f.rows["sprint_predictability"], f.err
}

func testQuery(metricID string) domain.MetricQuery {
	return domain.MetricQuery{
		MetricID:    metricID,
		WorkspaceID: "default",
		Granularity: "day",
		Start:       time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		End:         time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC),
	}
}

func flt(f float64) *float64 { return &f }

func newQuerySvc(rows map[string][]domain.MetricRow) *biz.MetricQuerySvc {
	catalog := biz.NewMetricCatalog()
	return biz.NewMetricQuerySvc(&fakeMetricQueryRepo{rows: rows}, catalog)
}

func TestMetricQuerySvc_PRCount_ReturnsFullQuality(t *testing.T) {
	bucket := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"pr_count": {{BucketStart: bucket, Value: flt(12), Count: 12}},
	})

	result, err := svc.Execute(context.Background(), testQuery("pr_count"))
	require.NoError(t, err)
	assert.Equal(t, domain.DataQualityFull, result.Quality)
	assert.Len(t, result.Data.Rows, 1)
	assert.Equal(t, "pr_count", result.MetricID)
}

func TestMetricQuerySvc_PRCycleTimeMedian_ReturnsFullQuality(t *testing.T) {
	bucket := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"pr_cycle_time_median": {{BucketStart: bucket, Value: flt(3600), Count: 5}},
	})

	result, err := svc.Execute(context.Background(), testQuery("pr_cycle_time_median"))
	require.NoError(t, err)
	assert.Equal(t, domain.DataQualityFull, result.Quality)
}

func TestMetricQuerySvc_BuildFailureRate_ReturnsRatio(t *testing.T) {
	bucket := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)
	rate := 0.2 // 20% failure rate
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"build_failure_rate": {{BucketStart: bucket, Value: &rate, Count: 10}},
	})

	result, err := svc.Execute(context.Background(), testQuery("build_failure_rate"))
	require.NoError(t, err)
	assert.Equal(t, domain.DataQualityFull, result.Quality)
	row := result.Data.Rows[0]
	assert.Equal(t, 0.2, row[1])
}

func TestMetricQuerySvc_EmptyData_ReturnsEmpty(t *testing.T) {
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"pr_count": {}, // no rows
	})

	result, err := svc.Execute(context.Background(), testQuery("pr_count"))
	require.NoError(t, err)
	assert.Equal(t, domain.DataQualityEmpty, result.Quality)
	assert.NotEmpty(t, result.QualityNotes)
	assert.Empty(t, result.Data.Rows)
}

func TestMetricQuerySvc_NullValues_ReturnsEmptyQuality(t *testing.T) {
	// Row exists but Value is nil (required field was NULL in DB)
	bucket := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"pr_cycle_time_median": {{BucketStart: bucket, Value: nil, Count: 3}},
	})

	result, err := svc.Execute(context.Background(), testQuery("pr_cycle_time_median"))
	require.NoError(t, err)
	assert.Equal(t, domain.DataQualityEmpty, result.Quality)
	assert.NotEmpty(t, result.QualityNotes)
}

func TestMetricQuerySvc_UnsupportedMetric_ReturnsError(t *testing.T) {
	svc := newQuerySvc(map[string][]domain.MetricRow{})

	_, err := svc.Execute(context.Background(), testQuery("totally_fake_metric"))
	require.Error(t, err)
	assert.ErrorIs(t, err, biz.ErrMetricNotFound)
}

func TestMetricQuerySvc_SprintPredictability_Full(t *testing.T) {
	bucket := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)
	ratio := 0.85 // 85% predictability
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"sprint_predictability": {{BucketStart: bucket, Value: &ratio, Count: 3}},
	})

	result, err := svc.Execute(context.Background(), testQuery("sprint_predictability"))
	require.NoError(t, err)
	assert.Equal(t, domain.DataQualityFull, result.Quality)
}

func TestMetricQuerySvc_PartialData_ReturnsPartialQuality(t *testing.T) {
	b1 := time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC)
	b2 := time.Date(2026, 1, 20, 0, 0, 0, 0, time.UTC)
	v := 4200.0
	svc := newQuerySvc(map[string][]domain.MetricRow{
		"pr_cycle_time_median": {
			{BucketStart: b1, Value: &v, Count: 5},
			{BucketStart: b2, Value: nil, Count: 2}, // second bucket has no cycle_time
		},
	})

	result, err := svc.Execute(context.Background(), testQuery("pr_cycle_time_median"))
	require.NoError(t, err)
	assert.Equal(t, domain.DataQualityPartial, result.Quality)
	assert.Len(t, result.Data.Rows, 2)
}
