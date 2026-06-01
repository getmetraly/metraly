// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/repo"
	"github.com/getmetraly/metraly/cmd/api/respond"
	"github.com/go-chi/chi/v5"
)

type PreviewHandler struct {
	dashboardSvc *biz.DashboardSvc
	templateSvc  *biz.TemplateSvc
	metricsSvc   *biz.MetricsSvc
	activityRepo repo.ActivityRepo
	insightRepo  repo.AIInsightRepo
	widgets      *widgetProcessorRegistry
}

func NewPreviewHandler(
	dashboardSvc *biz.DashboardSvc,
	templateSvc *biz.TemplateSvc,
	metricsSvc *biz.MetricsSvc,
	activityRepo repo.ActivityRepo,
	insightRepo repo.AIInsightRepo,
) *PreviewHandler {
	h := &PreviewHandler{
		dashboardSvc: dashboardSvc,
		templateSvc:  templateSvc,
		metricsSvc:   metricsSvc,
		activityRepo: activityRepo,
		insightRepo:  insightRepo,
	}
	h.widgets = newWidgetProcessorRegistry(h)
	return h
}

func (h *PreviewHandler) Templates(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.templateSvc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "template service unavailable")
		return
	}

	templates, err := h.templateSvc.List(r.Context())
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "TEMPLATES_LIST_FAILED", "failed to list templates")
		return
	}
	respond.JSON(w, http.StatusOK, templates)
}

func (h *PreviewHandler) DORA(w http.ResponseWriter, r *http.Request) {
	if !h.ready() {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "metrics service unavailable")
		return
	}

	resp, err := h.buildDORA(r.Context(), h.metricRange(r), h.metricTeam(r), h.metricRepo(r))
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "DORA_FAILED", "failed to compute DORA metrics")
		return
	}
	respond.JSON(w, http.StatusOK, resp)
}

func (h *PreviewHandler) Metric(w http.ResponseWriter, r *http.Request) {
	if !h.ready() {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "metrics service unavailable")
		return
	}

	metricID := chi.URLParam(r, "metricId")
	if metricID == "" {
		metricID = r.URL.Query().Get("metric")
	}
	if metricID == "" {
		respond.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "metricId is required")
		return
	}

	resp, err := h.metricsSvc.GetMetric(r.Context(), metricID, h.metricRange(r), h.metricTeam(r))
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "METRIC_FAILED", "failed to fetch metric")
		return
	}
	respond.JSON(w, http.StatusOK, resp)
}

func (h *PreviewHandler) Breakdown(w http.ResponseWriter, r *http.Request) {
	if !h.ready() {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "metrics service unavailable")
		return
	}

	metricID := chi.URLParam(r, "metricId")
	if metricID == "" {
		metricID = r.URL.Query().Get("metric")
	}
	if metricID == "" {
		respond.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "metricId is required")
		return
	}

	resp, err := h.metricsSvc.GetBreakdown(r.Context(), metricID, h.metricRange(r))
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "METRIC_BREAKDOWN_FAILED", "failed to fetch metric breakdown")
		return
	}
	respond.JSON(w, http.StatusOK, resp)
}

func (h *PreviewHandler) Insights(w http.ResponseWriter, r *http.Request) {
	if !h.readyInsights() {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "insights unavailable")
		return
	}

	insights, err := h.insightRepo.List(r.Context())
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "INSIGHTS_FAILED", "failed to fetch insights")
		return
	}
	respond.JSON(w, http.StatusOK, insights)
}

func (h *PreviewHandler) Activity(w http.ResponseWriter, r *http.Request) {
	if !h.readyActivity() {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "activity unavailable")
		return
	}

	wsID, _ := workspaceID(r)
	activity, err := h.activityRepo.List(r.Context(), wsID, 10)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "ACTIVITY_FAILED", "failed to fetch activity")
		return
	}
	respond.JSON(w, http.StatusOK, activity)
}

