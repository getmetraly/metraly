// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
)

// ErrNoCollectorRegistered is returned when no Collector is registered for the source's type.
var ErrNoCollectorRegistered = errors.New("no collector registered")

// CollectResult is the output of a single collector execution.
type CollectResult struct {
	// Events are the raw event candidates emitted by the collector.
	Events []*domain.RawSourceEvent
	// NextCursor is the opaque checkpoint for the next incremental sync.
	NextCursor string
	// RateLimitState describes the current rate-limit posture after the run.
	RateLimitState domain.RateLimitState
	// RetryAfter is non-nil when the source is rate-limited.
	RetryAfter *time.Time
}

// Collector is the interface all source collectors must implement.
type Collector interface {
	// SourceType returns the source type this collector handles.
	SourceType() domain.SourceType
	// Collect fetches events from the source starting at cursor.
	// The secret is the decrypted credential; must not be logged or stored.
	Collect(ctx context.Context, source domain.SourceConnection, secret, cursor string) (*CollectResult, error)
}

// CollectorRunRepo handles persistence of collector run records.
type CollectorRunRepo interface {
	CreateCollectorRun(ctx context.Context, run *domain.CollectorRun) error
	UpdateCollectorRun(ctx context.Context, run *domain.CollectorRun) error
	GetCollectorRun(ctx context.Context, id string) (*domain.CollectorRun, error)
	ListCollectorRuns(ctx context.Context, sourceConnectionID string, limit int) ([]*domain.CollectorRun, error)
}

// RawEventIngestRepo handles persistence of raw source events.
type RawEventIngestRepo interface {
	InsertRawSourceEventsBatch(ctx context.Context, events []*domain.RawSourceEvent) (int, error)
}

// CollectorSvc orchestrates the collector run lifecycle:
//  1. Create CollectorRun (started → running)
//  2. Load SourceConnection + decrypt credential
//  3. Dispatch to registered Collector
//  4. Persist raw events (idempotent; duplicates silently skipped)
//  5. Update CollectorRun (succeeded/failed) with cursor + event count
type CollectorSvc struct {
	sourceSvc  *SourceSvc
	sourceRepo SourceRepo
	runRepo    CollectorRunRepo
	eventRepo  RawEventIngestRepo
	collectors map[domain.SourceType]Collector
}

// NewCollectorSvc creates a CollectorSvc.
func NewCollectorSvc(sourceSvc *SourceSvc, sourceRepo SourceRepo, runRepo CollectorRunRepo, eventRepo RawEventIngestRepo) *CollectorSvc {
	return &CollectorSvc{
		sourceSvc:  sourceSvc,
		sourceRepo: sourceRepo,
		runRepo:    runRepo,
		eventRepo:  eventRepo,
		collectors: make(map[domain.SourceType]Collector),
	}
}

// RegisterCollector registers a collector for a source type. Panics on duplicate (programming error).
func (s *CollectorSvc) RegisterCollector(c Collector) {
	if _, exists := s.collectors[c.SourceType()]; exists {
		panic(fmt.Sprintf("collector already registered for source type %q", c.SourceType()))
	}
	s.collectors[c.SourceType()] = c
}

