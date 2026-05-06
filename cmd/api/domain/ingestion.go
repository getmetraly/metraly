// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package domain

import "time"

type IngestionRequest struct {
	Source      string    `json:"source"`
	EventType   string    `json:"eventType"`
	Action      string    `json:"action,omitempty"`
	Team        string    `json:"team"`
	Title       string    `json:"title,omitempty"`
	Description string    `json:"description,omitempty"`
	ActorName   string    `json:"actorName,omitempty"`
	ActorAvatar string    `json:"actorAvatar,omitempty"`
	Repo        string    `json:"repo,omitempty"`
	MetricID    string    `json:"metricId,omitempty"`
	MetricValue *float64  `json:"metricValue,omitempty"`
	OccurredAt  time.Time `json:"occurredAt,omitempty"`
}

type IngestionResult struct {
	Source       string    `json:"source"`
	EventType    string    `json:"eventType"`
	Team         string    `json:"team"`
	ActivityID   string    `json:"activityId"`
	ActivityType string    `json:"activityType"`
	MetricID     string    `json:"metricId"`
	MetricValue  float64   `json:"metricValue"`
	IngestedAt   time.Time `json:"ingestedAt"`
}
