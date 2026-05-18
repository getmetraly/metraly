// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz_test

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// — Fakes —

type fakeCollectorRunRepo struct {
	runs map[string]*domain.CollectorRun
}

func newFakeCollectorRunRepo() *fakeCollectorRunRepo {
	return &fakeCollectorRunRepo{runs: make(map[string]*domain.CollectorRun)}
}

func (f *fakeCollectorRunRepo) CreateCollectorRun(_ context.Context, run *domain.CollectorRun) error {
	f.runs[run.ID] = run
	return nil
}

func (f *fakeCollectorRunRepo) UpdateCollectorRun(_ context.Context, run *domain.CollectorRun) error {
	if _, ok := f.runs[run.ID]; !ok {
		return fmt.Errorf("run not found: %s", run.ID)
	}
	f.runs[run.ID] = run
	return nil
}

func (f *fakeCollectorRunRepo) GetCollectorRun(_ context.Context, id string) (*domain.CollectorRun, error) {
	r, ok := f.runs[id]
	if !ok {
		return nil, errors.New("not found")
	}
	return r, nil
}

func (f *fakeCollectorRunRepo) ListCollectorRuns(_ context.Context, sourceConnectionID string, limit int) ([]*domain.CollectorRun, error) {
	var result []*domain.CollectorRun
	for _, r := range f.runs {
		if r.SourceConnectionID == sourceConnectionID {
			result = append(result, r)
		}
	}
	return result, nil
}

type fakeRawEventRepo struct {
	events map[string]*domain.RawSourceEvent
}

func newFakeRawEventRepo() *fakeRawEventRepo {
	return &fakeRawEventRepo{events: make(map[string]*domain.RawSourceEvent)}
}

func (f *fakeRawEventRepo) InsertRawSourceEventsBatchWithOutcomes(_ context.Context, events []*domain.RawSourceEvent) ([]domain.RawEventInsertOutcome, error) {
	outcomes := make([]domain.RawEventInsertOutcome, 0, len(events))
	for _, ev := range events {
		inserted := false
		if _, exists := f.events[ev.DeduplicationKey]; !exists {
			f.events[ev.DeduplicationKey] = ev
			inserted = true
		}
		outcomes = append(outcomes, domain.RawEventInsertOutcome{Event: ev, Inserted: inserted})
	}
	return outcomes, nil
}

// fakeCollector is a test Collector implementation.
type fakeCollector struct {
	sourceType domain.SourceType
	result     *biz.CollectResult
	err        error
}

func (c *fakeCollector) SourceType() domain.SourceType { return c.sourceType }
func (c *fakeCollector) Collect(_ context.Context, _ domain.SourceConnection, _, _ string) (*biz.CollectResult, error) {
	return c.result, c.err
}

func makeCollectorSvc(t *testing.T) (*biz.CollectorSvc, *fakeSourceRepo, *fakeCollectorRunRepo, *fakeRawEventRepo) {
	t.Helper()
	sr := newFakeSourceRepo()
	runRepo := newFakeCollectorRunRepo()
	evRepo := newFakeRawEventRepo()
	key := biz.DeriveKey("test-only-key")
	reg := biz.NewAdapterRegistry()
	reg.Register(&biz.GitHubAdapter{})
	svc, err := biz.NewSourceSvc(sr, key, reg)
	require.NoError(t, err)
	colSvc := biz.NewCollectorSvc(svc, sr, runRepo, evRepo)
	return colSvc, sr, runRepo, evRepo
}

func createTestSource(t *testing.T, svc *biz.SourceSvc, sr *fakeSourceRepo) *domain.SourceConnection {
	t.Helper()
	sc, _, err := svc.CreateSource(context.Background(), "ws_01", domain.CreateSourceInput{
		SourceType:  domain.SourceTypeGitHub,
		DisplayName: "test source",
		Config:      map[string]string{"org": "acme"},
		RawSecret:   "ghp_testtoken1234",
	})
	require.NoError(t, err)
	return sc
}

// — Tests —