func (h *PreviewHandler) DashboardData(w http.ResponseWriter, r *http.Request) {
	if !h.readyDashboard() {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}

	dashboardID := chi.URLParam(r, "id")
	if dashboardID == "" {
		respond.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "dashboard id is required")
		return
	}

	dashboard, err := h.dashboardSvc.GetByID(r.Context(), dashboardID)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	widgets := make([]widgetDataItem, 0, len(dashboard.Widgets))
	for _, widget := range dashboard.Widgets {
		data, err := h.widgetDataFor(r.Context(), widget.WidgetType, widget.Config, dashboard)
		item := widgetDataItem{InstanceID: widget.InstanceID}
		if err != nil {
			item.Error = err.Error()
		} else {
			item.Data = data
		}
		widgets = append(widgets, item)
	}

	respond.JSON(w, http.StatusOK, widgetDataResponse{
		Widgets:   widgets,
		FetchedAt: time.Now().UTC(),
	})
}

func (h *PreviewHandler) WidgetsData(w http.ResponseWriter, r *http.Request) {
	if !h.readyDashboard() {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}

	var req widgetDataRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	if req.DashboardID == "" {
		respond.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "dashboardId is required")
		return
	}

	dashboard, err := h.dashboardSvc.GetByID(r.Context(), req.DashboardID)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	widgets := req.Widgets
	if len(widgets) == 0 {
		widgets = widgetInputsFromInstances(dashboard.Widgets)
	}

	items := make([]widgetDataItem, 0, len(widgets))
	for _, widget := range widgets {
		data, err := h.widgetDataFor(r.Context(), widget.WidgetType, widget.Config, dashboard)
		item := widgetDataItem{InstanceID: widget.InstanceID}
		if err != nil {
			item.Error = err.Error()
		} else {
			item.Data = data
		}
		items = append(items, item)
	}

	respond.JSON(w, http.StatusOK, widgetDataResponse{
		Widgets:   items,
		FetchedAt: time.Now().UTC(),
	})
}

type widgetDataRequest struct {
	DashboardID string        `json:"dashboardId"`
	Widgets     []widgetInput `json:"widgets"`
}

type widgetInput struct {
	InstanceID string          `json:"instanceId"`
	WidgetType string          `json:"widgetType"`
	Config     json.RawMessage `json:"config"`
}

func widgetInputsFromInstances(widgets []domain.WidgetInstance) []widgetInput {
	items := make([]widgetInput, 0, len(widgets))
	for _, widget := range widgets {
		items = append(items, widgetInput{
			InstanceID: widget.InstanceID,
			WidgetType: widget.WidgetType,
			Config:     widget.Config,
		})
	}
	return items
}

type widgetDataResponse struct {
	Widgets   []widgetDataItem `json:"widgets"`
	FetchedAt time.Time        `json:"fetchedAt"`
}

type widgetDataItem struct {
	InstanceID string `json:"instanceId"`
	Data       any    `json:"data,omitempty"`
	Error      string `json:"error,omitempty"`
}

type metricSnapshot struct {
	MetricID  string                   `json:"metricId"`
	Label     string                   `json:"label"`
	Unit      string                   `json:"unit"`
	Current   domain.MetricDataPoint   `json:"-"`
	Series    []float64                `json:"series"`
	Labels    []string                 `json:"labels"`
	Previous  []float64                `json:"previous"`
	CurrentTS []domain.MetricDataPoint `json:"-"`
}

type doraDetail struct {
	ID              string         `json:"id"`
	Label           string         `json:"label"`
	CurrentValue    string         `json:"currentValue"`
	CurrentValueRaw float64        `json:"currentValueRaw"`
	Delta           string         `json:"delta"`
	Level           string         `json:"level"`
	BenchmarkNote   string         `json:"benchmarkNote"`
	TimeSeries      map[string]any `json:"timeSeries"`
}

type doraResponse struct {
	DeployFrequency   doraDetail `json:"deployFrequency"`
	LeadTime          doraDetail `json:"leadTime"`
	ChangeFailureRate doraDetail `json:"changeFailureRate"`
	MTTR              doraDetail `json:"mttr"`
}

type metricDescriptor struct {
	Label string
	Unit  string
}

