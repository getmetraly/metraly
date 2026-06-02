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
	"time"

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

const (
	snapshotDashboardID = "dash-1"
	snapshotOwnerID     = "user-owner"
	snapshotWorkspaceID = "ws-test"
)

type fakeSnapshotDashboardRepo struct {
	dashboards map[string]*domain.Dashboard
}

func newFakeSnapshotDashboardRepo() *fakeSnapshotDashboardRepo {
	return &fakeSnapshotDashboardRepo{dashboards: make(map[string]*domain.Dashboard)}
}

func (f *fakeSnapshotDashboardRepo) List(_ context.Context, userID string) ([]*domain.Dashboard, error) {
	var out []*domain.Dashboard
	for _, d := range f.dashboards {
		if d.OwnerID == userID {
			out = append(out, d)
		}
	}
	return out, nil
}

func (f *fakeSnapshotDashboardRepo) GetByID(_ context.Context, id string) (*domain.Dashboard, error) {
	d, ok := f.dashboards[id]
	if !ok {
		return nil, repo.ErrNotFound
	}
	return d, nil
}

func (f *fakeSnapshotDashboardRepo) Create(_ context.Context, _ *domain.Dashboard) error { return nil }
func (f *fakeSnapshotDashboardRepo) CreateTemplate(_ context.Context, _ *domain.DashboardTemplate) error {
	return nil
}
func (f *fakeSnapshotDashboardRepo) Update(_ context.Context, _ *domain.Dashboard) (bool, error) {
	return false, nil
}
func (f *fakeSnapshotDashboardRepo) UpdateLayout(_ context.Context, _ string, _ []domain.WidgetLayout, _ int) (bool, error) {
	return false, nil
}
func (f *fakeSnapshotDashboardRepo) UpdateShare(_ context.Context, _ string, _ bool, _ *string) error {
	return nil
}
func (f *fakeSnapshotDashboardRepo) ListTemplates(_ context.Context) ([]*domain.DashboardTemplate, error) {
	return nil, nil
}
func (f *fakeSnapshotDashboardRepo) DeleteSystemTemplateDashboards(_ context.Context) error { return nil }
func (f *fakeSnapshotDashboardRepo) Delete(_ context.Context, _ string) error { return nil }

type fakeSnapshotMetricRepo struct{}

func (f *fakeSnapshotMetricRepo) GetTimeSeries(_ context.Context, _, _ string, _, _ time.Time) ([]domain.MetricDataPoint, error) {
	return []domain.MetricDataPoint{
		{Time: time.Date(2026, 5, 26, 0, 0, 0, 0, time.UTC), Value: 12},
		{Time: time.Date(2026, 5, 27, 0, 0, 0, 0, time.UTC), Value: 15},
	}, nil
}

func (f *fakeSnapshotMetricRepo) GetBreakdown(_ context.Context, _ string, _, _ time.Time) ([]domain.MetricBreakdownItem, error) {
	return []domain.MetricBreakdownItem{{Team: "eng", Value: 15}}, nil
}

func (f *fakeSnapshotMetricRepo) BulkInsert(_ context.Context, _ []domain.MetricDataPoint, _, _ string) error {
	return nil
}

func newQuerySnapshotHandlerForTest(dashboards map[string]*domain.Dashboard) *handlers.QuerySnapshotHandler {
	dashboardRepo := newFakeSnapshotDashboardRepo()
	for id, d := range dashboards {
		dashboardRepo.dashboards[id] = d
	}
	dashboardSvc := biz.NewDashboardSvc(dashboardRepo, nil, cache.NewNoopDashboardCache())
	metricsSvc := biz.NewMetricsSvc(&fakeSnapshotMetricRepo{}, cache.NewNoopMetricsCache())
	preview := handlers.NewPreviewHandler(dashboardSvc, nil, metricsSvc, nil, nil)
	return handlers.NewQuerySnapshotHandler(dashboardSvc, preview)
}

func withSnapshotClaims(req *http.Request, userID string) *http.Request {
	claims := &auth.Claims{Sub: userID, Workspace: snapshotWorkspaceID, Role: "engineer"}
	ctx := context.WithValue(req.Context(), middleware.ClaimsKey, claims)
	return req.WithContext(ctx)
}

func snapshotRequestBody(t *testing.T, body map[string]any) *bytes.Buffer {
	t.Helper()
	b, err := json.Marshal(body)
	require.NoError(t, err)
	return bytes.NewBuffer(b)
}

