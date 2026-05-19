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
	"log/slog"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/repo"
)

// ErrNoCollectorRegistered is returned when no Collector is registered for the source's type.
var ErrNoCollectorRegistered = errors.New("no collector registered")

// ErrRunInFlight is returned when an active run already exists for the source.
var ErrRunInFlight = errors.New("a collector run is already in flight for this source")

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
	// SkippedRepos is the count of per-repo errors encountered during collection.
	// Non-zero means the result is partial: some repos were skipped due to transient errors.
	SkippedRepos int
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
// Only contains methods actually called by CollectorSvc.Run; read-side
// methods (GetCollectorRun, ListCollectorRuns) live in CollectorRunFetcher
// in the handlers package, where they are workspace-scoped.
type CollectorRunRepo interface {
	CreateCollectorRun(ctx context.Context, run *domain.CollectorRun) error
	UpdateCollectorRun(ctx context.Context, run *domain.CollectorRun) error
	// GetActiveRunForSource returns the run ID of any in-flight run for the source.
	// Returns repo.ErrNotFound when none exists.
	GetActiveRunForSource(ctx context.Context, sourceConnectionID string) (string, error)
}

// RawEventIngestRepo handles persistence of raw source events.
type RawEventIngestRepo interface {
	InsertRawSourceEventsBatchWithOutcomes(ctx context.Context, events []*domain.RawSourceEvent) ([]domain.RawEventInsertOutcome, error)
}