var metricCatalog = map[string]metricDescriptor{
	"deploy-freq":  {Label: "Deploy Frequency", Unit: "/week"},
	"lead-time":    {Label: "Lead Time", Unit: "h"},
	"cfr":          {Label: "Change Failure Rate", Unit: "%"},
	"mttr":         {Label: "MTTR", Unit: "min"},
	"ci-pass":      {Label: "CI Pass Rate", Unit: "%"},
	"ci-duration":  {Label: "CI Duration", Unit: "min"},
	"ci-queue":     {Label: "CI Queue Time", Unit: "min"},
	"pr-cycle":     {Label: "PR Cycle Time", Unit: "h"},
	"pr-review":    {Label: "PR Review Time", Unit: "h"},
	"pr-merge":     {Label: "PR Merge Time", Unit: "min"},
	"velocity":     {Label: "Velocity", Unit: "pts"},
	"throughput":   {Label: "Throughput", Unit: "items"},
	"health-score": {Label: "Health Score", Unit: "%"},
}

func (h *PreviewHandler) widgetDataFor(ctx context.Context, widgetType string, config json.RawMessage, dashboard *domain.Dashboard) (any, error) {
	if h == nil || h.widgets == nil {
		return nil, fmt.Errorf("widget registry unavailable")
	}
	return h.widgets.Process(ctx, widgetType, config, dashboard)
}

func (h *PreviewHandler) statCardData(ctx context.Context, metricID string) (any, error) {
	snapshot, err := h.metricsSvc.GetMetric(ctx, metricID, "30d", "All teams")
	if err != nil {
		return nil, err
	}
	snapshot.Data = ensureMetricPoints(metricID, snapshot.Data)
	return buildStatCardData(metricID, snapshot), nil
}

func (h *PreviewHandler) metricChartData(ctx context.Context, metricID string) (any, error) {
	snapshot, err := h.metricsSvc.GetMetric(ctx, metricID, "30d", "All teams")
	if err != nil {
		return nil, err
	}
	snapshot.Data = ensureMetricPoints(metricID, snapshot.Data)
	return buildMetricChartData(metricID, snapshot), nil
}

func (h *PreviewHandler) leaderboardData(ctx context.Context, metricID string) (any, error) {
	items, err := h.metricsSvc.GetBreakdown(ctx, metricID, "30d")
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return demoLeaderboardRows(metricID), nil
	}
	rows := make([]map[string]any, 0, len(items))
	for _, item := range items {
		rows = append(rows, map[string]any{
			"team":     item.Team,
			"name":     item.Team,
			"value":    item.Value,
			"valueRaw": item.Value,
		})
	}
	return rows, nil
}

func (h *PreviewHandler) tableData(ctx context.Context, tableType string) (any, error) {
	switch tableType {
	case "recent-activity":
		return h.activityData(ctx)
	case "ai-insights":
		return h.insightData(ctx, "")
	default:
		wsID := workspaceIDFromCtx(ctx)
		activity, err := h.activityRepo.List(ctx, wsID, 5)
		if err != nil {
			return nil, err
		}
		rows := make([]map[string]any, 0, len(activity))
		for _, item := range activity {
			rows = append(rows, map[string]any{
				"title":  item.Title,
				"status": humanizeLabel(item.Type),
				"time":   item.Timestamp.Format("15:04"),
				"author": item.User.Name,
			})
		}
		if len(rows) == 0 {
			rows = demoTableRows()
		}
		return map[string]any{"rows": rows}, nil
	}
}

func (h *PreviewHandler) sprintBurndownData(ctx context.Context) (any, error) {
	snapshot, err := h.metricsSvc.GetMetric(ctx, "velocity", "30d", "All teams")
	if err != nil {
		return nil, err
	}
	points := ensureMetricPoints("velocity", snapshot.Data)
	ideal := make([]float64, 0, len(points))
	actual := make([]float64, 0, len(points))
	for i := range points {
		base := float64(len(points) - i)
		ideal = append(ideal, base)
		actual = append(actual, base*0.9)
	}
	return map[string]any{
		"ideal":  map[string]any{"values": ideal},
		"actual": map[string]any{"values": actual},
	}, nil
}

