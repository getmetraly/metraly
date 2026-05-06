// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package repo

import (
	"context"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
)

// Mock implementations for testing

type mockUserRepo struct {
	findByEmailFunc func(ctx context.Context, email string) (*domain.User, error)
}

func (m *mockUserRepo) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	return m.findByEmailFunc(ctx, email)
}
func (m *mockUserRepo) FindByID(ctx context.Context, id string) (*domain.User, error) {
	return nil, nil
}
func (m *mockUserRepo) FindByOIDCSub(ctx context.Context, sub string) (*domain.User, error) {
	return nil, nil
}
func (m *mockUserRepo) Create(ctx context.Context, u *domain.User, hash string) error { return nil }
func (m *mockUserRepo) Upsert(ctx context.Context, u *domain.User, hash string) error { return nil }
func (m *mockUserRepo) GetPasswordHash(ctx context.Context, email string) (string, string, error) {
	return "", "", nil
}

type mockDashboardRepo struct {
	updateFunc func(ctx context.Context, d *domain.Dashboard) (bool, error)
}

func (m *mockDashboardRepo) Update(ctx context.Context, d *domain.Dashboard) (bool, error) {
	return m.updateFunc(ctx, d)
}
func (m *mockDashboardRepo) List(ctx context.Context, userID string) ([]*domain.Dashboard, error) {
	return nil, nil
}
func (m *mockDashboardRepo) GetByID(ctx context.Context, id string) (*domain.Dashboard, error) {
	return nil, nil
}
func (m *mockDashboardRepo) Create(ctx context.Context, d *domain.Dashboard) error { return nil }
func (m *mockDashboardRepo) CreateTemplate(ctx context.Context, t *domain.DashboardTemplate) error {
	return nil
}
func (m *mockDashboardRepo) UpdateLayout(ctx context.Context, id string, layout []domain.WidgetLayout, version int) (bool, error) {
	return false, nil
}
func (m *mockDashboardRepo) UpdateShare(ctx context.Context, id string, isPublic bool, shareToken *string) error {
	return nil
}
func (m *mockDashboardRepo) ListTemplates(ctx context.Context) ([]*domain.DashboardTemplate, error) {
	return nil, nil
}

type mockMetricRepo struct {
	getTimeSeriesFunc func(ctx context.Context, metricID, team string, from, to time.Time) ([]domain.MetricDataPoint, error)
}

func (m *mockMetricRepo) GetTimeSeries(ctx context.Context, metricID, team string, from, to time.Time) ([]domain.MetricDataPoint, error) {
	return m.getTimeSeriesFunc(ctx, metricID, team, from, to)
}
func (m *mockMetricRepo) GetBreakdown(ctx context.Context, metricID string, from, to time.Time) ([]domain.MetricBreakdownItem, error) {
	return nil, nil
}
func (m *mockMetricRepo) BulkInsert(ctx context.Context, points []domain.MetricDataPoint, metricID, team string) error {
	return nil
}

func TestUserRepo_FindByEmail(t *testing.T) {
	expected := &domain.User{
		ID:    "usr_123",
		Name:  "Alice",
		Email: "alice@example.com",
		Role:  "admin",
	}
	mock := &mockUserRepo{
		findByEmailFunc: func(ctx context.Context, email string) (*domain.User, error) {
			if email != "alice@example.com" {
				t.Errorf("expected email alice@example.com, got %s", email)
			}
			return expected, nil
		},
	}
	u, err := mock.FindByEmail(context.Background(), "alice@example.com")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if u.ID != expected.ID || u.Email != expected.Email {
		t.Errorf("expected %+v, got %+v", expected, u)
	}
}

func TestDashboardRepo_Update_VersionConflict(t *testing.T) {
	mock := &mockDashboardRepo{
		updateFunc: func(ctx context.Context, d *domain.Dashboard) (bool, error) {
			return false, nil
		},
	}
	d := &domain.Dashboard{
		ID:      "dash_1",
		Version: 2,
	}
	ok, err := mock.Update(context.Background(), d)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ok {
		t.Error("expected Update to return false for version conflict")
	}
}

func TestMetricRepo_GetTimeSeries(t *testing.T) {
	now := time.Now()
	expected := []domain.MetricDataPoint{
		{Time: now.Add(-24 * time.Hour), Value: 10.5},
		{Time: now, Value: 12.3},
	}
	mock := &mockMetricRepo{
		getTimeSeriesFunc: func(ctx context.Context, metricID, team string, from, to time.Time) ([]domain.MetricDataPoint, error) {
			if metricID != "metric_1" {
				t.Errorf("expected metricID metric_1, got %s", metricID)
			}
			return expected, nil
		},
	}
	points, err := mock.GetTimeSeries(context.Background(), "metric_1", "team_a", now.Add(-48*time.Hour), now)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(points) != len(expected) {
		t.Errorf("expected %d points, got %d", len(expected), len(points))
	}
}
