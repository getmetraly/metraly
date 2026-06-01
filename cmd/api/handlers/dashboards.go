// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/middleware"
	"github.com/getmetraly/metraly/cmd/api/respond"
	"github.com/go-chi/chi/v5"
)

type DashboardHandler struct {
	svc *biz.DashboardSvc
}

func NewDashboardHandler(svc *biz.DashboardSvc) *DashboardHandler {
	return &DashboardHandler{svc: svc}
}

// validateWidgetTypes returns an error message if any widget in the list has an unsupported type.
func validateWidgetTypes(widgets []domain.WidgetInstance) string {
	for _, w := range widgets {
		if !SupportedWidgetTypes[w.WidgetType] {
			return "unsupported widget type: " + w.WidgetType
		}
	}
	return ""
}

func (h *DashboardHandler) List(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.svc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}

	userID, ok := currentUserID(r)
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	dashboards, err := h.svc.List(r.Context(), userID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "DASHBOARD_LIST_FAILED", "failed to list dashboards")
		return
	}
	respond.JSON(w, http.StatusOK, dashboards)
}

func (h *DashboardHandler) Create(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.svc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}

	userID, ok := currentUserID(r)
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	var input domain.CreateDashboardInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	if msg := validateWidgetTypes(input.Widgets); msg != "" {
		respond.Error(w, http.StatusBadRequest, "INVALID_WIDGET_TYPE", msg)
		return
	}

	sourceType := input.SourceType
	if sourceType == "" {
		sourceType = domain.DashboardSourceUserCreated
	}

	dashboard := &domain.Dashboard{
		ID:               newDashboardID(),
		Name:             input.Name,
		Description:      input.Description,
		Icon:             sanitizeDashboardIcon(input.Icon),
		OwnerID:          userID, // always from JWT claims; never from body
		IsPublic:         false,
		SourceType:       sourceType,
		SourceTemplateID: input.SourceTemplateID,
		ForkedFromID:     input.ForkedFromID,
		Widgets:          input.Widgets,
		Layout:           input.Layout,
	}

	if err := h.svc.Create(r.Context(), dashboard); err != nil {
		respond.Error(w, http.StatusInternalServerError, "DASHBOARD_CREATE_FAILED", "failed to create dashboard")
		return
	}
	respond.JSON(w, http.StatusOK, dashboard)
}

// Get returns a dashboard by ID.
// Allowed for the owner or for any user if the dashboard is public (P0-3).
func (h *DashboardHandler) Get(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.svc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}

	userID, ok := currentUserID(r)
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	dashboard, err := h.svc.GetByIDForUser(r.Context(), chi.URLParam(r, "id"), userID)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	respond.JSON(w, http.StatusOK, dashboard)
}

// Update mutates a dashboard. Only the owner is allowed (P0-3).
func (h *DashboardHandler) Update(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.svc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}

	userID, ok := currentUserID(r)
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	var input domain.UpdateDashboardInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	if msg := validateWidgetTypes(input.Widgets); msg != "" {
		respond.Error(w, http.StatusBadRequest, "INVALID_WIDGET_TYPE", msg)
		return
	}

	// GetByIDOwned enforces ownership — foreign/private dashboards are 404.
	current, err := h.svc.GetByIDOwned(r.Context(), chi.URLParam(r, "id"), userID)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	dashboard := &domain.Dashboard{
		ID:               current.ID,
		Name:             input.Name,
		Description:      input.Description,
		Icon:             sanitizeDashboardIcon(input.Icon),
		OwnerID:          current.OwnerID, // preserve — never accept ownerID from body
		IsPublic:         current.IsPublic,
		SourceType:       current.SourceType,
		SourceTemplateID: current.SourceTemplateID,
		ShareToken:       current.ShareToken,
		Widgets:          input.Widgets,
		Layout:           input.Layout,
		Version:          input.Version,
		ForkedFromID:     current.ForkedFromID,
		CreatedAt:        current.CreatedAt,
		UpdatedAt:        current.UpdatedAt,
	}

	updated, err := h.svc.Update(r.Context(), dashboard)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "DASHBOARD_UPDATE_FAILED", "failed to update dashboard")
		return
	}
	if !updated {
		respond.Error(w, http.StatusConflict, "VERSION_CONFLICT", "dashboard version is stale")
		return
	}

	updatedDashboard, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	respond.JSON(w, http.StatusOK, updatedDashboard)
}

