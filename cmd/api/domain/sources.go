// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package domain

import "time"

// SourceType identifies the external data source kind.
type SourceType string

const (
	SourceTypeGitHub        SourceType = "github"
	SourceTypeJira          SourceType = "jira"
	SourceTypeGitHubActions SourceType = "github_actions"
	SourceTypeGitLab        SourceType = "gitlab"
	SourceTypeLinear        SourceType = "linear"
	SourceTypePrometheus    SourceType = "prometheus"
)

// SourceStatus is the lifecycle state of a configured source connection.
type SourceStatus string

const (
	SourceStatusNotConfigured SourceStatus = "not_configured"
	SourceStatusPending       SourceStatus = "pending"
	SourceStatusTesting       SourceStatus = "testing"
	SourceStatusReady         SourceStatus = "ready"
	SourceStatusSyncing       SourceStatus = "syncing"
	SourceStatusDegraded      SourceStatus = "degraded"
	SourceStatusAuthFailed    SourceStatus = "auth_failed"
	SourceStatusRateLimited   SourceStatus = "rate_limited"
	SourceStatusDisabled      SourceStatus = "disabled"
	SourceStatusDeleted       SourceStatus = "deleted"
)

// SourceConnection is the registry entry for a configured external data source.
// It never contains raw secret material; secrets are referenced via CredentialRef.
type SourceConnection struct {
	ID           string            `json:"id"`
	WorkspaceID  string            `json:"workspaceId"`
	SourceType   SourceType        `json:"sourceType"`
	DisplayName  string            `json:"displayName"`
	Status       SourceStatus      `json:"status"`
	Config       map[string]string `json:"config"`
	CredentialID string            `json:"credentialId"`
	LastTestedAt *time.Time        `json:"lastTestedAt,omitempty"`
	LastSyncedAt *time.Time        `json:"lastSyncedAt,omitempty"`
	CreatedAt    time.Time         `json:"createdAt"`
	UpdatedAt    time.Time         `json:"updatedAt"`
}

type CredentialKind string

const (
	CredentialKindPAT      CredentialKind = "pat"
	CredentialKindAPIToken CredentialKind = "api_token"
	CredentialKindOAuth    CredentialKind = "oauth"
)

type CredentialRef struct {
	ID          string         `json:"id"`
	WorkspaceID string         `json:"workspaceId"`
	SourceType  SourceType     `json:"sourceType"`
	Kind        CredentialKind `json:"kind"`
	Hint        string         `json:"hint"`
	Scopes      []string       `json:"scopes"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
}

type TestResultStatus string

const (
	TestResultOK                TestResultStatus = "ok"
	TestResultInvalidCreds      TestResultStatus = "invalid_credentials"
	TestResultPermissionDenied  TestResultStatus = "permission_denied"
	TestResultRateLimited       TestResultStatus = "rate_limited"
	TestResultNetworkError      TestResultStatus = "network_error"
	TestResultUnsupportedSource TestResultStatus = "unsupported_source"
	TestResultUnknown           TestResultStatus = "unknown"
)

type ConnectionTestResult struct {
	Status        TestResultStatus `json:"status"`
	Message       string           `json:"message"`
	ScopesFound   []string         `json:"scopesFound,omitempty"`
	ScopesMissing []string         `json:"scopesMissing,omitempty"`
	TestedAt      time.Time        `json:"testedAt"`
	LatencyMs     int64            `json:"latencyMs"`
}

type CreateSourceInput struct {
	SourceType  SourceType        `json:"sourceType"`
	DisplayName string            `json:"displayName"`
	Config      map[string]string `json:"config"`
	RawSecret   string            `json:"secret"`
}

type UpdateSourceInput struct {
	DisplayName *string           `json:"displayName,omitempty"`
	Config      map[string]string `json:"config,omitempty"`
	RawSecret   *string           `json:"secret,omitempty"`
}
