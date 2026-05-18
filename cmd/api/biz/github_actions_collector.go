// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
)

const (
	githubActionsMaxRunPages = 10
	githubActionsPerPage     = 100
)

// GitHubActionsCollector collects GitHub Actions workflow run events.
//
// Collected events:
//   - workflow_run.started   (from run.created_at / run_started_at)
//   - workflow_run.completed (from run.updated_at when conclusion is set)
//
// Payload fields (structural only — no logs, annotations, commit messages, actor emails):
//
//	repo_id, workflow_id, started_at, completed_at, conclusion, duration_seconds, head_branch
//
// Config keys consumed from SourceConnection.Config:
//
//	org  — GitHub organisation login (required)
type GitHubActionsCollector struct {
	client *http.Client
}

// NewGitHubActionsCollector creates a GitHubActionsCollector with the given HTTP client.
// Pass nil to use the default client with a 30 s total timeout.
func NewGitHubActionsCollector(client *http.Client) *GitHubActionsCollector {
	if client == nil {
		client = &http.Client{Timeout: 30 * time.Second}
	}
	return &GitHubActionsCollector{client: client}
}

// SourceType implements biz.Collector.
func (c *GitHubActionsCollector) SourceType() domain.SourceType {
	return domain.SourceTypeGitHubActions
}

// Collect fetches workflow run events from the GitHub Actions REST API.
// cursor is an RFC3339 timestamp; empty string means "collect from the beginning".
// The secret must never appear in returned errors.
func (c *GitHubActionsCollector) Collect(
	ctx context.Context,
	source domain.SourceConnection,
	secret, cursor string,
) (*CollectResult, error) {
	org := source.Config["org"]
	if org == "" {
		return nil, fmt.Errorf("github_actions collector: missing 'org' in source config")
	}

	var since *time.Time
	if cursor != "" {
		t, err := time.Parse(time.RFC3339, cursor)
		if err == nil {
			since = &t
		}
	}

	// Reuse the same repo-lister from the GitHub collector.
	gh := &GitHubCollector{client: c.client}
	repos, rl, err := gh.listRepos(ctx, org, secret)
	if err != nil {
		return nil, err
	}
	if rl != nil {
		return &CollectResult{
			RateLimitState: domain.RateLimitStateThrottled,
			RetryAfter:     rl,
		}, nil
	}

	collectStart := time.Now().UTC()
	var events []*domain.RawSourceEvent

	for _, repo := range repos {
		runs, rl2, err := c.listWorkflowRuns(ctx, org, repo, secret, since)
		if err != nil {
			// Non-fatal per-repo error; skip and continue.
			continue
		}
		if rl2 != nil {
			return &CollectResult{
				Events:         events,
				RateLimitState: domain.RateLimitStateThrottled,
				RetryAfter:     rl2,
			}, nil
		}
		for _, run := range runs {
			events = append(events, c.runToEvents(source, run)...)
		}
	}

	return &CollectResult{
		Events:         events,
		NextCursor:     collectStart.UTC().Format(time.RFC3339),
		RateLimitState: domain.RateLimitStateOK,
	}, nil
}

// — Internal types for GitHub Actions API responses —
// Only structural fields needed for metric computation are decoded.

type ghWorkflowRun struct {
	ID           int64   `json:"id"`
	WorkflowID   int64   `json:"workflow_id"`
	Status       string  `json:"status"`    // queued | in_progress | completed
	Conclusion   *string `json:"conclusion"` // success | failure | cancelled | skipped | timed_out | action_required | neutral | stale
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
	RunStartedAt string  `json:"run_started_at"` // more precise start time
	HeadBranch   string  `json:"head_branch"`
	// Repository info is nested; decode only what we need.
	Repository ghActionsRepo `json:"repository"`
	// Name, display_title, head_commit, head_sha: NOT decoded — may contain free-form text.
}

type ghActionsRepo struct {
	ID int64 `json:"id"`
}

// ghWorkflowRunsResponse is the paginated envelope for the list-workflow-runs endpoint.
type ghWorkflowRunsResponse struct {
	TotalCount   int             `json:"total_count"`
	WorkflowRuns []ghWorkflowRun `json:"workflow_runs"`
}

