// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz

import (
	"context"
	"fmt"
	"strings"
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

// AllowedFilterKeys is the whitelist of filter dimensions callers may apply.
// Validated in MetricQuerySvc before dispatching to the repo.
// Also enforced (silently) in the repo layer as defence-in-depth.
var AllowedFilterKeys = map[string]bool{
	"repository_id":        true,
	"team_id":              true,
	"author_id":            true,
	"reviewer_id":          true,
	"source_connection_id": true,
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
//
// Validation:
//   - Unknown filter keys → ErrUnsupportedFilter (map to HTTP 400)
//   - Non-empty groupBy   → ErrUnsupportedGroupBy (map to HTTP 400)
func (s *MetricQuerySvc) Execute(ctx context.Context, q domain.MetricQuery) (domain.MetricQueryResult, error) {
	def, err := s.catalog.Get(q.MetricID)
	if err != nil {
		return domain.MetricQueryResult{}, fmt.Errorf("%w: %s", ErrMetricNotFound, q.MetricID)
	}

	// Validate groupBy — not yet implemented; reject rather than silently ignore.
	if len(q.GroupBy) > 0 {
		return domain.MetricQueryResult{}, fmt.Errorf("%w: %s (no groupBy dimensions are currently supported; planned for Phase 3)",
			ErrUnsupportedGroupBy, strings.Join(q.GroupBy, ", "))
	}

	// Validate filter keys — unknown keys are rejected rather than silently dropped.
	for k := range q.Filters {
		if !AllowedFilterKeys[k] {
			return domain.MetricQueryResult{}, fmt.Errorf("%w: %q (allowed: repository_id, team_id, author_id, reviewer_id, source_connection_id)",
				ErrUnsupportedFilter, k)
		}
	}

	rows, err := s.dispatchQuery(ctx, q)
	if err != nil {
		return domain.MetricQueryResult{}, fmt.Errorf("execute metric query %s: %w", q.MetricID, err)
	}

	frame, quality, notes := s.buildResult(q, rows)

	// Build lineage.
	lineage := buildLineage(def, q)

	// Build quality contract (richer form; backward-compat fields also set below).
	qc := buildQualityContract(quality, notes, rows)

	return domain.MetricQueryResult{
		MetricID:        q.MetricID,
		Query:           q,
		Data:            frame,
		Quality:         quality,
		QualityNotes:    notes,
		QualityContract: qc,
		Lineage:         lineage,
		ComputedAt:      time.Now().UTC(),
	}, nil
}

// buildLineage constructs a LineageContract from the metric definition and query.
// SourceIDs are populated from filters when available; otherwise left empty with a note.
func buildLineage(def *domain.MetricDefinition, q domain.MetricQuery) domain.LineageContract {
	formulaID := def.FormulaID
	if formulaID == "" {
		formulaID = fmt.Sprintf("formula:%s:v1", def.ID)
	}
	var sourceIDs []string
	if sid, ok := q.Filters["source_connection_id"]; ok && sid != "" {
		sourceIDs = []string{sid}
	}
	// TODO Phase 3: query contributing source_connection_ids from the DB for the
	// metric + time range when no explicit source filter is provided.
	return domain.LineageContract{
		MetricID:             def.ID,
		FormulaID:            formulaID,
		FormulaVersion:       1,
		SourceIDs:            sourceIDs,
		NormalizedEventTypes: []string{def.EventBasis},
	}
}

// buildQualityContract converts quality level and notes into a DataQualityContract.
func buildQualityContract(level domain.DataQualityLevel, notes []string, rows []domain.MetricRow) domain.DataQualityContract {
	qc := domain.DataQualityContract{
		Level: level,
		Notes: notes,
	}

	// Compute coverage: fraction of rows that have a non-nil value.
	if len(rows) > 0 {
		nonNull := 0
		var earliest, latest *time.Time
		for i := range rows {
			if rows[i].Value != nil {
				nonNull++
			}
			t := rows[i].BucketStart
			if !t.IsZero() {
				if earliest == nil || t.Before(*earliest) {
					tc := t
					earliest = &tc
				}
				if latest == nil || t.After(*latest) {
					tc := t
					latest = &tc
				}
			}
		}
		qc.CoveragePercent = float64(nonNull) / float64(len(rows)) * 100.0
		qc.EarliestDataAt = earliest
		qc.LatestDataAt = latest
	}
	// Empty result: coverage = 0, timestamps nil.

	return qc
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
			Columns: []string{"bucket", "value", "count"},
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
