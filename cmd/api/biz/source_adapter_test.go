// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz_test

import (
	"context"
	"testing"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func cfg(st domain.SourceType, config map[string]string) domain.SourceConnection {
	return domain.SourceConnection{SourceType: st, Config: config}
}

// — GitHub adapter —

func TestGitHubAdapter_OK(t *testing.T) {
	a := &biz.GitHubAdapter{}
	assert.Equal(t, domain.SourceTypeGitHub, a.SourceType())
	result, err := a.TestConnection(context.Background(), cfg(domain.SourceTypeGitHub, map[string]string{"org": "acme"}), "ghp_testtoken123")
	require.NoError(t, err)
	assert.Equal(t, domain.TestResultOK, result.Status)
	assert.NotEmpty(t, result.ScopesFound)
}

func TestGitHubAdapter_EmptySecret(t *testing.T) {
	a := &biz.GitHubAdapter{}
	result, err := a.TestConnection(context.Background(), cfg(domain.SourceTypeGitHub, map[string]string{"org": "acme"}), "")
	require.NoError(t, err)
	assert.Equal(t, domain.TestResultInvalidCreds, result.Status)
}

func TestGitHubAdapter_BadTokenPrefix(t *testing.T) {
	a := &biz.GitHubAdapter{}
	result, err := a.TestConnection(context.Background(), cfg(domain.SourceTypeGitHub, map[string]string{"org": "acme"}), "BADTOKEN")
	require.NoError(t, err)
	assert.Equal(t, domain.TestResultInvalidCreds, result.Status)
}

func TestGitHubAdapter_MissingOrgConfig(t *testing.T) {
	a := &biz.GitHubAdapter{}
	result, err := a.TestConnection(context.Background(), cfg(domain.SourceTypeGitHub, map[string]string{}), "ghp_valid")
	require.NoError(t, err)
	assert.Equal(t, domain.TestResultInvalidCreds, result.Status)
}

func TestGitHubAdapter_InstallationIDAccepted(t *testing.T) {
	a := &biz.GitHubAdapter{}
	result, err := a.TestConnection(context.Background(), cfg(domain.SourceTypeGitHub, map[string]string{"installation_id": "123"}), "ghp_valid")
	require.NoError(t, err)
	assert.Equal(t, domain.TestResultOK, result.Status)
}

// — GitHub Actions adapter —

func TestGitHubActionsAdapter_OK(t *testing.T) {
	a := &biz.GitHubActionsAdapter{}
	assert.Equal(t, domain.SourceTypeGitHubActions, a.SourceType())
	result, err := a.TestConnection(context.Background(), cfg(domain.SourceTypeGitHubActions, nil), "ghp_valid123")
	require.NoError(t, err)
	assert.Equal(t, domain.TestResultOK, result.Status)
	assert.Contains(t, result.ScopesFound, "workflow")
}

func TestGitHubActionsAdapter_BadPrefix(t *testing.T) {
	a := &biz.GitHubActionsAdapter{}
	result, err := a.TestConnection(context.Background(), cfg(domain.SourceTypeGitHubActions, nil), "gho_oauthtoken")
	require.NoError(t, err)
	// gho_ is not accepted by Actions adapter (requires ghp_ or github_pat_)
	assert.Equal(t, domain.TestResultInvalidCreds, result.Status)
}

// — Jira adapter —

func TestJiraAdapter_OK(t *testing.T) {
	a := &biz.JiraAdapter{}
	assert.Equal(t, domain.SourceTypeJira, a.SourceType())
	result, err := a.TestConnection(context.Background(), cfg(domain.SourceTypeJira, map[string]string{"base_url": "https://acme.atlassian.net"}), "validtoken12345678")
	require.NoError(t, err)
	assert.Equal(t, domain.TestResultOK, result.Status)
	assert.Contains(t, result.ScopesFound, "read:jira-work")
}

func TestJiraAdapter_EmptySecret(t *testing.T) {
	a := &biz.JiraAdapter{}
	result, err := a.TestConnection(context.Background(), cfg(domain.SourceTypeJira, map[string]string{"base_url": "https://acme.atlassian.net"}), "")
	require.NoError(t, err)
	assert.Equal(t, domain.TestResultInvalidCreds, result.Status)
}

func TestJiraAdapter_TooShortToken(t *testing.T) {
	a := &biz.JiraAdapter{}
	result, err := a.TestConnection(context.Background(), cfg(domain.SourceTypeJira, map[string]string{"base_url": "https://acme.atlassian.net"}), "short")
	require.NoError(t, err)
	assert.Equal(t, domain.TestResultInvalidCreds, result.Status)
}

func TestJiraAdapter_MissingBaseURL(t *testing.T) {
	a := &biz.JiraAdapter{}
	result, err := a.TestConnection(context.Background(), cfg(domain.SourceTypeJira, map[string]string{}), "validtoken12345678")
	require.NoError(t, err)
	assert.Equal(t, domain.TestResultInvalidCreds, result.Status)
}

// — Registry —

func TestAdapterRegistry_UnsupportedType(t *testing.T) {
	reg := biz.NewAdapterRegistry()
	_, ok := reg.Get(domain.SourceTypePrometheus)
	assert.False(t, ok)
}

func TestAdapterRegistry_Register_And_Get(t *testing.T) {
	reg := biz.NewAdapterRegistry()
	reg.Register(&biz.GitHubAdapter{})
	a, ok := reg.Get(domain.SourceTypeGitHub)
	require.True(t, ok)
	assert.Equal(t, domain.SourceTypeGitHub, a.SourceType())
}

func TestAdapterRegistry_DuplicatePanics(t *testing.T) {
	reg := biz.NewAdapterRegistry()
	reg.Register(&biz.GitHubAdapter{})
	assert.Panics(t, func() { reg.Register(&biz.GitHubAdapter{}) })
}

func TestAdapterRegistry_DefaultRegistry_HasThreeAdapters(t *testing.T) {
	reg := biz.DefaultRegistry()
	for _, st := range []domain.SourceType{domain.SourceTypeGitHub, domain.SourceTypeGitHubActions, domain.SourceTypeJira} {
		_, ok := reg.Get(st)
		assert.True(t, ok, "expected adapter for %s", st)
	}
	// Prometheus not registered
	_, ok := reg.Get(domain.SourceTypePrometheus)
	assert.False(t, ok)
}

func TestSourceSvc_TestConnection_UnsupportedSource_ReturnsCategory(t *testing.T) {
	svc, _ := newTestSvc(t) // empty registry
	sc, _, err := svc.CreateSource(context.Background(), "ws_01", domain.CreateSourceInput{
		SourceType:  domain.SourceTypePrometheus,
		DisplayName: "prom",
		Config:      map[string]string{},
		RawSecret:   "bearertoken12345678",
	})
	require.NoError(t, err)

	result, err := svc.TestConnection(context.Background(), "ws_01", sc.ID)
	assert.NoError(t, err)
	assert.Equal(t, domain.TestResultUnsupportedSource, result.Status)
}
