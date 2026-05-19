// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz

import (
	"context"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockIngestionActivityRepo struct {
	mock.Mock
}

func (m *mockIngestionActivityRepo) List(_ context.Context, _ string, _ int) ([]*domain.ActivityEvent, error) {
	return nil, nil
}

func (m *mockIngestionActivityRepo) BulkInsert(ctx context.Context, events []*domain.ActivityEvent) error {
	args := m.Called(ctx, events)
	return args.Error(0)
}

type mockIngestionMetricRepo struct {
	mock.Mock
}

func (m *mockIngestionMetricRepo) GetTimeSeries(ctx context.Context, metricID, team string, from, to time.Time) ([]domain.MetricDataPoint, error) {
	args := m.Called(ctx, metricID, team, from, to)
	if pts, ok := args.Get(0).([]domain.MetricDataPoint); ok {
		return pts, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockIngestionMetricRepo) GetBreakdown(ctx context.Context, metricID string, from, to time.Time) ([]domain.MetricBreakdownItem, error) {
	args := m.Called(ctx, metricID, from, to)
	if items, ok := args.Get(0).([]domain.MetricBreakdownItem); ok {
		return items, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockIngestionMetricRepo) BulkInsert(ctx context.Context, points []domain.MetricDataPoint, metricID, team string) error {
	args := m.Called(ctx, points, metricID, team)
	return args.Error(0)
}

func TestIngestionSvc_Ingest_GitHubPullRequest(t *testing.T) {
	ctx := context.Background()
	activityRepo := new(mockIngestionActivityRepo)
	metricRepo := new(mockIngestionMetricRepo)

	activityRepo.On("BulkInsert", ctx, mock.MatchedBy(func(events []*domain.ActivityEvent) bool {
		if len(events) != 1 {
			return false
		}
		event := events[0]
		return event.Type == "review" && event.Title == "Atlas pull request opened" && event.User.Name == "GitHub Ingest"
	})).Return(nil)
	metricRepo.On("BulkInsert", ctx, mock.MatchedBy(func(points []domain.MetricDataPoint) bool {
		return len(points) == 1 && points[0].Value == 1
	}), "pr-cycle", "Atlas").Return(nil)

	svc := NewIngestionSvc(activityRepo, metricRepo)
	res, err := svc.Ingest(ctx, domain.IngestionRequest{
		Source:    "github",
		EventType: "pull_request",
		Action:    "opened",
		Team:      "Atlas",
		Title:     "Atlas pull request opened",
	})

	assert.NoError(t, err)
	assert.NotNil(t, res)
	assert.Equal(t, "github", res.Source)
	assert.Equal(t, "pr-cycle", res.MetricID)
	assert.Equal(t, "review", res.ActivityType)
	activityRepo.AssertExpectations(t)
	metricRepo.AssertExpectations(t)
}

func TestIngestionSvc_Ingest_PMBlockedTask(t *testing.T) {
	ctx := context.Background()
	activityRepo := new(mockIngestionActivityRepo)
	metricRepo := new(mockIngestionMetricRepo)

	activityRepo.On("BulkInsert", ctx, mock.MatchedBy(func(events []*domain.ActivityEvent) bool {
		if len(events) != 1 {
			return false
		}
		return events[0].Type == "alert"
	})).Return(nil)
	metricRepo.On("BulkInsert", ctx, mock.MatchedBy(func(points []domain.MetricDataPoint) bool {
		return len(points) == 1 && points[0].Value == 1
	}), "blocked-tasks", "Beacon").Return(nil)

	svc := NewIngestionSvc(activityRepo, metricRepo)
	res, err := svc.Ingest(ctx, domain.IngestionRequest{
		Source:    "linear",
		EventType: "issue_blocked",
		Action:    "blocked",
		Team:      "Beacon",
	})

	assert.NoError(t, err)
	assert.NotNil(t, res)
	assert.Equal(t, "blocked-tasks", res.MetricID)
	assert.Equal(t, "alert", res.ActivityType)
	activityRepo.AssertExpectations(t)
	metricRepo.AssertExpectations(t)
}

func TestIngestionSvc_Ingest_Validation(t *testing.T) {
	svc := NewIngestionSvc(nil, nil)

	_, err := svc.Ingest(context.Background(), domain.IngestionRequest{})

	assert.Error(t, err)
}
