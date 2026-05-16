// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"
	"strconv"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/repo"
	"github.com/getmetraly/metraly/cmd/api/respond"
	"github.com/go-chi/chi/v5"
)

// CollectorRunFetcher is the read-only view of collector run persistence used by this handler.
type CollectorRunFetcher interface {
	GetCollectorRun(ctx context.Context, id string) (*domain.CollectorRun, error)
	ListCollectorRuns(ctx context.Context, sourceConnectionID string, limit int) ([]*domain.CollectorRun, error)
}

// CollectorHandler handles HTTP requests for the collector API.
type CollectorHandler struct {
	svc     *biz.CollectorSvc
	runRepo CollectorRunFetcher
}

// NewCollectorHandler creates a CollectorHandler.
func NewCollectorHandler(svc *biz.CollectorSvc, runRepo CollectorRunFetcher) *CollectorHandler {
	return &CollectorHandler{svc: svc, runRepo: runRepo}
}

// Trigger handles POST /api/v1/sources/{id}/collect.
// It starts a collector run synchronously and returns 202 with the run.
func (h *CollectorHandler) Trigger(w http.ResponseWriter, r *http.Request) {
	sourceID := chi.URLParam(r, "id")
	runID := newRunID()

	run, err := h.svc.Run(r.Context(), runID, sourceID)
	if run != nil {
		// Run record exists (even if failed); the run itself captures the outcome.
		respond.JSON(w, http.StatusAccepted, run)
		return
	}
	if err == nil {
		respond.JSON(w, http.StatusAccepted, run)
		return
	}
	if errors.Is(err, biz.ErrSourceNotFound) {
		respond.Error(w, http.StatusNotFound, "SOURCE_NOT_FOUND", "source not found")
		return
	}
	if errors.Is(err, biz.ErrNoCollectorRegistered) {
		respond.Error(w, http.StatusUnprocessableEntity, "NO_COLLECTOR_REGISTERED", err.Error())
		return
	}
	respond.Error(w, http.StatusInternalServerError, "COLLECTOR_ERROR", err.Error())
}

// ListRuns handles GET /api/v1/sources/{id}/collector-runs.
func (h *CollectorHandler) ListRuns(w http.ResponseWriter, r *http.Request) {
	sourceID := chi.URLParam(r, "id")
	limit := 20
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil && v > 0 {
			limit = v
		}
	}
	if limit > 100 {
		limit = 100
	}

	runs, err := h.runRepo.ListCollectorRuns(r.Context(), sourceID, limit)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list runs")
		return
	}
	if runs == nil {
		runs = []*domain.CollectorRun{}
	}
	respond.JSON(w, http.StatusOK, map[string]any{"runs": runs})
}

// GetRun handles GET /api/v1/collector-runs/{id}.
func (h *CollectorHandler) GetRun(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	run, err := h.runRepo.GetCollectorRun(r.Context(), id)
	if errors.Is(err, repo.ErrNotFound) {
		respond.Error(w, http.StatusNotFound, "RUN_NOT_FOUND", "collector run not found")
		return
	}
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get run")
		return
	}
	respond.JSON(w, http.StatusOK, run)
}

// newRunID generates a unique run ID with a "run_" prefix.
func newRunID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return "run_" + hex.EncodeToString(b)
}
