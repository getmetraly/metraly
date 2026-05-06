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

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockIngestionService struct {
	mock.Mock
}

func (m *mockIngestionService) Ingest(ctx context.Context, req domain.IngestionRequest) (*domain.IngestionResult, error) {
	args := m.Called(ctx, req)
	if res, ok := args.Get(0).(*domain.IngestionResult); ok {
		return res, args.Error(1)
	}
	return nil, args.Error(1)
}

func TestIngestionHandler_ServiceUnavailable(t *testing.T) {
	handler := NewIngestionHandler(nil)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/v1/ingest/github", bytes.NewBufferString(`{"source":"github","eventType":"pull_request","team":"Atlas"}`))

	handler.GitHub(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
}

func TestIngestionHandler_GitHub(t *testing.T) {
	svc := new(mockIngestionService)
	svc.On("Ingest", mock.Anything, domain.IngestionRequest{
		Source:    "github",
		EventType: "pull_request",
		Team:      "Atlas",
	}).Return(&domain.IngestionResult{
		Source:       "github",
		EventType:    "pull_request",
		Team:         "Atlas",
		ActivityID:   "activity-1",
		ActivityType: "review",
		MetricID:     "pr-cycle",
		MetricValue:  1,
	}, nil)

	handler := NewIngestionHandler(svc)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/v1/ingest/github", bytes.NewBufferString(`{"source":"github","eventType":"pull_request","team":"Atlas"}`))

	handler.GitHub(w, req)

	assert.Equal(t, http.StatusAccepted, w.Code)
	var resp domain.IngestionResult
	err := json.NewDecoder(w.Body).Decode(&resp)
	assert.NoError(t, err)
	assert.Equal(t, "github", resp.Source)
	assert.Equal(t, "pr-cycle", resp.MetricID)
	svc.AssertExpectations(t)
}

func TestIngestionHandler_InvalidJSON(t *testing.T) {
	handler := NewIngestionHandler(nil)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/v1/ingest/github", bytes.NewBufferString(`{`))

	handler.GitHub(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}
