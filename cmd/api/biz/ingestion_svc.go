// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/repo"
)

type IngestionSvc struct {
	activityRepo repo.ActivityRepo
	metricRepo   repo.MetricRepo
}

func NewIngestionSvc(activityRepo repo.ActivityRepo, metricRepo repo.MetricRepo) *IngestionSvc {
	return &IngestionSvc{activityRepo: activityRepo, metricRepo: metricRepo}
}

func (s *IngestionSvc) Ingest(ctx context.Context, req domain.IngestionRequest) (*domain.IngestionResult, error) {
	if s == nil || s.activityRepo == nil || s.metricRepo == nil {
		return nil, fmt.Errorf("ingestion service unavailable")
	}

	normalized, err := normalizeIngestionRequest(req)
	if err != nil {
		return nil, err
	}

	activity := &domain.ActivityEvent{
		ID:          uuid.NewString(),
		Type:        normalized.activityType,
		Title:       normalized.title,
		Description: normalized.description,
		Timestamp:   normalized.occurredAt,
		User: domain.ActivityUser{
			Name:   normalized.actorName,
			Avatar: normalized.actorAvatar,
		},
	}
	point := domain.MetricDataPoint{
		Time:  normalized.occurredAt,
		Value: normalized.metricValue,
	}

	if err := s.activityRepo.BulkInsert(ctx, []*domain.ActivityEvent{activity}); err != nil {
		return nil, fmt.Errorf("insert activity event: %w", err)
	}
	if err := s.metricRepo.BulkInsert(ctx, []domain.MetricDataPoint{point}, normalized.metricID, normalized.team); err != nil {
		return nil, fmt.Errorf("insert metric point: %w", err)
	}

	return &domain.IngestionResult{
		Source:       normalized.source,
		EventType:    normalized.eventType,
		Team:         normalized.team,
		ActivityID:   activity.ID,
		ActivityType: normalized.activityType,
		MetricID:     normalized.metricID,
		MetricValue:  normalized.metricValue,
		IngestedAt:   normalized.occurredAt,
	}, nil
}

type normalizedIngestionRequest struct {
	source       string
	eventType    string
	activityType string
	team         string
	title        string
	description  string
	actorName    string
	actorAvatar  string
	metricID     string
	metricValue  float64
	occurredAt   time.Time
}

func normalizeIngestionRequest(req domain.IngestionRequest) (*normalizedIngestionRequest, error) {
	source := strings.ToLower(strings.TrimSpace(req.Source))
	if source == "" {
		return nil, fmt.Errorf("source is required")
	}
	team := strings.TrimSpace(req.Team)
	if team == "" {
		return nil, fmt.Errorf("team is required")
	}
	eventType := strings.TrimSpace(req.EventType)
	if eventType == "" {
		return nil, fmt.Errorf("eventType is required")
	}

	occurredAt := req.OccurredAt.UTC()
	if req.OccurredAt.IsZero() {
		occurredAt = time.Now().UTC()
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		title = inferIngestionTitle(source, eventType, req.Action)
	}

	description := strings.TrimSpace(req.Description)
	if description == "" {
		description = fmt.Sprintf("%s %s event for %s", source, eventType, team)
	}

	actorName := strings.TrimSpace(req.ActorName)
	if actorName == "" {
		actorName = prettyIngestionSourceName(source) + " Ingest"
	}

	metricID := strings.TrimSpace(req.MetricID)
	if metricID == "" {
		metricID = inferMetricID(source, eventType, req.Action)
	}
	metricValue := 1.0
	if req.MetricValue != nil {
		metricValue = *req.MetricValue
	}

	return &normalizedIngestionRequest{
		source:       source,
		eventType:    eventType,
		activityType: inferActivityType(source, eventType, req.Action),
		team:         team,
		title:        title,
		description:  description,
		actorName:    actorName,
		actorAvatar:  strings.TrimSpace(req.ActorAvatar),
		metricID:     metricID,
		metricValue:  metricValue,
		occurredAt:   occurredAt,
	}, nil
}

func inferActivityType(source, eventType, action string) string {
	source = strings.ToLower(source)
	eventType = strings.ToLower(eventType)
	action = strings.ToLower(action)

	switch source {
	case "github":
		if strings.Contains(eventType, "push") {
			return "deploy"
		}
		if strings.Contains(action, "closed") || strings.Contains(action, "merged") {
			return "merge"
		}
		if strings.Contains(eventType, "pull_request") {
			return "review"
		}
	case "jira", "linear":
		if strings.Contains(eventType, "block") || strings.Contains(action, "block") {
			return "alert"
		}
		if strings.Contains(eventType, "issue") || strings.Contains(eventType, "task") {
			return "review"
		}
	}
	return "review"
}

func inferMetricID(source, eventType, action string) string {
	source = strings.ToLower(source)
	eventType = strings.ToLower(eventType)
	action = strings.ToLower(action)

	switch source {
	case "github":
		if strings.Contains(eventType, "push") {
			return "deploy-freq"
		}
		if strings.Contains(eventType, "pull_request") && (strings.Contains(action, "opened") || strings.Contains(action, "synchronize") || strings.Contains(action, "review_requested")) {
			return "pr-cycle"
		}
		return "throughput"
	case "jira", "linear":
		if strings.Contains(eventType, "block") || strings.Contains(action, "block") {
			return "blocked-tasks"
		}
		if strings.Contains(eventType, "issue") || strings.Contains(eventType, "task") {
			return "throughput"
		}
		return "blocked-tasks"
	default:
		return "throughput"
	}
}

func inferIngestionTitle(source, eventType, action string) string {
	source = strings.ToLower(source)
	eventType = strings.ToLower(eventType)
	action = strings.ToLower(action)

	switch source {
	case "github":
		if strings.Contains(eventType, "push") {
			return "GitHub push ingested"
		}
		if strings.Contains(eventType, "pull_request") {
			switch {
			case strings.Contains(action, "closed"):
				return "GitHub pull request merged"
			case strings.Contains(action, "opened"):
				return "GitHub pull request opened"
			default:
				return "GitHub pull request updated"
			}
		}
	case "jira":
		if strings.Contains(eventType, "block") {
			return "Jira blocked task ingested"
		}
		return "Jira issue ingested"
	case "linear":
		if strings.Contains(eventType, "block") {
			return "Linear blocked task ingested"
		}
		return "Linear issue ingested"
	}
	return prettyIngestionSourceName(source) + " event ingested"
}

func prettyIngestionSourceName(source string) string {
	switch strings.ToLower(source) {
	case "github":
		return "GitHub"
	case "jira":
		return "Jira"
	case "linear":
		return "Linear"
	case "pm":
		return "PM"
	default:
		if source == "" {
			return "Event"
		}
		return strings.ToUpper(source[:1]) + source[1:]
	}
}
