// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz

import (
	"context"
	"fmt"

	"github.com/getmetraly/metraly/cmd/api/cache"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/repo"
)

type DashboardSvc struct {
	repo  repo.DashboardRepo
	cache cache.DashboardCache
}

func NewDashboardSvc(r repo.DashboardRepo, c cache.DashboardCache) *DashboardSvc {
	return &DashboardSvc{repo: r, cache: c}
}

func (s *DashboardSvc) List(ctx context.Context, userID string) ([]*domain.Dashboard, error) {
	return s.repo.List(ctx, userID)
}

// GetByID returns a dashboard by ID without ownership checks.
// Prefer GetByIDForUser or GetByIDOwned for user-facing routes.
func (s *DashboardSvc) GetByID(ctx context.Context, id string) (*domain.Dashboard, error) {
	if d, err := s.cache.Get(ctx, id); err == nil {
		return d, nil
	}
	d, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	_ = s.cache.Set(ctx, d)
	return d, nil
}

// GetByIDForUser returns a dashboard that either belongs to userID or is public.
// Returns ErrDashboardNotFound when neither condition holds, to avoid ID enumeration.
func (s *DashboardSvc) GetByIDForUser(ctx context.Context, id, userID string) (*domain.Dashboard, error) {
	d, err := s.GetByID(ctx, id)
	if err != nil || d == nil {
		return nil, ErrDashboardNotFound
	}
	if d.OwnerID != userID && !d.IsPublic {
		return nil, ErrDashboardNotFound
	}
	return d, nil
}

// GetByIDOwned returns a dashboard only when it belongs to userID.
// Returns ErrDashboardNotFound otherwise (prefer 404 over 403 to avoid enumeration).
func (s *DashboardSvc) GetByIDOwned(ctx context.Context, id, userID string) (*domain.Dashboard, error) {
	d, err := s.GetByID(ctx, id)
	if err != nil || d == nil {
		return nil, ErrDashboardNotFound
	}
	if d.OwnerID != userID {
		return nil, ErrDashboardNotFound
	}
	return d, nil
}

func (s *DashboardSvc) Create(ctx context.Context, d *domain.Dashboard) error {
	return s.repo.Create(ctx, d)
}

// UpdateForUser updates a dashboard only if userID owns it.
func (s *DashboardSvc) UpdateForUser(ctx context.Context, d *domain.Dashboard, userID string) (bool, error) {
	// Verify ownership before writing — prevents mutation of foreign dashboards.
	if _, err := s.GetByIDOwned(ctx, d.ID, userID); err != nil {
		return false, ErrDashboardNotFound
	}
	updated, err := s.repo.Update(ctx, d)
	if updated {
		_ = s.cache.Set(ctx, d)
	}
	return updated, err
}

// Update is the unrestricted variant used internally (e.g., seed data, admin tools).
func (s *DashboardSvc) Update(ctx context.Context, d *domain.Dashboard) (bool, error) {
	updated, err := s.repo.Update(ctx, d)
	if updated {
		_ = s.cache.Set(ctx, d)
	}
	return updated, err
}

// UpdateLayoutForUser updates the layout only if userID owns the dashboard.
func (s *DashboardSvc) UpdateLayoutForUser(ctx context.Context, id string, layout []domain.WidgetLayout, version int, userID string) (bool, error) {
	if _, err := s.GetByIDOwned(ctx, id, userID); err != nil {
		return false, ErrDashboardNotFound
	}
	return s.repo.UpdateLayout(ctx, id, layout, version)
}

// UpdateLayout is the unrestricted variant.
func (s *DashboardSvc) UpdateLayout(ctx context.Context, id string, layout []domain.WidgetLayout, version int) (bool, error) {
	return s.repo.UpdateLayout(ctx, id, layout, version)
}

// UpdateShareForUser toggles share settings only if userID owns the dashboard.
func (s *DashboardSvc) UpdateShareForUser(ctx context.Context, id string, isPublic bool, shareToken *string, userID string) error {
	if _, err := s.GetByIDOwned(ctx, id, userID); err != nil {
		return fmt.Errorf("%w", ErrDashboardNotFound)
	}
	return s.repo.UpdateShare(ctx, id, isPublic, shareToken)
}

// UpdateShare is the unrestricted variant.
func (s *DashboardSvc) UpdateShare(ctx context.Context, id string, isPublic bool, shareToken *string) error {
	return s.repo.UpdateShare(ctx, id, isPublic, shareToken)
}

// DeleteForUser deletes a dashboard owned by userID. System-template dashboards are protected.
func (s *DashboardSvc) DeleteForUser(ctx context.Context, id, userID string) error {
	d, err := s.repo.GetByID(ctx, id)
	if err != nil || d == nil {
		return ErrDashboardNotFound
	}
	if d.OwnerID != userID {
		return ErrDashboardNotFound // prefer 404 over 403 for enumeration safety
	}
	if d.SourceType == domain.DashboardSourceSystemTemplate {
		return ErrForbidden
	}
	return s.repo.Delete(ctx, id)
}
