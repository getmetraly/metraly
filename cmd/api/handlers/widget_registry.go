// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
)

type widgetProcessor func(context.Context, string, json.RawMessage, *domain.Dashboard) (any, error)

type widgetProcessorRegistry struct {
	processors map[string]widgetProcessor
	fallback   widgetProcessor
}

func newWidgetProcessorRegistry(h *PreviewHandler) *widgetProcessorRegistry {
	r := &widgetProcessorRegistry{
		processors: make(map[string]widgetProcessor),
		fallback: func(_ context.Context, widgetType string, _ json.RawMessage, _ *domain.Dashboard) (any, error) {
			return nil, fmt.Errorf("unsupported widget type: %s", widgetType)
		},
	}

	r.register("stat-card", func(ctx context.Context, _ string, config json.RawMessage, _ *domain.Dashboard) (any, error) {
		return h.statCardData(ctx, parseWidgetMetric(config, "deploy-freq"))
	})
	r.register("metric-chart", func(ctx context.Context, _ string, config json.RawMessage, _ *domain.Dashboard) (any, error) {
		return h.metricChartData(ctx, parseWidgetMetric(config, "deploy-freq"))
	})
	r.register("leaderboard", func(ctx context.Context, _ string, config json.RawMessage, _ *domain.Dashboard) (any, error) {
		return h.leaderboardData(ctx, parseWidgetMetric(config, "deploy-freq"))
	})
	r.register("data-table", func(ctx context.Context, _ string, config json.RawMessage, _ *domain.Dashboard) (any, error) {
		return h.tableData(ctx, parseTableType(config))
	})
	r.register("dora-overview", func(ctx context.Context, _ string, _ json.RawMessage, _ *domain.Dashboard) (any, error) {
		return h.buildDORA(ctx, "30d", "All teams", "All repos")
	})
	r.register("heatmap", func(_ context.Context, _ string, config json.RawMessage, _ *domain.Dashboard) (any, error) {
		return buildHeatmapData(config), nil
	})
	r.register("sprint-burndown", func(ctx context.Context, _ string, _ json.RawMessage, _ *domain.Dashboard) (any, error) {
		return h.sprintBurndownData(ctx)
	})
	r.register("ai-insight", func(ctx context.Context, _ string, config json.RawMessage, _ *domain.Dashboard) (any, error) {
		return h.insightData(ctx, parseTopicHint(config))
	})
	r.register("anomaly-detector", func(context.Context, string, json.RawMessage, *domain.Dashboard) (any, error) {
		return map[string]any{
			"status":         "healthy",
			"summary":        "12 signals monitored · no critical anomalies",
			"signalsChecked": 12,
			"lastChecked":    time.Now().UTC().Format(time.RFC3339),
			"window":         "30d",
			"thresholds": []map[string]any{
				{"name": "Deploy Frequency", "value": "4.0/week", "status": "ok"},
				{"name": "Lead Time", "value": "15.4h", "status": "ok"},
				{"name": "Change Failure Rate", "value": "9.1%", "status": "ok"},
				{"name": "MTTR", "value": "39m", "status": "ok"},
			},
			"anomalies": []map[string]any{},
		}, nil
	})
	r.register("compare-bar-chart", func(ctx context.Context, _ string, config json.RawMessage, _ *domain.Dashboard) (any, error) {
		return h.compareBarData(ctx, parseWidgetMetric(config, "velocity"))
	})
	r.register("recent-activity", func(ctx context.Context, _ string, _ json.RawMessage, _ *domain.Dashboard) (any, error) {
		return h.activityData(ctx)
	})
	r.register("section-header", func(context.Context, string, json.RawMessage, *domain.Dashboard) (any, error) {
		return map[string]any{}, nil
	})
	r.register("health-gauge", func(ctx context.Context, _ string, config json.RawMessage, _ *domain.Dashboard) (any, error) {
		return h.gaugeData(ctx, parseWidgetMetric(config, "health-score"))
	})

	return r
}

func (r *widgetProcessorRegistry) register(widgetType string, processor widgetProcessor) {
	r.processors[widgetType] = processor
}

func (r *widgetProcessorRegistry) Process(ctx context.Context, widgetType string, config json.RawMessage, dashboard *domain.Dashboard) (any, error) {
	if r == nil {
		return nil, fmt.Errorf("widget registry unavailable")
	}
	processor, ok := r.processors[widgetType]
	if !ok {
		return r.fallback(ctx, widgetType, config, dashboard)
	}
	return processor(ctx, widgetType, config, dashboard)
}
