// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/getmetraly/metraly/cmd/api/auth"
	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/cache"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/handlers"
	"github.com/getmetraly/metraly/cmd/api/middleware"
	"github.com/getmetraly/metraly/cmd/api/repo"
	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// — Test constants —

const (
	dashboardOwner    = "user-owner-001"
	dashboardStranger = "user-stranger-002"
)

// — Fake dashboard repo —

type fakeDashboardRepoAuth struct {
	dashboards map[string]*domain.Dashboard
	created    []*domain.Dashboard
}

func newFakeDashboardRepoAuth() *fakeDashboardRepoAuth {
	return &fakeDashboardRepoAuth{dashboards: make(map[string]*domain.Dashboard)}
}

func (f *fakeDashboardRepoAuth) List(_ context.Context, userID string) ([]*domain.Dashboard, error) {
	var result []*domain.Dashboard
	for _, d := range f.dashboards {
		if d.OwnerID == userID || d.IsPublic {
			result = append(result, d)
		}
	}
	return result, nil
}

func (f *fakeDashboardRepoAuth) GetByID(_ context.Context, id string) (*domain.Dashboard, error) {
	d, ok := f.dashboards[id]
	if !ok {
		return nil, repo.ErrNotFound
	}
	return d, nil
}

func (f *fakeDashboardRepoAuth) Create(_ context.Context, d *domain.Dashboard) error {
	f.created = append(f.created, d)
	f.dashboards[d.ID] = d
	return nil
}

func (f *fakeDashboardRepoAuth) CreateTemplate(_ context.Context, _ *domain.DashboardTemplate) error {
	return nil
}

func (f *fakeDashboardRepoAuth) Update(_ context.Context, d *domain.Dashboard) (bool, error) {
	if _, ok := f.dashboards[d.ID]; ok {
		f.dashboards[d.ID] = d
		return true, nil
	}
	return false, nil
}

func (f *fakeDashboardRepoAuth) UpdateLayout(_ context.Context, id string, layout []domain.WidgetLayout, version int) (bool, error) {
	d, ok := f.dashboards[id]
	if !ok {
		return false, nil
	}
	d.Layout = layout
	d.Version = version + 1
	return true, nil
}

func (f *fakeDashboardRepoAuth) UpdateShare(_ context.Context, id string, isPublic bool, token *string) error {
	d, ok := f.dashboards[id]
	if !ok {
		return nil
	}
	d.IsPublic = isPublic
	d.ShareToken = token
	return nil
}

func (f *fakeDashboardRepoAuth) ListTemplates(_ context.Context) ([]*domain.DashboardTemplate, error) {
	return nil, nil
}

func (f *fakeDashboardRepoAuth) DeleteSystemTemplateDashboards(_ context.Context) error {
	return nil
}

func (f *fakeDashboardRepoAuth) Delete(_ context.Context, id string) error {
	delete(f.dashboards, id)
	return nil
}

// — helpers —

func dashboardRouter(h *handlers.DashboardHandler) http.Handler {
	r := chi.NewRouter()
	r.Get("/api/v1/dashboards/{id}", h.Get)
	r.Put("/api/v1/dashboards/{id}", h.Update)
	r.Put("/api/v1/dashboards/{id}/layout", h.UpdateLayout)
	r.Put("/api/v1/dashboards/{id}/share", h.UpdateShare)
	r.Post("/api/v1/dashboards/{id}/fork", h.Fork)
	return r
}

func withUserClaims(r *http.Request, userID string) *http.Request {
	claims := &auth.Claims{Sub: userID, Workspace: "ws-test", Role: "engineer"}
	ctx := context.WithValue(r.Context(), middleware.ClaimsKey, claims)
	return r.WithContext(ctx)
}

func newDashboardHandler(fr *fakeDashboardRepoAuth) *handlers.DashboardHandler {
	return handlers.NewDashboardHandler(biz.NewDashboardSvc(fr, cache.NewNoopDashboardCache()))
}

// seedPrivateDashboard inserts a private dashboard owned by dashboardOwner into the repo.
func seedPrivateDashboard(fr *fakeDashboardRepoAuth, id string) {
	fr.dashboards[id] = &domain.Dashboard{
		ID:       id,
		Name:     "Private Dashboard",
		OwnerID:  dashboardOwner,
		IsPublic: false,
		Version:  1,
	}
}

// seedPublicDashboard inserts a public dashboard owned by dashboardOwner.
func seedPublicDashboard(fr *fakeDashboardRepoAuth, id string) {
	fr.dashboards[id] = &domain.Dashboard{
		ID:       id,
		Name:     "Public Dashboard",
		OwnerID:  dashboardOwner,
		IsPublic: true,
		Version:  1,
	}
}

// — P0-3 Tests: Dashboard ownership enforcement —

// TestDashboardHandler_Get_PrivateOtherUser_Returns404 verifies that a user cannot read
// another user's private dashboard by ID (prevents ID enumeration).
func TestDashboardHandler_Get_PrivateOtherUser_Returns404(t *testing.T) {
	fr := newFakeDashboardRepoAuth()
	seedPrivateDashboard(fr, "dash-private")
	h := newDashboardHandler(fr)
	router := dashboardRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboards/dash-private", nil)
	req = withUserClaims(req, dashboardStranger) // stranger, not the owner
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusNotFound, rec.Code,
		"private dashboard of another user must appear as not found")
}

