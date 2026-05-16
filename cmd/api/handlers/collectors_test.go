// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/handlers"
	"github.com/getmetraly/metraly/cmd/api/repo"
	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// — fakes —

type fakeCollectorRunRepo struct {
	runs map[string]*domain.CollectorRun
}

func newFakeCollectorRunRepo() *fakeCollectorRunRepo {
	return &fakeCollectorRunRepo{runs: map[string]*domain.CollectorRun{}}
}

func (f *fakeCollectorRunRepo) CreateCollectorRun(_ context.Context, run *domain.CollectorRun) error {
	f.runs[run.ID] = run
	return nil
}

func (f *fakeCollectorRunRepo) UpdateCollectorRun(_ context.Context, run *domain.CollectorRun) error {
	f.runs[run.ID] = run
	return nil
}

func (f *fakeCollectorRunRepo) GetCollectorRun(_ context.Context, id string) (*domain.CollectorRun, error) {
	r, ok := f.runs[id]
	if !ok {
		return nil, repo.ErrNotFound
	}
	return r, nil
}

func (f *fakeCollectorRunRepo) ListCollectorRuns(_ context.Context, sourceConnectionID string, limit int) ([]*domain.CollectorRun, error) {
	var result []*domain.CollectorRun
	for _, r := range f.runs {
		if r.SourceConnectionID == sourceConnectionID {
			result = append(result, r)
		}
		if len(result) >= limit {
			break
		}
	}
	return result, nil
}

// buildCollectorSvc builds a real CollectorSvc backed by fake repos.
// sourceID: if non-empty, that source is pre-seeded in the fake source repo.
// withCollector: if true, a no-op collector is registered for the source type.
func buildCollectorSvc(
	sourceID string, sourceType domain.SourceType, withCollector bool,
) (*biz.CollectorSvc, *fakeCollectorRunRepo, *fakeSourceRepoForHandler) {
	runRepo := newFakeCollectorRunRepo()
	srcRepo := &fakeSourceRepoForHandler{
		sources: map[string]any{},
		creds:   map[string]any{},
		secrets: map[string]string{},
	}
	if sourceID != "" {
		srcRepo.sources[sourceID] = &domain.SourceConnection{
			ID:          sourceID,
			WorkspaceID: "default",
			SourceType:  sourceType,
			DisplayName: "Test Source",
			Status:      domain.SourceStatusReady,
		}
	}
	key := biz.DeriveKey("test-collector-handler-key")
	svc, _ := biz.NewSourceSvc(srcRepo, key, biz.NewAdapterRegistry())
	collectorSvc := biz.NewCollectorSvc(svc, srcRepo, runRepo, &fakeEventRepo{})
	if withCollector {
		collectorSvc.RegisterCollector(&noopCollector{sourceType: sourceType})
	}
	return collectorSvc, runRepo, srcRepo
}

// fakeEventRepo satisfies biz.RawEventIngestRepo.
type fakeEventRepo struct{}

func (f *fakeEventRepo) InsertRawSourceEventsBatch(_ context.Context, _ []*domain.RawSourceEvent) (int, error) {
	return 0, nil
}

// noopCollector is a do-nothing collector for tests.
type noopCollector struct{ sourceType domain.SourceType }

func (c *noopCollector) SourceType() domain.SourceType { return c.sourceType }
func (c *noopCollector) Collect(_ context.Context, _ domain.SourceConnection, _, _ string) (*biz.CollectResult, error) {
	return &biz.CollectResult{
		Events:         nil,
		NextCursor:     "",
		RateLimitState: domain.RateLimitStateOK,
	}, nil
}

// chiRouter wraps a handler with a chi router so URL params work.
func chiRouterWithCollector(h *handlers.CollectorHandler) http.Handler {
	r := chi.NewRouter()
	r.Post("/api/v1/sources/{id}/collect", h.Trigger)
	r.Get("/api/v1/sources/{id}/collector-runs", h.ListRuns)
	r.Get("/api/v1/collector-runs/{id}", h.GetRun)
	return r
}

// — tests —

func TestCollectorHandler_Trigger_HappyPath(t *testing.T) {
	svc, runRepo, _ := buildCollectorSvc("src-1", domain.SourceTypeGitHub, true)
	h := handlers.NewCollectorHandler(svc, runRepo)
	router := chiRouterWithCollector(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/sources/src-1/collect", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusAccepted, rec.Code)
	var run domain.CollectorRun
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&run))
	assert.Equal(t, "src-1", run.SourceConnectionID)
	assert.Equal(t, domain.CollectorRunStatusSucceeded, run.Status)
}

