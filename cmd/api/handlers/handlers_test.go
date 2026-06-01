// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

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
	"github.com/getmetraly/metraly/cmd/api/middleware"
	"github.com/stretchr/testify/assert"
)

const testUserID = "user-test-001"

// withClaims injects JWT claims into the request context for internal handler tests
// that bypass the auth middleware.
func withClaims(r *http.Request, userID string) *http.Request {
	claims := &auth.Claims{Sub: userID, Workspace: "ws-test", Role: "engineer"}
	ctx := context.WithValue(r.Context(), middleware.ClaimsKey, claims)
	return r.WithContext(ctx)
}

func TestGetMe(t *testing.T) {
	claims := &auth.Claims{
		Sub:   "user-123",
		Email: "test@example.com",
		Role:  "admin",
	}

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/me", nil)

	// Set claims in context using the exported key
	ctx := context.WithValue(req.Context(), middleware.ClaimsKey, claims)
	req = req.WithContext(ctx)

	MeHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp MeResponse
	err := json.NewDecoder(w.Body).Decode(&resp)
	assert.NoError(t, err)
	assert.Equal(t, "test@example.com", resp.Email)
	assert.Equal(t, "admin", resp.Role)
}

type fakeDashboardRepo struct {
	listResult []*domain.Dashboard
	created    *domain.Dashboard
	byID       map[string]*domain.Dashboard // indexed by dashboard ID
}

func (f *fakeDashboardRepo) List(ctx context.Context, userID string) ([]*domain.Dashboard, error) {
	return f.listResult, nil
}

func (f *fakeDashboardRepo) GetByID(ctx context.Context, id string) (*domain.Dashboard, error) {
	if f.byID != nil {
		if d, ok := f.byID[id]; ok {
			return d, nil
		}
	}
	return nil, nil
}

func (f *fakeDashboardRepo) Create(ctx context.Context, d *domain.Dashboard) error {
	f.created = d
	return nil
}

func (f *fakeDashboardRepo) CreateTemplate(ctx context.Context, t *domain.DashboardTemplate) error {
	return nil
}

func (f *fakeDashboardRepo) Update(ctx context.Context, d *domain.Dashboard) (bool, error) {
	return false, nil
}

func (f *fakeDashboardRepo) UpdateLayout(ctx context.Context, id string, layout []domain.WidgetLayout, version int) (bool, error) {
	return false, nil
}

func (f *fakeDashboardRepo) UpdateShare(ctx context.Context, id string, isPublic bool, shareToken *string) error {
	return nil
}

func (f *fakeDashboardRepo) ListTemplates(ctx context.Context) ([]*domain.DashboardTemplate, error) {
	return nil, nil
}

func (f *fakeDashboardRepo) DeleteSystemTemplateDashboards(ctx context.Context) error {
	return nil
}

func (f *fakeDashboardRepo) Delete(ctx context.Context, id string) error {
	return nil
}

func newTestDashboardHandler(repo *fakeDashboardRepo) *DashboardHandler {
	return NewDashboardHandler(biz.NewDashboardSvc(repo, nil, cache.NewNoopDashboardCache()))
}

func TestDashboardHandler_List(t *testing.T) {
	repo := &fakeDashboardRepo{
		listResult: []*domain.Dashboard{
			{ID: "dash-1", Name: "CTO Overview", OwnerID: testUserID},
		},
	}
	handler := newTestDashboardHandler(repo)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/dashboards", nil)
	req = withClaims(req, testUserID) // auth required (P0-3)

	handler.List(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var dashboards []domain.Dashboard
	err := json.NewDecoder(w.Body).Decode(&dashboards)
	assert.NoError(t, err)
	assert.Len(t, dashboards, 1)
	assert.Equal(t, "dash-1", dashboards[0].ID)
}

func TestDashboardHandler_List_NoAuth_Returns401(t *testing.T) {
	handler := newTestDashboardHandler(&fakeDashboardRepo{})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/dashboards", nil)
	// No claims → must return 401.
	handler.List(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestDashboardHandler_Create_InvalidJSON(t *testing.T) {
	handler := newTestDashboardHandler(&fakeDashboardRepo{})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/v1/dashboards", nil)
	req = withClaims(req, testUserID) // auth must pass to reach JSON decode

	handler.Create(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDashboardHandler_Create(t *testing.T) {
	repo := &fakeDashboardRepo{}
	handler := newTestDashboardHandler(repo)
	body := bytes.NewBufferString(`{"name":"Delivery","description":"Flow metrics","icon":"chart","widgets":[],"layout":[]}`)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/v1/dashboards", body)
	req = withClaims(req, testUserID) // OwnerID must come from JWT claims, not body

	handler.Create(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NotNil(t, repo.created)
	assert.Equal(t, "Delivery", repo.created.Name)
	// OwnerID must be set from claims, never from request body (P0-3).
	assert.Equal(t, testUserID, repo.created.OwnerID)

	var dashboard domain.Dashboard
	err := json.NewDecoder(w.Body).Decode(&dashboard)
	assert.NoError(t, err)
	assert.Equal(t, "Delivery", dashboard.Name)
}

func TestDashboardHandler_Create_NoAuth_Returns401(t *testing.T) {
	repo := &fakeDashboardRepo{}
	handler := newTestDashboardHandler(repo)
	body := bytes.NewBufferString(`{"name":"Test"}`)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/v1/dashboards", body)
	// No claims → must return 401 (P0-3).
	handler.Create(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestGetMetrics(t *testing.T) {
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/metrics?metric=deploy-freq", nil)

	MetricsHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp MetricResponse
	err := json.NewDecoder(w.Body).Decode(&resp)
	assert.NoError(t, err)
	assert.Equal(t, "deploy-freq", resp.ID)
	assert.NotEmpty(t, resp.Series)
}
