// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package domain

import "time"

type CollectorRunStatus string

const (
	CollectorRunStatusStarted   CollectorRunStatus = "started"
	CollectorRunStatusRunning   CollectorRunStatus = "running"
	CollectorRunStatusSucceeded CollectorRunStatus = "succeeded"
	CollectorRunStatusFailed    CollectorRunStatus = "failed"
	CollectorRunStatusCancelled CollectorRunStatus = "cancelled"
)

type RateLimitState string

const (
	RateLimitStateOK        RateLimitState = "ok"
	RateLimitStateThrottled RateLimitState = "throttled"
	RateLimitStateCooldown  RateLimitState = "cooldown"
)

type CollectorRun struct {
	ID                 string             `json:"id"`
	SourceConnectionID string             `json:"sourceConnectionId"`
	CollectorType      string             `json:"collectorType"`
	Status             CollectorRunStatus `json:"status"`
	StartedAt          time.Time          `json:"startedAt"`
	FinishedAt         *time.Time         `json:"finishedAt,omitempty"`
	Cursor             string             `json:"cursor"`
	RawEventCount      int64              `json:"rawEventCount"`
	ErrorCategory      string             `json:"errorCategory,omitempty"`
	ErrorMessage       string             `json:"errorMessage,omitempty"`
	RateLimitState     RateLimitState     `json:"rateLimitState"`
	RetryAfter         *time.Time         `json:"retryAfter,omitempty"`
}