// runToEvents converts a GitHub Actions workflow run into raw events.
// Always emits workflow_run.started. Emits workflow_run.completed only when
// the run has a non-empty conclusion (i.e., it is finished).
func (c *GitHubActionsCollector) runToEvents(source domain.SourceConnection, run ghWorkflowRun) []*domain.RawSourceEvent {
	extID := strconv.FormatInt(run.ID, 10)
	repoID := strconv.FormatInt(run.Repository.ID, 10)
	wfID := strconv.FormatInt(run.WorkflowID, 10)
	received := time.Now().UTC()

	// Prefer run_started_at when available; fall back to created_at.
	startedStr := run.RunStartedAt
	if startedStr == "" {
		startedStr = run.CreatedAt
	}
	startedAt := parseGHTime(startedStr)

	var events []*domain.RawSourceEvent

	// workflow_run.started
	startPayload := map[string]any{
		"repo_id":     repoID,
		"workflow_id": wfID,
		"started_at":  startedStr,
	}
	if run.HeadBranch != "" {
		startPayload["head_branch"] = run.HeadBranch
	}
	events = append(events, &domain.RawSourceEvent{
		ID:                 newRawID(),
		SourceConnectionID: source.ID,
		SourceType:         domain.SourceTypeGitHubActions,
		ExternalID:         extID,
		EventType:          "workflow_run.started",
		PayloadHash:        BuildPayloadHash(startPayload),
		DeduplicationKey:   BuildDeduplicationKey(domain.SourceTypeGitHubActions, extID, "workflow_run.started", &startedAt),
		Payload:            startPayload,
		SchemaVersion:      1,
		ReceivedAt:         received,
		SourceUpdatedAt:    &startedAt,
	})

	// workflow_run.completed — only when the run is finished.
	if run.Status == "completed" && run.Conclusion != nil && *run.Conclusion != "" {
		completedAt := parseGHTime(run.UpdatedAt)
		conclusion := normalizeConclusion(*run.Conclusion)

		completedPayload := map[string]any{
			"repo_id":       repoID,
			"workflow_id":   wfID,
			"started_at":    startedStr,
			"completed_at":  run.UpdatedAt,
			"conclusion":    conclusion,
		}
		if run.HeadBranch != "" {
			completedPayload["head_branch"] = run.HeadBranch
		}
		// Compute duration_seconds when both timestamps are valid.
		if !startedAt.IsZero() && !completedAt.IsZero() && completedAt.After(startedAt) {
			dur := int64(completedAt.Sub(startedAt).Seconds())
			completedPayload["duration_seconds"] = dur
		}

		events = append(events, &domain.RawSourceEvent{
			ID:                 newRawID(),
			SourceConnectionID: source.ID,
			SourceType:         domain.SourceTypeGitHubActions,
			ExternalID:         extID,
			EventType:          "workflow_run.completed",
			PayloadHash:        BuildPayloadHash(completedPayload),
			DeduplicationKey:   BuildDeduplicationKey(domain.SourceTypeGitHubActions, extID, "workflow_run.completed", &completedAt),
			Payload:            completedPayload,
			SchemaVersion:      1,
			ReceivedAt:         received,
			SourceUpdatedAt:    &completedAt,
		})
	}

	return events
}

// listWorkflowRuns fetches workflow runs for the given repo (paginated up to githubActionsMaxRunPages).
// Returns (nil, retryAfter, nil) on rate-limit detection.
func (c *GitHubActionsCollector) listWorkflowRuns(
	ctx context.Context,
	org, repo, secret string,
	since *time.Time,
) ([]ghWorkflowRun, *time.Time, error) {
	var runs []ghWorkflowRun
	gh := &GitHubCollector{client: c.client}

	for page := 1; page <= githubActionsMaxRunPages; page++ {
		u := fmt.Sprintf("%s/repos/%s/%s/actions/runs?per_page=%d&page=%d",
			githubAPIBase,
			url.PathEscape(org),
			url.PathEscape(repo),
			githubActionsPerPage, page)
		if since != nil {
			// GitHub supports created=>=YYYY-MM-DD or created=YYYY-MM-DDTHH:MM:SSZ
			u += "&created=>=" + url.QueryEscape(since.UTC().Format("2006-01-02"))
		}

		body, resp, err := gh.doRequest(ctx, secret, u)
		if err != nil {
			return nil, nil, err
		}
		if rl := detectRateLimit(resp); rl != nil {
			return nil, rl, nil
		}
		if resp.StatusCode == http.StatusUnauthorized {
			return nil, nil, fmt.Errorf("github_actions auth error: %s", safeStatusMsg(resp.StatusCode))
		}
		if resp.StatusCode == http.StatusForbidden {
			return nil, nil, fmt.Errorf("github_actions permission error: %s", safeStatusMsg(resp.StatusCode))
		}
		if resp.StatusCode != http.StatusOK {
			return nil, nil, fmt.Errorf("github_actions runs API: unexpected status %d", resp.StatusCode)
		}

		var result ghWorkflowRunsResponse
		if err := json.Unmarshal(body, &result); err != nil {
			return nil, nil, fmt.Errorf("github_actions runs decode: %w", err)
		}
		runs = append(runs, result.WorkflowRuns...)

		// Stop early when we've seen runs older than the cursor.
		if since != nil && len(result.WorkflowRuns) > 0 {
			last := result.WorkflowRuns[len(result.WorkflowRuns)-1]
			if lastCreated := parseGHTime(last.CreatedAt); !lastCreated.IsZero() && lastCreated.Before(*since) {
				break
			}
		}
		if len(result.WorkflowRuns) < githubActionsPerPage {
			break
		}
		if !hasNextPage(resp) {
			break
		}
	}
	return runs, nil, nil
}