func (h *PreviewHandler) compareBarData(ctx context.Context, metricID string) (any, error) {
	snapshot, err := h.metricsSvc.GetMetric(ctx, metricID, "30d", "All teams")
	if err != nil {
		return nil, err
	}
	points := ensureMetricPoints(metricID, snapshot.Data)
	current := seriesFromSnapshot(points, 1.0)
	secondary := seriesFromSnapshot(points, 0.92)
	descriptor := metricDescriptorFor(metricID)
	return map[string]any{
		"metricId":  metricID,
		"label":     descriptor.Label,
		"unit":      descriptor.Unit,
		"labels":    labelsFrom(points),
		"primary":   map[string]any{"label": "Current", "values": current},
		"secondary": map[string]any{"label": "Previous", "values": secondary},
		"summary":   descriptor.Label + " vs previous period",
	}, nil
}

func (h *PreviewHandler) insightData(ctx context.Context, topicHint string) (any, error) {
	if h.insightRepo == nil {
		return map[string]any{"title": "AI Insight", "body": "No insight available"}, nil
	}
	insights, err := h.insightRepo.List(ctx)
	if err != nil {
		return nil, err
	}
	if len(insights) == 0 {
		return map[string]any{"title": "AI Insight", "body": "No insight available"}, nil
	}
	for _, ins := range insights {
		if topicHint == "" || strings.Contains(strings.ToLower(ins.Title+" "+ins.Body), strings.ToLower(topicHint)) {
			return map[string]any{
				"title":  ins.Title,
				"body":   ins.Body,
				"action": derefString(ins.Action),
			}, nil
		}
	}
	ins := insights[0]
	return map[string]any{
		"title":  ins.Title,
		"body":   ins.Body,
		"action": derefString(ins.Action),
	}, nil
}

func (h *PreviewHandler) activityData(ctx context.Context) (any, error) {
	if h.activityRepo == nil {
		return map[string]any{"activities": []any{}}, nil
	}
	wsID := workspaceIDFromCtx(ctx)
	activity, err := h.activityRepo.List(ctx, wsID, 10)
	if err != nil {
		return nil, err
	}
	activities := make([]map[string]any, 0, len(activity))
	for _, item := range activity {
		activities = append(activities, map[string]any{
			"actor":        item.User.Name,
			"description":  item.Description,
			"relativeTime": humanizeRelative(item.Timestamp),
			"color":        "var(--cyan)",
		})
	}
	if len(activities) == 0 {
		activities = demoActivities()
	}
	return map[string]any{"activities": activities}, nil
}

func (h *PreviewHandler) buildDORA(ctx context.Context, timeRange, team, repoName string) (doraResponse, error) {
	_ = repoName
	deploy, err := h.metricsSvc.GetMetric(ctx, "deploy-freq", timeRange, team)
	if err != nil {
		return doraResponse{}, err
	}
	lead, err := h.metricsSvc.GetMetric(ctx, "lead-time", timeRange, team)
	if err != nil {
		return doraResponse{}, err
	}
	cfr, err := h.metricsSvc.GetMetric(ctx, "cfr", timeRange, team)
	if err != nil {
		return doraResponse{}, err
	}
	mttr, err := h.metricsSvc.GetMetric(ctx, "mttr", timeRange, team)
	if err != nil {
		return doraResponse{}, err
	}

	return doraResponse{
		DeployFrequency:   buildDORADetail("deploy-freq", deploy),
		LeadTime:          buildDORADetail("lead-time", lead),
		ChangeFailureRate: buildDORADetail("cfr", cfr),
		MTTR:              buildDORADetail("mttr", mttr),
	}, nil
}

func buildStatCardData(metricID string, resp *domain.MetricResponse) map[string]any {
	values := make([]float64, 0, len(resp.Data))
	for _, p := range resp.Data {
		values = append(values, p.Value)
	}
	last := 0.0
	if len(values) > 0 {
		last = values[len(values)-1]
	}
	delta := 0.0
	if len(values) > 1 {
		delta = last - values[len(values)-2]
	}
	return map[string]any{
		"metricId": metricID,
		"value":    fmt.Sprintf("%.1f", last),
		"delta":    fmt.Sprintf("%+.1f", delta),
		"sparkline": map[string]any{
			"values": values,
		},
	}
}