func TestCollectorSvc_Run_HappyPath(t *testing.T) {
	colSvc, sr, runRepo, evRepo := makeCollectorSvc(t)
	key := biz.DeriveKey("test-only-key")
	reg := biz.NewAdapterRegistry()
	sourceSvc, _ := biz.NewSourceSvc(sr, key, reg)
	sc := createTestSource(t, sourceSvc, sr)

	now := time.Now().UTC()
	events := []*domain.RawSourceEvent{
		{
			ID:                 "raw_01",
			SourceConnectionID: sc.ID,
			SourceType:         domain.SourceTypeGitHub,
			ExternalID:         "pr_1",
			EventType:          "pull_request.opened",
			PayloadHash:        biz.BuildPayloadHash(map[string]any{"number": 1}),
			DeduplicationKey:   biz.BuildDeduplicationKey(domain.SourceTypeGitHub, "pr_1", "pull_request.opened", &now),
			Payload:            map[string]any{"number": 1},
			SchemaVersion:      1,
			ReceivedAt:         now,
		},
	}

	fc := &fakeCollector{
		sourceType: domain.SourceTypeGitHub,
		result: &biz.CollectResult{
			Events:         events,
			NextCursor:     "cursor_v1",
			RateLimitState: domain.RateLimitStateOK,
		},
	}
	colSvc.RegisterCollector(fc)

	run, err := colSvc.Run(context.Background(), "run_01", sc.ID)
	require.NoError(t, err)
	assert.Equal(t, domain.CollectorRunStatusSucceeded, run.Status)
	assert.Equal(t, "cursor_v1", run.Cursor)
	assert.Equal(t, int64(1), run.RawEventCount)
	assert.NotNil(t, run.FinishedAt)

	// Event stored
	assert.Len(t, evRepo.events, 1)

	// Run persisted
	stored, err := runRepo.GetCollectorRun(context.Background(), "run_01")
	require.NoError(t, err)
	assert.Equal(t, domain.CollectorRunStatusSucceeded, stored.Status)
}

func TestCollectorSvc_Run_CollectorError(t *testing.T) {
	colSvc, sr, runRepo, _ := makeCollectorSvc(t)
	key := biz.DeriveKey("test-only-key")
	sourceSvc, _ := biz.NewSourceSvc(sr, key, biz.NewAdapterRegistry())
	sc := createTestSource(t, sourceSvc, sr)

	fc := &fakeCollector{
		sourceType: domain.SourceTypeGitHub,
		err:        errors.New("401 bad credentials"),
	}
	colSvc.RegisterCollector(fc)

	run, err := colSvc.Run(context.Background(), "run_fail", sc.ID)
	require.Error(t, err)
	assert.Equal(t, domain.CollectorRunStatusFailed, run.Status)
	assert.Equal(t, "auth_error", run.ErrorCategory)
	assert.NotEmpty(t, run.ErrorMessage)

	stored, _ := runRepo.GetCollectorRun(context.Background(), "run_fail")
	assert.Equal(t, domain.CollectorRunStatusFailed, stored.Status)
}

func TestCollectorSvc_Run_Duplicate_Events_NotCounted(t *testing.T) {
	colSvc, sr, _, evRepo := makeCollectorSvc(t)
	key := biz.DeriveKey("test-only-key")
	sourceSvc, _ := biz.NewSourceSvc(sr, key, biz.NewAdapterRegistry())
	sc := createTestSource(t, sourceSvc, sr)

	now := time.Now().UTC()
	ev := &domain.RawSourceEvent{
		ID:               "raw_dup",
		SourceType:       domain.SourceTypeGitHub,
		ExternalID:       "pr_2",
		EventType:        "pull_request.opened",
		PayloadHash:      "sha256:abc",
		DeduplicationKey: biz.BuildDeduplicationKey(domain.SourceTypeGitHub, "pr_2", "pull_request.opened", &now),
		Payload:          map[string]any{},
		SchemaVersion:    1,
		ReceivedAt:       now,
	}

	fc := &fakeCollector{
		sourceType: domain.SourceTypeGitHub,
		result: &biz.CollectResult{
			Events:         []*domain.RawSourceEvent{ev, ev}, // same event twice
			RateLimitState: domain.RateLimitStateOK,
		},
	}
	colSvc.RegisterCollector(fc)

	run, err := colSvc.Run(context.Background(), "run_dup", sc.ID)
	require.NoError(t, err)
	assert.Equal(t, int64(1), run.RawEventCount) // only 1 inserted
	assert.Len(t, evRepo.events, 1)
}

