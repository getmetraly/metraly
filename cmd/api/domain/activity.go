// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package domain

import "time"

type ActivityUser struct {
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}

type ActivityEvent struct {
	ID          string       `json:"id"`
	WorkspaceID string       `json:"workspaceId,omitempty"` // required for multi-tenant inserts
	Type        string       `json:"type"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	Timestamp   time.Time    `json:"timestamp"`
	User        ActivityUser `json:"user"`
}

// ActivityFeedQuery is the input to an activity feed request from the normalized event store.
type ActivityFeedQuery struct {
	WorkspaceID string
	Start       time.Time
	End         time.Time
	// Filters are applied as dimension equality filters (same whitelist as metric queries).
	Filters map[string]string
	// Limit caps the number of items returned; 0 means "use default" (50), max 200.
	Limit int
}

// ActivityFeedItem is a single event in the activity feed.
// Free-form text (PR titles, commit messages, issue summaries) MUST NOT appear here.
type ActivityFeedItem struct {
	ID                 string    `json:"id"`
	EventType          string    `json:"eventType"`
	EntityKind         string    `json:"entityKind"`
	EntityID           string    `json:"entityId"`
	OccurredAt         time.Time `json:"occurredAt"`
	RepositoryID       string    `json:"repositoryId,omitempty"`
	TeamID             string    `json:"teamId,omitempty"`
	AuthorID           string    `json:"authorId,omitempty"`
	ReviewerID         string    `json:"reviewerId,omitempty"`
	AuthorUnresolved   bool      `json:"authorUnresolved,omitempty"`
	ReviewerUnresolved bool      `json:"reviewerUnresolved,omitempty"`
}
