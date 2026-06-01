// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package repo

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DashboardRepo interface {
	List(ctx context.Context, userID string) ([]*domain.Dashboard, error)
	GetByID(ctx context.Context, id string) (*domain.Dashboard, error)
	Create(ctx context.Context, d *domain.Dashboard) error
	CreateTemplate(ctx context.Context, t *domain.DashboardTemplate) error
	Update(ctx context.Context, d *domain.Dashboard) (bool, error)
	UpdateLayout(ctx context.Context, id string, layout []domain.WidgetLayout, version int) (bool, error)
	UpdateShare(ctx context.Context, id string, isPublic bool, shareToken *string) error
	ListTemplates(ctx context.Context) ([]*domain.DashboardTemplate, error)
	DeleteSystemTemplateDashboards(ctx context.Context) error
	Delete(ctx context.Context, id string) error
}

type pgDashboardRepo struct{ pool *pgxpool.Pool }

func NewDashboardRepo(pool *pgxpool.Pool) DashboardRepo { return &pgDashboardRepo{pool} }

func (r *pgDashboardRepo) List(ctx context.Context, userID string) ([]*domain.Dashboard, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, description, icon, owner_id, is_public, source_type, source_template_id, share_token,
		        widgets, layout, version, forked_from_id, created_at, updated_at
		 FROM dashboards WHERE owner_id=$1 OR is_public=true ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*domain.Dashboard
	for rows.Next() {
		d := &domain.Dashboard{}
		var widgetsJSON, layoutJSON []byte
		err := rows.Scan(&d.ID, &d.Name, &d.Description, &d.Icon, &d.OwnerID, &d.IsPublic, &d.SourceType, &d.SourceTemplateID,
			&d.ShareToken, &widgetsJSON, &layoutJSON, &d.Version, &d.ForkedFromID, &d.CreatedAt, &d.UpdatedAt)
		if err != nil {
			return nil, err
		}
		if err := json.Unmarshal(widgetsJSON, &d.Widgets); err != nil {
			return nil, fmt.Errorf("decode dashboard widgets: %w", err)
		}
		if err := json.Unmarshal(layoutJSON, &d.Layout); err != nil {
			return nil, fmt.Errorf("decode dashboard layout: %w", err)
		}
		result = append(result, d)
	}
	return result, rows.Err()
}

