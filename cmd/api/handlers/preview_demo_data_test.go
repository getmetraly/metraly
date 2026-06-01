package handlers

import (
	"context"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/cache"
	"github.com/getmetraly/metraly/cmd/api/domain"
)

type zeroMetricRepo struct{}

func (zeroMetricRepo) GetTimeSeries(context.Context, string, string, time.Time, time.Time) ([]domain.MetricDataPoint, error) {
	return []domain.MetricDataPoint{}, nil
}

func (zeroMetricRepo) GetBreakdown(context.Context, string, time.Time, time.Time) ([]domain.MetricBreakdownItem, error) {
	return []domain.MetricBreakdownItem{}, nil
}

func (zeroMetricRepo) BulkInsert(context.Context, []domain.MetricDataPoint, string, string) error {
	return nil
}

type missCache struct{}

func (missCache) Get(context.Context, string, string) ([]domain.MetricDataPoint, error) {
	return nil, cache.ErrCacheMiss
}

func (missCache) Set(context.Context, string, string, []domain.MetricDataPoint) error {
	return nil
}

type zeroActivityRepo struct{}

func (zeroActivityRepo) List(context.Context, string, int) ([]*domain.ActivityEvent, error) {
	return []*domain.ActivityEvent{}, nil
}

func (zeroActivityRepo) BulkInsert(context.Context, []*domain.ActivityEvent) error {
	return nil
}

type zeroInsightRepo struct{}

func (zeroInsightRepo) List(context.Context) ([]*domain.AIInsight, error) {
	return []*domain.AIInsight{}, nil
}

func (zeroInsightRepo) BulkInsert(context.Context, []*domain.AIInsight) error {
	return nil
}

func newPreviewHandlerWithEmptySources() *PreviewHandler {
	metricsSvc := biz.NewMetricsSvc(zeroMetricRepo{}, missCache{})
	return NewPreviewHandler(nil, nil, metricsSvc, zeroActivityRepo{}, zeroInsightRepo{})
}

func TestPreviewHandler_DemoFallbacks_VisualWidgetsAreNonEmpty(t *testing.T) {
	h := newPreviewHandlerWithEmptySources()
	ctx := context.Background()

	chart, err := h.metricChartData(ctx, "pr-cycle")
	if err != nil {
		t.Fatalf("metricChartData failed: %v", err)
	}
	chartMap := chart.(map[string]any)
	current := chartMap["current"].(map[string]any)
	if len(current["values"].([]float64)) == 0 {
		t.Fatal("expected non-empty metric-chart current.values")
	}

	compare, err := h.compareBarData(ctx, "velocity")
	if err != nil {
		t.Fatalf("compareBarData failed: %v", err)
	}
	compareMap := compare.(map[string]any)
	if len(compareMap["primary"].(map[string]any)["values"].([]float64)) == 0 {
		t.Fatal("expected non-empty compare-bar primary.values")
	}

	burndown, err := h.sprintBurndownData(ctx)
	if err != nil {
		t.Fatalf("sprintBurndownData failed: %v", err)
	}
	burndownMap := burndown.(map[string]any)
	if len(burndownMap["ideal"].(map[string]any)["values"].([]float64)) == 0 {
		t.Fatal("expected non-empty sprint-burndown ideal.values")
	}

	activity, err := h.activityData(ctx)
	if err != nil {
		t.Fatalf("activityData failed: %v", err)
	}
	activityMap := activity.(map[string]any)
	if len(activityMap["activities"].([]map[string]any)) == 0 {
		t.Fatal("expected non-empty recent-activity activities")
	}

	table, err := h.tableData(ctx, "pr-queue")
	if err != nil {
		t.Fatalf("tableData failed: %v", err)
	}
	tableMap := table.(map[string]any)
	if len(tableMap["rows"].([]map[string]any)) == 0 {
		t.Fatal("expected non-empty data-table rows")
	}
}

func TestPreviewHandler_RegistrySupportsSandboxWidgetTypes(t *testing.T) {
	h := newPreviewHandlerWithEmptySources()
	ctx := context.Background()
	widgetTypes := []string{
		"section-header",
		"stat-card",
		"metric-chart",
		"dora-overview",
		"leaderboard",
		"data-table",
		"heatmap",
		"sprint-burndown",
		"ai-insight",
		"anomaly-detector",
		"compare-bar-chart",
		"recent-activity",
		"health-gauge",
	}
	for _, widgetType := range widgetTypes {
		if _, err := h.widgets.Process(ctx, widgetType, nil, nil); err != nil {
			t.Fatalf("widget processor missing or failing for %s: %v", widgetType, err)
		}
	}
}
