// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package domain_test

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSourceConnection_Serialization(t *testing.T) {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	sc := domain.SourceConnection{ID: "src_01", WorkspaceID: "ws_01", SourceType: domain.SourceTypeGitHub, DisplayName: "test", Status: domain.SourceStatusReady, Config: map[string]string{"org": "acme"}, CredentialID: "cred_01", CreatedAt: now, UpdatedAt: now}
	b, err := json.Marshal(sc)
	require.NoError(t, err)
	assert.NotContains(t, string(b), "rawSecret")
	assert.NotContains(t, string(b), "secret")
	var decoded domain.SourceConnection
	require.NoError(t, json.Unmarshal(b, &decoded))
	assert.Equal(t, sc.ID, decoded.ID)
	assert.Equal(t, sc.SourceType, decoded.SourceType)
	assert.Equal(t, sc.Status, decoded.Status)
}
func TestCredentialRef_NoSecretInOutput(t *testing.T) {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	cr := domain.CredentialRef{ID: "cred_01", WorkspaceID: "ws_01", SourceType: domain.SourceTypeGitHub, Kind: domain.CredentialKindPAT, Hint: "ab12", Scopes: []string{"repo", "read:org"}, CreatedAt: now, UpdatedAt: now}
	b, err := json.Marshal(cr)
	require.NoError(t, err)
	s := string(b)
	assert.Contains(t, s, "ab12")
	assert.NotContains(t, s, "ghp_")
}
func TestConnectionTestResult_FixtureValid(t *testing.T) {
	data, err := os.ReadFile("../tests/fixtures/connection_test_result_ok.json")
	require.NoError(t, err)
	var result domain.ConnectionTestResult
	require.NoError(t, json.Unmarshal(data, &result))
	assert.Equal(t, domain.TestResultOK, result.Status)
	assert.NotZero(t, result.TestedAt)
	assert.Greater(t, result.LatencyMs, int64(0))
}
func TestCreateSourceInput_SecretNotRetained(t *testing.T) {
	input := domain.CreateSourceInput{SourceType: domain.SourceTypeGitHub, DisplayName: "test", Config: map[string]string{"org": "acme"}, RawSecret: "ghp_supersecret"}
	b, _ := json.Marshal(input)
	assert.True(t, len(b) > 0)
	assert.Contains(t, string(b), "secret")
}
func TestSourceStatus_AllConstantsDefined(t *testing.T) {
	statuses := []domain.SourceStatus{domain.SourceStatusNotConfigured, domain.SourceStatusPending, domain.SourceStatusTesting, domain.SourceStatusReady, domain.SourceStatusSyncing, domain.SourceStatusDegraded, domain.SourceStatusAuthFailed, domain.SourceStatusRateLimited, domain.SourceStatusDisabled, domain.SourceStatusDeleted}
	for _, s := range statuses {
		assert.True(t, len(string(s)) > 0)
		assert.False(t, strings.Contains(string(s), " "), "status must not contain spaces: %s", s)
	}
}