func TestCollectorSvc_Run_NoCollectorRegistered(t *testing.T) {
	colSvc, sr, _, _ := makeCollectorSvc(t)
	key := biz.DeriveKey("test-only-key")
	sourceSvc, _ := biz.NewSourceSvc(sr, key, biz.NewAdapterRegistry())

	// Create a Jira source but register no Jira collector
	sc, _, err := sourceSvc.CreateSource(context.Background(), "ws_01", domain.CreateSourceInput{
		SourceType:  domain.SourceTypeJira,
		DisplayName: "jira",
		Config:      map[string]string{"base_url": "https://acme.atlassian.net"},
		RawSecret:   "jiratoken1234567",
	})
	require.NoError(t, err)

	_, err = colSvc.Run(context.Background(), "run_no_col", sc.ID)
	assert.Error(t, err)
}

func TestCollectorSvc_Run_ContextCancellation(t *testing.T) {
	colSvc, sr, runRepo, _ := makeCollectorSvc(t)
	key := biz.DeriveKey("test-only-key")
	sourceSvc, _ := biz.NewSourceSvc(sr, key, biz.NewAdapterRegistry())
	sc := createTestSource(t, sourceSvc, sr)

	fc := &fakeCollector{
		sourceType: domain.SourceTypeGitHub,
		err:        errors.New("context canceled"),
	}
	colSvc.RegisterCollector(fc)

	run, err := colSvc.Run(context.Background(), "run_cancel", sc.ID)
	require.Error(t, err)
	assert.Equal(t, "cancelled", run.ErrorCategory)

	stored, _ := runRepo.GetCollectorRun(context.Background(), "run_cancel")
	assert.Equal(t, domain.CollectorRunStatusFailed, stored.Status)
}

func TestBuildDeduplicationKey_Stable(t *testing.T) {
	ts := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	k1 := biz.BuildDeduplicationKey(domain.SourceTypeGitHub, "pr_42", "pull_request.opened", &ts)
	k2 := biz.BuildDeduplicationKey(domain.SourceTypeGitHub, "pr_42", "pull_request.opened", &ts)
	assert.Equal(t, k1, k2, "deduplication key must be stable for same inputs")
	assert.Contains(t, k1, "github")
	assert.Contains(t, k1, "pr_42")
}

func TestBuildPayloadHash_Stable(t *testing.T) {
	p := map[string]any{"number": 42, "state": "open"}
	h1 := biz.BuildPayloadHash(p)
	h2 := biz.BuildPayloadHash(p)
	assert.Equal(t, h1, h2)
	assert.True(t, len(h1) > 10)
	assert.Contains(t, h1, "sha256:")
}

// — fakeNormEventRepo —

type fakeNormEventRepo struct {
	events []*domain.NormalizedEvent
}

func (f *fakeNormEventRepo) InsertNormalizedEvent(_ context.Context, ev *domain.NormalizedEvent) error {
	f.events = append(f.events, ev)
	return nil
}

func (f *fakeNormEventRepo) ListNormalizedEventsByRawID(_ context.Context, _ string) ([]*domain.NormalizedEvent, error) {
	return nil, nil
}

func (f *fakeNormEventRepo) ListNormalizedEventsByEntity(_ context.Context, _, _ string) ([]*domain.NormalizedEvent, error) {
	return nil, nil
}

func makeRawGitHubEvent(id, sourceID string) *domain.RawSourceEvent {
	now := time.Now().UTC()
	return &domain.RawSourceEvent{
		ID:                 id,
		SourceConnectionID: sourceID,
		SourceType:         domain.SourceTypeGitHub,
		ExternalID:         id,
		EventType:          "pull_request.opened",
		PayloadHash:        biz.BuildPayloadHash(map[string]any{"number": 1, "id": id}),
		DeduplicationKey:   biz.BuildDeduplicationKey(domain.SourceTypeGitHub, id, "pull_request.opened", &now),
		Payload: map[string]any{
			"number": 1,
			"id":     id,
			"merged": false,
			"state":  "open",
			"title":  "Test PR",
			"user":   map[string]any{"login": "octocat"},
			"base":   map[string]any{"repo": map[string]any{"name": "repo", "owner": map[string]any{"login": "org"}}},
		},
		SchemaVersion: 1,
		ReceivedAt:    now,
	}
}