func buildMetricChartData(metricID string, resp *domain.MetricResponse) map[string]any {
	values := make([]float64, 0, len(resp.Data))
	labels := make([]string, 0, len(resp.Data))
	for _, p := range resp.Data {
		values = append(values, p.Value)
		labels = append(labels, p.Time.Format("Jan 2"))
	}
	previous := make([]float64, len(values))
	for i, v := range values {
		previous[i] = v * 0.92
	}
	return map[string]any{
		"metricId": metricID,
		"label":    metricLabel(metricID),
		"unit":     metricUnit(metricID),
		"current": map[string]any{
			"values": values,
			"labels": labels,
			"unit":   metricUnit(metricID),
		},
		"previous": map[string]any{
			"values": previous,
			"labels": labels,
			"unit":   metricUnit(metricID),
		},
		"labels": labels,
	}
}

func buildDORADetail(metricID string, resp *domain.MetricResponse) doraDetail {
	points := ensureMetricPoints(metricID, resp.Data)
	values := make([]float64, 0, len(points))
	for _, p := range points {
		values = append(values, p.Value)
	}
	current := 0.0
	if len(values) > 0 {
		current = values[len(values)-1]
	}
	delta := 0.0
	if len(values) > 1 {
		delta = current - values[len(values)-2]
	}
	desc := metricDescriptorFor(metricID)
	return doraDetail{
		ID:              metricID,
		Label:           desc.Label,
		CurrentValue:    fmt.Sprintf("%.1f%s", current, desc.Unit),
		CurrentValueRaw: current,
		Delta:           fmt.Sprintf("%+.1f", delta),
		Level:           metricLevel(current),
		BenchmarkNote:   "Backend-backed preview data",
		TimeSeries: map[string]any{
			"values": values,
			"labels": labelsFrom(points),
			"unit":   desc.Unit,
		},
	}
}

func labelsFrom(points []domain.MetricDataPoint) []string {
	labels := make([]string, 0, len(points))
	for _, p := range points {
		labels = append(labels, p.Time.Format("Jan 2"))
	}
	return labels
}

func seriesFromSnapshot(points []domain.MetricDataPoint, scale float64) []float64 {
	values := make([]float64, 0, len(points))
	for _, p := range points {
		values = append(values, p.Value*scale)
	}
	return values
}

func ensureMetricPoints(metricID string, points []domain.MetricDataPoint) []domain.MetricDataPoint {
	if len(points) > 0 {
		return points
	}
	now := time.Date(2026, 5, 31, 0, 0, 0, 0, time.UTC)
	pattern := map[string][]float64{
		"deploy-freq": {2.8, 2.9, 3.1, 3.2, 3.3, 3.2, 3.4, 3.6, 3.7, 3.6, 3.8, 4.0},
		"lead-time":   {18.2, 17.9, 17.5, 17.1, 16.9, 16.7, 16.5, 16.2, 16.1, 15.9, 15.7, 15.4},
		"cfr":         {11.8, 11.3, 11.1, 10.8, 10.6, 10.4, 10.1, 9.9, 9.8, 9.6, 9.3, 9.1},
		"mttr":        {62, 59, 57, 55, 53, 51, 48, 46, 45, 43, 41, 39},
		"pr-cycle":    {42, 41, 39, 38, 37, 36, 35, 35, 34, 33, 32, 31},
		"velocity":    {61, 63, 64, 66, 68, 67, 69, 71, 72, 73, 74, 75},
	}
	series, ok := pattern[metricID]
	if !ok {
		series = []float64{10, 11, 12, 13, 14, 15, 16, 16.5, 17, 18, 18.5, 19}
	}
	start := now.AddDate(0, 0, -(len(series) - 1))
	result := make([]domain.MetricDataPoint, 0, len(series))
	for i, value := range series {
		result = append(result, domain.MetricDataPoint{
			Time:  start.AddDate(0, 0, i),
			Value: value,
		})
	}
	return result
}

func demoLeaderboardRows(metricID string) []map[string]any {
	values := map[string][]float64{
		"velocity": {75, 72, 68, 64, 61},
		"pr-cycle": {31, 33, 35, 37, 39},
	}
	series, ok := values[metricID]
	if !ok {
		series = []float64{68, 64, 61, 58, 55}
	}
	teams := []string{"Atlas", "Beacon", "Comet", "Delta", "Echo"}
	rows := make([]map[string]any, 0, len(teams))
	for i, team := range teams {
		rows = append(rows, map[string]any{
			"team":     team,
			"name":     team,
			"value":    series[i],
			"valueRaw": series[i],
		})
	}
	return rows
}

