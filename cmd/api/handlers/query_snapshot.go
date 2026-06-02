// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/respond"
	"github.com/go-chi/chi/v5"
)

// QuerySnapshotHandler serves POST /api/v1/dashboards/{id}/query-results/snapshot.
// Snapshot is the source of truth for QueryResult runtime until backend producers
// and pubsub exist for /ws/dashboards/{id}/realtime.
type QuerySnapshotHandler struct {
	dashboardSvc *biz.DashboardSvc
	preview      *PreviewHandler
	now          func() time.Time
}

func NewQuerySnapshotHandler(dashboardSvc *biz.DashboardSvc, preview *PreviewHandler) *QuerySnapshotHandler {
	return &QuerySnapshotHandler{
		dashboardSvc: dashboardSvc,
		preview:      preview,
		now:          func() time.Time { return time.Now().UTC() },
	}
}

type querySnapshotRequest struct {
	Queries []querySnapshotRequestItem `json:"queries"`
}

type querySnapshotRequestItem struct {
	QueryKey string                    `json:"queryKey"`
	Query    querySnapshotRequestQuery `json:"query"`
}

type querySnapshotRequestQuery struct {
	MetricID    string            `json:"metricId"`
	ResultKind  string            `json:"resultKind"`
	Granularity string            `json:"granularity"`
	Start       string            `json:"start"`
	End         string            `json:"end"`
	Filters     map[string]string `json:"filters,omitempty"`
	GroupBy     []string          `json:"groupBy,omitempty"`
	Params      map[string]any    `json:"params,omitempty"`
}

type querySnapshotResponse struct {
	DashboardID string                    `json:"dashboardId"`
	Results     []querySnapshotResultItem `json:"results"`
}

type querySnapshotResultItem struct {
	QueryKey  string `json:"queryKey"`
	Result    any    `json:"result,omitempty"`
	Status    string `json:"status"`
	Version   int    `json:"version"`
	Sequence  int    `json:"sequence"`
	UpdatedAt string `json:"updatedAt"`
}

func (h *QuerySnapshotHandler) Snapshot(w http.ResponseWriter, r *http.Request) {
	userID, ok := currentUserID(r)
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "MISSING_AUTH", "authenticated user required")
		return
	}
	if _, ok := workspaceID(r); !ok {
		respond.Error(w, http.StatusUnauthorized, "MISSING_WORKSPACE", "workspace not resolved from token")
		return
	}

	dashboardID := chi.URLParam(r, "id")
	dashboard, err := h.dashboardSvc.GetByIDForUser(r.Context(), dashboardID, userID)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	var req querySnapshotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	if len(req.Queries) == 0 {
		respond.Error(w, http.StatusBadRequest, "MISSING_QUERIES", "queries must be non-empty")
		return
	}

	results := make([]querySnapshotResultItem, 0, len(req.Queries))
	seen := make(map[string]struct{}, len(req.Queries))
	updatedAt := h.now().Format(time.RFC3339)
	sequence := 1

	for i := range req.Queries {
		item := req.Queries[i]
		if item.QueryKey == "" {
			respond.Error(w, http.StatusBadRequest, "MISSING_QUERY_KEY", "queryKey is required")
			return
		}
		if item.Query.MetricID == "" {
			respond.Error(w, http.StatusBadRequest, "MISSING_METRIC_ID", "metricId is required")
			return
		}
		if item.Query.ResultKind == "" {
			respond.Error(w, http.StatusBadRequest, "MISSING_RESULT_KIND", "resultKind is required")
			return
		}
		if item.Query.Start == "" || item.Query.End == "" {
			respond.Error(w, http.StatusBadRequest, "MISSING_TIME_RANGE", "start and end are required")
			return
		}
		start, err := time.Parse(time.RFC3339, item.Query.Start)
		if err != nil {
			respond.Error(w, http.StatusBadRequest, "INVALID_START", "start must be RFC3339: "+err.Error())
			return
		}
		end, err := time.Parse(time.RFC3339, item.Query.End)
		if err != nil {
			respond.Error(w, http.StatusBadRequest, "INVALID_END", "end must be RFC3339: "+err.Error())
			return
		}
		if !end.After(start) {
			respond.Error(w, http.StatusBadRequest, "INVALID_TIME_RANGE", "end must be after start")
			return
		}
		if _, ok := seen[item.QueryKey]; ok {
			continue
		}
		seen[item.QueryKey] = struct{}{}

		widgetType, config, mapErr := buildSnapshotWidget(item.Query)
		resultItem := querySnapshotResultItem{
			QueryKey:  item.QueryKey,
			Status:    "ready",
			Version:   dashboard.Version,
			Sequence:  sequence,
			UpdatedAt: updatedAt,
		}
		sequence++

		if mapErr != nil {
			resultItem.Status = "error"
			results = append(results, resultItem)
			continue
		}

		data, err := h.preview.widgetDataFor(r.Context(), widgetType, config, dashboard)
		if err != nil {
			resultItem.Status = "error"
			results = append(results, resultItem)
			continue
		}
		resultItem.Result = data
		results = append(results, resultItem)
	}

	respond.JSON(w, http.StatusOK, querySnapshotResponse{DashboardID: dashboard.ID, Results: results})
}