// Run executes a full collector lifecycle for the given source connection.
// runID is caller-supplied for idempotency (safe to retry with the same ID after a crash).
func (s *CollectorSvc) Run(ctx context.Context, runID, sourceID string) (*domain.CollectorRun, error) {
	now := time.Now().UTC()

	sc, err := s.sourceSvc.GetSource(ctx, sourceID)
	if err != nil {
		return nil, fmt.Errorf("load source: %w", err)
	}

	collector, ok := s.collectors[sc.SourceType]
	if !ok {
		return nil, fmt.Errorf("%w for source type %q", ErrNoCollectorRegistered, sc.SourceType)
	}

	run := &domain.CollectorRun{
		ID:                 runID,
		SourceConnectionID: sourceID,
		CollectorType:      string(sc.SourceType),
		Status:             domain.CollectorRunStatusStarted,
		StartedAt:          now,
		RateLimitState:     domain.RateLimitStateOK,
	}
	if err := s.runRepo.CreateCollectorRun(ctx, run); err != nil {
		return nil, fmt.Errorf("create collector run: %w", err)
	}

	run.Status = domain.CollectorRunStatusRunning
	if err := s.runRepo.UpdateCollectorRun(ctx, run); err != nil {
		return run, fmt.Errorf("update run to running: %w", err)
	}

	// Decrypt credential — secret is scoped to this function and zeroed after use.
	var secret string
	if sc.CredentialID != "" {
		enc, err := s.sourceRepo.GetEncryptedSecret(ctx, sc.CredentialID)
		if err != nil {
			return s.failRun(ctx, run, "credential_error", "could not load credential")
		}
		secret, err = s.sourceSvc.decryptSecret(enc)
		if err != nil {
			return s.failRun(ctx, run, "credential_error", "credential decryption failed")
		}
	}

	result, collectErr := collector.Collect(ctx, *sc, secret, run.Cursor)
	secret = "" // zero immediately after collector call

	if collectErr != nil {
		return s.failRun(ctx, run, categorizeCollectorError(collectErr), collectErr.Error())
	}
	if result == nil {
		return s.failRun(ctx, run, "unknown", "collector returned nil result")
	}

	run.RateLimitState = result.RateLimitState
	run.RetryAfter = result.RetryAfter
	if result.RateLimitState == domain.RateLimitStateThrottled || result.RateLimitState == domain.RateLimitStateCooldown {
		return s.failRun(ctx, run, "rate_limited", "source is rate limited")
	}

	// Stamp this run's ID on events before persisting
	for _, ev := range result.Events {
		if ev.CollectorRunID == "" {
			ev.CollectorRunID = run.ID
		}
	}

	inserted, err := s.eventRepo.InsertRawSourceEventsBatch(ctx, result.Events)
	if err != nil {
		return s.failRun(ctx, run, "storage_error", "failed to persist raw events: "+err.Error())
	}

	finished := time.Now().UTC()
	run.Status = domain.CollectorRunStatusSucceeded
	run.FinishedAt = &finished
	run.Cursor = result.NextCursor
	run.RawEventCount = int64(inserted) // count of newly inserted events only (duplicates excluded)
	if err := s.runRepo.UpdateCollectorRun(ctx, run); err != nil {
		run.ErrorMessage = "run succeeded but final update failed: " + err.Error()
	}

	return run, nil
}

func (s *CollectorSvc) failRun(ctx context.Context, run *domain.CollectorRun, errorCategory, errorMessage string) (*domain.CollectorRun, error) {
	finished := time.Now().UTC()
	run.Status = domain.CollectorRunStatusFailed
	run.FinishedAt = &finished
	run.ErrorCategory = errorCategory
	run.ErrorMessage = errorMessage
	_ = s.runRepo.UpdateCollectorRun(ctx, run)
	return run, fmt.Errorf("%s: %s", errorCategory, errorMessage)
}

// categorizeCollectorError maps common error patterns to category strings.
func categorizeCollectorError(err error) string {
	if err == nil {
		return ""
	}
	s := err.Error()
	switch {
	case containsAny(s, "401", "unauthorized", "bad credentials", "invalid token"):
		return "auth_error"
	case containsAny(s, "403", "forbidden", "permission denied"):
		return "permission_error"
	case containsAny(s, "429", "rate limit", "too many requests"):
		return "rate_limited"
	case containsAny(s, "context canceled", "context deadline exceeded"):
		return "cancelled"
	case containsAny(s, "connection refused", "no such host", "i/o timeout"):
		return "network_error"
	default:
		return "unknown"
	}
}

func containsAny(s string, substrs ...string) bool {
	sl := lowerASCII(s)
	for _, sub := range substrs {
		if strContains(sl, lowerASCII(sub)) {
			return true
		}
	}
	return false
}

func lowerASCII(s string) string {
	b := make([]byte, len(s))
	for i := range s {
		if s[i] >= 'A' && s[i] <= 'Z' {
			b[i] = s[i] + 32
		} else {
			b[i] = s[i]
		}
	}
	return string(b)
}

func strContains(s, sub string) bool {
	if len(sub) == 0 {
		return true
	}
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

// BuildDeduplicationKey constructs a stable deduplication key for a raw event.
func BuildDeduplicationKey(sourceType domain.SourceType, externalID, eventType string, sourceUpdatedAt *time.Time) string {
	ts := ""
	if sourceUpdatedAt != nil {
		ts = sourceUpdatedAt.UTC().Format(time.RFC3339)
	}
	return fmt.Sprintf("%s:%s:%s:%s", sourceType, externalID, eventType, ts)
}

// BuildPayloadHash computes SHA-256 of the JSON-encoded payload for deduplication.
func BuildPayloadHash(payload map[string]any) string {
	b, _ := json.Marshal(payload)
	h := sha256.Sum256(b)
	return "sha256:" + hex.EncodeToString(h[:])
}