func TestCollectorHandler_Trigger_SourceNotFound(t *testing.T) {
	svc, runRepo, _ := buildCollectorSvc("", domain.SourceTypeGitHub, true)
	h := handlers.NewCollectorHandler(svc, runRepo)
	router := chiRouterWithCollector(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/sources/does-not-exist/collect", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusNotFound, rec.Code)
}

func TestCollectorHandler_Trigger_NoCollectorRegistered(t *testing.T) {
	svc, runRepo, _ := buildCollectorSvc("src-2", domain.SourceTypeGitHub, false)
	h := handlers.NewCollectorHandler(svc, runRepo)
	router := chiRouterWithCollector(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/sources/src-2/collect", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
	var body map[string]any
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&body))
	errObj, _ := body["error"].(map[string]any)
	assert.Equal(t, "no_collector_registered", errObj["code"])
}

func TestCollectorHandler_ListRuns_Default(t *testing.T) {
	svc, runRepo, _ := buildCollectorSvc("src-3", domain.SourceTypeGitHub, true)
	// Seed a run directly into the run repo.
	now := time.Now().UTC()
	runRepo.runs["run-a"] = &domain.CollectorRun{
		ID:                 "run-a",
		SourceConnectionID: "src-3",
		Status:             domain.CollectorRunStatusSucceeded,
		StartedAt:          now,
		RateLimitState:     domain.RateLimitStateOK,
	}

	h := handlers.NewCollectorHandler(svc, runRepo)
	router := chiRouterWithCollector(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/sources/src-3/collector-runs", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	var body map[string]any
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&body))
	runs, ok := body["runs"].([]any)
	require.True(t, ok)
	assert.Len(t, runs, 1)
}

func TestCollectorHandler_ListRuns_MaxLimit(t *testing.T) {
	svc, runRepo, _ := buildCollectorSvc("src-4", domain.SourceTypeGitHub, false)
	h := handlers.NewCollectorHandler(svc, runRepo)
	router := chiRouterWithCollector(h)

	// Request a limit over 100 — should be clamped.
	req := httptest.NewRequest(http.MethodGet, "/api/v1/sources/src-4/collector-runs?limit=9999", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	// The handler should respond 200 with an empty list (no runs seeded).
	assert.Equal(t, http.StatusOK, rec.Code)
	var body map[string]any
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&body))
	_, ok := body["runs"]
	assert.True(t, ok, "response must contain 'runs' key")
}

func TestCollectorHandler_GetRun_HappyPath(t *testing.T) {
	svc, runRepo, _ := buildCollectorSvc("src-5", domain.SourceTypeGitHub, false)
	now := time.Now().UTC()
	runRepo.runs["run-x"] = &domain.CollectorRun{
		ID:                 "run-x",
		SourceConnectionID: "src-5",
		Status:             domain.CollectorRunStatusSucceeded,
		StartedAt:          now,
		RateLimitState:     domain.RateLimitStateOK,
	}

	h := handlers.NewCollectorHandler(svc, runRepo)
	router := chiRouterWithCollector(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/collector-runs/run-x", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	var run domain.CollectorRun
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&run))
	assert.Equal(t, "run-x", run.ID)
}

func TestCollectorHandler_GetRun_NotFound(t *testing.T) {
	svc, runRepo, _ := buildCollectorSvc("", domain.SourceTypeGitHub, false)
	h := handlers.NewCollectorHandler(svc, runRepo)
	router := chiRouterWithCollector(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/collector-runs/does-not-exist", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusNotFound, rec.Code)
}

func TestCollectorHandler_Trigger_ResponseNeverContainsSecret(t *testing.T) {
	svc, runRepo, _ := buildCollectorSvc("src-6", domain.SourceTypeGitHub, true)
	h := handlers.NewCollectorHandler(svc, runRepo)
	router := chiRouterWithCollector(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/sources/src-6/collect", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	body := rec.Body.String()
	assert.False(t, strings.Contains(strings.ToLower(body), "secret"), "response must not contain 'secret'")
	assert.False(t, strings.Contains(strings.ToLower(body), "token"), "response must not contain 'token'")
	assert.False(t, strings.Contains(strings.ToLower(body), "password"), "response must not contain 'password'")
}
