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

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/handlers"
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

func doWidgetRequest(t *testing.T, executor handlers.MetricQueryExecutor, body *bytes.Buffer) *httptest.ResponseRecorder {
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

	w := doWidgetRequest(t, executor, buildWidgetRequest("activity_feed", "pr_count"))
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestWidgetDataHandler_MissingWidgetType(t *testing.T) {
	body, _ := json.Marshal(map[string]any{
		"query": map[string]any{"metricId": "pr_count", "start": "2026-01-01T00:00:00Z", "end": "2026-02-01T00:00:00Z"},
	})
	executor := &stubMetricQueryExecutor{}
	w := doWidgetRequest(t, executor, bytes.NewBuffer(body))
	assert.Equal(t, http.StatusBadRequest, w.Code)
}
