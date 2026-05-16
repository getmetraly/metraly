// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz_test

import (
	"testing"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMetricCatalog_Get_AllMVPMetrics(t *testing.T) {
	c := biz.NewMetricCatalog()

	ids := []string{
		"pr_count",
		"pr_cycle_time_median",
		"review_latency_median",
		"build_failure_rate",
		"build_duration_p95",
		"sprint_predictability",
	}
	for _, id := range ids {
		m, err := c.Get(id)
		require.NoError(t, err, "metric %q must be in catalog", id)
		assert.NotEmpty(t, m.Name)
		assert.NotEmpty(t, m.Additivity)
		assert.NotEmpty(t, m.EventBasis)
	}
}

func TestMetricCatalog_Get_NotFound(t *testing.T) {
	c := biz.NewMetricCatalog()
	_, err := c.Get("nonexistent_metric")
	assert.ErrorIs(t, err, biz.ErrMetricNotFound)
}

func TestMetricCatalog_List_ContainsAllMVP(t *testing.T) {
	c := biz.NewMetricCatalog()
	list := c.List()
	assert.Len(t, list, 6)
}

func TestMetricCatalog_Additivity_NonAdditive(t *testing.T) {
	c := biz.NewMetricCatalog()
	m, err := c.Get("pr_cycle_time_median")
	require.NoError(t, err)
	assert.Equal(t, domain.NonAdditiveMetric, m.Additivity)
}

func TestMetricCatalog_Additivity_Ratio(t *testing.T) {
	c := biz.NewMetricCatalog()
	m, err := c.Get("build_failure_rate")
	require.NoError(t, err)
	assert.Equal(t, domain.RatioMetric, m.Additivity)
}

func TestMetricCatalog_Additivity_Distribution(t *testing.T) {
	c := biz.NewMetricCatalog()
	m, err := c.Get("build_duration_p95")
	require.NoError(t, err)
	assert.Equal(t, domain.DistributionMetric, m.Additivity)
}

// — Formula Validator tests —

func TestFormulaValidator_Valid_AdditiveMetric(t *testing.T) {
	c := biz.NewMetricCatalog()
	v := biz.NewFormulaValidator(c)

	errs, err := v.Validate("pr_count", "COUNT(pull_request.merged)")
	require.NoError(t, err)
	assert.Empty(t, errs, "SUM on additive metric is allowed")
}

func TestFormulaValidator_Reject_SumOnNonAdditive(t *testing.T) {
	c := biz.NewMetricCatalog()
	v := biz.NewFormulaValidator(c)

	errs, err := v.Validate("pr_cycle_time_median", "SUM(cycle_time_seconds)")
	require.NoError(t, err)
	require.Len(t, errs, 1)
	assert.Equal(t, "additivity_sum_forbidden", errs[0].Rule)
}

func TestFormulaValidator_Reject_SumOnNonAdditive_Lowercase(t *testing.T) {
	c := biz.NewMetricCatalog()
	v := biz.NewFormulaValidator(c)

	errs, err := v.Validate("review_latency_median", "sum(review_latency_seconds)")
	require.NoError(t, err)
	require.NotEmpty(t, errs)
	assert.Equal(t, "additivity_sum_forbidden", errs[0].Rule)
}

func TestFormulaValidator_Reject_AvgOnDistribution(t *testing.T) {
	c := biz.NewMetricCatalog()
	v := biz.NewFormulaValidator(c)

	errs, err := v.Validate("build_duration_p95", "AVG(duration_seconds)")
	require.NoError(t, err)
	require.NotEmpty(t, errs)
	assert.Equal(t, "additivity_distribution_forbidden", errs[0].Rule)
}

func TestFormulaValidator_EmptyExpression(t *testing.T) {
	c := biz.NewMetricCatalog()
	v := biz.NewFormulaValidator(c)

	errs, err := v.Validate("pr_count", "")
	require.NoError(t, err)
	require.Len(t, errs, 1)
	assert.Equal(t, "non_empty", errs[0].Rule)
}

func TestFormulaValidator_UnknownMetric(t *testing.T) {
	c := biz.NewMetricCatalog()
	v := biz.NewFormulaValidator(c)

	_, err := v.Validate("nonexistent", "SUM(x)")
	assert.ErrorIs(t, err, biz.ErrMetricNotFound)
}

func TestFormulaValidator_Valid_DistributionMetric_Percentile(t *testing.T) {
	c := biz.NewMetricCatalog()
	v := biz.NewFormulaValidator(c)

	errs, err := v.Validate("build_duration_p95", "PERCENTILE(duration_seconds, 95)")
	require.NoError(t, err)
	assert.Empty(t, errs)
}
