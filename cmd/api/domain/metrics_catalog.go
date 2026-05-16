// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package domain

import "time"

// Additivity classifies how a metric value can be aggregated.
// This drives safe vs. unsafe aggregation detection in the formula validator.
type Additivity string

const (
	// AdditiveMetric can be summed across dimensions (e.g., count, total_duration).
	AdditiveMetric Additivity = "additive"
	// NonAdditiveMetric must use median/percentile, never summed (e.g., cycle_time, latency).
	NonAdditiveMetric Additivity = "non_additive"
	// RatioMetric is a computed ratio; summing numerators/denominators separately is required.
	RatioMetric Additivity = "ratio"
	// DistributionMetric requires percentile computation (e.g., p95 duration).
	DistributionMetric Additivity = "distribution"
)

// MetricDefinition is the canonical definition of a metric in the catalog.
type MetricDefinition struct {
	ID          string     `json:"id"`          // e.g., "pr_count"
	Name        string     `json:"name"`        // display name
	Description string     `json:"description"`
	Unit        string     `json:"unit"`        // "count", "seconds", "percent", etc.
	Additivity  Additivity `json:"additivity"`
	// EventBasis is the NormalizedEventType that drives this metric.
	EventBasis string `json:"eventBasis"`
	// FormulaID is the formula definition used to compute this metric.
	FormulaID string `json:"formulaId,omitempty"`
	// Tags for filtering and grouping in the UI.
	Tags []string `json:"tags,omitempty"`
	// Deprecated marks metrics that should not be used in new dashboards.
	Deprecated bool `json:"deprecated,omitempty"`
}

// FormulaDefinition defines the computation for a metric.
type FormulaDefinition struct {
	ID         string     `json:"id"`
	MetricID   string     `json:"metricId"`
	Expression string     `json:"expression"` // DSL expression string
	Additivity Additivity `json:"additivity"`
	// Version allows forward-compatible formula changes.
	Version   int       `json:"version"`
	CreatedAt time.Time `json:"createdAt"`
}

// MetricQuery is the input to a metric computation request.
type MetricQuery struct {
	MetricID    string     `json:"metricId"`
	WorkspaceID string     `json:"workspaceId"`
	// Granularity: day | week | month
	Granularity string     `json:"granularity"`
	Start       time.Time  `json:"start"`
	End         time.Time  `json:"end"`
	// Filters: arbitrary dimension filters (e.g., team_id, repository_id)
	Filters     map[string]string `json:"filters,omitempty"`
	// GroupBy dimensions for breakdown (e.g., ["team_id", "repository_id"])
	GroupBy     []string   `json:"groupBy,omitempty"`
}

// MetricDataFrame is a columnar result set for metric queries.
type MetricDataFrame struct {
	// Columns are the dimension + measure column names.
	Columns []string `json:"columns"`
	// Rows are parallel value arrays; each row is one time bucket / dimension group.
	Rows    [][]any  `json:"rows"`
}

// DataQualityLevel describes the confidence in a metric value.
type DataQualityLevel string

const (
	DataQualityFull     DataQualityLevel = "full"
	DataQualityPartial  DataQualityLevel = "partial"
	DataQualityEstimate DataQualityLevel = "estimate"
	DataQualityEmpty    DataQualityLevel = "empty"
)

// MetricQueryResult is the output of a metric computation.
type MetricQueryResult struct {
	MetricID    string           `json:"metricId"`
	Query       MetricQuery      `json:"query"`
	Data        MetricDataFrame  `json:"data"`
	Quality     DataQualityLevel `json:"quality"`
	// QualityNotes describes gaps, partial data, or caveats.
	QualityNotes []string        `json:"qualityNotes,omitempty"`
	// ComputedAt is when the result was computed (for cache staleness).
	ComputedAt  time.Time        `json:"computedAt"`
}

// DataQualityContract holds the quality metadata for a metric or widget result.
type DataQualityContract struct {
	Level        DataQualityLevel `json:"level"`
	Notes        []string         `json:"notes,omitempty"`
	// CoveragePercent is the fraction of expected data points that are present (0–100).
	CoveragePercent float64        `json:"coveragePercent"`
	// EarliestDataAt is the earliest event timestamp available for this metric.
	EarliestDataAt *time.Time     `json:"earliestDataAt,omitempty"`
	// LatestDataAt is the most recent event timestamp.
	LatestDataAt   *time.Time     `json:"latestDataAt,omitempty"`
}

// LineageContract describes how a metric or widget result was derived.
type LineageContract struct {
	MetricID       string   `json:"metricId"`
	FormulaID      string   `json:"formulaId"`
	FormulaVersion int      `json:"formulaVersion"`
	// SourceIDs are the source connections that contributed data.
	SourceIDs      []string `json:"sourceIds"`
	// NormalizedEventTypes are the event types that fed this metric.
	NormalizedEventTypes []string `json:"normalizedEventTypes"`
}

// MetricRow is a single result row from a metric aggregation query.
// BucketStart is the start of the time bucket (truncated to granularity).
// Dimensions contains optional group-by values (e.g., team_id, repository_id).
// Value is the primary numeric metric; nil when no data exists for the bucket.
// Count is the number of events that fed this value.
type MetricRow struct {
	BucketStart time.Time
	Dimensions  map[string]string
	Value       *float64
	Count       int64
}
