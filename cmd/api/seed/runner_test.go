// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package seed_test

import (
	"context"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/repo"
	"github.com/getmetraly/metraly/cmd/api/seed"
)

type recordingUserRepo struct {
	created []*domain.User
}

func (r *recordingUserRepo) FindByID(ctx context.Context, id string) (*domain.User, error) {
	return nil, nil
}
func (r *recordingUserRepo) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	return nil, nil
}
func (r *recordingUserRepo) FindByOIDCSub(ctx context.Context, sub string) (*domain.User, error) {
	return nil, nil
}
func (r *recordingUserRepo) Create(ctx context.Context, u *domain.User, passwordHash string) error {
	r.created = append(r.created, u)
	return nil
}
func (r *recordingUserRepo) Upsert(ctx context.Context, u *domain.User, passwordHash string) error {
	r.created = append(r.created, u)
	return nil
}
func (r *recordingUserRepo) GetPasswordHash(ctx context.Context, email string) (string, string, error) {
	return "", "", nil
}

type recordingDashboardRepo struct {
	created        []*domain.Dashboard
	templates      []*domain.DashboardTemplate
	templateSeeded bool
}

func (r *recordingDashboardRepo) List(ctx context.Context, userID string) ([]*domain.Dashboard, error) {
	return nil, nil
}
func (r *recordingDashboardRepo) GetByID(ctx context.Context, id string) (*domain.Dashboard, error) {
	return nil, nil
}
func (r *recordingDashboardRepo) Create(ctx context.Context, d *domain.Dashboard) error {
	if !r.templateSeeded {
		return context.Canceled
	}
	r.created = append(r.created, d)
	return nil
}
func (r *recordingDashboardRepo) CreateTemplate(ctx context.Context, t *domain.DashboardTemplate) error {
	r.templateSeeded = true
	r.templates = append(r.templates, t)
	return nil
}
func (r *recordingDashboardRepo) Update(ctx context.Context, d *domain.Dashboard) (bool, error) {
	return false, nil
}
func (r *recordingDashboardRepo) UpdateLayout(ctx context.Context, id string, layout []domain.WidgetLayout, version int) (bool, error) {
	return false, nil
}
func (r *recordingDashboardRepo) UpdateShare(ctx context.Context, id string, isPublic bool, shareToken *string) error {
	return nil
}
func (r *recordingDashboardRepo) ListTemplates(ctx context.Context) ([]*domain.DashboardTemplate, error) {
	return nil, nil
}
func (r *recordingDashboardRepo) DeleteSystemTemplateDashboards(ctx context.Context) error {
	return nil
}

type recordingPluginRepo struct {
	created []*domain.Plugin
}

func (r *recordingPluginRepo) List(ctx context.Context) ([]*domain.Plugin, error) { return nil, nil }
func (r *recordingPluginRepo) Install(ctx context.Context, id string) error       { return nil }
func (r *recordingPluginRepo) BulkInsert(ctx context.Context, plugins []*domain.Plugin) error {
	r.created = append(r.created, plugins...)
	return nil
}

type recordingInsightRepo struct {
	created []*domain.AIInsight
}

func (r *recordingInsightRepo) List(ctx context.Context) ([]*domain.AIInsight, error) {
	return nil, nil
}
func (r *recordingInsightRepo) BulkInsert(ctx context.Context, insights []*domain.AIInsight) error {
	r.created = append(r.created, insights...)
	return nil
}

type recordingActivityRepo struct {
	created []*domain.ActivityEvent
}

func (r *recordingActivityRepo) List(_ context.Context, _ string, _ int) ([]*domain.ActivityEvent, error) {
	return nil, nil
}
func (r *recordingActivityRepo) BulkInsert(ctx context.Context, events []*domain.ActivityEvent) error {
	r.created = append(r.created, events...)
	return nil
}

type recordingMetricRepo struct {
	calls int
}

func (r *recordingMetricRepo) GetTimeSeries(ctx context.Context, metricID, team string, from, to time.Time) ([]domain.MetricDataPoint, error) {
	return nil, nil
}
func (r *recordingMetricRepo) GetBreakdown(ctx context.Context, metricID string, from, to time.Time) ([]domain.MetricBreakdownItem, error) {
	return nil, nil
}
func (r *recordingMetricRepo) BulkInsert(ctx context.Context, points []domain.MetricDataPoint, metricID, team string) error {
	r.calls++
	return nil
}

var _ repo.UserRepo = (*recordingUserRepo)(nil)
var _ repo.DashboardRepo = (*recordingDashboardRepo)(nil)
var _ repo.PluginRepo = (*recordingPluginRepo)(nil)
var _ repo.AIInsightRepo = (*recordingInsightRepo)(nil)
var _ repo.ActivityRepo = (*recordingActivityRepo)(nil)
var _ repo.MetricRepo = (*recordingMetricRepo)(nil)

func TestRunnerSeedsSandboxIncData(t *testing.T) {
	users := &recordingUserRepo{}
	dashboards := &recordingDashboardRepo{}
	plugins := &recordingPluginRepo{}
	insights := &recordingInsightRepo{}
	activity := &recordingActivityRepo{}
	metrics := &recordingMetricRepo{}

	runner := seed.NewRunner(users, dashboards, plugins, insights, activity, metrics)
	if err := runner.Run(context.Background(), "admin@sandbox.invalid", "password123"); err != nil {
		t.Fatalf("runner failed: %v", err)
	}

	if got := len(users.created); got != 1 {
		t.Fatalf("expected one seeded user, got %d", got)
	}
	if got := len(dashboards.created); got != 1 {
		t.Fatalf("expected exactly 1 seeded dashboard (sandbox-all-widgets), got %d", got)
	}
	seeded := dashboards.created[0]
	if seeded.ID != "sandbox-all-widgets" {
		t.Fatalf("expected dashboard id sandbox-all-widgets, got %q", seeded.ID)
	}
	if seeded.Name != "Demo" {
		t.Fatalf("expected dashboard name Demo, got %q", seeded.Name)
	}
	if seeded.Icon != "sparkles" {
		t.Fatalf("expected dashboard icon sparkles, got %q", seeded.Icon)
	}
	if got := len(seeded.Widgets); got != 16 {
		t.Fatalf("expected 16 widgets in seeded dashboard, got %d", got)
	}
	if got := len(plugins.created); got == 0 {
		t.Fatal("expected seeded plugins")
	}
	if got := len(insights.created); got < 6 {
		t.Fatalf("expected seeded insights, got %d", got)
	}
	if got := len(activity.created); got < 5 {
		t.Fatalf("expected seeded activity events, got %d", got)
	}
	if got := metrics.calls; got < len(seedMetricIDsForTest())*5 {
		t.Fatalf("expected seeded metric series, got %d calls", got)
	}
}

func seedMetricIDsForTest() []string {
	return []string{
		"deploy-freq",
		"lead-time",
		"cfr",
		"mttr",
		"ci-pass",
		"pr-cycle",
		"pr-review",
		"health-score",
		"velocity",
		"throughput",
	}
}
