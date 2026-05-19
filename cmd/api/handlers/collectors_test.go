// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers_test

import (
	"context"
	"encoding/json"
	"fmt"
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

// GetActiveRunForSource returns ErrNotFound (no active run guard needed in most handler tests).
func (f *fakeCollectorRunRepo) GetActiveRunForSource(_ context.Context, sourceConnectionID string) (string, error) {
	for _, r := range f.runs {
		if r.SourceConnectionID == sourceConnectionID &&
			(r.Status == domain.CollectorRunStatusStarted || r.Status == domain.CollectorRunStatusRunning) {
			return r.ID, nil
		}
	}
	return "", repo.ErrNotFound
}

// buildCollectorSvc builds a real CollectorSvc backed by fake repos.
// sourceID: if non-empty, that source is pre-seeded in the fake source repo under testWorkspace.
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
			WorkspaceID: testWorkspace,
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

func (f *fakeEventRepo) InsertRawSourceEventsBatchWithOutcomes(_ context.Context, _ []*domain.RawSourceEvent) ([]domain.RawEventInsertOutcome, error) {
	return nil, nil
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

func TestCollectorHandler_NoWorkspace_Returns401(t *testing.T) {
	svc, runRepo, _ := buildCollectorSvc("src-1", domain.SourceTypeGitHub, true)
	h := handlers.NewCollectorHandler(svc, runRepo)
	router := chiRouterWithCollector(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/sources/src-1/collect", nil)
	// No workspace in context → must return 401.
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestCollectorHandler_Trigger_HappyPath(t *testing.T) {
	svc, runRepo, _ := buildCollectorSvc("src-1", domain.SourceTypeGitHub, true)
	h := handlers.NewCollectorHandler(svc, runRepo)
	router := chiRouterWithCollector(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/sources/src-1/collect", nil)
	req = withTestWorkspace(req, testWorkspace)
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
	req = withTestWorkspace(req, testWorkspace)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusNotFound, rec.Code)
}

func TestCollectorHandler_Trigger_NoCollectorRegistered(t *testing.T) {
	svc, runRepo, _ := buildCollectorSvc("src-2", domain.SourceTypeGitHub, false)
	h := handlers.NewCollectorHandler(svc, runRepo)
	router := chiRouterWithCollector(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/sources/src-2/collect", nil)
	req = withTestWorkspace(req, testWorkspace)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
	var body map[string]any
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&body))
	errObj, _ := body["error"].(map[string]any)
	assert.Equal(t, "NO_COLLECTOR_REGISTERED", errObj["code"])
}

func TestCollectorHandler_Trigger_RunInFlight_Returns409(t *testing.T) {
	svc, runRepo, _ := buildCollectorSvc("src-inf", domain.SourceTypeGitHub, true)
	h := handlers.NewCollectorHandler(svc, runRepo)
	router := chiRouterWithCollector(h)

	// Seed an in-flight run for the source.
	runRepo.runs["run-existing"] = &domain.CollectorRun{
		ID:                 "run-existing",
		SourceConnectionID: "src-inf",
		Status:             domain.CollectorRunStatusRunning,
		StartedAt:          time.Now().UTC(),
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/sources/src-inf/collect", nil)
	req = withTestWorkspace(req, testWorkspace)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusConflict, rec.Code)
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

	// Seed 101 runs with the target source ID so clamping must actually fire.
	now := time.Now().UTC()
	for i := range 101 {
		id := fmt.Sprintf("run-max-%d", i)
		runRepo.runs[id] = &domain.CollectorRun{
			ID:                 id,
			SourceConnectionID: "src-4",
			Status:             domain.CollectorRunStatusSucceeded,
			StartedAt:          now,
			RateLimitState:     domain.RateLimitStateOK,
		}
	}

	h := handlers.NewCollectorHandler(svc, runRepo)
	router := chiRouterWithCollector(h)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/sources/src-4/collector-runs?limit=9999", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	var body map[string]any
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&body))
	runs, ok := body["runs"].([]any)
	require.True(t, ok, "response must contain 'runs' key")
	assert.Len(t, runs, 100, "handler must clamp limit to 100")
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
	req = withTestWorkspace(req, testWorkspace)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	body := rec.Body.String()
	assert.False(t, strings.Contains(strings.ToLower(body), "secret"), "response must not contain 'secret'")
	assert.False(t, strings.Contains(strings.ToLower(body), "token"), "response must not contain 'token'")
	assert.False(t, strings.Contains(strings.ToLower(body), "password"), "response must not contain 'password'")
}
