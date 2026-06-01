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

type mockDashboardRepo struct {
	mock.Mock
}

func (m *mockDashboardRepo) List(ctx context.Context, userID string) ([]*domain.Dashboard, error) {
	args := m.Called(ctx, userID)
	if d, ok := args.Get(0).([]*domain.Dashboard); ok {
		return d, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockDashboardRepo) GetByID(ctx context.Context, id string) (*domain.Dashboard, error) {
	args := m.Called(ctx, id)
	if d, ok := args.Get(0).(*domain.Dashboard); ok {
		return d, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockDashboardRepo) Create(ctx context.Context, d *domain.Dashboard) error {
	args := m.Called(ctx, d)
	return args.Error(0)
}

func (m *mockDashboardRepo) CreateTemplate(ctx context.Context, t *domain.DashboardTemplate) error {
	args := m.Called(ctx, t)
	return args.Error(0)
}

func (m *mockDashboardRepo) Update(ctx context.Context, d *domain.Dashboard) (bool, error) {
	args := m.Called(ctx, d)
	return args.Bool(0), args.Error(1)
}

func (m *mockDashboardRepo) UpdateLayout(ctx context.Context, id string, layout []domain.WidgetLayout, version int) (bool, error) {
	args := m.Called(ctx, id, layout, version)
	return args.Bool(0), args.Error(1)
}

func (m *mockDashboardRepo) UpdateShare(ctx context.Context, id string, isPublic bool, shareToken *string) error {
	args := m.Called(ctx, id, isPublic, shareToken)
	return args.Error(0)
}

func (m *mockDashboardRepo) ListTemplates(ctx context.Context) ([]*domain.DashboardTemplate, error) {
	args := m.Called(ctx)
	if t, ok := args.Get(0).([]*domain.DashboardTemplate); ok {
		return t, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockDashboardRepo) DeleteSystemTemplateDashboards(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func (m *mockDashboardRepo) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

type mockDashboardCache struct {
	mock.Mock
}

func (m *mockDashboardCache) Get(ctx context.Context, id string) (*domain.Dashboard, error) {
	args := m.Called(ctx, id)
	if d, ok := args.Get(0).(*domain.Dashboard); ok {
		return d, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockDashboardCache) Set(ctx context.Context, d *domain.Dashboard) error {
	args := m.Called(ctx, d)
	return args.Error(0)
}

func TestDashboardSvc_GetByID_CacheHit(t *testing.T) {
	ctx := context.Background()
	dashboardRepo := new(mockDashboardRepo)
	dashboardCache := new(mockDashboardCache)

	cachedDashboard := &domain.Dashboard{
		ID:        "dash-1",
		Name:      "Cached Dashboard",
		OwnerID:   "user-1",
		Version:   1,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	dashboardCache.On("Get", ctx, "dash-1").Return(cachedDashboard, nil)

	svc := NewDashboardSvc(dashboardRepo, dashboardCache)

	d, err := svc.GetByID(ctx, "dash-1")

	assert.NoError(t, err)
	assert.NotNil(t, d)
	assert.Equal(t, "dash-1", d.ID)
	assert.Equal(t, "Cached Dashboard", d.Name)
	dashboardCache.AssertExpectations(t)
	dashboardRepo.AssertNotCalled(t, "GetByID")
}

func TestDashboardSvc_GetByID_CacheMiss(t *testing.T) {
	ctx := context.Background()
	dashboardRepo := new(mockDashboardRepo)
	dashboardCache := new(mockDashboardCache)

	dashboard := &domain.Dashboard{
		ID:        "dash-2",
		Name:      "Test Dashboard",
		OwnerID:   "user-1",
		Version:   1,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	dashboardCache.On("Get", ctx, "dash-2").Return(nil, assert.AnError)
	dashboardRepo.On("GetByID", ctx, "dash-2").Return(dashboard, nil)
	dashboardCache.On("Set", ctx, dashboard).Return(nil)

	svc := NewDashboardSvc(dashboardRepo, dashboardCache)

	d, err := svc.GetByID(ctx, "dash-2")

	assert.NoError(t, err)
	assert.NotNil(t, d)
	assert.Equal(t, "dash-2", d.ID)
	dashboardCache.AssertExpectations(t)
	dashboardRepo.AssertExpectations(t)
}

func TestDashboardSvc_Update_VersionConflict(t *testing.T) {
	ctx := context.Background()
	dashboardRepo := new(mockDashboardRepo)
	dashboardCache := new(mockDashboardCache)

	dashboard := &domain.Dashboard{
		ID:      "dash-3",
		Name:    "Updated Dashboard",
		OwnerID: "user-1",
		Version: 2,
	}

	dashboardRepo.On("Update", ctx, dashboard).Return(false, nil)

	svc := NewDashboardSvc(dashboardRepo, dashboardCache)

	updated, err := svc.Update(ctx, dashboard)

	assert.NoError(t, err)
	assert.False(t, updated)
	dashboardRepo.AssertExpectations(t)
	dashboardCache.AssertNotCalled(t, "Set")
}

func TestDashboardSvc_Update_Success(t *testing.T) {
	ctx := context.Background()
	dashboardRepo := new(mockDashboardRepo)
	dashboardCache := new(mockDashboardCache)

	dashboard := &domain.Dashboard{
		ID:      "dash-4",
		Name:    "Updated Dashboard",
		OwnerID: "user-1",
		Version: 3,
	}

	dashboardRepo.On("Update", ctx, dashboard).Return(true, nil)
	dashboardCache.On("Set", ctx, dashboard).Return(nil)

	svc := NewDashboardSvc(dashboardRepo, dashboardCache)

	updated, err := svc.Update(ctx, dashboard)

	assert.NoError(t, err)
	assert.True(t, updated)
	dashboardRepo.AssertExpectations(t)
	dashboardCache.AssertExpectations(t)
}

func TestDashboardSvc_List(t *testing.T) {
	ctx := context.Background()
	dashboardRepo := new(mockDashboardRepo)
	dashboardCache := new(mockDashboardCache)

	expectedDashboards := []*domain.Dashboard{
		{ID: "dash-1", Name: "Dashboard 1", OwnerID: "user-1"},
		{ID: "dash-2", Name: "Dashboard 2", OwnerID: "user-1"},
	}

	dashboardRepo.On("List", ctx, "user-1").Return(expectedDashboards, nil)

	svc := NewDashboardSvc(dashboardRepo, dashboardCache)

	dashboards, err := svc.List(ctx, "user-1")

	assert.NoError(t, err)
	assert.Equal(t, expectedDashboards, dashboards)
	dashboardRepo.AssertExpectations(t)
}
