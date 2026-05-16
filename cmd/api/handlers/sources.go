// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/respond"
	"github.com/go-chi/chi/v5"
)

type SourceHandler struct{ svc *biz.SourceSvc }

func NewSourceHandler(svc *biz.SourceSvc) *SourceHandler { return &SourceHandler{svc: svc} }
func (h *SourceHandler) List(w http.ResponseWriter, r *http.Request) {
	sources, err := h.svc.ListSources(r.Context(), workspaceID(r))
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "SOURCE_LIST_FAILED", err.Error())
		return
	}
	respond.JSON(w, http.StatusOK, sources)
}
func (h *SourceHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input domain.CreateSourceInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	if input.SourceType == "" {
		respond.Error(w, http.StatusBadRequest, "MISSING_SOURCE_TYPE", "sourceType is required")
		return
	}
	if input.RawSecret == "" {
		respond.Error(w, http.StatusBadRequest, "MISSING_SECRET", "secret is required")
		return
	}
	sc, cred, err := h.svc.CreateSource(r.Context(), workspaceID(r), input)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "SOURCE_CREATE_FAILED", err.Error())
		return
	}
	respond.JSON(w, http.StatusCreated, map[string]any{"source": sc, "credential": cred})
}
func (h *SourceHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	sc, err := h.svc.GetSource(r.Context(), id)
	if err != nil {
		respond.Error(w, http.StatusNotFound, "SOURCE_NOT_FOUND", "source not found")
		return
	}
	respond.JSON(w, http.StatusOK, sc)
}
func (h *SourceHandler) Test(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	result, err := h.svc.TestConnection(r.Context(), id)
	if err != nil {
		respond.JSON(w, http.StatusUnprocessableEntity, result)
		return
	}
	respond.JSON(w, http.StatusOK, result)
}
func workspaceID(_ *http.Request) string { return "default" }
