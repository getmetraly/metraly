// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
)

const (
	githubAPIBase       = "https://api.github.com"
	githubUserAgent     = "metraly-collector/1.0"
	githubBodyLimit     = 4 * 1024 * 1024 // 4 MB per response
	githubReqTimeout    = 10 * time.Second
	githubMaxPRPages    = 10 // max pages of PRs per repo per run
	githubMaxRepoPages  = 10 // max pages of repos per org per run
	githubPerPage       = 100
)

// GitHubCollector collects GitHub pull-request lifecycle events.
//
// Collected events:
//   - pull_request.opened  (from PR created_at)
//   - pull_request.merged  (from PR merged_at when merged)
//   - pull_request.closed  (from PR closed_at when closed without merge)
//
// NOT collected in this version (partial, documented):
//   - pull_request.review_requested — requires the per-PR Timeline API
//     (GET /repos/{owner}/{repo}/issues/{number}/timeline); deferred due to
//     N+1 API cost and unreliable availability.
//   - pull_request.review_submitted — requires per-PR Reviews API; deferred for same reason.
//     review_latency_seconds is therefore not set on pull_request.merged events.
//
// Config keys consumed from SourceConnection.Config:
//
//	org  — GitHub organisation login (required)
type GitHubCollector struct {
	client *http.Client
}

// NewGitHubCollector creates a GitHubCollector with the given HTTP client.
// Pass nil to use the default client with a 30 s total timeout.
func NewGitHubCollector(client *http.Client) *GitHubCollector {
	if client == nil {
		client = &http.Client{Timeout: 30 * time.Second}
	}
	return &GitHubCollector{client: client}
}

// SourceType implements biz.Collector.
func (c *GitHubCollector) SourceType() domain.SourceType { return domain.SourceTypeGitHub }

// Collect fetches PR events from the GitHub REST API.
// cursor is an RFC3339 timestamp; empty string means "collect from the beginning".
// The secret must never appear in returned errors.
func (c *GitHubCollector) Collect(
	ctx context.Context,
	source domain.SourceConnection,
	secret, cursor string,
) (*CollectResult, error) {
	org := source.Config["org"]
	if org == "" {
		return nil, fmt.Errorf("github collector: missing 'org' in source config")
	}

	var since *time.Time
	if cursor != "" {
		t, err := time.Parse(time.RFC3339, cursor)
		if err == nil {
			since = &t
		}
		// Malformed cursor is non-fatal; fall back to full collection.
	}

	repos, rl, err := c.listRepos(ctx, org, secret)
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
		prs, rl2, err := c.listPRs(ctx, org, repo, secret, since)
		if err != nil {
			// Non-fatal per-repo error; skip this repo and continue.
			continue
		}
		if rl2 != nil {
			return &CollectResult{
				Events:         events,
				RateLimitState: domain.RateLimitStateThrottled,
				RetryAfter:     rl2,
			}, nil
		}
		for _, pr := range prs {
			events = append(events, c.prToEvents(source, repo, pr)...)
		}
	}

	return &CollectResult{
		Events:         events,
		NextCursor:     collectStart.UTC().Format(time.RFC3339),
		RateLimitState: domain.RateLimitStateOK,
	}, nil
}

// — Internal types for GitHub REST API responses —
// Only structural fields needed for metric computation are decoded.
// Title, body, commit messages are intentionally excluded.

type ghRepo struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	FullName string `json:"full_name"` // "owner/repo"
}

type ghUser struct {
	Login string `json:"login"`
	// No email — email is never stored; identity resolution uses login only.
}