func TestCollectorSvc_NormalizedEventsInsertedOnce(t *testing.T) {
	colSvc, sr, _, _ := makeCollectorSvc(t)
	key := biz.DeriveKey("test-only-key")
	sourceSvc, _ := biz.NewSourceSvc(sr, key, biz.NewAdapterRegistry())
	sc := createTestSource(t, sourceSvc, sr)

	normRepo := &fakeNormEventRepo{}
	colSvc.WithNormalizer(biz.NewNormalizerSvc(normRepo))

	fc := &fakeCollector{
		sourceType: domain.SourceTypeGitHub,
		result: &biz.CollectResult{
			Events:         []*domain.RawSourceEvent{makeRawGitHubEvent("raw_norm_01", sc.ID)},
			RateLimitState: domain.RateLimitStateOK,
		},
	}
	colSvc.RegisterCollector(fc)

	run, err := colSvc.Run(context.Background(), "run_norm_01", sc.ID)
	require.NoError(t, err)
	assert.Equal(t, domain.CollectorRunStatusSucceeded, run.Status)
	assert.Len(t, normRepo.events, 1, "exactly one normalized event should be stored")
}

func TestCollectorSvc_DuplicateRawEvent_NoNormalized(t *testing.T) {
	colSvc, sr, _, _ := makeCollectorSvc(t)
	key := biz.DeriveKey("test-only-key")
	sourceSvc, _ := biz.NewSourceSvc(sr, key, biz.NewAdapterRegistry())
	sc := createTestSource(t, sourceSvc, sr)

	normRepo := &fakeNormEventRepo{}
	colSvc.WithNormalizer(biz.NewNormalizerSvc(normRepo))

	ev := makeRawGitHubEvent("raw_dup_norm", sc.ID)
	fc := &fakeCollector{
		sourceType: domain.SourceTypeGitHub,
		result: &biz.CollectResult{
			Events:         []*domain.RawSourceEvent{ev, ev}, // same event twice
			RateLimitState: domain.RateLimitStateOK,
		},
	}
	colSvc.RegisterCollector(fc)

	run, err := colSvc.Run(context.Background(), "run_dup_norm", sc.ID)
	require.NoError(t, err)
	assert.Equal(t, int64(1), run.RawEventCount)
	assert.Len(t, normRepo.events, 1, "duplicate raw event must not produce a second normalized event")
}

func TestCollectorSvc_NormalizerIgnoredEvent_RunSucceeds(t *testing.T) {
	colSvc, sr, _, _ := makeCollectorSvc(t)
	key := biz.DeriveKey("test-only-key")
	sourceSvc, _ := biz.NewSourceSvc(sr, key, biz.NewAdapterRegistry())
	sc := createTestSource(t, sourceSvc, sr)

	normRepo := &fakeNormEventRepo{}
	colSvc.WithNormalizer(biz.NewNormalizerSvc(normRepo))

	// An event with an unsupported source type will trigger a NormalizerError
	now := time.Now().UTC()
	unsupportedEv := &domain.RawSourceEvent{
		ID:                 "raw_unsup",
		SourceConnectionID: sc.ID,
		SourceType:         domain.SourceTypeGitHub, // source type ok for ingest
		ExternalID:         "raw_unsup",
		EventType:          "unknown_unsupported_event_type_zzz",
		PayloadHash:        biz.BuildPayloadHash(map[string]any{"x": 1}),
		DeduplicationKey:   biz.BuildDeduplicationKey(domain.SourceTypeGitHub, "raw_unsup", "unknown_unsupported_event_type_zzz", &now),
		Payload:            map[string]any{"x": 1},
		SchemaVersion:      1,
		ReceivedAt:         now,
	}
	fc := &fakeCollector{
		sourceType: domain.SourceTypeGitHub,
		result: &biz.CollectResult{
			Events:         []*domain.RawSourceEvent{unsupportedEv},
			RateLimitState: domain.RateLimitStateOK,
		},
	}
	colSvc.RegisterCollector(fc)

	run, err := colSvc.Run(context.Background(), "run_ignored", sc.ID)
	require.NoError(t, err, "ignored normalizer error must not fail the run")
	assert.Equal(t, domain.CollectorRunStatusSucceeded, run.Status)
}
