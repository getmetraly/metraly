// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package domain_test

import (
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRawSourceEvent_FixtureRoundTrip(t *testing.T) {
	data, err := os.ReadFile("../tests/fixtures/raw_source_event_github_pr.json")
	require.NoError(t, err)
	var ev domain.RawSourceEvent
	require.NoError(t, json.Unmarshal(data, &ev))
	assert.Equal(t, "raw_01", ev.ID)
	assert.Equal(t, domain.SourceTypeGitHub, ev.SourceType)
	assert.Equal(t, "pr_42", ev.ExternalID)
	assert.Equal(t, 1, ev.SchemaVersion)
	assert.NotEmpty(t, ev.DeduplicationKey)
	assert.NotEmpty(t, ev.PayloadHash)
}
func TestRawSourceEvent_NoSensitiveTextInPayloadKeys(t *testing.T) {
	ev := domain.RawSourceEvent{ID: "raw_test", SourceConnectionID: "src_01", SourceType: domain.SourceTypeGitHub, ExternalID: "pr_1", EventType: "pull_request.opened", PayloadHash: "sha256:abc", DeduplicationKey: "github:pr_1:pull_request.opened:2026-01-01T00:00:00Z", Payload: map[string]any{"number": 1, "state": "open"}, SchemaVersion: 1, ReceivedAt: time.Now()}
	b, err := json.Marshal(ev)
	require.NoError(t, err)
	assert.NotContains(t, string(b), `"title"`)
	assert.NotContains(t, string(b), `"body"`)
	assert.NotContains(t, string(b), `"message"`)
}
func TestNormalizedEventTypes_AllDefined(t *testing.T) {
	types := []domain.NormalizedEventType{domain.NormEventPROpened, domain.NormEventPRReviewRequested, domain.NormEventPRReviewSubmitted, domain.NormEventPRMerged, domain.NormEventPRClosed, domain.NormEventWorkflowRunStarted, domain.NormEventWorkflowRunCompleted, domain.NormEventDeploymentCreated, domain.NormEventDeploymentSucceeded, domain.NormEventDeploymentFailed, domain.NormEventIssueCreated, domain.NormEventIssueStatusChanged, domain.NormEventIssueClosed, domain.NormEventSprintStarted, domain.NormEventSprintClosed}
	for _, et := range types {
		assert.Contains(t, string(et), ".", "event type must have dot separator: %s", et)
	}
}
func TestCollectorRun_StatusConstants(t *testing.T) {
	statuses := []domain.CollectorRunStatus{domain.CollectorRunStatusStarted, domain.CollectorRunStatusRunning, domain.CollectorRunStatusSucceeded, domain.CollectorRunStatusFailed, domain.CollectorRunStatusCancelled}
	for _, s := range statuses {
		assert.NotEmpty(t, string(s))
	}
}