func buildSnapshotWidget(q querySnapshotRequestQuery) (string, json.RawMessage, error) {
	config := map[string]any{
		"metricId":    q.MetricID,
		"granularity": q.Granularity,
		"start":       q.Start,
		"end":         q.End,
	}
	if len(q.Filters) > 0 {
		config["filters"] = q.Filters
	}
	if len(q.GroupBy) > 0 {
		config["groupBy"] = q.GroupBy
	}
	for key, value := range q.Params {
		config[key] = value
	}

	widgetType := ""
	switch q.ResultKind {
	case "scalar":
		widgetType = "stat-card"
		config["type"] = widgetType
	case "timeseries":
		widgetType = "metric-chart"
		config["type"] = widgetType
		if _, ok := config["chartVariant"]; !ok {
			config["chartVariant"] = "area"
		}
		if _, ok := config["showCompare"]; !ok {
			config["showCompare"] = false
		}
	case "breakdown":
		if compare, _ := q.Params["compare"].(bool); compare {
			widgetType = "compare-bar-chart"
		} else {
			widgetType = "leaderboard"
		}
		config["type"] = widgetType
		if _, ok := config["maxRows"]; !ok {
			config["maxRows"] = 5
		}
		if _, ok := config["limit"]; !ok {
			config["limit"] = 5
		}
	case "table":
		widgetType = "data-table"
		config["type"] = widgetType
		if _, ok := config["tableType"]; !ok {
			config["tableType"] = "pr-queue"
		}
		if _, ok := config["maxRows"]; !ok {
			config["maxRows"] = 5
		}
	case "dora":
		widgetType = "dora-overview"
		config = map[string]any{"type": widgetType}
	case "activity":
		widgetType = "recent-activity"
		config = map[string]any{"type": widgetType}
		if maxItems, ok := q.Params["maxItems"]; ok {
			config["maxItems"] = maxItems
		}
	case "heatmap":
		widgetType = "heatmap"
		config["type"] = widgetType
		if _, ok := config["rowGroupBy"]; !ok && len(q.GroupBy) > 0 {
			config["rowGroupBy"] = q.GroupBy[0]
		}
		if _, ok := config["columns"]; !ok {
			config["columns"] = 14
		}
	case "insight":
		widgetType = "ai-insight"
		config["type"] = widgetType
	case "anomaly":
		widgetType = "anomaly-detector"
		config = map[string]any{"type": widgetType}
	default:
		return "", nil, fmt.Errorf("unsupported result kind: %s", q.ResultKind)
	}

	raw, err := json.Marshal(config)
	if err != nil {
		return "", nil, fmt.Errorf("marshal widget config: %w", err)
	}
	return widgetType, raw, nil
}
