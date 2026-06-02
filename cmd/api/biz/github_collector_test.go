// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// — helpers —

func ghTestSource(org string) domain.SourceConnection {
	return domain.SourceConnection{
		ID:          "src_01",
		WorkspaceID: "ws_01",
		SourceType:  domain.SourceTypeGitHub,
		Config:      map[string]string{"org": org},
	}
}

func ghActionsTestSource(org string) domain.SourceConnection {
	return domain.SourceConnection{
		ID:          "src_acts_01",
		WorkspaceID: "ws_01",
		SourceType:  domain.SourceTypeGitHubActions,
		Config:      map[string]string{"org": org},
	}
}

// newGHTestServer creates a fake GitHub API server for testing.
// It serves a minimal set of endpoints:
//
//	GET /orgs/{org}/repos        → single repo list
//	GET /repos/{org}/{repo}/pulls → PR list (with optional pagination)
//	GET /repos/{org}/{repo}/actions/runs → workflow run list
func newGHTestServer(t *testing.T, org string, prs []map[string]any, runs []map[string]any) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-RateLimit-Remaining", "5000")

		switch {
		case strings.HasSuffix(r.URL.Path, "/orgs/"+org+"/repos") ||
			strings.Contains(r.URL.Path, "/orgs/"+org+"/repos"):
			// Return a single repo.
			repos := []map[string]any{
				{"id": 999, "name": "testrepo", "full_name": org + "/testrepo"},
			}
			json.NewEncoder(w).Encode(repos)

		case strings.Contains(r.URL.Path, "/pulls"):
			json.NewEncoder(w).Encode(prs)

		case strings.Contains(r.URL.Path, "/actions/runs"):
			resp := map[string]any{
				"total_count":   len(runs),
				"workflow_runs": runs,
			}
			json.NewEncoder(w).Encode(resp)

		default:
			http.NotFound(w, r)
		}
	}))
	return srv
}

// collectorWithServer creates a GitHubCollector pointing at the given test server.
func collectorWithServer(srv *httptest.Server) *biz.GitHubCollector {
	// Override the base URL via the package-level var: we patch the client to
	// redirect all requests to the test server by overriding the host in the URL.
	// Since githubAPIBase is used as a const, we instead inject a custom transport.
	transport := &rewriteTransport{target: srv.URL}
	client := &http.Client{Transport: transport, Timeout: 5 * time.Second}
	return biz.NewGitHubCollector(client)
}

func actionsCollectorWithServer(srv *httptest.Server) *biz.GitHubActionsCollector {
	transport := &rewriteTransport{target: srv.URL}
	client := &http.Client{Transport: transport, Timeout: 5 * time.Second}
	return biz.NewGitHubActionsCollector(client)
}

// rewriteTransport rewrites requests to a given target base URL, preserving path and query.
type rewriteTransport struct {
	target string
}

func (rt *rewriteTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	cloned := req.Clone(req.Context())
	cloned.URL.Scheme = "http"
	cloned.URL.Host = strings.TrimPrefix(rt.target, "http://")
	return http.DefaultTransport.RoundTrip(cloned)
}

// — GitHub PR Collector tests —

func TestGitHubCollector_CollectsOpenedAndMergedEvents(t *testing.T) {
	mergedAt := "2026-01-15T12:00:00Z"
	prs := []map[string]any{
		{
			"id":         1001,
			"number":     42,
			"state":      "closed",
			"merged":     true,
			"user":       map[string]any{"login": "alice"},
			"created_at": "2026-01-01T09:00:00Z",
			"updated_at": "2026-01-15T12:00:00Z",
			"merged_at":  mergedAt,
			"closed_at":  mergedAt,
			"base":       map[string]any{"repo": map[string]any{"id": 555, "name": "testrepo"}},
		},
	}

	srv := newGHTestServer(t, "acme", prs, nil)
	defer srv.Close()

	col := collectorWithServer(srv)
	result, err := col.Collect(context.Background(), ghTestSource("acme"), "ghp_faketoken", "")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, domain.RateLimitStateOK, result.RateLimitState)

	// Expect: pull_request.opened + pull_request.merged
	require.Len(t, result.Events, 2)
	types := map[string]bool{}
	for _, ev := range result.Events {
		types[ev.EventType] = true
	}
	assert.True(t, types["pull_request.opened"], "must emit pull_request.opened")
	assert.True(t, types["pull_request.merged"], "must emit pull_request.merged")
}

