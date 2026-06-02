// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package seed

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/repo"
	"golang.org/x/crypto/bcrypt"
)

var sandboxTeams = []string{"Atlas", "Beacon", "Comet", "Delta", "Echo"}

var metricIDs = []string{
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

const (
	DemoDashboardID           = "sandbox-all-widgets"
	DemoDeletedTombstoneKey   = "demo_dashboard_deleted"
	DemoDeletedTombstoneValue = "true"
)

type Runner struct {
	users      repo.UserRepo
	dashboards repo.DashboardRepo
	seedState  repo.SeedStateRepo
	plugins    repo.PluginRepo
	insights   repo.AIInsightRepo
	activity   repo.ActivityRepo
	metrics    repo.MetricRepo
}

func NewRunner(
	users repo.UserRepo,
	dashboards repo.DashboardRepo,
	seedState repo.SeedStateRepo,
	plugins repo.PluginRepo,
	insights repo.AIInsightRepo,
	activity repo.ActivityRepo,
	metrics repo.MetricRepo,
) *Runner {
	return &Runner{
		users:      users,
		dashboards: dashboards,
		seedState:  seedState,
		plugins:    plugins,
		insights:   insights,
		activity:   activity,
		metrics:    metrics,
	}
}

func (r *Runner) Run(ctx context.Context, adminEmail, adminPassword string) error {
	if err := r.seedAdmin(ctx, adminEmail, adminPassword); err != nil {
		return fmt.Errorf("seed admin: %w", err)
	}
	if err := r.seedTemplates(ctx); err != nil {
		return fmt.Errorf("seed templates: %w", err)
	}
	if err := r.seedDashboards(ctx); err != nil {
		return fmt.Errorf("seed dashboards: %w", err)
	}
	if err := r.plugins.BulkInsert(ctx, seedPlugins); err != nil {
		return fmt.Errorf("seed plugins: %w", err)
	}
	if err := r.insights.BulkInsert(ctx, seedInsights); err != nil {
		return fmt.Errorf("seed insights: %w", err)
	}
	if err := r.seedActivities(ctx); err != nil {
		return fmt.Errorf("seed activity: %w", err)
	}
	if err := r.seedMetrics(ctx); err != nil {
		return fmt.Errorf("seed metrics: %w", err)
	}
	return nil
}

func (r *Runner) seedAdmin(ctx context.Context, email, password string) error {
	if email == "" || password == "" {
		return fmt.Errorf("seed admin email and password are required")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user := &domain.User{
		ID:     "admin-seed",
		Name:   "Admin",
		Email:  email,
		Avatar: "",
		Role:   "admin",
	}
	return r.users.Upsert(ctx, user, string(hash))
}

func (r *Runner) seedDashboards(ctx context.Context) error {
	if err := r.dashboards.DeleteSystemTemplateDashboards(ctx); err != nil {
		return fmt.Errorf("delete old system dashboards: %w", err)
	}
	existing, err := r.dashboards.GetByID(ctx, sandboxAllWidgets.ID)
	if err == nil && existing != nil {
		return nil
	}
	if r.seedState != nil {
		value, exists, err := r.seedState.Get(ctx, DemoDeletedTombstoneKey)
		if err != nil {
			return fmt.Errorf("check demo tombstone: %w", err)
		}
		if exists && value == DemoDeletedTombstoneValue {
			return nil
		}
	}
	return r.dashboards.Create(ctx, sandboxAllWidgets)
}

func (r *Runner) RestoreDemo(ctx context.Context) error {
	if r.seedState != nil {
		if err := r.seedState.Delete(ctx, DemoDeletedTombstoneKey); err != nil {
			return fmt.Errorf("clear demo tombstone: %w", err)
		}
	}
	existing, err := r.dashboards.GetByID(ctx, DemoDashboardID)
	if err == nil && existing != nil {
		return nil
	}
	return r.dashboards.Create(ctx, sandboxAllWidgets)
}

func (r *Runner) seedTemplates(ctx context.Context) error {
	for _, template := range seedTemplates {
		if err := r.dashboards.CreateTemplate(ctx, template); err != nil {
			return err
		}
	}
	return nil
}

func (r *Runner) seedActivities(ctx context.Context) error {
	events := []*domain.ActivityEvent{
		{
			ID:          "activity-1",
			Type:        "review",
			Title:       "Atlas PRs waiting on review",
			Description: "Three Atlas pull requests have been waiting more than 24 hours for a first review.",
			Timestamp:   fixedSeedTime(-2 * time.Hour),
			User:        domain.ActivityUser{Name: "Sandbox Bot", Avatar: ""},
		},
		{
			ID:          "activity-2",
			Type:        "deploy",
			Title:       "Beacon deployment trend improved",
			Description: "Beacon increased deployment frequency while keeping change failure low.",
			Timestamp:   fixedSeedTime(-6 * time.Hour),
			User:        domain.ActivityUser{Name: "Beacon CD", Avatar: ""},
		},
		{
			ID:          "activity-3",
			Type:        "merge",
			Title:       "Comet flaky tests patched",
			Description: "A timeout-heavy integration suite was narrowed down to a small set of failing tests.",
			Timestamp:   fixedSeedTime(-10 * time.Hour),
			User:        domain.ActivityUser{Name: "Comet CI", Avatar: ""},
		},
		{
			ID:          "activity-4",
			Type:        "alert",
			Title:       "Delta rollback completed",
			Description: "A rolled-back Delta deployment resolved the incident within the expected MTTR window.",
			Timestamp:   fixedSeedTime(-18 * time.Hour),
			User:        domain.ActivityUser{Name: "Delta Ops", Avatar: ""},
		},
		{
			ID:          "activity-5",
			Type:        "review",
			Title:       "Prompt injection trap ignored",
			Description: "Demo content contains untrusted text, but only approved metric context should influence the output.",
			Timestamp:   fixedSeedTime(-26 * time.Hour),
			User:        domain.ActivityUser{Name: "Security Demo", Avatar: ""},
		},
	}
	return r.activity.BulkInsert(ctx, events)
}

func (r *Runner) seedMetrics(ctx context.Context) error {
	for _, team := range sandboxTeams {
		for _, spec := range metricSeriesSpecs(team) {
			points := buildSeries(fixedSeedTime(0), spec)
			if err := r.metrics.BulkInsert(ctx, points, spec.metricID, team); err != nil {
				return err
			}
		}
	}
	return nil
}

type metricSeriesSpec struct {
	metricID string
	base     float64
	slope    float64
	wiggle   float64
}

func metricSeriesSpecs(team string) []metricSeriesSpec {
	switch team {
	case "Atlas":
		return []metricSeriesSpec{
			{metricID: "deploy-freq", base: 3.1, slope: 0.01, wiggle: 0.08},
			{metricID: "lead-time", base: 72, slope: 0.18, wiggle: 0.4},
			{metricID: "cfr", base: 4.4, slope: 0.02, wiggle: 0.06},
			{metricID: "mttr", base: 48, slope: -0.1, wiggle: 0.5},
			{metricID: "ci-pass", base: 92, slope: 0.03, wiggle: 0.2},
			{metricID: "pr-cycle", base: 4.8, slope: 0.05, wiggle: 0.05},
			{metricID: "pr-review", base: 2.8, slope: 0.03, wiggle: 0.04},
			{metricID: "health-score", base: 70, slope: 0.05, wiggle: 0.1},
			{metricID: "velocity", base: 32, slope: 0.15, wiggle: 0.2},
			{metricID: "throughput", base: 18, slope: 0.1, wiggle: 0.15},
		}
	case "Beacon":
		return []metricSeriesSpec{
			{metricID: "deploy-freq", base: 5.8, slope: 0.16, wiggle: 0.08},
			{metricID: "lead-time", base: 18, slope: -0.12, wiggle: 0.3},
			{metricID: "cfr", base: 2.3, slope: -0.01, wiggle: 0.03},
			{metricID: "mttr", base: 22, slope: -0.08, wiggle: 0.3},
			{metricID: "ci-pass", base: 96, slope: 0.04, wiggle: 0.15},
			{metricID: "pr-cycle", base: 2.1, slope: -0.04, wiggle: 0.05},
			{metricID: "pr-review", base: 1.0, slope: -0.01, wiggle: 0.03},
			{metricID: "health-score", base: 85, slope: 0.04, wiggle: 0.08},
			{metricID: "velocity", base: 42, slope: 0.12, wiggle: 0.18},
			{metricID: "throughput", base: 24, slope: 0.08, wiggle: 0.12},
		}
	case "Comet":
		return []metricSeriesSpec{
			{metricID: "deploy-freq", base: 4.0, slope: -0.02, wiggle: 0.08},
			{metricID: "lead-time", base: 28, slope: 0.05, wiggle: 0.25},
			{metricID: "cfr", base: 5.2, slope: 0.06, wiggle: 0.08},
			{metricID: "mttr", base: 55, slope: 0.2, wiggle: 0.45},
			{metricID: "ci-pass", base: 83, slope: -0.18, wiggle: 0.22},
			{metricID: "pr-cycle", base: 3.2, slope: 0.04, wiggle: 0.05},
			{metricID: "pr-review", base: 1.7, slope: 0.03, wiggle: 0.03},
			{metricID: "health-score", base: 67, slope: -0.05, wiggle: 0.1},
			{metricID: "velocity", base: 36, slope: 0.08, wiggle: 0.15},
			{metricID: "throughput", base: 21, slope: 0.04, wiggle: 0.1},
		}
	case "Delta":
		return []metricSeriesSpec{
			{metricID: "deploy-freq", base: 4.8, slope: 0.02, wiggle: 0.06},
			{metricID: "lead-time", base: 24, slope: -0.03, wiggle: 0.2},
			{metricID: "cfr", base: 3.8, slope: 0.01, wiggle: 0.05},
			{metricID: "mttr", base: 82, slope: 0.15, wiggle: 0.6},
			{metricID: "ci-pass", base: 95, slope: 0.02, wiggle: 0.1},
			{metricID: "pr-cycle", base: 2.4, slope: 0.03, wiggle: 0.04},
			{metricID: "pr-review", base: 1.1, slope: 0.01, wiggle: 0.02},
			{metricID: "health-score", base: 74, slope: 0.02, wiggle: 0.08},
			{metricID: "velocity", base: 28, slope: -0.03, wiggle: 0.1},
			{metricID: "throughput", base: 15, slope: -0.02, wiggle: 0.08},
		}
	case "Echo":
		return []metricSeriesSpec{
			{metricID: "deploy-freq", base: 2.2, slope: 0.04, wiggle: 0.05},
			{metricID: "lead-time", base: 40, slope: 0.06, wiggle: 0.35},
			{metricID: "cfr", base: 3.1, slope: 0.00, wiggle: 0.05},
			{metricID: "mttr", base: 28, slope: 0.02, wiggle: 0.25},
			{metricID: "ci-pass", base: 90, slope: 0.03, wiggle: 0.12},
			{metricID: "pr-cycle", base: 3.8, slope: 0.02, wiggle: 0.04},
			{metricID: "pr-review", base: 2.0, slope: 0.01, wiggle: 0.03},
			{metricID: "health-score", base: 68, slope: 0.03, wiggle: 0.08},
			{metricID: "velocity", base: 20, slope: 0.02, wiggle: 0.08},
			{metricID: "throughput", base: 10, slope: 0.01, wiggle: 0.05},
		}
	default:
		return nil
	}
}

func buildSeries(anchor time.Time, spec metricSeriesSpec) []domain.MetricDataPoint {
	const points = 14
	start := anchor.AddDate(0, 0, -points+1)
	series := make([]domain.MetricDataPoint, 0, points)
	for i := 0; i < points; i++ {
		value := spec.base + spec.slope*float64(i)
		if i%2 == 0 {
			value += spec.wiggle
		} else {
			value -= spec.wiggle / 2
		}
		series = append(series, domain.MetricDataPoint{
			Time:  start.AddDate(0, 0, i),
			Value: value,
		})
	}
	return series
}

func fixedSeedTime(offset time.Duration) time.Time {
	base := time.Date(2026, 5, 6, 12, 0, 0, 0, time.UTC)
	return base.Add(offset)
}

func mustJSON(v any) json.RawMessage {
	b, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return b
}

func stringPtr(s string) *string {
	return &s
}

var sandboxAllWidgets = &domain.Dashboard{
	ID:               DemoDashboardID,
	Name:             "Demo",
	Description:      "All Metraly widgets with backend-generated demo data",
	Icon:             "sparkles",
	OwnerID:          "admin-seed",
	IsPublic:         true,
	SourceType:       domain.DashboardSourceUserCreated,
	SourceTemplateID: stringPtr("all-widgets"),
	Widgets: []domain.WidgetInstance{
		{InstanceID: "all-section-exec", WidgetType: "section-header", Config: mustJSON(map[string]any{"type": "section-header", "title": "Executive Overview"})},
		{InstanceID: "all-stat-deploy", WidgetType: "stat-card", Config: mustJSON(map[string]any{"type": "stat-card", "metricId": "deploy-freq", "showSparkline": true, "colorKey": "success"})},
		{InstanceID: "all-stat-lead", WidgetType: "stat-card", Config: mustJSON(map[string]any{"type": "stat-card", "metricId": "lead-time", "showSparkline": true, "colorKey": "purple"})},
		{InstanceID: "all-stat-cfr", WidgetType: "stat-card", Config: mustJSON(map[string]any{"type": "stat-card", "metricId": "cfr", "showSparkline": true, "colorKey": "warning"})},
		{InstanceID: "all-stat-mttr", WidgetType: "stat-card", Config: mustJSON(map[string]any{"type": "stat-card", "metricId": "mttr", "showSparkline": true, "colorKey": "error"})},
		{InstanceID: "all-dora", WidgetType: "dora-overview", Config: mustJSON(map[string]any{"type": "dora-overview"})},
		{InstanceID: "all-gauge", WidgetType: "health-gauge", Config: mustJSON(map[string]any{"type": "health-gauge", "metricId": "health-score"})},
		{InstanceID: "all-metric-pr", WidgetType: "metric-chart", Config: mustJSON(map[string]any{"type": "metric-chart", "metricId": "pr-cycle", "chartVariant": "area", "showCompare": false})},
		{InstanceID: "all-compare", WidgetType: "compare-bar-chart", Config: mustJSON(map[string]any{"type": "compare-bar-chart", "metricId": "velocity"})},
		{InstanceID: "all-heatmap", WidgetType: "heatmap", Config: mustJSON(map[string]any{"type": "heatmap", "rowGroupBy": "team", "columns": 14})},
		{InstanceID: "all-leaderboard", WidgetType: "leaderboard", Config: mustJSON(map[string]any{"type": "leaderboard", "metricId": "velocity"})},
		{InstanceID: "all-table", WidgetType: "data-table", Config: mustJSON(map[string]any{"type": "data-table", "tableType": "pr-queue", "maxRows": 5})},
		{InstanceID: "all-burndown", WidgetType: "sprint-burndown", Config: mustJSON(map[string]any{"type": "sprint-burndown", "showTaskList": false})},
		{InstanceID: "all-ai", WidgetType: "ai-insight", Config: mustJSON(map[string]any{"type": "ai-insight", "variant": "card", "topicHint": "delivery health"})},
		{InstanceID: "all-anomaly", WidgetType: "anomaly-detector", Config: mustJSON(map[string]any{"type": "anomaly-detector", "watchMetrics": []string{"deploy-freq", "lead-time"}})},
		{InstanceID: "all-activity", WidgetType: "recent-activity", Config: mustJSON(map[string]any{"type": "recent-activity", "maxItems": 8})},
	},
	Layout: []domain.WidgetLayout{
		{InstanceID: "all-section-exec", X: 0, Y: 0, W: 12, H: 1},
		{InstanceID: "all-stat-deploy", X: 0, Y: 1, W: 3, H: 2},
		{InstanceID: "all-stat-lead", X: 3, Y: 1, W: 3, H: 2},
		{InstanceID: "all-stat-cfr", X: 6, Y: 1, W: 3, H: 2},
		{InstanceID: "all-stat-mttr", X: 9, Y: 1, W: 3, H: 2},
		{InstanceID: "all-dora", X: 0, Y: 3, W: 8, H: 3},
		{InstanceID: "all-gauge", X: 8, Y: 3, W: 4, H: 3},
		{InstanceID: "all-metric-pr", X: 0, Y: 6, W: 6, H: 3},
		{InstanceID: "all-compare", X: 6, Y: 6, W: 6, H: 3},
		{InstanceID: "all-heatmap", X: 0, Y: 9, W: 8, H: 3},
		{InstanceID: "all-leaderboard", X: 8, Y: 9, W: 4, H: 3},
		{InstanceID: "all-table", X: 0, Y: 12, W: 6, H: 3},
		{InstanceID: "all-burndown", X: 6, Y: 12, W: 6, H: 3},
		{InstanceID: "all-ai", X: 0, Y: 15, W: 12, H: 3},
		{InstanceID: "all-anomaly", X: 0, Y: 18, W: 6, H: 2},
		{InstanceID: "all-activity", X: 6, Y: 18, W: 6, H: 3},
	},
}
