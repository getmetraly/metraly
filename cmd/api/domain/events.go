// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package domain

import "time"

type RawSourceEvent struct {
	ID                 string         `json:"id"`
	SourceConnectionID string         `json:"sourceConnectionId"`
	CollectorRunID     string         `json:"collectorRunId"`
	SourceType         SourceType     `json:"sourceType"`
	ExternalID         string         `json:"externalId"`
	EventType          string         `json:"eventType"`
	PayloadHash        string         `json:"payloadHash"`
	DeduplicationKey   string         `json:"deduplicationKey"`
	Payload            map[string]any `json:"payload"`
	SchemaVersion      int            `json:"schemaVersion"`
	ReceivedAt         time.Time      `json:"receivedAt"`
	SourceUpdatedAt    *time.Time     `json:"sourceUpdatedAt,omitempty"`
}

type NormalizedEventType string

const (
	NormEventPROpened             NormalizedEventType = "pull_request.opened"
	NormEventPRReviewRequested    NormalizedEventType = "pull_request.review_requested"
	NormEventPRReviewSubmitted    NormalizedEventType = "pull_request.review_submitted"
	NormEventPRMerged             NormalizedEventType = "pull_request.merged"
	NormEventPRClosed             NormalizedEventType = "pull_request.closed"
	NormEventWorkflowRunStarted   NormalizedEventType = "workflow_run.started"
	NormEventWorkflowRunCompleted NormalizedEventType = "workflow_run.completed"
	NormEventDeploymentCreated    NormalizedEventType = "deployment.created"
	NormEventDeploymentSucceeded  NormalizedEventType = "deployment.succeeded"
	NormEventDeploymentFailed     NormalizedEventType = "deployment.failed"
	NormEventIssueCreated         NormalizedEventType = "issue.created"
	NormEventIssueStatusChanged   NormalizedEventType = "issue.status_changed"
	NormEventIssueClosed          NormalizedEventType = "issue.closed"
	NormEventSprintStarted        NormalizedEventType = "sprint.started"
	NormEventSprintClosed         NormalizedEventType = "sprint.closed"
)

type NormalizedEvent struct {
	ID                   string              `json:"id"`
	RawSourceEventID     string              `json:"rawSourceEventId"`
	SourceConnectionID   string              `json:"sourceConnectionId"`
	EventType            NormalizedEventType `json:"eventType"`
	EntityKind           string              `json:"entityKind"`
	EntityID             string              `json:"entityId"`
	RepositoryID         string              `json:"repositoryId,omitempty"`
	TeamID               string              `json:"teamId,omitempty"`
	AuthorID             string              `json:"authorId,omitempty"`
	AuthorUnresolved     bool                `json:"authorUnresolved,omitempty"`
	ReviewerID           string              `json:"reviewerId,omitempty"`
	ReviewerUnresolved   bool                `json:"reviewerUnresolved,omitempty"`
	OccurredAt           time.Time           `json:"occurredAt"`
	ReceivedAt           time.Time           `json:"receivedAt"`
	CycleTimeSeconds     *int64              `json:"cycleTimeSeconds,omitempty"`
	ReviewLatencySeconds *int64              `json:"reviewLatencySeconds,omitempty"`
	DurationSeconds      *int64              `json:"durationSeconds,omitempty"`
	// Conclusion is the outcome of a workflow/deployment run: success|failure|cancelled|unknown.
	Conclusion           string              `json:"conclusion,omitempty"`
	// PointsCompleted and PointsPlanned are set for sprint.closed events.
	PointsCompleted      *int64              `json:"pointsCompleted,omitempty"`
	PointsPlanned        *int64              `json:"pointsPlanned,omitempty"`
	SchemaVersion        int                 `json:"schemaVersion"`
}

// RawEventInsertOutcome records the result of inserting one raw source event.
type RawEventInsertOutcome struct {
	Event    *RawSourceEvent
	Inserted bool // true if newly inserted; false if duplicate
}