func TestGitHubCollector_CollectsClosedWithoutMerge(t *testing.T) {
	closedAt := "2026-01-10T10:00:00Z"
	prs := []map[string]any{
		{
			"id":         1002,
			"number":     43,
			"state":      "closed",
			"merged":     false,
			"user":       map[string]any{"login": "bob"},
			"created_at": "2026-01-08T09:00:00Z",
			"updated_at": closedAt,
			"merged_at":  nil,
			"closed_at":  closedAt,
			"base":       map[string]any{"repo": map[string]any{"id": 555, "name": "testrepo"}},
		},
	}

	srv := newGHTestServer(t, "acme", prs, nil)
	defer srv.Close()

	col := collectorWithServer(srv)
	result, err := col.Collect(context.Background(), ghTestSource("acme"), "ghp_faketoken", "")
	require.NoError(t, err)

	types := map[string]bool{}
	for _, ev := range result.Events {
		types[ev.EventType] = true
	}
	assert.True(t, types["pull_request.opened"], "must emit pull_request.opened")
	assert.True(t, types["pull_request.closed"], "must emit pull_request.closed")
	assert.False(t, types["pull_request.merged"], "must NOT emit pull_request.merged for non-merged PR")
}

func TestGitHubCollector_ComputesCycleTimeSeconds(t *testing.T) {
	// Created 10 days before merged: 10 * 24 * 3600 = 864000 seconds.
	createdAt := "2026-01-01T00:00:00Z"
	mergedAt := "2026-01-11T00:00:00Z"
	prs := []map[string]any{
		{
			"id":         1003,
			"number":     44,
			"state":      "closed",
			"merged":     true,
			"user":       map[string]any{"login": "carol"},
			"created_at": createdAt,
			"updated_at": mergedAt,
			"merged_at":  mergedAt,
			"closed_at":  mergedAt,
			"base":       map[string]any{"repo": map[string]any{"id": 555, "name": "testrepo"}},
		},
	}

	srv := newGHTestServer(t, "acme", prs, nil)
	defer srv.Close()

	col := collectorWithServer(srv)
	result, err := col.Collect(context.Background(), ghTestSource("acme"), "ghp_faketoken", "")
	require.NoError(t, err)

	var mergedEv *domain.RawSourceEvent
	for _, ev := range result.Events {
		if ev.EventType == "pull_request.merged" {
			mergedEv = ev
			break
		}
	}
	require.NotNil(t, mergedEv, "merged event must be present")
	ct, ok := mergedEv.Payload["cycle_time_seconds"]
	require.True(t, ok, "cycle_time_seconds must be in payload")
	assert.Equal(t, int64(10*24*3600), ct)
}

func TestGitHubCollector_NoForbiddenFields(t *testing.T) {
	prs := []map[string]any{
		{
			"id":         1004,
			"number":     45,
			"state":      "closed",
			"merged":     true,
			"user":       map[string]any{"login": "dave"},
			"title":      "Secret PR title that must not be stored",
			"body":       "Sensitive description that must not appear",
			"created_at": "2026-01-01T00:00:00Z",
			"updated_at": "2026-01-05T00:00:00Z",
			"merged_at":  "2026-01-05T00:00:00Z",
			"closed_at":  "2026-01-05T00:00:00Z",
			"base":       map[string]any{"repo": map[string]any{"id": 555, "name": "testrepo"}},
		},
	}

	srv := newGHTestServer(t, "acme", prs, nil)
	defer srv.Close()

	col := collectorWithServer(srv)
	result, err := col.Collect(context.Background(), ghTestSource("acme"), "ghp_faketoken", "")
	require.NoError(t, err)

	for _, ev := range result.Events {
		payloadJSON, _ := json.Marshal(ev.Payload)
		s := string(payloadJSON)
		assert.NotContains(t, s, "title", "title must NOT appear in payload")
		assert.NotContains(t, s, "body", "body must NOT appear in payload")
		assert.NotContains(t, s, "Secret PR title", "PR title must NOT appear in payload")
		assert.NotContains(t, s, "Sensitive description", "PR body must NOT appear in payload")
	}
}

