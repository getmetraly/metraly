// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
)

// SourceAdapter performs source validation for a specific source type.
// MVP implementations validate config/credential shape without live network calls.
// Phase 2 will add real HTTP calls with short timeouts.
type SourceAdapter interface {
	// SourceType returns the source type this adapter handles.
	SourceType() domain.SourceType

	// TestConnection validates the source configuration and credential.
	// Implementations MUST NOT log or propagate the raw secret.
	// On success, ScopesFound is populated. On failure, Status is set to a specific category.
	TestConnection(ctx context.Context, cfg domain.SourceConnection, secret string) (*domain.ConnectionTestResult, error)
}

// AdapterRegistry maps source types to their adapters.
type AdapterRegistry struct {
	adapters map[domain.SourceType]SourceAdapter
}

// NewAdapterRegistry creates an empty registry.
func NewAdapterRegistry() *AdapterRegistry {
	return &AdapterRegistry{adapters: make(map[domain.SourceType]SourceAdapter)}
}

// Register adds an adapter. Panics on duplicate registration (programming error, not runtime error).
func (r *AdapterRegistry) Register(a SourceAdapter) {
	if _, exists := r.adapters[a.SourceType()]; exists {
		panic(fmt.Sprintf("adapter already registered for source type %q", a.SourceType()))
	}
	r.adapters[a.SourceType()] = a
}

// Get returns the adapter for the given source type, or (nil, false) if unsupported.
func (r *AdapterRegistry) Get(st domain.SourceType) (SourceAdapter, bool) {
	a, ok := r.adapters[st]
	return a, ok
}

// DefaultRegistry builds the production adapter registry with all supported source types.
func DefaultRegistry() *AdapterRegistry {
	reg := NewAdapterRegistry()
	reg.Register(&GitHubAdapter{})
	reg.Register(&GitHubActionsAdapter{})
	reg.Register(&JiraAdapter{})
	return reg
}

// — GitHub adapter —

// GitHubAdapter validates GitHub Personal Access Token credentials.
// MVP: validates token prefix and required config keys without live HTTP.
type GitHubAdapter struct{}

func (a *GitHubAdapter) SourceType() domain.SourceType { return domain.SourceTypeGitHub }

func (a *GitHubAdapter) TestConnection(_ context.Context, cfg domain.SourceConnection, secret string) (*domain.ConnectionTestResult, error) {
	now := time.Now().UTC()

	if secret == "" {
		return &domain.ConnectionTestResult{
			Status:   domain.TestResultInvalidCreds,
			Message:  "GitHub PAT is empty",
			TestedAt: now,
		}, nil
	}

	// GitHub PATs start with ghp_, github_pat_, gho_, or ghs_.
	// This is a structural check only — does not validate against the API.
	if !strings.HasPrefix(secret, "ghp_") &&
		!strings.HasPrefix(secret, "github_pat_") &&
		!strings.HasPrefix(secret, "gho_") &&
		!strings.HasPrefix(secret, "ghs_") {
		return &domain.ConnectionTestResult{
			Status:   domain.TestResultInvalidCreds,
			Message:  "GitHub PAT does not match expected format (ghp_*, github_pat_*, gho_*, ghs_*)",
			TestedAt: now,
		}, nil
	}

	if cfg.Config["org"] == "" && cfg.Config["installation_id"] == "" {
		return &domain.ConnectionTestResult{
			Status:   domain.TestResultInvalidCreds,
			Message:  "GitHub source requires 'org' or 'installation_id' in config",
			TestedAt: now,
		}, nil
	}

	return &domain.ConnectionTestResult{
		Status:        domain.TestResultOK,
		Message:       "GitHub PAT format valid; live API verification pending Phase 2",
		ScopesFound:   []string{"repo", "read:org"},
		ScopesMissing: []string{},
		TestedAt:      now,
	}, nil
}

// — GitHub Actions adapter —

// GitHubActionsAdapter validates GitHub credentials for the Actions collector.
type GitHubActionsAdapter struct{}

func (a *GitHubActionsAdapter) SourceType() domain.SourceType { return domain.SourceTypeGitHubActions }

func (a *GitHubActionsAdapter) TestConnection(_ context.Context, cfg domain.SourceConnection, secret string) (*domain.ConnectionTestResult, error) {
	now := time.Now().UTC()

	if secret == "" {
		return &domain.ConnectionTestResult{
			Status:   domain.TestResultInvalidCreds,
			Message:  "GitHub Actions PAT is empty",
			TestedAt: now,
		}, nil
	}

	if !strings.HasPrefix(secret, "ghp_") && !strings.HasPrefix(secret, "github_pat_") {
		return &domain.ConnectionTestResult{
			Status:   domain.TestResultInvalidCreds,
			Message:  "GitHub Actions PAT does not match expected format (ghp_*, github_pat_*)",
			TestedAt: now,
		}, nil
	}

	return &domain.ConnectionTestResult{
		Status:        domain.TestResultOK,
		Message:       "GitHub Actions PAT format valid; live API verification pending Phase 2",
		ScopesFound:   []string{"repo", "read:org", "workflow"},
		ScopesMissing: []string{},
		TestedAt:      now,
	}, nil
}

// — Jira adapter —

// JiraAdapter validates Jira API token credentials.
// MVP: validates config shape without live HTTP.
type JiraAdapter struct{}

func (a *JiraAdapter) SourceType() domain.SourceType { return domain.SourceTypeJira }

func (a *JiraAdapter) TestConnection(_ context.Context, cfg domain.SourceConnection, secret string) (*domain.ConnectionTestResult, error) {
	now := time.Now().UTC()

	if secret == "" {
		return &domain.ConnectionTestResult{
			Status:   domain.TestResultInvalidCreds,
			Message:  "Jira API token is empty",
			TestedAt: now,
		}, nil
	}

	// Accept anything >= 8 chars as structurally valid (Cloud = 24 chars, DC = longer).
	if len(secret) < 8 {
		return &domain.ConnectionTestResult{
			Status:   domain.TestResultInvalidCreds,
			Message:  "Jira API token too short (minimum 8 characters)",
			TestedAt: now,
		}, nil
	}

	if cfg.Config["base_url"] == "" {
		return &domain.ConnectionTestResult{
			Status:   domain.TestResultInvalidCreds,
			Message:  "Jira source requires 'base_url' in config (e.g. https://your-org.atlassian.net)",
			TestedAt: now,
		}, nil
	}

	return &domain.ConnectionTestResult{
		Status:        domain.TestResultOK,
		Message:       "Jira API token format valid; live API verification pending Phase 2",
		ScopesFound:   []string{"read:jira-work", "read:jira-user"},
		ScopesMissing: []string{},
		TestedAt:      now,
	}, nil
}
