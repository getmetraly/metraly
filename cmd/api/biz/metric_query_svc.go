// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz

import (
	"context"
	"fmt"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
)

// MetricQueryRepo executes bucketed metric aggregation queries.
type MetricQueryRepo interface {
	QueryPRCount(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error)
	QueryPRCycleTimeMedian(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error)
	QueryReviewLatencyMedian(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error)
	QueryBuildFailureRate(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error)
	QueryBuildDurationP95(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error)
	QuerySprintPredictability(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error)
}

// MetricQuerySvc executes metric queries using the normalized event store.
type MetricQuerySvc struct {
	repo    MetricQueryRepo
	catalog *MetricCatalog
}

// NewMetricQuerySvc creates a MetricQuerySvc.
func NewMetricQuerySvc(repo MetricQueryRepo, catalog *MetricCatalog) *MetricQuerySvc {
	return &MetricQuerySvc{repo: repo, catalog: catalog}
}

// Execute runs a metric query and returns a typed result with quality metadata.
// NEVER fakes results: returns quality=empty with notes when data is insufficient.
func (s *MetricQuerySvc) Execute(ctx context.Context, q domain.MetricQuery) (domain.MetricQueryResult, error) {
	if _, err := s.catalog.Get(q.MetricID); err != nil {
		return domain.MetricQueryResult{}, fmt.Errorf("%w: %s", ErrMetricNotFound, q.MetricID)
	}

	rows, err := s.dispatchQuery(ctx, q)
	if err != nil {
		return domain.MetricQueryResult{}, fmt.Errorf("execute metric query %s: %w", q.MetricID, err)
	}

	frame, quality, notes := s.buildResult(q, rows)
	return domain.MetricQueryResult{
		MetricID:     q.MetricID,
		Query:        q,
		Data:         frame,
		Quality:      quality,
		QualityNotes: notes,
		ComputedAt:   time.Now().UTC(),
	}, nil
}

// dispatchQuery routes to the appropriate repo method based on metric ID.
func (s *MetricQuerySvc) dispatchQuery(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error) {
	switch q.MetricID {
	case "pr_count":
		return s.repo.QueryPRCount(ctx, q)
	case "pr_cycle_time_median":
		return s.repo.QueryPRCycleTimeMedian(ctx, q)
	case "review_latency_median":
		return s.repo.QueryReviewLatencyMedian(ctx, q)
	case "build_failure_rate":
		return s.repo.QueryBuildFailureRate(ctx, q)
	case "build_duration_p95":
		return s.repo.QueryBuildDurationP95(ctx, q)
	case "sprint_predictability":
		return s.repo.QuerySprintPredictability(ctx, q)
	default:
		return nil, fmt.Errorf("%w: %s", ErrMetricNotFound, q.MetricID)
	}
}

// buildResult converts repo rows into a MetricDataFrame with quality classification.
func (s *MetricQuerySvc) buildResult(q domain.MetricQuery, rows []domain.MetricRow) (domain.MetricDataFrame, domain.DataQualityLevel, []string) {
	if len(rows) == 0 {
		return domain.MetricDataFrame{
			Columns: []string{"bucket", "value"},
			Rows:    [][]any{},
		}, domain.DataQualityEmpty, []string{
			fmt.Sprintf("no %s data in the requested time range (%s to %s)", q.MetricID, q.Start.Format("2006-01-02"), q.End.Format("2006-01-02")),
		}
	}

	// Count rows with non-nil values to classify quality.
	nonNull := 0
	for _, row := range rows {
		if row.Value != nil {
			nonNull++
		}
	}

	var quality domain.DataQualityLevel
	var notes []string
	switch {
	case nonNull == 0:
		quality = domain.DataQualityEmpty
		notes = append(notes, fmt.Sprintf("events found but %s could not be computed (required fields may be null)", q.MetricID))
	case nonNull < len(rows):
		quality = domain.DataQualityPartial
		notes = append(notes, fmt.Sprintf("%d of %d buckets have computable %s values", nonNull, len(rows), q.MetricID))
	default:
		quality = domain.DataQualityFull
	}

	frame := domain.MetricDataFrame{
		Columns: []string{"bucket", "value", "count"},
		Rows:    make([][]any, len(rows)),
	}
	for i, row := range rows {
		var v any
		if row.Value != nil {
			v = *row.Value
		}
		frame.Rows[i] = []any{row.BucketStart.Format(time.RFC3339), v, row.Count}
	}
	return frame, quality, notes
}
