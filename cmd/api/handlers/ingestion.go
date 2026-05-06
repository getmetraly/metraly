// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/respond"
)

type ingestionService interface {
	Ingest(ctx context.Context, req domain.IngestionRequest) (*domain.IngestionResult, error)
}

type IngestionHandler struct {
	svc ingestionService
}

func NewIngestionHandler(svc ingestionService) *IngestionHandler {
	return &IngestionHandler{svc: svc}
}

func (h *IngestionHandler) GitHub(w http.ResponseWriter, r *http.Request) {
	h.ingest(w, r, "github")
}

func (h *IngestionHandler) PM(w http.ResponseWriter, r *http.Request) {
	h.ingest(w, r, "pm")
}

func (h *IngestionHandler) ingest(w http.ResponseWriter, r *http.Request, source string) {
	var req domain.IngestionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	if h == nil || h.svc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "ingestion service unavailable")
		return
	}
	if req.Source == "" {
		req.Source = source
	}
	if req.Source != source && !(source == "pm" && (req.Source == "jira" || req.Source == "linear" || req.Source == "pm")) {
		respond.Error(w, http.StatusBadRequest, "INVALID_SOURCE", "source does not match endpoint")
		return
	}

	result, err := h.svc.Ingest(r.Context(), req)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "INGEST_FAILED", err.Error())
		return
	}
	respond.JSON(w, http.StatusAccepted, result)
}
