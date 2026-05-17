// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package repo

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MetricQueryRepo executes metric aggregation queries against normalized_events.
type MetricQueryRepo struct{ pool *pgxpool.Pool }

// NewMetricQueryRepo creates a MetricQueryRepo.
func NewMetricQueryRepo(pool *pgxpool.Pool) *MetricQueryRepo {
	return &MetricQueryRepo{pool: pool}
}

// QueryPRCount returns pull_request.merged counts bucketed by granularity.
// value = count of merged PRs; additivity=additive.
func (r *MetricQueryRepo) QueryPRCount(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error) {
	dateTrunc := granularityTrunc(q.Granularity)
	args := []any{q.Start, q.End}
	filter, args := buildFilter(q.Filters, args)

	sql := fmt.Sprintf(`
		SELECT DATE_TRUNC('%s', occurred_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS bucket,
		       COUNT(*)::FLOAT AS value,
		       COUNT(*) AS cnt
		FROM normalized_events
		WHERE event_type = 'pull_request.merged'
		  AND occurred_at >= $1 AND occurred_at < $2
		  %s
		GROUP BY bucket
		ORDER BY bucket ASC
	`, dateTrunc, filter)

	return r.queryRows(ctx, sql, args)
}

// QueryPRCycleTimeMedian returns the median cycle_time_seconds for merged PRs.
// Non-additive: use PERCENTILE_CONT, never SUM.
func (r *MetricQueryRepo) QueryPRCycleTimeMedian(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error) {
	dateTrunc := granularityTrunc(q.Granularity)
	args := []any{q.Start, q.End}
	filter, args := buildFilter(q.Filters, args)

	sql := fmt.Sprintf(`
		SELECT DATE_TRUNC('%s', occurred_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS bucket,
		       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cycle_time_seconds) AS value,
		       COUNT(*) AS cnt
		FROM normalized_events
		WHERE event_type = 'pull_request.merged'
		  AND cycle_time_seconds IS NOT NULL
		  AND occurred_at >= $1 AND occurred_at < $2
		  %s
		GROUP BY bucket
		ORDER BY bucket ASC
	`, dateTrunc, filter)

	return r.queryRows(ctx, sql, args)
}

// QueryReviewLatencyMedian returns the median review_latency_seconds.
// Non-additive: use PERCENTILE_CONT.
func (r *MetricQueryRepo) QueryReviewLatencyMedian(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error) {
	dateTrunc := granularityTrunc(q.Granularity)
	args := []any{q.Start, q.End}
	filter, args := buildFilter(q.Filters, args)

	sql := fmt.Sprintf(`
		SELECT DATE_TRUNC('%s', occurred_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS bucket,
		       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY review_latency_seconds) AS value,
		       COUNT(*) AS cnt
		FROM normalized_events
		WHERE event_type = 'pull_request.review_submitted'
		  AND review_latency_seconds IS NOT NULL
		  AND occurred_at >= $1 AND occurred_at < $2
		  %s
		GROUP BY bucket
		ORDER BY bucket ASC
	`, dateTrunc, filter)

	return r.queryRows(ctx, sql, args)
}

// QueryBuildFailureRate returns the ratio of failed to total workflow runs per bucket.
// Returns value in range [0.0, 1.0]. Ratio metric: numerator and denominator aggregated separately.
func (r *MetricQueryRepo) QueryBuildFailureRate(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error) {
	dateTrunc := granularityTrunc(q.Granularity)
	args := []any{q.Start, q.End}
	filter, args := buildFilter(q.Filters, args)

	// Cast to float8 so pgx decodes as float64, not pgtype.Numeric.
	// Exclude NULL-conclusion rows: they are pre-migration data and must not
	// dilute the denominator. This also lets the partial index on (event_type, conclusion)
	// WHERE conclusion IS NOT NULL be used by the planner.
	sql := fmt.Sprintf(`
		SELECT DATE_TRUNC('%s', occurred_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS bucket,
		       (SUM(CASE WHEN conclusion = 'failure' THEN 1 ELSE 0 END)::float8
		           / NULLIF(COUNT(*), 0)) AS value,
		       COUNT(*) AS cnt
		FROM normalized_events
		WHERE event_type = 'workflow_run.completed'
		  AND conclusion IS NOT NULL
		  AND occurred_at >= $1 AND occurred_at < $2
		  %s
		GROUP BY bucket
		ORDER BY bucket ASC
	`, dateTrunc, filter)

	return r.queryRows(ctx, sql, args)
}