// TestDashboardHandler_Get_PublicOtherUser_Allowed verifies that a user can read
// a public dashboard that belongs to another user.
func TestDashboardHandler_Get_PublicOtherUser_Allowed(t *testing.T) {
	fr := newFakeDashboardRepoAuth()
	seedPublicDashboard(fr, "dash-public")
	h := newDashboardHandler(fr)
	router := dashboardRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboards/dash-public", nil)
	req = withUserClaims(req, dashboardStranger) // not the owner, but public
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code,
		"public dashboard must be readable by any authenticated user")
	var d domain.Dashboard
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&d))
	assert.Equal(t, "dash-public", d.ID)
}

// TestDashboardHandler_Update_PrivateOtherUser_Returns404 verifies that a user cannot
// update another user's dashboard (prevents silent data mutation).
func TestDashboardHandler_Update_PrivateOtherUser_Returns404Or403(t *testing.T) {
	fr := newFakeDashboardRepoAuth()
	seedPrivateDashboard(fr, "dash-update")
	h := newDashboardHandler(fr)
	router := dashboardRouter(h)

	body, _ := json.Marshal(map[string]any{"name": "Hijacked", "widgets": []any{}, "layout": []any{}, "version": 1})
	req := httptest.NewRequest(http.MethodPut, "/api/v1/dashboards/dash-update", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req = withUserClaims(req, dashboardStranger)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.True(t, rec.Code == http.StatusNotFound || rec.Code == http.StatusForbidden,
		"update of another user's dashboard must return 404 or 403, got %d", rec.Code)
}

// TestDashboardHandler_UpdateLayout_PrivateOtherUser_Returns404Or403 verifies that
// layout updates enforce ownership.
func TestDashboardHandler_UpdateLayout_PrivateOtherUser_Returns404Or403(t *testing.T) {
	fr := newFakeDashboardRepoAuth()
	seedPrivateDashboard(fr, "dash-layout")
	h := newDashboardHandler(fr)
	router := dashboardRouter(h)

	body, _ := json.Marshal(map[string]any{"layout": []any{}, "version": 1})
	req := httptest.NewRequest(http.MethodPut, "/api/v1/dashboards/dash-layout/layout", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req = withUserClaims(req, dashboardStranger)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.True(t, rec.Code == http.StatusNotFound || rec.Code == http.StatusForbidden,
		"layout update of another user's dashboard must return 404 or 403, got %d", rec.Code)
}

// TestDashboardHandler_UpdateShare_PrivateOtherUser_Returns404Or403 verifies that
// sharing settings enforce ownership.
func TestDashboardHandler_UpdateShare_PrivateOtherUser_Returns404Or403(t *testing.T) {
	fr := newFakeDashboardRepoAuth()
	seedPrivateDashboard(fr, "dash-share")
	h := newDashboardHandler(fr)
	router := dashboardRouter(h)

	body, _ := json.Marshal(map[string]any{"isPublic": true})
	req := httptest.NewRequest(http.MethodPut, "/api/v1/dashboards/dash-share/share", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req = withUserClaims(req, dashboardStranger)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.True(t, rec.Code == http.StatusNotFound || rec.Code == http.StatusForbidden,
		"share update of another user's dashboard must return 404 or 403, got %d", rec.Code)
}

// TestDashboardHandler_Fork_PrivateOtherUser_Returns404Or403 verifies that forking
// a private dashboard owned by another user is not allowed.
func TestDashboardHandler_Fork_PrivateOtherUser_Returns404Or403(t *testing.T) {
	fr := newFakeDashboardRepoAuth()
	seedPrivateDashboard(fr, "dash-fork-private")
	h := newDashboardHandler(fr)
	router := dashboardRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/dashboards/dash-fork-private/fork", nil)
	req = withUserClaims(req, dashboardStranger)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.True(t, rec.Code == http.StatusNotFound || rec.Code == http.StatusForbidden,
		"fork of another user's private dashboard must return 404 or 403, got %d", rec.Code)
}

// TestDashboardHandler_Fork_PublicOtherUser_Allowed verifies that forking a public
// dashboard is allowed for any authenticated user.
func TestDashboardHandler_Fork_PublicOtherUser_Allowed(t *testing.T) {
	fr := newFakeDashboardRepoAuth()
	seedPublicDashboard(fr, "dash-fork-public")
	h := newDashboardHandler(fr)
	router := dashboardRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/dashboards/dash-fork-public/fork", nil)
	req = withUserClaims(req, dashboardStranger)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code,
		"forking a public dashboard must succeed for any authenticated user")
	var forked domain.Dashboard
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&forked))
	// The fork must be owned by the requesting user, not the original owner.
	assert.Equal(t, dashboardStranger, forked.OwnerID,
		"fork OwnerID must be the requesting user's ID, not the source owner")
	assert.False(t, forked.IsPublic, "forked dashboard must be private by default")
}

// TestDashboardHandler_Get_OwnPrivateDashboard_Allowed verifies that a user can read
// their own private dashboard.
func TestDashboardHandler_Get_OwnPrivateDashboard_Allowed(t *testing.T) {
	fr := newFakeDashboardRepoAuth()
	seedPrivateDashboard(fr, "dash-own")
	h := newDashboardHandler(fr)
	router := dashboardRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboards/dash-own", nil)
	req = withUserClaims(req, dashboardOwner) // the actual owner
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code,
		"owner must be able to read their own private dashboard")
}

// TestDashboardHandler_Get_MissingClaims_Returns401 verifies that missing auth claims
// return 401 for protected dashboard routes (P0-3).
func TestDashboardHandler_Get_MissingClaims_Returns401(t *testing.T) {
	fr := newFakeDashboardRepoAuth()
	seedPrivateDashboard(fr, "dash-auth")
	h := newDashboardHandler(fr)
	router := dashboardRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboards/dash-auth", nil)
	// No claims at all.
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}