func TestGitHubCollector_401_ReturnsAuthError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"message":"Bad credentials"}`))
	}))
	defer srv.Close()

	col := collectorWithServer(srv)
	_, err := col.Collect(context.Background(), ghTestSource("acme"), "ghp_bad", "")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "auth error")
	// Verify the secret does not appear in the error.
	assert.NotContains(t, err.Error(), "ghp_bad")
}

func TestGitHubCollector_403_ReturnsPermissionError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"message":"Forbidden"}`))
	}))
	defer srv.Close()

	col := collectorWithServer(srv)
	_, err := col.Collect(context.Background(), ghTestSource("acme"), "ghp_ok", "")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "permission error")
}

func TestGitHubCollector_RateLimit_Returns429(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-RateLimit-Remaining", "0")
		w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(60*time.Second).Unix(), 10))
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"message":"API rate limit exceeded"}`))
	}))
	defer srv.Close()

	col := collectorWithServer(srv)
	result, err := col.Collect(context.Background(), ghTestSource("acme"), "ghp_ok", "")
	require.NoError(t, err, "rate limit should not be an error — it returns a result with retry-after")
	assert.Equal(t, domain.RateLimitStateThrottled, result.RateLimitState)
	assert.NotNil(t, result.RetryAfter)
}

func TestGitHubCollector_RetryAfterHeader(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Retry-After", "120")
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	col := collectorWithServer(srv)
	result, err := col.Collect(context.Background(), ghTestSource("acme"), "ghp_ok", "")
	require.NoError(t, err)
	assert.Equal(t, domain.RateLimitStateThrottled, result.RateLimitState)
	require.NotNil(t, result.RetryAfter)
	// RetryAfter must be roughly 120 seconds from now (allow ±5 s for test timing).
	diff := result.RetryAfter.Sub(time.Now())
	assert.Greater(t, diff.Seconds(), 115.0)
	assert.Less(t, diff.Seconds(), 125.0)
}

func TestGitHubCollector_Pagination(t *testing.T) {
	callCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-RateLimit-Remaining", "5000")

		if strings.Contains(r.URL.Path, "/orgs/") && strings.Contains(r.URL.Path, "/repos") {
			json.NewEncoder(w).Encode([]map[string]any{
				{"id": 1, "name": "repo1", "full_name": "org/repo1"},
			})
			return
		}

		if strings.Contains(r.URL.Path, "/pulls") {
			callCount++
			page := r.URL.Query().Get("page")
			if page == "" || page == "1" {
				// First page: return exactly githubPerPage (100) PRs so the collector
				// does NOT break early on "less than per_page" and checks the Link header.
				w.Header().Set("Link", `<http://placeholder/pulls?page=2>; rel="next"`)
				prs := make([]map[string]any, 100)
				for i := range prs {
					id := 3000 + i
					prs[i] = map[string]any{
						"id":         id,
						"number":     id,
						"state":      "open",
						"merged":     false,
						"user":       map[string]any{"login": "x"},
						"created_at": "2026-01-01T00:00:00Z",
						"updated_at": "2026-01-01T00:00:00Z",
						"merged_at":  nil,
						"closed_at":  nil,
						"base":       map[string]any{"repo": map[string]any{"id": 1, "name": "repo1"}},
					}
				}
				json.NewEncoder(w).Encode(prs)
			} else {
				// Second page: empty — collector stops.
				json.NewEncoder(w).Encode([]map[string]any{})
			}
		}
	}))
	defer srv.Close()

	col := collectorWithServer(srv)
	result, err := col.Collect(context.Background(), ghTestSource("org"), "ghp_tok", "")
	require.NoError(t, err)
	// Pagination was followed: at least 2 PR-page requests.
	assert.GreaterOrEqual(t, callCount, 2, "collector must follow Link: rel=next pagination")
	// 100 PRs × 1 event each (opened only, state=open so no merged/closed).
	assert.Len(t, result.Events, 100)
}

func TestGitHubCollector_MissingOrg_ReturnsError(t *testing.T) {
	col := biz.NewGitHubCollector(nil)
	src := domain.SourceConnection{ID: "x", Config: map[string]string{}}
	_, err := col.Collect(context.Background(), src, "ghp_tok", "")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "'org'")
}