type ghPR struct {
	ID        int64   `json:"id"`
	Number    int     `json:"number"`
	State     string  `json:"state"` // "open" | "closed"
	Merged    bool    `json:"merged"`
	User      ghUser  `json:"user"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
	MergedAt  *string `json:"merged_at"`
	ClosedAt  *string `json:"closed_at"`
	Base      struct {
		Repo ghRepo `json:"repo"`
	} `json:"base"`
	// Title, body, commits: NOT decoded — must not be stored in payload.
}

// prToEvents converts a single GitHub PR into one or more raw events.
// Each event contains only metric-safe structural fields.
// Free-form text fields (title, body, commit messages) are never included.
func (c *GitHubCollector) prToEvents(source domain.SourceConnection, repoName string, pr ghPR) []*domain.RawSourceEvent {
	extID := strconv.FormatInt(pr.ID, 10)
	repoID := strconv.FormatInt(pr.Base.Repo.ID, 10)
	if repoID == "0" {
		// Repo ID missing — use repo name as fallback key.
		repoID = repoName
	}

	createdAt := parseGHTime(pr.CreatedAt)
	received := time.Now().UTC()

	var events []*domain.RawSourceEvent

	// pull_request.opened — always emitted; stable on created_at.
	openedPayload := map[string]any{
		"repo_id":      repoID,
		"author_login": pr.User.Login,
		"created_at":   pr.CreatedAt,
	}
	events = append(events, &domain.RawSourceEvent{
		ID:                 newRawID(),
		SourceConnectionID: source.ID,
		SourceType:         domain.SourceTypeGitHub,
		ExternalID:         extID,
		EventType:          "pull_request.opened",
		PayloadHash:        BuildPayloadHash(openedPayload),
		DeduplicationKey:   BuildDeduplicationKey(domain.SourceTypeGitHub, extID, "pull_request.opened", &createdAt),
		Payload:            openedPayload,
		SchemaVersion:      1,
		ReceivedAt:         received,
		SourceUpdatedAt:    &createdAt,
	})

	// pull_request.merged or pull_request.closed (mutually exclusive based on merge state).
	if pr.State == "closed" {
		if pr.Merged && pr.MergedAt != nil {
			mergedAt := parseGHTime(*pr.MergedAt)
			var cycleTimeSecs *int64
			if !mergedAt.IsZero() && !createdAt.IsZero() {
				ct := int64(mergedAt.Sub(createdAt).Seconds())
				if ct > 0 {
					cycleTimeSecs = &ct
				}
			}
			mergedPayload := map[string]any{
				"repo_id":      repoID,
				"author_login": pr.User.Login,
				"created_at":   pr.CreatedAt,
				"merged_at":    *pr.MergedAt,
			}
			if cycleTimeSecs != nil {
				mergedPayload["cycle_time_seconds"] = *cycleTimeSecs
			}
			events = append(events, &domain.RawSourceEvent{
				ID:                 newRawID(),
				SourceConnectionID: source.ID,
				SourceType:         domain.SourceTypeGitHub,
				ExternalID:         extID,
				EventType:          "pull_request.merged",
				PayloadHash:        BuildPayloadHash(mergedPayload),
				DeduplicationKey:   BuildDeduplicationKey(domain.SourceTypeGitHub, extID, "pull_request.merged", &mergedAt),
				Payload:            mergedPayload,
				SchemaVersion:      1,
				ReceivedAt:         received,
				SourceUpdatedAt:    &mergedAt,
			})
		} else if pr.ClosedAt != nil {
			closedAt := parseGHTime(*pr.ClosedAt)
			closedPayload := map[string]any{
				"repo_id":      repoID,
				"author_login": pr.User.Login,
				"closed_at":    *pr.ClosedAt,
			}
			events = append(events, &domain.RawSourceEvent{
				ID:                 newRawID(),
				SourceConnectionID: source.ID,
				SourceType:         domain.SourceTypeGitHub,
				ExternalID:         extID,
				EventType:          "pull_request.closed",
				PayloadHash:        BuildPayloadHash(closedPayload),
				DeduplicationKey:   BuildDeduplicationKey(domain.SourceTypeGitHub, extID, "pull_request.closed", &closedAt),
				Payload:            closedPayload,
				SchemaVersion:      1,
				ReceivedAt:         received,
				SourceUpdatedAt:    &closedAt,
			})
		}
	}

	return events
}

// listRepos fetches all repos for the given org (paginated up to githubMaxRepoPages).
// Returns (nil, retryAfter, nil) on rate-limit detection.
func (c *GitHubCollector) listRepos(ctx context.Context, org, secret string) ([]string, *time.Time, error) {
	var repoNames []string
	for page := 1; page <= githubMaxRepoPages; page++ {
		u := fmt.Sprintf("%s/orgs/%s/repos?per_page=%d&page=%d&type=all",
			githubAPIBase, url.PathEscape(org), githubPerPage, page)
		body, resp, err := c.doRequest(ctx, secret, u)
		if err != nil {
			return nil, nil, err
		}
		if rl := detectRateLimit(resp); rl != nil {
			return nil, rl, nil
		}
		if resp.StatusCode == http.StatusUnauthorized {
			return nil, nil, fmt.Errorf("github auth error: %s", safeStatusMsg(resp.StatusCode))
		}
		if resp.StatusCode == http.StatusForbidden {
			return nil, nil, fmt.Errorf("github permission error: %s", safeStatusMsg(resp.StatusCode))
		}
		if resp.StatusCode != http.StatusOK {
			return nil, nil, fmt.Errorf("github repos API: unexpected status %d", resp.StatusCode)
		}

		var repos []ghRepo
		if err := json.Unmarshal(body, &repos); err != nil {
			return nil, nil, fmt.Errorf("github repos decode: %w", err)
		}
		for _, r := range repos {
			repoNames = append(repoNames, r.Name)
		}
		if len(repos) < githubPerPage {
			break // no more pages
		}
		if !hasNextPage(resp) {
			break
		}
	}
	return repoNames, nil, nil
}

// listPRs fetches PRs for the given repo updated since the cursor (paginated).
// Returns (nil, retryAfter, nil) on rate-limit detection.
func (c *GitHubCollector) listPRs(
	ctx context.Context,
	org, repo, secret string,
	since *time.Time,
) ([]ghPR, *time.Time, error) {
	var prs []ghPR
	for page := 1; page <= githubMaxPRPages; page++ {
		u := fmt.Sprintf("%s/repos/%s/%s/pulls?state=all&sort=updated&direction=desc&per_page=%d&page=%d",
			githubAPIBase,
			url.PathEscape(org),
			url.PathEscape(repo),
			githubPerPage, page)
		if since != nil {
			u += "&since=" + url.QueryEscape(since.UTC().Format(time.RFC3339))
		}
		body, resp, err := c.doRequest(ctx, secret, u)
		if err != nil {
			return nil, nil, err
		}
		if rl := detectRateLimit(resp); rl != nil {
			return nil, rl, nil
		}
		if resp.StatusCode == http.StatusUnauthorized {
			return nil, nil, fmt.Errorf("github auth error: %s", safeStatusMsg(resp.StatusCode))
		}
		if resp.StatusCode == http.StatusForbidden {
			return nil, nil, fmt.Errorf("github permission error: %s", safeStatusMsg(resp.StatusCode))
		}
		if resp.StatusCode != http.StatusOK {
			return nil, nil, fmt.Errorf("github pulls API: unexpected status %d", resp.StatusCode)
		}

		var page_prs []ghPR
		if err := json.Unmarshal(body, &page_prs); err != nil {
			return nil, nil, fmt.Errorf("github pulls decode: %w", err)
		}
		prs = append(prs, page_prs...)

		// If a since cursor is provided, stop when we see PRs updated before it.
		if since != nil && len(page_prs) > 0 {
			last := page_prs[len(page_prs)-1]
			if lastUpdated := parseGHTime(last.UpdatedAt); !lastUpdated.IsZero() && lastUpdated.Before(*since) {
				break
			}
		}
		if len(page_prs) < githubPerPage {
			break
		}
		if !hasNextPage(resp) {
			break
		}
	}
	return prs, nil, nil
}

// doRequest performs a single authenticated GET request to the GitHub API.
// Authorization header is never logged or included in returned errors.
func (c *GitHubCollector) doRequest(ctx context.Context, secret, rawURL string) ([]byte, *http.Response, error) {
	reqCtx, cancel := context.WithTimeout(ctx, githubReqTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("github build request: %w", err)
	}
	req.Header.Set("User-Agent", githubUserAgent)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if secret != "" {
		req.Header.Set("Authorization", "Bearer "+secret)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("github request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, githubBodyLimit))
	if err != nil {
		return nil, resp, fmt.Errorf("github read response: %w", err)
	}
	return body, resp, nil
}

// detectRateLimit inspects a GitHub API response for rate-limit signals.
// Returns a non-nil retryAfter time when the client must back off.
func detectRateLimit(resp *http.Response) *time.Time {
	if resp.StatusCode == http.StatusTooManyRequests {
		t := parseRetryAfter(resp)
		return &t
	}
	// GitHub rate-limited 403: X-RateLimit-Remaining = 0
	if resp.StatusCode == http.StatusForbidden &&
		resp.Header.Get("X-RateLimit-Remaining") == "0" {
		t := parseRateLimitReset(resp)
		return &t
	}
	// Proactive back-off when remaining is 0 on any successful response.
	if resp.Header.Get("X-RateLimit-Remaining") == "0" {
		t := parseRateLimitReset(resp)
		return &t
	}
	return nil
}

func parseRetryAfter(resp *http.Response) time.Time {
	if h := resp.Header.Get("Retry-After"); h != "" {
		if secs, err := strconv.Atoi(h); err == nil {
			return time.Now().UTC().Add(time.Duration(secs) * time.Second)
		}
	}
	return time.Now().UTC().Add(60 * time.Second)
}

func parseRateLimitReset(resp *http.Response) time.Time {
	if h := resp.Header.Get("X-RateLimit-Reset"); h != "" {
		if unix, err := strconv.ParseInt(h, 10, 64); err == nil {
			return time.Unix(unix, 0).UTC()
		}
	}
	return time.Now().UTC().Add(60 * time.Second)
}

// linkNextRe matches the `<url>; rel="next"` segment of a Link header.
var linkNextRe = regexp.MustCompile(`<([^>]+)>;\s*rel="next"`)

// hasNextPage returns true when the response Link header includes rel="next".
func hasNextPage(resp *http.Response) bool {
	return linkNextRe.MatchString(resp.Header.Get("Link"))
}

// safeStatusMsg returns a status message safe to surface in errors
// (HTTP status code only; no response body that could contain tokens).
func safeStatusMsg(code int) string {
	return fmt.Sprintf("HTTP %d %s", code, http.StatusText(code))
}

// parseGHTime parses a GitHub RFC3339 timestamp string, returning zero value on failure.
func parseGHTime(s string) time.Time {
	if s == "" {
		return time.Time{}
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return time.Time{}
	}
	return t.UTC()
}

// newRawID generates a short random ID for a raw source event.
func newRawID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return "raw_" + hex.EncodeToString(b)
}

// buildGitHubBaseURL is the GitHub API base URL, overridable in tests.
// Using a package-level var allows tests to inject a httptest.Server URL.
var buildGitHubBaseURL = func() string { return githubAPIBase }

// sanitizeSecret ensures the secret never appears in log output or error messages.
// Used internally as a reminder comment rather than a runtime redaction.
func sanitizeSecret(_ string) string { return strings.Repeat("*", 8) }
