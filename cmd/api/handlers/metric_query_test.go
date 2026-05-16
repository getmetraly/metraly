// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/handlers"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func buildQueryRequest(body map[string]any) *bytes.Buffer {
	b, _ := json.Marshal(body)
	return bytes.NewBuffer(b)
}

func doQueryRequest(t *testing.T, executor handlers.MetricQueryExecutor, body *bytes.Buffer) *httptest.ResponseRecorder {
	t.Helper()
	h := handlers.NewMetricQueryHandler(executor)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/metrics/query", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.Query(w, req)
	return w
}

func validQueryBody() map[string]any {
	return map[string]any{
		"metricId":    "pr_count",
		"granularity": "day",
		"start":       "2026-01-01T00:00:00Z",
		"end":         "2026-02-01T00:00:00Z",
	}
}

func okQueryExecutor() *stubMetricQueryExecutor {
	v := 5.0
	return &stubMetricQueryExecutor{
		result: domain.MetricQueryResult{
			MetricID:   "pr_count",
			Quality:    domain.DataQualityFull,
			ComputedAt: time.Now().UTC(),
			Data: domain.MetricDataFrame{
				Columns: []string{"bucket", "value", "count"},
				Rows:    [][]any{{"2026-01-15T00:00:00Z", v, int64(5)}},
			},
		},
	}
}

func TestMetricQueryHandler_Success(t *testing.T) {
	w := doQueryRequest(t, okQueryExecutor(), buildQueryRequest(validQueryBody()))
	require.Equal(t, http.StatusOK, w.Code)

	var resp map[string]any
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	assert.Equal(t, "pr_count", resp["metricId"])
	assert.Equal(t, "full", resp["quality"])
}

func TestMetricQueryHandler_GranularityDefault(t *testing.T) {
	// When granularity is omitted it must default to "day".
	body := validQueryBody()
	delete(body, "granularity")

	var capturedQ domain.MetricQuery
	exec := &capturingExecutor{
		inner:    &stubMetricQueryExecutor{result: domain.MetricQueryResult{Quality: domain.DataQualityEmpty}},
		captured: &capturedQ,
	}
	w := doQueryRequest(t, exec, buildQueryRequest(body))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "day", capturedQ.Granularity)
}

func TestMetricQueryHandler_InvalidJSON(t *testing.T) {
	w := doQueryRequest(t, okQueryExecutor(), bytes.NewBufferString("{bad json"))
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assertErrorCode(t, w, "INVALID_JSON")
}

func TestMetricQueryHandler_MissingMetricID(t *testing.T) {
	body := validQueryBody()
	delete(body, "metricId")
	w := doQueryRequest(t, okQueryExecutor(), buildQueryRequest(body))
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assertErrorCode(t, w, "MISSING_METRIC_ID")
}

func TestMetricQueryHandler_MissingStart(t *testing.T) {
	body := validQueryBody()
	delete(body, "start")
	w := doQueryRequest(t, okQueryExecutor(), buildQueryRequest(body))
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assertErrorCode(t, w, "MISSING_TIME_RANGE")
}

func TestMetricQueryHandler_MissingEnd(t *testing.T) {
	body := validQueryBody()
	delete(body, "end")
	w := doQueryRequest(t, okQueryExecutor(), buildQueryRequest(body))
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assertErrorCode(t, w, "MISSING_TIME_RANGE")
}

func TestMetricQueryHandler_InvalidStart(t *testing.T) {
	body := validQueryBody()
	body["start"] = "2026-01-01" // date-only is not RFC3339
	w := doQueryRequest(t, okQueryExecutor(), buildQueryRequest(body))
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assertErrorCode(t, w, "INVALID_START")
}

func TestMetricQueryHandler_InvalidEnd(t *testing.T) {
	body := validQueryBody()
	body["end"] = "not-a-timestamp"
	w := doQueryRequest(t, okQueryExecutor(), buildQueryRequest(body))
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assertErrorCode(t, w, "INVALID_END")
}

func TestMetricQueryHandler_EndBeforeStart(t *testing.T) {
	body := validQueryBody()
	body["start"] = "2026-02-01T00:00:00Z"
	body["end"] = "2026-01-01T00:00:00Z"
	w := doQueryRequest(t, okQueryExecutor(), buildQueryRequest(body))
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assertErrorCode(t, w, "INVALID_TIME_RANGE")
}

func TestMetricQueryHandler_InvalidGranularity(t *testing.T) {
	body := validQueryBody()
	body["granularity"] = "hour"
	w := doQueryRequest(t, okQueryExecutor(), buildQueryRequest(body))
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assertErrorCode(t, w, "INVALID_GRANULARITY")
}

func TestMetricQueryHandler_MetricNotFound(t *testing.T) {
	exec := &stubMetricQueryExecutor{err: biz.ErrMetricNotFound}
	w := doQueryRequest(t, exec, buildQueryRequest(validQueryBody()))
	assert.Equal(t, http.StatusNotFound, w.Code)
	assertErrorCode(t, w, "METRIC_NOT_FOUND")
}

func TestMetricQueryHandler_InternalError(t *testing.T) {
	exec := &stubMetricQueryExecutor{err: errors.New("db unavailable")}
	w := doQueryRequest(t, exec, buildQueryRequest(validQueryBody()))
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assertErrorCode(t, w, "QUERY_FAILED")
}

// assertErrorCode decodes the response body and asserts the "code" field.
// respond.Error wraps errors as {"error":{"code":"...","message":"..."}}.
func assertErrorCode(t *testing.T, w *httptest.ResponseRecorder, code string) {
	t.Helper()
	var resp struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	assert.Equal(t, code, resp.Error.Code)
}

// capturingExecutor wraps a stub and captures the MetricQuery passed to Execute.
type capturingExecutor struct {
	inner    *stubMetricQueryExecutor
	captured *domain.MetricQuery
}

func (c *capturingExecutor) Execute(_ context.Context, q domain.MetricQuery) (domain.MetricQueryResult, error) {
	*c.captured = q
	return c.inner.result, c.inner.err
}