// CollectorSvc orchestrates the collector run lifecycle:
//  1. Guard against concurrent in-flight runs per source
//  2. Create CollectorRun (started → running)
//  3. Load SourceConnection + decrypt credential (workspace-scoped)
//  4. Dispatch to registered Collector
//  5. Persist raw events (idempotent; duplicates silently skipped)
//  6. Update CollectorRun (succeeded/failed) with cursor + event count
type CollectorSvc struct {
	sourceSvc  *SourceSvc
	sourceRepo SourceRepo
	runRepo    CollectorRunRepo
	eventRepo  RawEventIngestRepo
	collectors map[domain.SourceType]Collector
	normalizer *NormalizerSvc // optional; nil means skip normalization
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

// WithNormalizer attaches a NormalizerSvc to the CollectorSvc pipeline.
func (s *CollectorSvc) WithNormalizer(n *NormalizerSvc) {
	s.normalizer = n
}

// Run executes a full collector lifecycle for the given source connection.
// workspaceID is required and enforces tenant isolation for source and credential reads.
// runID is caller-supplied for idempotency (safe to retry with the same ID after a crash;
// CreateCollectorRun uses ON CONFLICT (id) DO NOTHING).
//
// Run uses context.WithoutCancel for the final DB writes so that client disconnects
// cannot leave collector_runs rows stuck in 'running'.
func (s *CollectorSvc) Run(ctx context.Context, runID, workspaceID, sourceID string) (*domain.CollectorRun, error) {
	now := time.Now().UTC()
	slog.InfoContext(ctx, "collector_run.started",
		"run_id", runID,
		"source_id", sourceID,
	)

	// Guard against concurrent in-flight runs for the same source.
	if existingRunID, err := s.runRepo.GetActiveRunForSource(ctx, sourceID); err == nil {
		return nil, fmt.Errorf("%w (existing run %s)", ErrRunInFlight, existingRunID)
	} else if !errors.Is(err, repo.ErrNotFound) {
		return nil, fmt.Errorf("check active run: %w", err)
	}

	sc, err := s.sourceSvc.GetSource(ctx, workspaceID, sourceID)
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
		if errors.Is(err, repo.ErrActiveRunExists) {
			return nil, fmt.Errorf("%w (db constraint)", ErrRunInFlight)
		}
		return nil, fmt.Errorf("create collector run: %w", err)
	}

	run.Status = domain.CollectorRunStatusRunning
	if err := s.runRepo.UpdateCollectorRun(ctx, run); err != nil {
		// Transition to running failed — attempt to mark as failed using a fresh context
		// so that client disconnection cannot leave the row stuck at 'started'.
		return s.failRunBackground(run, "lifecycle_error", "update run to running: "+err.Error())
	}

	// Decrypt credential — secret is scoped to this function and cleared after use.
	secret, err := s.sourceSvc.DecryptSecretForSource(ctx, sc)
	if err != nil {
		return s.failRunBackground(run, "credential_error", "could not decrypt credential: "+err.Error())
	}

	result, collectErr := collector.Collect(ctx, *sc, secret, run.Cursor)
	secret = "" // zero immediately after collector call — NEVER log secret

	if collectErr != nil {
		slog.WarnContext(ctx, "collector_run.collect_failed",
			"run_id", runID,
			"source_id", sourceID,
			"error_category", categorizeCollectorError(collectErr),
		)
		return s.failRunBackground(run, categorizeCollectorError(collectErr), collectErr.Error())
	}
	if result == nil {
		return s.failRunBackground(run, "unknown", "collector returned nil result")
	}

	run.RateLimitState = result.RateLimitState
	run.RetryAfter = result.RetryAfter
	if result.RateLimitState == domain.RateLimitStateThrottled || result.RateLimitState == domain.RateLimitStateCooldown {
		return s.failRunBackground(run, "rate_limited", "source is rate limited")
	}

	// Stamp this run's ID on events before persisting.
	for _, ev := range result.Events {
		if ev.CollectorRunID == "" {
			ev.CollectorRunID = run.ID
		}
	}

	outcomes, err := s.eventRepo.InsertRawSourceEventsBatchWithOutcomes(ctx, result.Events)
	if err != nil {
		return s.failRunBackground(run, "storage_error", "failed to persist raw events: "+err.Error())
	}
	inserted := 0
	for _, o := range outcomes {
		if o.Inserted {
			inserted++
		}
	}

	if s.normalizer != nil {
		for _, outcome := range outcomes {
			if !outcome.Inserted {
				continue // skip duplicates
			}
			_, nerr := s.normalizer.NormalizeAndStore(ctx, outcome.Event, sc.WorkspaceID)
			if nerr != nil {
				var normErr *NormalizerError
				if errors.As(nerr, &normErr) && (normErr.Category == NormCategoryIgnoredKnown || normErr.Category == NormCategoryUnsupportedSrc) {
					continue
				}
				slog.WarnContext(ctx, "collector_run.normalization_error",
					"run_id", runID,
					"source_id", sourceID,
					"raw_event_id", outcome.Event.ID,
				)
				continue
			}
		}
	}

	finished := time.Now().UTC()
	run.Status = domain.CollectorRunStatusSucceeded
	run.FinishedAt = &finished
	run.Cursor = result.NextCursor
	run.RawEventCount = int64(inserted)
	slog.InfoContext(ctx, "collector_run.succeeded",
		"run_id", runID,
		"source_id", sourceID,
		"events_fetched", len(result.Events),
		"events_inserted", inserted,
		"events_duplicated", len(result.Events)-inserted,
		"repos_skipped", result.SkippedRepos,
	)

	// Use a detached context for the final write so client disconnect cannot skip it.
	writeCtx := context.WithoutCancel(ctx)
	if err := s.runRepo.UpdateCollectorRun(writeCtx, run); err != nil {
		slog.ErrorContext(writeCtx, "collector_run.final_update_failed",
			"run_id", runID,
			"error", err,
		)
		return run, fmt.Errorf("run succeeded but final status update failed: %w", err)
	}

	return run, nil
}

// failRunBackground writes the failure status using context.Background() so that
// a cancelled request context cannot prevent the DB write.
func (s *CollectorSvc) failRunBackground(run *domain.CollectorRun, errorCategory, errorMessage string) (*domain.CollectorRun, error) {
	finished := time.Now().UTC()
	run.Status = domain.CollectorRunStatusFailed
	run.FinishedAt = &finished
	run.ErrorCategory = errorCategory
	run.ErrorMessage = errorMessage
	_ = s.runRepo.UpdateCollectorRun(context.Background(), run)
	slog.Warn("collector_run.failed",
		"run_id", run.ID,
		"source_id", run.SourceConnectionID,
		"error_category", errorCategory,
	)
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
	case containsAny(s, "429", "rate limit", "too many requests"):
		return "rate_limited"
	case containsAny(s, "403", "forbidden", "permission denied"):
		return "permission_error"
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