func TestGitHubCollector_MalformedCursor_FallsBackToFullCollect(t *testing.T) {
	// A malformed cursor must not crash; the collector falls back to full collection.
	srv := newGHTestServer(t, "myorg", []map[string]any{
		{"id": 1, "number": 7, "state": "open", "merged": false,
			"user":       map[string]any{"login": "bob"},
			"created_at": "2026-01-10T00:00:00Z",
			"updated_at": "2026-01-10T00:00:00Z"},
	}, nil)
	defer srv.Close()
	col := collectorWithServer(srv)

	result, err := col.Collect(context.Background(), ghTestSource("myorg"), "tok", "NOT-A-TIMESTAMP")
	require.NoError(t, err, "malformed cursor must not cause an error")
	require.NotNil(t, result)
	// Full collection must have occurred (at least the one open PR).
	assert.NotEmpty(t, result.Events, "malformed cursor must trigger full collection")
	assert.Equal(t, 0, result.SkippedRepos, "no repos should be skipped when server is healthy")
}

func TestGitHubCollector_SkippedRepos_OnPerRepoError(t *testing.T) {
	// When a per-repo request returns an error the collector must:
	//  1. not return a top-level error,
	//  2. increment SkippedRepos,
	//  3. still return events from healthy repos (none here since server returns 500).
	callCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		// Repo listing returns one repo.
		if r.URL.Path == "/orgs/errorg/repos" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`[{"id":1,"name":"repo1","full_name":"errorg/repo1"}]`))
			return
		}
		// All PR requests fail with a server error.
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	col := collectorWithServer(srv)
	result, err := col.Collect(context.Background(), ghTestSource("errorg"), "tok", "")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, 1, result.SkippedRepos, "the single failing repo must be counted")
	assert.Empty(t, result.Events, "no events from a fully failing repo")
}

// — GitHub Actions Collector tests —

func TestGitHubActionsCollector_CollectsStartedAndCompletedEvents(t *testing.T) {
	startedAt := "2026-01-15T10:00:00Z"
	completedAt := "2026-01-15T10:05:00Z"
	conclusion := "success"
	runs := []map[string]any{
		{
			"id":             5001,
			"workflow_id":    100,
			"status":         "completed",
			"conclusion":     conclusion,
			"created_at":     startedAt,
			"updated_at":     completedAt,
			"run_started_at": startedAt,
			"head_branch":    "main",
			"repository":     map[string]any{"id": 777},
		},
	}

	srv := newGHTestServer(t, "acme", nil, runs)
	defer srv.Close()

	col := actionsCollectorWithServer(srv)
	result, err := col.Collect(context.Background(), ghActionsTestSource("acme"), "ghp_tok", "")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, domain.RateLimitStateOK, result.RateLimitState)

	// Expect: workflow_run.started + workflow_run.completed
	require.Len(t, result.Events, 2)
	types := map[string]bool{}
	for _, ev := range result.Events {
		types[ev.EventType] = true
	}
	assert.True(t, types["workflow_run.started"], "must emit workflow_run.started")
	assert.True(t, types["workflow_run.completed"], "must emit workflow_run.completed")
}

func TestGitHubActionsCollector_InProgressRun_OnlyStartedEvent(t *testing.T) {
	runs := []map[string]any{
		{
			"id":          6001,
			"workflow_id": 200,
			"status":      "in_progress",
			"conclusion":  nil,
			"created_at":  "2026-01-20T08:00:00Z",
			"updated_at":  "2026-01-20T08:01:00Z",
			"repository":  map[string]any{"id": 888},
		},
	}

	srv := newGHTestServer(t, "acme", nil, runs)
	defer srv.Close()

	col := actionsCollectorWithServer(srv)
	result, err := col.Collect(context.Background(), ghActionsTestSource("acme"), "ghp_tok", "")
	require.NoError(t, err)

	types := map[string]bool{}
	for _, ev := range result.Events {
		types[ev.EventType] = true
	}
	assert.True(t, types["workflow_run.started"], "must emit workflow_run.started for in-progress run")
	assert.False(t, types["workflow_run.completed"], "must NOT emit workflow_run.completed for in-progress run")
}