func (r *pgDashboardRepo) GetByID(ctx context.Context, id string) (*domain.Dashboard, error) {
	d := &domain.Dashboard{}
	var widgetsJSON, layoutJSON []byte
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, description, icon, owner_id, is_public, source_type, source_template_id, share_token,
		        widgets, layout, version, forked_from_id, created_at, updated_at
		 FROM dashboards WHERE id=$1`, id,
	).Scan(&d.ID, &d.Name, &d.Description, &d.Icon, &d.OwnerID, &d.IsPublic, &d.SourceType, &d.SourceTemplateID,
		&d.ShareToken, &widgetsJSON, &layoutJSON, &d.Version, &d.ForkedFromID, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(widgetsJSON, &d.Widgets); err != nil {
		return nil, fmt.Errorf("decode dashboard widgets: %w", err)
	}
	if err := json.Unmarshal(layoutJSON, &d.Layout); err != nil {
		return nil, fmt.Errorf("decode dashboard layout: %w", err)
	}
	return d, nil
}

func (r *pgDashboardRepo) Create(ctx context.Context, d *domain.Dashboard) error {
	widgetsJSON, err := json.Marshal(d.Widgets)
	if err != nil {
		return fmt.Errorf("encode dashboard widgets: %w", err)
	}
	layoutJSON, err := json.Marshal(d.Layout)
	if err != nil {
		return fmt.Errorf("encode dashboard layout: %w", err)
	}
	_, err = r.pool.Exec(ctx,
		`INSERT INTO dashboards(id, name, description, icon, owner_id, is_public, source_type, source_template_id, widgets, layout, forked_from_id)
		 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		 ON CONFLICT (id) DO NOTHING`,
		d.ID, d.Name, d.Description, d.Icon, d.OwnerID, d.IsPublic, d.SourceType, d.SourceTemplateID,
		widgetsJSON, layoutJSON, d.ForkedFromID,
	)
	return err
}

func (r *pgDashboardRepo) CreateTemplate(ctx context.Context, t *domain.DashboardTemplate) error {
	widgetsJSON, err := json.Marshal(t.Widgets)
	if err != nil {
		return fmt.Errorf("encode dashboard template widgets: %w", err)
	}
	layoutJSON, err := json.Marshal(t.Layout)
	if err != nil {
		return fmt.Errorf("encode dashboard template layout: %w", err)
	}
	_, err = r.pool.Exec(ctx,
		`INSERT INTO dashboard_templates(id, name, description, icon, category, widgets, layout)
		 VALUES($1,$2,$3,$4,$5,$6,$7)
		 ON CONFLICT (id) DO NOTHING`,
		t.ID, t.Name, t.Description, t.Icon, t.Category,
		widgetsJSON, layoutJSON,
	)
	return err
}

func (r *pgDashboardRepo) Update(ctx context.Context, d *domain.Dashboard) (bool, error) {
	widgetsJSON, err := json.Marshal(d.Widgets)
	if err != nil {
		return false, fmt.Errorf("encode dashboard widgets: %w", err)
	}
	layoutJSON, err := json.Marshal(d.Layout)
	if err != nil {
		return false, fmt.Errorf("encode dashboard layout: %w", err)
	}
	tag, err := r.pool.Exec(ctx,
		`UPDATE dashboards SET name=$1, description=$2, icon=$3, widgets=$4, layout=$5,
		        version=version+1, updated_at=NOW()
		 WHERE id=$6 AND version=$7`,
		d.Name, d.Description, d.Icon, widgetsJSON, layoutJSON, d.ID, d.Version,
	)
	return tag.RowsAffected() == 1, err
}

func (r *pgDashboardRepo) UpdateLayout(ctx context.Context, id string, layout []domain.WidgetLayout, version int) (bool, error) {
	layoutJSON, err := json.Marshal(layout)
	if err != nil {
		return false, fmt.Errorf("encode dashboard layout: %w", err)
	}
	tag, err := r.pool.Exec(ctx,
		`UPDATE dashboards SET layout=$1, version=version+1, updated_at=NOW() WHERE id=$2 AND version=$3`,
		layoutJSON, id, version,
	)
	return tag.RowsAffected() == 1, err
}

func (r *pgDashboardRepo) UpdateShare(ctx context.Context, id string, isPublic bool, shareToken *string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE dashboards SET is_public=$1, share_token=$2, updated_at=NOW() WHERE id=$3`,
		isPublic, shareToken, id,
	)
	return err
}

func (r *pgDashboardRepo) ListTemplates(ctx context.Context) ([]*domain.DashboardTemplate, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, description, icon, category, widgets, layout FROM dashboard_templates ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*domain.DashboardTemplate
	for rows.Next() {
		t := &domain.DashboardTemplate{}
		var widgetsJSON, layoutJSON []byte
		if err := rows.Scan(&t.ID, &t.Name, &t.Description, &t.Icon, &t.Category, &widgetsJSON, &layoutJSON); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(widgetsJSON, &t.Widgets); err != nil {
			return nil, fmt.Errorf("decode dashboard widgets: %w", err)
		}
		if err := json.Unmarshal(layoutJSON, &t.Layout); err != nil {
			return nil, fmt.Errorf("decode dashboard layout: %w", err)
		}
		result = append(result, t)
	}
	return result, rows.Err()
}
func (r *pgDashboardRepo) DeleteSystemTemplateDashboards(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM dashboards WHERE source_type = 'system-template'`)
	return err
}

func (r *pgDashboardRepo) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM dashboards WHERE id=$1`, id)
	return err
}