func demoTableRows() []map[string]any {
	return []map[string]any{
		{"title": "PR-1842 optimize ingestion queue", "status": "Review", "time": "09:12", "author": "Nadia"},
		{"title": "PR-1838 harden auth middleware", "status": "Blocked", "time": "10:03", "author": "Marco"},
		{"title": "PR-1832 fix flaky burndown calc", "status": "Review", "time": "10:38", "author": "Lea"},
		{"title": "PR-1829 add ai insight guardrails", "status": "Ready", "time": "11:05", "author": "Arun"},
		{"title": "PR-1823 reduce query fanout", "status": "Review", "time": "11:42", "author": "Ira"},
	}
}

func demoActivities() []map[string]any {
	return []map[string]any{
		{"actor": "Nadia", "description": "Merged PR-1842 into main", "relativeTime": "12m ago", "color": "var(--cyan)"},
		{"actor": "Marco", "description": "Flagged deploy risk on service-api", "relativeTime": "24m ago", "color": "var(--cyan)"},
		{"actor": "Lea", "description": "Completed sprint burndown recalculation", "relativeTime": "38m ago", "color": "var(--cyan)"},
		{"actor": "Arun", "description": "Published AI insight safety checklist", "relativeTime": "52m ago", "color": "var(--cyan)"},
		{"actor": "Ira", "description": "Reduced metric query latency by 14%", "relativeTime": "1h ago", "color": "var(--cyan)"},
	}
}

func parseWidgetMetric(raw json.RawMessage, fallback string) string {
	var cfg struct {
		MetricID string `json:"metricId"`
	}
	if err := json.Unmarshal(raw, &cfg); err != nil || cfg.MetricID == "" {
		return fallback
	}
	return cfg.MetricID
}

func parseTableType(raw json.RawMessage) string {
	var cfg struct {
		TableType string `json:"tableType"`
	}
	if err := json.Unmarshal(raw, &cfg); err != nil || cfg.TableType == "" {
		return "pr-queue"
	}
	return cfg.TableType
}

func parseTopicHint(raw json.RawMessage) string {
	var cfg struct {
		TopicHint string `json:"topicHint"`
	}
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return ""
	}
	return cfg.TopicHint
}

func metricLabel(metricID string) string {
	return metricDescriptorFor(metricID).Label
}

func metricUnit(metricID string) string {
	return metricDescriptorFor(metricID).Unit
}

func metricDescriptorFor(metricID string) metricDescriptor {
	if desc, ok := metricCatalog[metricID]; ok {
		return desc
	}
	return metricDescriptor{
		Label: humanizeLabel(metricID),
	}
}

func metricLevel(value float64) string {
	switch {
	case value >= 80:
		return "Elite"
	case value >= 50:
		return "High"
	case value >= 25:
		return "Med"
	default:
		return "Low"
	}
}

func humanizeLabel(value string) string {
	parts := strings.Split(value, "-")
	for i, part := range parts {
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + strings.ToLower(part[1:])
	}
	return strings.Join(parts, " ")
}

func derefString(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}

func humanizeRelative(t time.Time) string {
	d := time.Since(t)
	if d < time.Minute {
		return "just now"
	}
	if d < time.Hour {
		return fmt.Sprintf("%d min ago", int(d.Minutes()))
	}
	if d < 24*time.Hour {
		return fmt.Sprintf("%d hr ago", int(d.Hours()))
	}
	return fmt.Sprintf("%d d ago", int(d.Hours()/24))
}

func (h *PreviewHandler) metricRange(r *http.Request) string {
	if v := r.URL.Query().Get("timeRange"); v != "" {
		return v
	}
	return "30d"
}

func (h *PreviewHandler) metricTeam(r *http.Request) string {
	if v := r.URL.Query().Get("team"); v != "" {
		return v
	}
	return "All teams"
}

func (h *PreviewHandler) metricRepo(r *http.Request) string {
	if v := r.URL.Query().Get("repo"); v != "" {
		return v
	}
	return "All repos"
}

