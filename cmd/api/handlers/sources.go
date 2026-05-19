// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/middleware"
	"github.com/getmetraly/metraly/cmd/api/respond"
	"github.com/go-chi/chi/v5"
)

type SourceHandler struct{ svc *biz.SourceSvc }

func NewSourceHandler(svc *biz.SourceSvc) *SourceHandler { return &SourceHandler{svc: svc} }

func (h *SourceHandler) List(w http.ResponseWriter, r *http.Request) {
	wsID, ok := workspaceID(r)
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "MISSING_WORKSPACE", "workspace not resolved from token")
		return
	}
	sources, err := h.svc.ListSources(r.Context(), wsID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "SOURCE_LIST_FAILED", "failed to list sources")
		return
	}
	respond.JSON(w, http.StatusOK, sources)
}

func (h *SourceHandler) Create(w http.ResponseWriter, r *http.Request) {
	wsID, ok := workspaceID(r)
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "MISSING_WORKSPACE", "workspace not resolved from token")
		return
	}
	var input domain.CreateSourceInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
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
	sc, cred, err := h.svc.CreateSource(r.Context(), wsID, input)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "SOURCE_CREATE_FAILED", "failed to create source")
		return
	}
	respond.JSON(w, http.StatusCreated, map[string]any{"source": sc, "credential": cred})
}

func (h *SourceHandler) Get(w http.ResponseWriter, r *http.Request) {
	wsID, ok := workspaceID(r)
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "MISSING_WORKSPACE", "workspace not resolved from token")
		return
	}
	id := chi.URLParam(r, "id")
	sc, err := h.svc.GetSource(r.Context(), wsID, id)
	if err != nil {
		respond.Error(w, http.StatusNotFound, "SOURCE_NOT_FOUND", "source not found")
		return
	}
	respond.JSON(w, http.StatusOK, sc)
}

func (h *SourceHandler) Test(w http.ResponseWriter, r *http.Request) {
	wsID, ok := workspaceID(r)
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "MISSING_WORKSPACE", "workspace not resolved from token")
		return
	}
	id := chi.URLParam(r, "id")
	result, err := h.svc.TestConnection(r.Context(), wsID, id)
	if err != nil {
		respond.JSON(w, http.StatusUnprocessableEntity, result)
		return
	}
	respond.JSON(w, http.StatusOK, result)
}

// workspaceID extracts the workspace ID from the JWT claims stored in the request context.
// Returns ("", false) when claims are absent or carry no workspace — callers must return 401.
// No hardcoded fallback is ever used; the workspace must come from the authenticated token.
func workspaceID(r *http.Request) (string, bool) {
	claims := middleware.ClaimsFrom(r.Context())
	if claims == nil || claims.Workspace == "" {
		return "", false
	}
	return claims.Workspace, true
}

// workspaceIDFromCtx extracts workspace from a context.Context (for internal helpers
// that don't have direct access to *http.Request).
// Returns "" when claims are absent — callers should treat empty as "no workspace".
func workspaceIDFromCtx(ctx context.Context) string {
	claims := middleware.ClaimsFrom(ctx)
	if claims == nil {
		return ""
	}
	return claims.Workspace
}
