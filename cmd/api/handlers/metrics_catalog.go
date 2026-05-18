// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/respond"
	"github.com/go-chi/chi/v5"
)

// MetricCatalogHandler serves the metric definition catalog and formula validator.
type MetricCatalogHandler struct {
	catalog   *biz.MetricCatalog
	validator *biz.FormulaValidator
}

// NewMetricCatalogHandler creates a MetricCatalogHandler.
func NewMetricCatalogHandler(catalog *biz.MetricCatalog, validator *biz.FormulaValidator) *MetricCatalogHandler {
	return &MetricCatalogHandler{catalog: catalog, validator: validator}
}

// ListMetrics handles GET /api/v1/metrics/catalog
// Returns all metric definitions in the catalog.
func (h *MetricCatalogHandler) ListMetrics(w http.ResponseWriter, r *http.Request) {
	metrics := h.catalog.List()
	respond.JSON(w, http.StatusOK, metrics)
}

// GetMetric handles GET /api/v1/metrics/catalog/{metricId}
// Returns a single metric definition or 404.
func (h *MetricCatalogHandler) GetMetric(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "metricId")
	m, err := h.catalog.Get(id)
	if err != nil {
		if errors.Is(err, biz.ErrMetricNotFound) {
			respond.Error(w, http.StatusNotFound, "METRIC_NOT_FOUND", "metric not found: "+id)
			return
		}
		respond.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	respond.JSON(w, http.StatusOK, m)
}

// validateFormulaRequest is the body for POST /api/v1/formulas/validate.
type validateFormulaRequest struct {
	MetricID   string `json:"metricId"`
	Expression string `json:"expression"`
}

// validateFormulaResponse is the body for POST /api/v1/formulas/validate.
type validateFormulaResponse struct {
	Valid  bool                     `json:"valid"`
	Errors []formulaValidationError `json:"errors,omitempty"`
}

type formulaValidationError struct {
	Rule    string `json:"rule"`
	Message string `json:"message"`
}

// ValidateFormula handles POST /api/v1/formulas/validate
// Validates a formula expression against the metric's additivity contract.
func (h *MetricCatalogHandler) ValidateFormula(w http.ResponseWriter, r *http.Request) {
	var req validateFormulaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	if req.MetricID == "" {
		respond.Error(w, http.StatusBadRequest, "MISSING_METRIC_ID", "metricId is required")
		return
	}
	if req.Expression == "" {
		respond.Error(w, http.StatusBadRequest, "MISSING_EXPRESSION", "expression is required")
		return
	}

	errs, err := h.validator.Validate(req.MetricID, req.Expression)
	if err != nil {
		if errors.Is(err, biz.ErrMetricNotFound) {
			respond.Error(w, http.StatusNotFound, "METRIC_NOT_FOUND", "metric not found: "+req.MetricID)
			return
		}
		respond.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	resp := validateFormulaResponse{Valid: len(errs) == 0}
	for _, e := range errs {
		resp.Errors = append(resp.Errors, formulaValidationError{Rule: e.Rule, Message: e.Message})
	}
	respond.JSON(w, http.StatusOK, resp)
}
