// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/middleware"
	"github.com/getmetraly/metraly/cmd/api/respond"
	"github.com/go-chi/chi/v5"
)

const fallbackDashboardOwnerID = "admin-seed"

type DashboardHandler struct {
	svc *biz.DashboardSvc
}

func NewDashboardHandler(svc *biz.DashboardSvc) *DashboardHandler {
	return &DashboardHandler{svc: svc}
}

func (h *DashboardHandler) List(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.svc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}

	dashboards, err := h.svc.List(r.Context(), dashboardOwnerID(r))
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "DASHBOARD_LIST_FAILED", err.Error())
		return
	}
	respond.JSON(w, http.StatusOK, dashboards)
}

func (h *DashboardHandler) Create(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.svc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}

	var input domain.CreateDashboardInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	dashboard := &domain.Dashboard{
		ID:          newDashboardID(),
		Name:        input.Name,
		Description: input.Description,
		Icon:        input.Icon,
		OwnerID:     dashboardOwnerID(r),
		IsPublic:    false,
		Widgets:     input.Widgets,
		Layout:      input.Layout,
	}

	if err := h.svc.Create(r.Context(), dashboard); err != nil {
		respond.Error(w, http.StatusInternalServerError, "DASHBOARD_CREATE_FAILED", err.Error())
		return
	}
	respond.JSON(w, http.StatusOK, dashboard)
}

func (h *DashboardHandler) Get(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.svc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}

	dashboard, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	respond.JSON(w, http.StatusOK, dashboard)
}

func (h *DashboardHandler) Update(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.svc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}

	var input domain.UpdateDashboardInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	dashboard := &domain.Dashboard{
		ID:      chi.URLParam(r, "id"),
		Name:    input.Name,
		Icon:    input.Icon,
		Widgets: input.Widgets,
		Layout:  input.Layout,
		Version: input.Version,
	}

	updated, err := h.svc.Update(r.Context(), dashboard)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "DASHBOARD_UPDATE_FAILED", err.Error())
		return
	}
	if !updated {
		respond.Error(w, http.StatusConflict, "VERSION_CONFLICT", "dashboard version is stale")
		return
	}

	respond.JSON(w, http.StatusOK, dashboard)
}

func (h *DashboardHandler) UpdateLayout(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.svc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}

	var input domain.UpdateLayoutInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	updated, err := h.svc.UpdateLayout(r.Context(), chi.URLParam(r, "id"), input.Layout, input.Version)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "DASHBOARD_LAYOUT_UPDATE_FAILED", err.Error())
		return
	}
	if !updated {
		respond.Error(w, http.StatusConflict, "VERSION_CONFLICT", "dashboard version is stale")
		return
	}

	dashboard, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	dashboard.Layout = input.Layout
	respond.JSON(w, http.StatusOK, dashboard)
}

func (h *DashboardHandler) UpdateShare(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.svc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}

	var input domain.UpdateShareInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	var shareToken *string
	if input.IsPublic {
		token := newShareToken()
		shareToken = &token
	}
	if err := h.svc.UpdateShare(r.Context(), chi.URLParam(r, "id"), input.IsPublic, shareToken); err != nil {
		respond.Error(w, http.StatusInternalServerError, "DASHBOARD_SHARE_UPDATE_FAILED", err.Error())
		return
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"isPublic":   input.IsPublic,
		"shareToken":  shareToken,
		"dashboardId": chi.URLParam(r, "id"),
	})
}

func (h *DashboardHandler) Fork(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.svc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}

	source, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		http.NotFound(w, r)
		return
	}

	forked := &domain.Dashboard{
		ID:          newDashboardID(),
		Name:        source.Name + " Copy",
		Description: source.Description,
		Icon:        source.Icon,
		OwnerID:     dashboardOwnerID(r),
		IsPublic:    false,
		Widgets:     source.Widgets,
		Layout:      source.Layout,
		ForkedFromID: func() *string {
			id := source.ID
			return &id
		}(),
	}
	if err := h.svc.Create(r.Context(), forked); err != nil {
		respond.Error(w, http.StatusInternalServerError, "DASHBOARD_FORK_FAILED", err.Error())
		return
	}

	respond.JSON(w, http.StatusOK, forked)
}

func dashboardOwnerID(r *http.Request) string {
	if claims := middleware.ClaimsFrom(r.Context()); claims != nil && claims.Sub != "" {
		return claims.Sub
	}
	return fallbackDashboardOwnerID
}

func newDashboardID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return fallbackDashboardOwnerID
	}
	return hex.EncodeToString(b[:])
}

func newShareToken() string {
	var b [12]byte
	if _, err := rand.Read(b[:]); err != nil {
		return fallbackDashboardOwnerID
	}
	return hex.EncodeToString(b[:])
}