func (h *PreviewHandler) ready() bool {
	return h != nil && h.metricsSvc != nil
}

func (h *PreviewHandler) readyInsights() bool {
	return h != nil && h.insightRepo != nil
}

func (h *PreviewHandler) readyActivity() bool {
	return h != nil && h.activityRepo != nil
}

func (h *PreviewHandler) readyDashboard() bool {
	return h != nil && h.dashboardSvc != nil
}

var _ = errors.Is

// ── Heatmap widget data ────────────────────────────────────────────────────

// heatmapCell is a single cell in a team-activity heatmap.
type heatmapCell struct {
	X      string `json:"x"`
	Y      string `json:"y"`
	Value  int    `json:"value"`
	Status string `json:"status,omitempty"`
}

// heatmapWidgetData is the data shape for widgetType=heatmap.
// Matches the HeatmapWidgetData interface expected by the UI.
type heatmapWidgetData struct {
	Title   string        `json:"title,omitempty"`
	XLabels []string      `json:"xLabels"`
	YLabels []string      `json:"yLabels"`
	Cells   []heatmapCell `json:"cells"`
	Summary string        `json:"summary,omitempty"`
}

// buildHeatmapData produces a deterministic HeatmapWidgetData payload from a
// widget config. Output is stable across calls for the same config — it uses a
// Park-Miller LCG seeded at 42, matching makeHeatmapWidgetData on the frontend.
func buildHeatmapData(config json.RawMessage) heatmapWidgetData {
	var cfg struct {
		RowGroupBy string `json:"rowGroupBy"`
		Columns    int    `json:"columns"`
	}
	_ = json.Unmarshal(config, &cfg)

	cols := cfg.Columns
	switch {
	case cols == 0:
		cols = 16
	case cols < 4:
		cols = 4
	case cols > 24:
		cols = 24
	}

	var yLabels []string
	var title string
	switch cfg.RowGroupBy {
	case "weekday":
		yLabels = []string{"Mon", "Tue", "Wed", "Thu", "Fri"}
		title = "Activity by Weekday"
	default: // "team" or unset
		yLabels = []string{"Atlas", "Beacon", "Comet", "Delta", "Echo"}
		title = "Team Activity"
	}

	xLabels := make([]string, cols)
	for i := range cols {
		xLabels[i] = fmt.Sprintf("W%d", i+1)
	}

	// Park-Miller LCG, seed 42 — same constants as seed.PRNG.
	state := int64(42)
	nextInt := func(n int) int {
		state = (state * 16807) % 2147483647
		return int(float64(state-1) / 2147483646.0 * float64(n))
	}

	cells := make([]heatmapCell, 0, len(yLabels)*cols)
	for _, y := range yLabels {
		for _, x := range xLabels {
			v := nextInt(6)
			cells = append(cells, heatmapCell{X: x, Y: y, Value: v, Status: heatmapCellStatus(v)})
		}
	}

	return heatmapWidgetData{
		Title:   title,
		XLabels: xLabels,
		YLabels: yLabels,
		Cells:   cells,
		Summary: fmt.Sprintf("Team activity across %d weeks", cols),
	}
}

// heatmapCellStatus derives a status string from a cell value.
// Thresholds match the frontend makeHeatmapWidgetData helper.
func heatmapCellStatus(v int) string {
	switch {
	case v >= 4:
		return "ok"
	case v >= 2:
		return "warning"
	case v >= 1:
		return "neutral"
	default:
		return "error"
	}
}

// ── Health-gauge widget data ───────────────────────────────────────────────

type gaugeWidgetData struct {
	Score float64 `json:"score"`
}

func (h *PreviewHandler) gaugeData(ctx context.Context, metricID string) (gaugeWidgetData, error) {
	snapshot, err := h.metricsSvc.GetMetric(ctx, metricID, "30d", "All teams")
	if err != nil || len(snapshot.Data) == 0 {
		return gaugeWidgetData{Score: 72.0}, nil
	}
	v := snapshot.Data[len(snapshot.Data)-1].Value
	if v < 0 {
		v = 0
	}
	if v > 100 {
		v = 100
	}
	return gaugeWidgetData{Score: v}, nil
}
