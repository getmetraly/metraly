// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/handlers"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newCatalogHandler() *handlers.MetricCatalogHandler {
	catalog := biz.NewMetricCatalog()
	validator := biz.NewFormulaValidator(catalog)
	return handlers.NewMetricCatalogHandler(catalog, validator)
}

func TestMetricCatalogHandler_List(t *testing.T) {
	h := newCatalogHandler()
	r := httptest.NewRequest(http.MethodGet, "/api/v1/metrics/catalog", nil)
	w := httptest.NewRecorder()

	h.ListMetrics(w, r)

	require.Equal(t, http.StatusOK, w.Code)
	var resp []*domain.MetricDefinition
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	// MVP catalog has 6 metrics
	assert.Len(t, resp, 6)
}

func TestMetricCatalogHandler_GetMetric_Found(t *testing.T) {
	h := newCatalogHandler()

	rtr := chi.NewRouter()
	rtr.Get("/api/v1/metrics/catalog/{metricId}", h.GetMetric)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/metrics/catalog/pr_count", nil)
	w := httptest.NewRecorder()
	rtr.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var m domain.MetricDefinition
	require.NoError(t, json.NewDecoder(w.Body).Decode(&m))
	assert.Equal(t, "pr_count", m.ID)
	assert.Equal(t, domain.AdditiveMetric, m.Additivity)
}

func TestMetricCatalogHandler_GetMetric_NotFound(t *testing.T) {
	h := newCatalogHandler()

	rtr := chi.NewRouter()
	rtr.Get("/api/v1/metrics/catalog/{metricId}", h.GetMetric)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/metrics/catalog/nonexistent_metric", nil)
	w := httptest.NewRecorder()
	rtr.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestMetricCatalogHandler_ValidateFormula_Valid(t *testing.T) {
	h := newCatalogHandler()
	body := `{"metricId":"pr_count","expression":"count(pull_request.merged)"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/formulas/validate", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.ValidateFormula(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	assert.Equal(t, true, resp["valid"])
}

func TestMetricCatalogHandler_ValidateFormula_NonAdditiveWithSum(t *testing.T) {
	h := newCatalogHandler()
	// pr_cycle_time_median is non-additive — SUM() should fail validation
	body := `{"metricId":"pr_cycle_time_median","expression":"SUM(cycle_time_seconds)"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/formulas/validate", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.ValidateFormula(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	assert.Equal(t, false, resp["valid"])
	errs, _ := resp["errors"].([]any)
	assert.NotEmpty(t, errs)
}

func TestMetricCatalogHandler_ValidateFormula_MetricNotFound(t *testing.T) {
	h := newCatalogHandler()
	body := `{"metricId":"unknown_metric","expression":"count(*)"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/formulas/validate", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.ValidateFormula(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestMetricCatalogHandler_ValidateFormula_InvalidJSON(t *testing.T) {
	h := newCatalogHandler()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/formulas/validate", bytes.NewBufferString("not-json"))
	w := httptest.NewRecorder()

	h.ValidateFormula(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}
