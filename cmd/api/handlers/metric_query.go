// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/respond"
)

// MetricQueryExecutor is the subset of MetricQuerySvc used by the handler.
type MetricQueryExecutor interface {
	Execute(ctx context.Context, q domain.MetricQuery) (domain.MetricQueryResult, error)
}

// MetricQueryHandler serves POST /api/v1/metrics/query.
type MetricQueryHandler struct {
	svc MetricQueryExecutor
}

// NewMetricQueryHandler creates a MetricQueryHandler.
func NewMetricQueryHandler(svc MetricQueryExecutor) *MetricQueryHandler {
	return &MetricQueryHandler{svc: svc}
}

// metricQueryRequest is the deserialized body for POST /api/v1/metrics/query.
type metricQueryRequest struct {
	MetricID    string            `json:"metricId"`
	WorkspaceID string            `json:"workspaceId"`
	Granularity string            `json:"granularity"`
	Start       time.Time         `json:"start"`
	End         time.Time         `json:"end"`
	Filters     map[string]string `json:"filters,omitempty"`
	GroupBy     []string          `json:"groupBy,omitempty"`
}

// Query handles POST /api/v1/metrics/query.
// Returns a MetricQueryResult with quality metadata.
// Never returns fake data; returns quality=empty with notes when data is absent.
func (h *MetricQueryHandler) Query(w http.ResponseWriter, r *http.Request) {
	var req metricQueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	if req.MetricID == "" {
		respond.Error(w, http.StatusBadRequest, "MISSING_METRIC_ID", "metricId is required")
		return
	}
	if req.Start.IsZero() || req.End.IsZero() {
		respond.Error(w, http.StatusBadRequest, "MISSING_TIME_RANGE", "start and end are required")
		return
	}
	if !req.End.After(req.Start) {
		respond.Error(w, http.StatusBadRequest, "INVALID_TIME_RANGE", "end must be after start")
		return
	}
	if req.Granularity == "" {
		req.Granularity = "day"
	}

	q := domain.MetricQuery{
		MetricID:    req.MetricID,
		WorkspaceID: req.WorkspaceID,
		Granularity: req.Granularity,
		Start:       req.Start,
		End:         req.End,
		Filters:     req.Filters,
		GroupBy:     req.GroupBy,
	}

	result, err := h.svc.Execute(r.Context(), q)
	if err != nil {
		if errors.Is(err, biz.ErrMetricNotFound) {
			respond.Error(w, http.StatusNotFound, "METRIC_NOT_FOUND", err.Error())
			return
		}
		respond.Error(w, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}

	respond.JSON(w, http.StatusOK, result)
}
