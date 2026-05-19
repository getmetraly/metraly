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
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/handlers"
	"github.com/getmetraly/metraly/cmd/api/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// stubMetricQueryExecutor is a hand-rolled stub for handlers.MetricQueryExecutor.
type stubMetricQueryExecutor struct {
	result domain.MetricQueryResult
	err    error
}

func (s *stubMetricQueryExecutor) Execute(_ context.Context, _ domain.MetricQuery) (domain.MetricQueryResult, error) {
	return s.result, s.err
}

func sampleResult(metricID string, rows [][]any) domain.MetricQueryResult {
	return domain.MetricQueryResult{
		MetricID:   metricID,
		Quality:    domain.DataQualityFull,
		ComputedAt: time.Now().UTC(),
		Data: domain.MetricDataFrame{
			Columns: []string{"bucket", "value", "count"},
			Rows:    rows,
		},
	}
}

func buildWidgetRequest(widgetType, metricID string) *bytes.Buffer {
	body := map[string]any{
		"widgetType": widgetType,
		"query": map[string]any{
			"metricId":    metricID,
			"granularity": "day",
			"start":       "2026-01-01T00:00:00Z",
			"end":         "2026-02-01T00:00:00Z",
		},
	}
	b, _ := json.Marshal(body)
	return bytes.NewBuffer(b)
}

// doWidgetRequest sends a widget-data request with a valid workspace claim.
func doWidgetRequest(t *testing.T, executor handlers.MetricQueryExecutor, body *bytes.Buffer) *httptest.ResponseRecorder {
	t.Helper()
	h := handlers.NewWidgetDataHandler(executor)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/metrics/widget-data", body)
	req.Header.Set("Content-Type", "application/json")
	req = withTestWorkspace(req, testWorkspace)
	w := httptest.NewRecorder()
	h.Query(w, req)
	return w
}

// doWidgetRequestNoAuth sends a widget-data request without any JWT claims.
func doWidgetRequestNoAuth(t *testing.T, executor handlers.MetricQueryExecutor, body *bytes.Buffer) *httptest.ResponseRecorder {
	t.Helper()
	h := handlers.NewWidgetDataHandler(executor)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/metrics/widget-data", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.Query(w, req)
	return w
}

func TestWidgetDataHandler_KPICard(t *testing.T) {
	v := 42.0
	executor := &stubMetricQueryExecutor{
		result: sampleResult("pr_count", [][]any{
			{"2026-01-15T00:00:00Z", v, int64(42)},
		}),
	}

	w := doWidgetRequest(t, executor, buildWidgetRequest("kpi_card", "pr_count"))
	require.Equal(t, http.StatusOK, w.Code)

	var resp map[string]any
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	assert.Equal(t, "kpi_card", resp["widgetType"])
	assert.Equal(t, "full", resp["quality"])
	data, _ := resp["data"].(map[string]any)
	require.NotNil(t, data)
	assert.NotNil(t, data["value"])
}

func TestWidgetDataHandler_LineChart(t *testing.T) {
	v1, v2 := 10.0, 20.0
	executor := &stubMetricQueryExecutor{
		result: sampleResult("pr_count", [][]any{
			{"2026-01-01T00:00:00Z", v1, int64(10)},
			{"2026-01-02T00:00:00Z", v2, int64(20)},
		}),
	}

	w := doWidgetRequest(t, executor, buildWidgetRequest("line_chart", "pr_count"))
	require.Equal(t, http.StatusOK, w.Code)

	var resp map[string]any
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	assert.Equal(t, "line_chart", resp["widgetType"])
	data, _ := resp["data"].(map[string]any)
	require.NotNil(t, data)
	labels, _ := data["labels"].([]any)
	assert.Len(t, labels, 2)
}