// QueryBuildDurationP95 returns the p95 duration_seconds for completed workflow runs.
// Distribution metric: use PERCENTILE_CONT(0.95).
func (r *MetricQueryRepo) QueryBuildDurationP95(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error) {
	dateTrunc := granularityTrunc(q.Granularity)
	args := []any{q.Start, q.End}
	filter, args := buildFilter(q.Filters, args)

	sql := fmt.Sprintf(`
		SELECT DATE_TRUNC('%s', occurred_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS bucket,
		       PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_seconds) AS value,
		       COUNT(*) AS cnt
		FROM normalized_events
		WHERE event_type = 'workflow_run.completed'
		  AND duration_seconds IS NOT NULL
		  AND occurred_at >= $1 AND occurred_at < $2
		  %s
		GROUP BY bucket
		ORDER BY bucket ASC
	`, dateTrunc, filter)

	return r.queryRows(ctx, sql, args)
}

// QuerySprintPredictability returns completed_points / planned_points per sprint.closed bucket.
// Ratio metric: numerator and denominator aggregated separately.
func (r *MetricQueryRepo) QuerySprintPredictability(ctx context.Context, q domain.MetricQuery) ([]domain.MetricRow, error) {
	dateTrunc := granularityTrunc(q.Granularity)
	args := []any{q.Start, q.End}
	filter, args := buildFilter(q.Filters, args)

	// Require both measures to be non-NULL; sprints ingested before migration 011
	// or via a normalizer path that omits points must not dilute the ratio.
	sql := fmt.Sprintf(`
		SELECT DATE_TRUNC('%s', occurred_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS bucket,
		       SUM(points_completed::float8) / NULLIF(SUM(points_planned), 0) AS value,
		       COUNT(*) AS cnt
		FROM normalized_events
		WHERE event_type = 'sprint.closed'
		  AND points_completed IS NOT NULL
		  AND points_planned IS NOT NULL
		  AND occurred_at >= $1 AND occurred_at < $2
		  %s
		GROUP BY bucket
		ORDER BY bucket ASC
	`, dateTrunc, filter)

	return r.queryRows(ctx, sql, args)
}

// — helpers —

// granularityTrunc maps MetricQuery.Granularity to a PostgreSQL DATE_TRUNC unit.
func granularityTrunc(g string) string {
	switch g {
	case "week":
		return "week"
	case "month":
		return "month"
	default:
		return "day"
	}
}

// allowedFilterColumns is the whitelist of column names callers may filter on.
// Prevents SQL injection through column names.
var allowedFilterColumns = map[string]bool{
	"repository_id":        true,
	"team_id":              true,
	"author_id":            true,
	"reviewer_id":          true,
	"source_connection_id": true,
}

// buildFilter converts a Filters map into a safe SQL fragment + updated args slice.
// Unknown columns are silently dropped.
func buildFilter(filters map[string]string, args []any) (string, []any) {
	if len(filters) == 0 {
		return "", args
	}
	var clauses []string
	for col, val := range filters {
		if !allowedFilterColumns[col] {
			continue
		}
		args = append(args, val)
		clauses = append(clauses, fmt.Sprintf("AND %s = $%d", col, len(args)))
	}
	return strings.Join(clauses, " "), args
}

// queryRows executes a bucketed metric SQL query and scans the results into MetricRows.
// SQL must SELECT at minimum: bucket TIMESTAMPTZ, value FLOAT8 (nullable), cnt BIGINT.
func (r *MetricQueryRepo) queryRows(ctx context.Context, sql string, args []any) ([]domain.MetricRow, error) {
	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("metric query: %w", err)
	}
	defer rows.Close()

	var result []domain.MetricRow
	for rows.Next() {
		var row domain.MetricRow
		row.Dimensions = map[string]string{}

		fds := rows.FieldDescriptions()
		vals := make([]any, len(fds))
		ptrs := make([]any, len(fds))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, fmt.Errorf("scan metric row: %w", err)
		}

		for i, fd := range fds {
			name := string(fd.Name)
			switch name {
			case "bucket":
				if t, ok := vals[i].(time.Time); ok {
					row.BucketStart = t
				}
			case "value":
				switch v := vals[i].(type) {
				case float64:
					row.Value = &v
				case int64:
					f := float64(v)
					row.Value = &f
				case pgtype.Numeric:
					// Ratio expressions without an explicit ::float8 cast return
					// pgtype.Numeric. Convert defensively so future metrics don't silently
					// lose their values.
					if f, err := v.Float64Value(); err == nil && f.Valid {
						val := f.Float64
						row.Value = &val
					}
				}
			case "cnt":
				if c, ok := vals[i].(int64); ok {
					row.Count = c
				}
			default:
				if s, ok := vals[i].(string); ok {
					row.Dimensions[name] = s
				}
			}
		}
		result = append(result, row)
	}
	return result, rows.Err()
}