func TestGitHubActionsCollector_ConclusionMapping(t *testing.T) {
	cases := []struct {
		rawConclusion  string
		wantConclusion string
	}{
		{"success", "success"},
		{"failure", "failure"},
		{"cancelled", "cancelled"},
		{"timed_out", "failure"}, // mapped to failure by normalizeConclusion
		{"action_required", "failure"},
		{"neutral", "unknown"}, // P1-9: neutral is informational, not a failure
		{"skipped", "unknown"},
	}

	for _, tc := range cases {
		t.Run(tc.rawConclusion, func(t *testing.T) {
			conclusion := tc.rawConclusion
			runs := []map[string]any{
				{
					"id":          7000,
					"workflow_id": 300,
					"status":      "completed",
					"conclusion":  conclusion,
					"created_at":  "2026-01-01T00:00:00Z",
					"updated_at":  "2026-01-01T01:00:00Z",
					"repository":  map[string]any{"id": 999},
				},
			}

			srv := newGHTestServer(t, "org", nil, runs)
			defer srv.Close()

			col := actionsCollectorWithServer(srv)
			result, err := col.Collect(context.Background(), ghActionsTestSource("org"), "ghp_tok", "")
			require.NoError(t, err)

			var completedEv *domain.RawSourceEvent
			for _, ev := range result.Events {
				if ev.EventType == "workflow_run.completed" {
					completedEv = ev
					break
				}
			}
			require.NotNil(t, completedEv, "completed event must be present")
			got, _ := completedEv.Payload["conclusion"].(string)
			assert.Equal(t, tc.wantConclusion, got)
		})
	}
}

func TestGitHubActionsCollector_ComputesDurationSeconds(t *testing.T) {
	// 5 minutes = 300 seconds.
	startedAt := "2026-01-15T10:00:00Z"
	completedAt := "2026-01-15T10:05:00Z"
	conclusion := "success"
	runs := []map[string]any{
		{
			"id":             8001,
			"workflow_id":    400,
			"status":         "completed",
			"conclusion":     conclusion,
			"created_at":     startedAt,
			"updated_at":     completedAt,
			"run_started_at": startedAt,
			"repository":     map[string]any{"id": 111},
		},
	}

	srv := newGHTestServer(t, "acme", nil, runs)
	defer srv.Close()

	col := actionsCollectorWithServer(srv)
	result, err := col.Collect(context.Background(), ghActionsTestSource("acme"), "ghp_tok", "")
	require.NoError(t, err)

	var completedEv *domain.RawSourceEvent
	for _, ev := range result.Events {
		if ev.EventType == "workflow_run.completed" {
			completedEv = ev
			break
		}
	}
	require.NotNil(t, completedEv)
	dur, ok := completedEv.Payload["duration_seconds"]
	require.True(t, ok, "duration_seconds must be in payload")
	assert.Equal(t, int64(300), dur)
}

func TestGitHubActionsCollector_NoForbiddenFields(t *testing.T) {
	conclusion := "success"
	runs := []map[string]any{
		{
			"id":            9001,
			"workflow_id":   500,
			"status":        "completed",
			"conclusion":    conclusion,
			"display_title": "Sensitive commit message that must not be stored",
			"head_commit":   map[string]any{"message": "this is a commit message"},
			"created_at":    "2026-01-01T00:00:00Z",
			"updated_at":    "2026-01-01T01:00:00Z",
			"repository":    map[string]any{"id": 222},
		},
	}

	srv := newGHTestServer(t, "acme", nil, runs)
	defer srv.Close()

	col := actionsCollectorWithServer(srv)
	result, err := col.Collect(context.Background(), ghActionsTestSource("acme"), "ghp_tok", "")
	require.NoError(t, err)

	for _, ev := range result.Events {
		payloadJSON, _ := json.Marshal(ev.Payload)
		s := string(payloadJSON)
		assert.NotContains(t, s, "display_title", "display_title must NOT appear in payload")
		assert.NotContains(t, s, "head_commit", "head_commit must NOT appear in payload")
		assert.NotContains(t, s, "commit message", "commit message must NOT appear in payload")
		assert.NotContains(t, s, "Sensitive commit", "sensitive text must NOT appear in payload")
	}
}

func TestGitHubActionsCollector_MissingOrg_ReturnsError(t *testing.T) {
	col := biz.NewGitHubActionsCollector(nil)
	src := domain.SourceConnection{ID: "x", Config: map[string]string{}}
	_, err := col.Collect(context.Background(), src, "ghp_tok", "")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "'org'")
}

// — Runtime registration test —

func TestRuntime_GitHubCollectorsRegistered(t *testing.T) {
	// Verify that the two concrete collectors implement the Collector interface
	// and report the correct source types. This exercises the type assertions
	// made at startup in runtime.go without requiring a full runtime.
	var _ biz.Collector = biz.NewGitHubCollector(nil)
	var _ biz.Collector = biz.NewGitHubActionsCollector(nil)

	assert.Equal(t, domain.SourceTypeGitHub, biz.NewGitHubCollector(nil).SourceType())
	assert.Equal(t, domain.SourceTypeGitHubActions, biz.NewGitHubActionsCollector(nil).SourceType())
}