// UpdateLayout changes the layout. Only the owner is allowed (P0-3).
func (h *DashboardHandler) UpdateLayout(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.svc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}

	userID, ok := currentUserID(r)
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	var input domain.UpdateLayoutInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	updated, err := h.svc.UpdateLayoutForUser(r.Context(), chi.URLParam(r, "id"), input.Layout, input.Version, userID)
	if errors.Is(err, biz.ErrDashboardNotFound) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "DASHBOARD_LAYOUT_UPDATE_FAILED", "failed to update layout")
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

// UpdateShare toggles sharing. Only the owner is allowed (P0-3).
func (h *DashboardHandler) UpdateShare(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.svc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}

	userID, ok := currentUserID(r)
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
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

	if err := h.svc.UpdateShareForUser(r.Context(), chi.URLParam(r, "id"), input.IsPublic, shareToken, userID); err != nil {
		if errors.Is(err, biz.ErrDashboardNotFound) {
			http.NotFound(w, r)
			return
		}
		respond.Error(w, http.StatusInternalServerError, "DASHBOARD_SHARE_UPDATE_FAILED", "failed to update share settings")
		return
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"isPublic":    input.IsPublic,
		"shareToken":  shareToken,
		"dashboardId": chi.URLParam(r, "id"),
	})
}

// Delete removes a dashboard owned by the caller.
func (h *DashboardHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.svc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}
	userID, ok := currentUserID(r)
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}
	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteForUser(r.Context(), id, userID); err != nil {
		if errors.Is(err, biz.ErrDashboardNotFound) {
			http.NotFound(w, r)
			return
		}
		if errors.Is(err, biz.ErrForbidden) {
			respond.Error(w, http.StatusForbidden, "FORBIDDEN", "cannot delete this dashboard")
			return
		}
		respond.Error(w, http.StatusInternalServerError, "DASHBOARD_DELETE_FAILED", "failed to delete dashboard")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Fork creates a copy of a dashboard. Allowed for owner or public dashboards (P0-3).
func (h *DashboardHandler) Fork(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.svc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}

	userID, ok := currentUserID(r)
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	// GetByIDForUser: user can fork their own or any public dashboard.
	source, err := h.svc.GetByIDForUser(r.Context(), chi.URLParam(r, "id"), userID)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	forked := &domain.Dashboard{
		ID:               newDashboardID(),
		Name:             source.Name + " Copy",
		Description:      source.Description,
		Icon:             source.Icon,
		OwnerID:          userID, // the requesting user owns the fork
		IsPublic:         false,
		SourceType:       domain.DashboardSourceForked,
		SourceTemplateID: source.SourceTemplateID,
		Widgets:          source.Widgets,
		Layout:           source.Layout,
		ForkedFromID: func() *string {
			id := source.ID
			return &id
		}(),
	}
	if err := h.svc.Create(r.Context(), forked); err != nil {
		respond.Error(w, http.StatusInternalServerError, "DASHBOARD_FORK_FAILED", "failed to fork dashboard")
		return
	}

	respond.JSON(w, http.StatusOK, forked)
}

// currentUserID extracts the authenticated user's subject claim from the request context.
// Returns ("", false) when claims are absent or the subject is empty, meaning the route
// must reject the request with 401. Never falls back to any seed/admin ID.
func currentUserID(r *http.Request) (string, bool) {
	claims := middleware.ClaimsFrom(r.Context())
	if claims == nil || claims.Sub == "" {
		return "", false
	}
	return claims.Sub, true
}

func newDashboardID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "admin-seed"
	}
	return hex.EncodeToString(b[:])
}

func newShareToken() string {
	var b [12]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "admin-seed"
	}
	return hex.EncodeToString(b[:])
}
