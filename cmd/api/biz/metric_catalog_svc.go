// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz

import (
	"errors"
	"fmt"
	"strings"

	"github.com/getmetraly/metraly/cmd/api/domain"
)

// ErrMetricNotFound is returned when a metric ID is not registered in the catalog.
var ErrMetricNotFound = errors.New("metric not found in catalog")

// ErrFormulaInvalid is returned when formula validation fails.
var ErrFormulaInvalid = errors.New("formula invalid")

// MetricCatalog is the in-process registry of metric definitions.
// The MVP catalog is hard-coded; Phase 4 will add DB-backed metric management.
type MetricCatalog struct {
	metrics map[string]*domain.MetricDefinition
}

// NewMetricCatalog creates a MetricCatalog pre-loaded with the MVP metrics.
func NewMetricCatalog() *MetricCatalog {
	c := &MetricCatalog{metrics: make(map[string]*domain.MetricDefinition)}
	for _, m := range mvpMetrics() {
		m := m
		c.metrics[m.ID] = &m
	}
	return c
}

// Get returns a metric definition by ID.
func (c *MetricCatalog) Get(id string) (*domain.MetricDefinition, error) {
	m, ok := c.metrics[id]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrMetricNotFound, id)
	}
	return m, nil
}

// List returns all metric definitions.
func (c *MetricCatalog) List() []*domain.MetricDefinition {
	result := make([]*domain.MetricDefinition, 0, len(c.metrics))
	for _, m := range c.metrics {
		result = append(result, m)
	}
	return result
}

// mvpMetrics returns the initial set of metric definitions for the MVP.
func mvpMetrics() []domain.MetricDefinition {
	return []domain.MetricDefinition{
		{
			ID:          "pr_count",
			Name:        "PR Count",
			Description: "Number of pull requests merged in the period.",
			Unit:        "count",
			Additivity:  domain.AdditiveMetric,
			EventBasis:  "pull_request.merged",
			Tags:        []string{"dora", "flow"},
		},
		{
			ID:          "pr_cycle_time_median",
			Name:        "PR Cycle Time (Median)",
			Description: "Median time from PR open to merge. Non-additive: use median/p50, never sum.",
			Unit:        "seconds",
			Additivity:  domain.NonAdditiveMetric,
			EventBasis:  "pull_request.merged",
			Tags:        []string{"dora", "flow"},
		},
		{
			ID:          "review_latency_median",
			Name:        "Review Latency (Median)",
			Description: "Median time from review_requested to first review_submitted. Non-additive.",
			Unit:        "seconds",
			Additivity:  domain.NonAdditiveMetric,
			EventBasis:  "pull_request.review_submitted",
			Tags:        []string{"flow", "quality"},
		},
		{
			ID:          "build_failure_rate",
			Name:        "Build Failure Rate",
			Description: "Ratio of failed workflow runs to total runs. Aggregate as ratio, not sum.",
			Unit:        "ratio",
			Additivity:  domain.RatioMetric,
			EventBasis:  "workflow_run.completed",
			Tags:        []string{"dora", "reliability"},
		},
		{
			ID:          "build_duration_p95",
			Name:        "Build Duration (p95)",
			Description: "95th percentile workflow run duration. Use p95 aggregation, never sum.",
			Unit:        "seconds",
			Additivity:  domain.DistributionMetric,
			EventBasis:  "workflow_run.completed",
			Tags:        []string{"reliability", "performance"},
		},
		{
			ID:          "sprint_predictability",
			Name:        "Sprint Predictability",
			Description: "Ratio of completed story points to planned story points per sprint.",
			Unit:        "ratio",
			Additivity:  domain.RatioMetric,
			EventBasis:  "sprint.closed",
			Tags:        []string{"flow", "planning"},
		},
	}
}

// FormulaValidator validates formula expressions against the metric catalog.
// The MVP validates additivity contracts and detects common anti-patterns.
// The full query engine is implemented in a later phase.
type FormulaValidator struct {
	catalog *MetricCatalog
}

// NewFormulaValidator creates a FormulaValidator.
func NewFormulaValidator(catalog *MetricCatalog) *FormulaValidator {
	return &FormulaValidator{catalog: catalog}
}

// ValidationError describes a specific validation failure.
type ValidationError struct {
	Rule    string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Rule, e.Message)
}

// Validate validates a formula expression for a given metric.
// Returns a list of validation errors; empty slice means valid.
func (v *FormulaValidator) Validate(metricID, expression string) ([]ValidationError, error) {
	m, err := v.catalog.Get(metricID)
	if err != nil {
		return nil, err
	}

	var errs []ValidationError

	// Rule: expression must not be empty
	if strings.TrimSpace(expression) == "" {
		errs = append(errs, ValidationError{
			Rule:    "non_empty",
			Message: "formula expression must not be empty",
		})
		return errs, nil
	}

	// Rule: non-additive metrics must not use SUM()
	if m.Additivity == domain.NonAdditiveMetric && containsFunc(expression, "sum(", "SUM(") {
		errs = append(errs, ValidationError{
			Rule:    "additivity_sum_forbidden",
			Message: fmt.Sprintf("metric %q is non-additive (additivity=%s); SUM() is forbidden — use MEDIAN() or PERCENTILE()", m.ID, m.Additivity),
		})
	}

	// Rule: ratio metrics must not use SUM() directly on the ratio
	if m.Additivity == domain.RatioMetric && containsFunc(expression, "sum(ratio", "SUM(ratio", "sum(rate", "SUM(rate") {
		errs = append(errs, ValidationError{
			Rule:    "additivity_ratio_sum_forbidden",
			Message: fmt.Sprintf("metric %q is a ratio; do not SUM the ratio — aggregate numerator and denominator separately", m.ID),
		})
	}

	// Rule: distribution metrics must not use SUM() or MEAN()
	if m.Additivity == domain.DistributionMetric && containsFunc(expression, "sum(", "SUM(", "mean(", "MEAN(", "avg(", "AVG(") {
		errs = append(errs, ValidationError{
			Rule:    "additivity_distribution_forbidden",
			Message: fmt.Sprintf("metric %q is a distribution; use PERCENTILE(N) or HISTOGRAM(), not SUM/MEAN/AVG", m.ID),
		})
	}

	// Rule: non-additive metrics should not use AVERAGE/MEAN on raw values
	if m.Additivity == domain.NonAdditiveMetric && containsFunc(expression, "mean(", "MEAN(", "avg(", "AVG(") {
		errs = append(errs, ValidationError{
			Rule:    "additivity_mean_warning",
			Message: fmt.Sprintf("metric %q is non-additive; MEAN/AVG can hide outliers — prefer MEDIAN() or PERCENTILE()", m.ID),
		})
	}

	return errs, nil
}

// containsFunc checks if s contains any of the given substrings (case-sensitive).
func containsFunc(s string, substrs ...string) bool {
	for _, sub := range substrs {
		if strings.Contains(s, sub) {
			return true
		}
	}
	return false
}
