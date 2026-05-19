// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz

import (
	"context"
	"fmt"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
)

// ActivityFeedResult is the output of an activity feed query.
type ActivityFeedResult struct {
	Items        []domain.ActivityFeedItem `json:"items"`
	Quality      domain.DataQualityLevel   `json:"quality"`
	QualityNotes []string                  `json:"qualityNotes,omitempty"`
}

// ActivityFeedRepo fetches normalized events for the activity feed widget.
type ActivityFeedRepo interface {
	QueryActivityFeed(ctx context.Context, q domain.ActivityFeedQuery) ([]domain.ActivityFeedItem, error)
}

// ActivityFeedSvc serves the activity_feed widget type.
type ActivityFeedSvc struct {
	repo ActivityFeedRepo
}

// NewActivityFeedSvc creates an ActivityFeedSvc.
func NewActivityFeedSvc(repo ActivityFeedRepo) *ActivityFeedSvc {
	return &ActivityFeedSvc{repo: repo}
}

// Execute runs an activity feed query and returns quality-annotated results.
// WorkspaceID is required; Execute returns ErrMissingWorkspaceID immediately
// when it is empty — the repo is never called for unscoped reads.
func (s *ActivityFeedSvc) Execute(ctx context.Context, q domain.ActivityFeedQuery) (ActivityFeedResult, error) {
	// P1-13: workspace guard at the biz layer, independent of handler validation.
	if q.WorkspaceID == "" {
		return ActivityFeedResult{}, fmt.Errorf("%w: activity feed requires a workspace", ErrMissingWorkspaceID)
	}

	// Validate filter keys.
	for k := range q.Filters {
		if !AllowedFilterKeys[k] {
			return ActivityFeedResult{}, fmt.Errorf("%w: %q (allowed: repository_id, team_id, author_id, reviewer_id, source_connection_id)",
				ErrUnsupportedFilter, k)
		}
	}

	if q.Limit <= 0 {
		q.Limit = 50
	}
	if q.Limit > 200 {
		q.Limit = 200
	}

	items, err := s.repo.QueryActivityFeed(ctx, q)
	if err != nil {
		return ActivityFeedResult{}, fmt.Errorf("activity feed query: %w", err)
	}

	if len(items) == 0 {
		return ActivityFeedResult{
			Items:   []domain.ActivityFeedItem{},
			Quality: domain.DataQualityEmpty,
			QualityNotes: []string{
				fmt.Sprintf("no activity events found between %s and %s",
					q.Start.Format("2006-01-02"), q.End.Format("2006-01-02")),
			},
		}, nil
	}

	// Verify no free-form text leaks: ActivityFeedItem has no title/body/message
	// fields by design. This is enforced by the domain type definition.
	return ActivityFeedResult{
		Items:   items,
		Quality: domain.DataQualityFull,
	}, nil
}

// ActivityFeedExecutor is the interface used by the widget-data handler.
type ActivityFeedExecutor interface {
	Execute(ctx context.Context, q domain.ActivityFeedQuery) (ActivityFeedResult, error)
}

// ActivityFeedQueryFrom converts handler parameters into an ActivityFeedQuery.
// Exported for use in tests.
func ActivityFeedQueryFrom(workspaceID, start, end string, filters map[string]string, limit int) (domain.ActivityFeedQuery, error) {
	s, err := time.Parse(time.RFC3339, start)
	if err != nil {
		return domain.ActivityFeedQuery{}, fmt.Errorf("invalid start: %w", err)
	}
	e, err := time.Parse(time.RFC3339, end)
	if err != nil {
		return domain.ActivityFeedQuery{}, fmt.Errorf("invalid end: %w", err)
	}
	return domain.ActivityFeedQuery{
		WorkspaceID: workspaceID,
		Start:       s,
		End:         e,
		Filters:     filters,
		Limit:       limit,
	}, nil
}