func TestWidgetDataHandler_BarChart(t *testing.T) {
	v := 5.0
	executor := &stubMetricQueryExecutor{
		result: sampleResult("pr_count", [][]any{
			{"2026-01-10T00:00:00Z", v, int64(5)},
		}),
	}

	w := doWidgetRequest(t, executor, buildWidgetRequest("bar_chart", "pr_count"))
	require.Equal(t, http.StatusOK, w.Code)

	var resp map[string]any
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	assert.Equal(t, "bar_chart", resp["widgetType"])
}

func TestWidgetDataHandler_Table(t *testing.T) {
	executor := &stubMetricQueryExecutor{
		result: sampleResult("pr_count", [][]any{
			{"2026-01-15T00:00:00Z", 7.0, int64(7)},
		}),
	}

	w := doWidgetRequest(t, executor, buildWidgetRequest("table", "pr_count"))
	require.Equal(t, http.StatusOK, w.Code)

	var resp map[string]any
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	assert.Equal(t, "table", resp["widgetType"])
	data, _ := resp["data"].(map[string]any)
	cols, _ := data["columns"].([]any)
	assert.NotEmpty(t, cols)
}

func TestWidgetDataHandler_UnsupportedWidgetType(t *testing.T) {
	executor := &stubMetricQueryExecutor{result: sampleResult("pr_count", [][]any{})}

	w := doWidgetRequest(t, executor, buildWidgetRequest("unsupported_type", "pr_count"))
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestWidgetDataHandler_ActivityFeed_NotWired_Returns501(t *testing.T) {
	// activity_feed without an attached ActivityFeedSvc must return 501.
	executor := &stubMetricQueryExecutor{result: sampleResult("pr_count", [][]any{})}
	w := doWidgetRequest(t, executor, buildWidgetRequest("activity_feed", ""))
	assert.Equal(t, http.StatusNotImplemented, w.Code)
	assertWidgetErrorCode(t, w, "ACTIVITY_FEED_NOT_ENABLED")
}

func TestWidgetDataHandler_ActivityFeed_TypedNil_Returns501(t *testing.T) {
	// A typed-nil (*ActivityFeedSvc)(nil) must not panic and must return 501.
	executor := &stubMetricQueryExecutor{result: sampleResult("pr_count", [][]any{})}
	h := handlers.NewWidgetDataHandler(executor)
	h.WithActivityFeed((*stubActivityFeedExecutor)(nil))

	body := buildActivityFeedRequestBody("ws_01")
	req := httptest.NewRequest(http.MethodPost, "/api/v1/metrics/widget-data", body)
	req.Header.Set("Content-Type", "application/json")
	req = withTestWorkspace(req, "ws_01")
	w := httptest.NewRecorder()
	h.Query(w, req)

	assert.Equal(t, http.StatusNotImplemented, w.Code)
	assertWidgetErrorCode(t, w, "ACTIVITY_FEED_NOT_ENABLED")
}

// TestWidgetDataHandler_MissingClaimsWorkspace_Returns401 verifies that a request
// without JWT claims is rejected 401 for any widget type (P0-1).
func TestWidgetDataHandler_MissingClaimsWorkspace_Returns401(t *testing.T) {
	executor := &stubMetricQueryExecutor{result: sampleResult("pr_count", [][]any{})}
	w := doWidgetRequestNoAuth(t, executor, buildWidgetRequest("kpi_card", "pr_count"))
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assertWidgetErrorCode(t, w, "MISSING_WORKSPACE")
}

// TestWidgetDataHandler_MetricWidget_UsesWorkspaceFromClaims_NotBody verifies that
// the handler passes the JWT claims workspace to the executor, not the body workspace.
func TestWidgetDataHandler_MetricWidget_UsesWorkspaceFromClaims_NotBody(t *testing.T) {
	var capturedQ domain.MetricQuery
	exec := &capturingExecutor{
		inner:    okQueryExecutor(),
		captured: &capturedQ,
	}

	h := handlers.NewWidgetDataHandler(exec)
	body, _ := json.Marshal(map[string]any{
		"widgetType": "kpi_card",
		"query": map[string]any{
			"metricId":    "pr_count",
			"workspaceId": "ws_attacker", // malicious body workspace
			"granularity": "day",
			"start":       "2026-01-01T00:00:00Z",
			"end":         "2026-02-01T00:00:00Z",
		},
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/metrics/widget-data", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	claimsWS := "ws_legitimate"
	ctx := context.WithValue(req.Context(), middleware.ClaimsKey, &auth.Claims{Workspace: claimsWS})
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()
	h.Query(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, claimsWS, capturedQ.WorkspaceID,
		"handler must use workspace from JWT claims, not from body")
	assert.NotEqual(t, "ws_attacker", capturedQ.WorkspaceID)
}

// TestWidgetDataHandler_ActivityFeed_UsesWorkspaceFromClaims_NotBody verifies that
// the activity_feed widget type also uses claims workspace.
func TestWidgetDataHandler_ActivityFeed_UsesWorkspaceFromClaims_NotBody(t *testing.T) {
	var capturedQ domain.ActivityFeedQuery
	stub := &capturingActivityFeedExecutor{captured: &capturedQ}

	h := handlers.NewWidgetDataHandler(&stubMetricQueryExecutor{})
	h.WithActivityFeed(stub)

	body, _ := json.Marshal(map[string]any{
		"widgetType": "activity_feed",
		"query": map[string]any{
			"workspaceId": "ws_attacker", // body workspace — must be ignored
			"start":       "2026-01-01T00:00:00Z",
			"end":         "2026-02-01T00:00:00Z",
		},
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/metrics/widget-data", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	claimsWS := "ws_legitimate"
	ctx := context.WithValue(req.Context(), middleware.ClaimsKey, &auth.Claims{Workspace: claimsWS})
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()
	h.Query(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, claimsWS, capturedQ.WorkspaceID,
		"activity_feed must use workspace from JWT claims, not from body")
}

func TestWidgetDataHandler_MissingWidgetType(t *testing.T) {
	body, _ := json.Marshal(map[string]any{
		"query": map[string]any{"metricId": "pr_count", "start": "2026-01-01T00:00:00Z", "end": "2026-02-01T00:00:00Z"},
	})
	executor := &stubMetricQueryExecutor{}
	w := doWidgetRequest(t, executor, bytes.NewBuffer(body))
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// — helpers for activity_feed tests —

// stubActivityFeedExecutor satisfies biz.ActivityFeedExecutor for handler tests.
type stubActivityFeedExecutor struct {
	result biz.ActivityFeedResult
	err    error
}

func (s *stubActivityFeedExecutor) Execute(_ context.Context, _ domain.ActivityFeedQuery) (biz.ActivityFeedResult, error) {
	return s.result, s.err
}

// capturingActivityFeedExecutor captures the ActivityFeedQuery passed to Execute.
type capturingActivityFeedExecutor struct {
	captured *domain.ActivityFeedQuery
	result   biz.ActivityFeedResult
}

func (c *capturingActivityFeedExecutor) Execute(_ context.Context, q domain.ActivityFeedQuery) (biz.ActivityFeedResult, error) {
	*c.captured = q
	return c.result, nil
}

// buildActivityFeedRequestBody builds a widget-data request body for the activity_feed widget type.
func buildActivityFeedRequestBody(workspaceID string) *bytes.Buffer {
	body := map[string]any{
		"widgetType": "activity_feed",
		"query": map[string]any{
			"workspaceId": workspaceID,
			"start":       "2026-01-01T00:00:00Z",
			"end":         "2026-02-01T00:00:00Z",
		},
	}
	b, _ := json.Marshal(body)
	return bytes.NewBuffer(b)
}

// assertWidgetErrorCode decodes the response and asserts the error code field.
func assertWidgetErrorCode(t *testing.T, w *httptest.ResponseRecorder, code string) {
	t.Helper()
	var resp struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	assert.Equal(t, code, resp.Error.Code)
}
