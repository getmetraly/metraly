// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz_test

// Tests for P0-2: normalized event idempotency via deterministic IDs.
// Tests for P0-3: identity resolution workspace scoping.
// Tests for P1-8: zero cycle_time_seconds preserved.
// Tests for P1-9: neutral conclusion maps to "unknown".
// Tests for P1-10: deployment events normalize correctly.

import (
	"context"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockNormRepo captures inserted events by ID for dedup checking.
type mockNormRepo struct {
	inserted map[string]*domain.NormalizedEvent
}

func newMockNormRepo() *mockNormRepo {
	return &mockNormRepo{inserted: map[string]*domain.NormalizedEvent{}}
}

func (m *mockNormRepo) InsertNormalizedEvent(_ context.Context, ev *domain.NormalizedEvent) error {
	// Simulate ON CONFLICT (id) DO NOTHING: if ID already exists, skip.
	if _, exists := m.inserted[ev.ID]; exists {
		return nil
	}
	m.inserted[ev.ID] = ev
	return nil
}

func (m *mockNormRepo) ListNormalizedEventsByRawID(_ context.Context, _ string) ([]*domain.NormalizedEvent, error) {
	return nil, nil
}

func (m *mockNormRepo) ListNormalizedEventsByEntity(_ context.Context, _, _ string) ([]*domain.NormalizedEvent, error) {
	return nil, nil
}

func makeRawPROpened(rawID, extID, connID string) *domain.RawSourceEvent {
	now := time.Now().UTC()
	return &domain.RawSourceEvent{
		ID:                 rawID,
		SourceConnectionID: connID,
		SourceType:         domain.SourceTypeGitHub,
		ExternalID:         extID,
		EventType:          "pull_request.opened",
		Payload:            map[string]any{"repo_id": "repo_1", "author_login": "alice", "created_at": now.Format(time.RFC3339)},
		SchemaVersion:      1,
		ReceivedAt:         now,
		SourceUpdatedAt:    &now,
	}
}

// TestNormalizerIdempotency_SameRawEventTwice verifies P0-2:
// normalizing the same raw event twice stores exactly one normalized event.
func TestNormalizerIdempotency_SameRawEventTwice(t *testing.T) {
	repo := newMockNormRepo()
	svc := biz.NewNormalizerSvc(repo)

	raw := makeRawPROpened("raw-pr-1", "pr-100", "conn-1")

	_, err := svc.NormalizeAndStore(context.Background(), raw, "ws-a")
	require.NoError(t, err)

	_, err = svc.NormalizeAndStore(context.Background(), raw, "ws-a")
	require.NoError(t, err)

	assert.Len(t, repo.inserted, 1, "same raw event must produce exactly one normalized event on retry")
}

// TestNormalizerIdempotency_DifferentEventsDontCollide verifies IDs don't clash.
func TestNormalizerIdempotency_DifferentEventsDontCollide(t *testing.T) {
	repo := newMockNormRepo()
	svc := biz.NewNormalizerSvc(repo)

	raw1 := makeRawPROpened("raw-pr-a", "pr-101", "conn-1")
	raw2 := makeRawPROpened("raw-pr-b", "pr-102", "conn-1")

	_, err := svc.NormalizeAndStore(context.Background(), raw1, "ws-a")
	require.NoError(t, err)
	_, err = svc.NormalizeAndStore(context.Background(), raw2, "ws-a")
	require.NoError(t, err)

	assert.Len(t, repo.inserted, 2, "different raw events must produce different normalized events")
}

// TestNormalizerIdempotency_DeterministicID verifies the same inputs always produce the same ID.
func TestNormalizerIdempotency_DeterministicID(t *testing.T) {
	svc := biz.NewNormalizerSvc(newMockNormRepo())

	raw := makeRawPROpened("raw-stable-1", "pr-999", "conn-1")

	ev1, err := svc.Normalize(raw)
	require.NoError(t, err)
	ev2, err := svc.Normalize(raw)
	require.NoError(t, err)

	assert.Equal(t, ev1.ID, ev2.ID, "normalize must be deterministic for the same raw event")
	assert.True(t, len(ev1.ID) > 4, "ID must be non-trivially short")
}

// TestNormConclusion_Neutral verifies P1-9: neutral maps to "unknown", not "failure".
func TestNormConclusion_Neutral(t *testing.T) {
	svc := biz.NewNormalizerSvc(newMockNormRepo())

	now := time.Now().UTC()
	raw := &domain.RawSourceEvent{
		ID:                 "raw-wf-neutral",
		SourceConnectionID: "conn-1",
		SourceType:         domain.SourceTypeGitHubActions,
		ExternalID:         "run-1",
		EventType:          "workflow_run.completed",
		Payload: map[string]any{
			"repo_id":      "repo-1",
			"conclusion":   "neutral",
			"completed_at": now.Format(time.RFC3339),
		},
		SchemaVersion: 1,
		ReceivedAt:    now,
	}

	ev, err := svc.Normalize(raw)
	require.NoError(t, err)
	assert.NotEqual(t, "failure", ev.Conclusion, "neutral conclusion must not map to failure")
	assert.Equal(t, "unknown", ev.Conclusion, "neutral conclusion must map to unknown")
}

// TestNormZeroCycleTime verifies P1-8: zero cycle_time_seconds is preserved as non-nil 0.
func TestNormZeroCycleTime(t *testing.T) {
	svc := biz.NewNormalizerSvc(newMockNormRepo())

	now := time.Now().UTC()
	raw := &domain.RawSourceEvent{
		ID:                 "raw-pr-zero-ct",
		SourceConnectionID: "conn-1",
		SourceType:         domain.SourceTypeGitHub,
		ExternalID:         "pr-1",
		EventType:          "pull_request.merged",
		Payload: map[string]any{
			"repo_id":            "repo-1",
			"author_login":       "alice",
			"merged_at":          now.Format(time.RFC3339),
			"cycle_time_seconds": 0, // explicit zero
			"created_at":         now.Format(time.RFC3339),
		},
		SchemaVersion: 1,
		ReceivedAt:    now,
	}

	ev, err := svc.Normalize(raw)
	require.NoError(t, err)
	require.NotNil(t, ev.CycleTimeSeconds, "explicit zero cycle_time_seconds must be stored as non-nil 0")
	assert.Equal(t, int64(0), *ev.CycleTimeSeconds)
}

// TestNormDeploymentEvents verifies P1-10: deployment.* events normalize correctly.
func TestNormDeploymentEvents(t *testing.T) {
	cases := []struct {
		rawEventType     string
		expectedNormType domain.NormalizedEventType
		payloadTimeKey   string
	}{
		{"deployment.created", domain.NormEventDeploymentCreated, "created_at"},
		{"deployment.succeeded", domain.NormEventDeploymentSucceeded, "deployed_at"},
		{"deployment.failed", domain.NormEventDeploymentFailed, "failed_at"},
	}

	for _, tc := range cases {
		t.Run(string(tc.rawEventType), func(t *testing.T) {
			svc := biz.NewNormalizerSvc(newMockNormRepo())
			now := time.Now().UTC()
			raw := &domain.RawSourceEvent{
				ID:                 "raw-deploy-" + string(tc.rawEventType),
				SourceConnectionID: "conn-1",
				SourceType:         domain.SourceTypeGitHub,
				ExternalID:         "deploy-1",
				EventType:          tc.rawEventType,
				Payload: map[string]any{
					"repo_id":         "repo-1",
					tc.payloadTimeKey: now.Format(time.RFC3339),
				},
				SchemaVersion: 1,
				ReceivedAt:    now,
			}
			ev, err := svc.Normalize(raw)
			require.NoError(t, err)
			assert.Equal(t, tc.expectedNormType, ev.EventType,
				"%s should map to %s", tc.rawEventType, tc.expectedNormType)
			assert.Equal(t, "deployment", ev.EntityKind)
		})
	}
}

// TestNormWorkspaceScoping_IdentityResolution verifies P0-3:
// identity resolution uses the workspace passed to NormalizeAndStore, not a hardcoded "default".
func TestNormWorkspaceScoping_IdentityResolution(t *testing.T) {
	repo := newMockNormRepo()
	svc := biz.NewNormalizerSvc(repo)

	resolver := &captureResolver{calls: []captureCall{}}
	svc.WithIdentityResolver(resolver)

	now := time.Now().UTC()
	raw := &domain.RawSourceEvent{
		ID:                 "raw-ws-scope",
		SourceConnectionID: "conn-ws-a",
		SourceType:         domain.SourceTypeGitHub,
		ExternalID:         "pr-ws",
		EventType:          "pull_request.opened",
		Payload: map[string]any{
			"repo_id":      "repo-1",
			"author_login": "alice",
			"created_at":   now.Format(time.RFC3339),
		},
		SchemaVersion: 1,
		ReceivedAt:    now,
	}

	_, err := svc.NormalizeAndStore(context.Background(), raw, "ws-workspace-a")
	require.NoError(t, err)

	require.Len(t, resolver.calls, 1, "resolver should be called once for the author")
	assert.Equal(t, "ws-workspace-a", resolver.calls[0].workspaceID,
		"identity resolver must be called with the workspace passed to NormalizeAndStore, not a hardcoded default")
	assert.NotEqual(t, "default", resolver.calls[0].workspaceID,
		"workspace must never be hardcoded to 'default'")
}

type captureCall struct {
	workspaceID string
	externalID  string
}

type captureResolver struct {
	calls []captureCall
}

func (r *captureResolver) ResolveIdentity(_ context.Context, workspaceID string, _ domain.SourceType, externalID string) (biz.IdentityResolution, error) {
	r.calls = append(r.calls, captureCall{workspaceID: workspaceID, externalID: externalID})
	return biz.IdentityResolution{Resolved: false}, nil
}

func (r *captureResolver) UpsertUnresolved(_ context.Context, _ string, _ domain.SourceType, _, _ string) error {
	return nil
}