func snapshotRouter(h *handlers.QuerySnapshotHandler) http.Handler {
	r := chi.NewRouter()
	r.Post("/api/v1/dashboards/{id}/query-results/snapshot", h.Snapshot)
	return r
}

func seedSnapshotDashboard() *domain.Dashboard {
	return &domain.Dashboard{
		ID:      snapshotDashboardID,
		Name:    "Demo",
		OwnerID: snapshotOwnerID,
		Version: 3,
	}
}

func TestQuerySnapshotHandler_NoClaims_Returns401(t *testing.T) {
	h := newQuerySnapshotHandlerForTest(map[string]*domain.Dashboard{snapshotDashboardID: seedSnapshotDashboard()})
	body := map[string]any{"queries": []any{map[string]any{"queryKey": "q1", "query": validSnapshotQuery("timeseries")}}}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/dashboards/"+snapshotDashboardID+"/query-results/snapshot", snapshotRequestBody(t, body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	snapshotRouter(h).ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
	assertSnapshotErrorCode(t, rec, "MISSING_AUTH")
}

func TestQuerySnapshotHandler_InvalidJSON_Returns400(t *testing.T) {
	h := newQuerySnapshotHandlerForTest(map[string]*domain.Dashboard{snapshotDashboardID: seedSnapshotDashboard()})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/dashboards/"+snapshotDashboardID+"/query-results/snapshot", bytes.NewBufferString("{bad json"))
	req.Header.Set("Content-Type", "application/json")
	req = withSnapshotClaims(req, snapshotOwnerID)
	rec := httptest.NewRecorder()

	snapshotRouter(h).ServeHTTP(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assertSnapshotErrorCode(t, rec, "INVALID_JSON")
}

func TestQuerySnapshotHandler_EmptyQueries_Returns400(t *testing.T) {
	h := newQuerySnapshotHandlerForTest(map[string]*domain.Dashboard{snapshotDashboardID: seedSnapshotDashboard()})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/dashboards/"+snapshotDashboardID+"/query-results/snapshot", snapshotRequestBody(t, map[string]any{"queries": []any{}}))
	req.Header.Set("Content-Type", "application/json")
	req = withSnapshotClaims(req, snapshotOwnerID)
	rec := httptest.NewRecorder()

	snapshotRouter(h).ServeHTTP(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assertSnapshotErrorCode(t, rec, "MISSING_QUERIES")
}

func TestQuerySnapshotHandler_MissingQueryKey_Returns400(t *testing.T) {
	h := newQuerySnapshotHandlerForTest(map[string]*domain.Dashboard{snapshotDashboardID: seedSnapshotDashboard()})
	body := map[string]any{"queries": []any{map[string]any{"query": validSnapshotQuery("timeseries")}}}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/dashboards/"+snapshotDashboardID+"/query-results/snapshot", snapshotRequestBody(t, body))
	req.Header.Set("Content-Type", "application/json")
	req = withSnapshotClaims(req, snapshotOwnerID)
	rec := httptest.NewRecorder()

	snapshotRouter(h).ServeHTTP(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assertSnapshotErrorCode(t, rec, "MISSING_QUERY_KEY")
}

func TestQuerySnapshotHandler_DashboardNotFound_Returns404(t *testing.T) {
	h := newQuerySnapshotHandlerForTest(map[string]*domain.Dashboard{})
	body := map[string]any{"queries": []any{map[string]any{"queryKey": "q1", "query": validSnapshotQuery("timeseries")}}}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/dashboards/missing/query-results/snapshot", snapshotRequestBody(t, body))
	req.Header.Set("Content-Type", "application/json")
	req = withSnapshotClaims(req, snapshotOwnerID)
	rec := httptest.NewRecorder()

	snapshotRouter(h).ServeHTTP(rec, req)

	assert.Equal(t, http.StatusNotFound, rec.Code)
}

func TestQuerySnapshotHandler_Success(t *testing.T) {
	h := newQuerySnapshotHandlerForTest(map[string]*domain.Dashboard{snapshotDashboardID: seedSnapshotDashboard()})
	body := map[string]any{
		"queries": []any{
			map[string]any{
				"queryKey": "pr-cycle:timeseries",
				"query": map[string]any{
					"metricId":    "pr-cycle",
					"resultKind":  "timeseries",
					"granularity": "day",
					"start":       "2026-05-26T00:00:00Z",
					"end":         "2026-06-02T00:00:00Z",
					"filters":     map[string]any{"workspace": "attacker", "team": "eng"},
					"groupBy":     []any{"team"},
					"params":      map[string]any{"tableType": "pr-queue", "maxRows": 5},
				},
			},
		},
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/dashboards/"+snapshotDashboardID+"/query-results/snapshot", snapshotRequestBody(t, body))
	req.Header.Set("Content-Type", "application/json")
	req = withSnapshotClaims(req, snapshotOwnerID)
	rec := httptest.NewRecorder()

	snapshotRouter(h).ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	var resp struct {
		DashboardID string `json:"dashboardId"`
		Results     []struct {
			QueryKey  string         `json:"queryKey"`
			Result    map[string]any `json:"result"`
			Status    string         `json:"status"`
			Version   int            `json:"version"`
			Sequence  int            `json:"sequence"`
			UpdatedAt string         `json:"updatedAt"`
		} `json:"results"`
	}
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&resp))
	require.Equal(t, snapshotDashboardID, resp.DashboardID)
	require.Len(t, resp.Results, 1)
	assert.Equal(t, "pr-cycle:timeseries", resp.Results[0].QueryKey)
	assert.Equal(t, "ready", resp.Results[0].Status)
	assert.Equal(t, 3, resp.Results[0].Version)
	assert.Equal(t, 1, resp.Results[0].Sequence)
	assert.NotEmpty(t, resp.Results[0].UpdatedAt)
	assert.NotEmpty(t, resp.Results[0].Result)
}

func TestQuerySnapshotHandler_DedupesQueryKeys(t *testing.T) {
	h := newQuerySnapshotHandlerForTest(map[string]*domain.Dashboard{snapshotDashboardID: seedSnapshotDashboard()})
	body := map[string]any{
		"queries": []any{
			map[string]any{"queryKey": "same", "query": validSnapshotQuery("timeseries")},
			map[string]any{"queryKey": "same", "query": validSnapshotQuery("scalar")},
		},
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/dashboards/"+snapshotDashboardID+"/query-results/snapshot", snapshotRequestBody(t, body))
	req.Header.Set("Content-Type", "application/json")
	req = withSnapshotClaims(req, snapshotOwnerID)
	rec := httptest.NewRecorder()

	snapshotRouter(h).ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	var resp struct {
		Results []struct {
			QueryKey string `json:"queryKey"`
			Sequence int    `json:"sequence"`
		} `json:"results"`
	}
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&resp))
	require.Len(t, resp.Results, 1)
	assert.Equal(t, "same", resp.Results[0].QueryKey)
	assert.Equal(t, 1, resp.Results[0].Sequence)
}

func TestQuerySnapshotHandler_UnsupportedResultKind_ItemErrorOverall200(t *testing.T) {
	h := newQuerySnapshotHandlerForTest(map[string]*domain.Dashboard{snapshotDashboardID: seedSnapshotDashboard()})
	body := map[string]any{"queries": []any{map[string]any{"queryKey": "q1", "query": validSnapshotQuery("unsupported")}}}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/dashboards/"+snapshotDashboardID+"/query-results/snapshot", snapshotRequestBody(t, body))
	req.Header.Set("Content-Type", "application/json")
	req = withSnapshotClaims(req, snapshotOwnerID)
	rec := httptest.NewRecorder()

	snapshotRouter(h).ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	var resp struct {
		Results []struct {
			Status   string `json:"status"`
			Version  int    `json:"version"`
			Sequence int    `json:"sequence"`
		} `json:"results"`
	}
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&resp))
	require.Len(t, resp.Results, 1)
	assert.Equal(t, "error", resp.Results[0].Status)
	assert.Equal(t, 3, resp.Results[0].Version)
	assert.Equal(t, 1, resp.Results[0].Sequence)
}

func validSnapshotQuery(resultKind string) map[string]any {
	return map[string]any{
		"metricId":    "pr-cycle",
		"resultKind":  resultKind,
		"granularity": "day",
		"start":       "2026-05-26T00:00:00Z",
		"end":         "2026-06-02T00:00:00Z",
		"filters":     map[string]any{"team": "eng"},
		"groupBy":     []any{"team"},
		"params":      map[string]any{"tableType": "pr-queue", "maxRows": 5},
	}
}

func assertSnapshotErrorCode(t *testing.T, rec *httptest.ResponseRecorder, code string) {
	t.Helper()
	var resp struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&resp))
	assert.Equal(t, code, resp.Error.Code)
}
