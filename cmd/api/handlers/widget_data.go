// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/respond"
)

// WidgetDataHandler serves POST /api/v1/metrics/widget-data.
// It accepts a metricWidgetSpec, executes the underlying metric query, and
// adapts the MetricQueryResult into the requested widget shape.
type WidgetDataHandler struct {
	svc MetricQueryExecutor
}

// NewWidgetDataHandler creates a WidgetDataHandler.
func NewWidgetDataHandler(svc MetricQueryExecutor) *WidgetDataHandler {
	return &WidgetDataHandler{svc: svc}
}

// metricWidgetRequest is the body for POST /api/v1/metrics/widget-data.
type metricWidgetRequest struct {
	WidgetType string              `json:"widgetType"` // kpi_card | line_chart | bar_chart | table
	Query      metricWidgetQuery   `json:"query"`
}

// metricWidgetQuery carries the metric execution parameters.
type metricWidgetQuery struct {
	MetricID    string            `json:"metricId"`
	WorkspaceID string            `json:"workspaceId"`
	Granularity string            `json:"granularity"`
	Start       string            `json:"start"` // RFC3339
	End         string            `json:"end"`   // RFC3339
	Filters     map[string]string `json:"filters,omitempty"`
	GroupBy     []string          `json:"groupBy,omitempty"`
}

// metricWidgetResponse wraps a MetricQueryResult with the adapted widget payload.
type metricWidgetResponse struct {
	WidgetType   string                  `json:"widgetType"`
	Quality      domain.DataQualityLevel `json:"quality"`
	QualityNotes []string                `json:"qualityNotes,omitempty"`
	Data         any                     `json:"data"` // shape depends on widgetType
}

// kpiCardData is the data shape for widgetType=kpi_card.
type kpiCardData struct {
	Value     any    `json:"value"`  // latest non-nil bucket value, or nil
	BucketISO string `json:"bucket"` // ISO-8601 of the latest bucket
}

// timeSeriesData is the shape for line_chart and bar_chart.
type timeSeriesData struct {
	Labels []string    `json:"labels"` // ISO-8601 bucket timestamps
	Series []*float64  `json:"series"` // primary metric values; nil where data is absent
}

// tableWidgetData is the data shape for widgetType=table.
type tableWidgetData struct {
	Columns []string `json:"columns"`
	Rows    [][]any  `json:"rows"`
}

// Query handles POST /api/v1/metrics/widget-data.
func (h *WidgetDataHandler) Query(w http.ResponseWriter, r *http.Request) {
	var req metricWidgetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	if req.WidgetType == "" {
		respond.Error(w, http.StatusBadRequest, "MISSING_WIDGET_TYPE", "widgetType is required")
		return
	}
	// Validate widgetType before executing the query so unsupported types are
	// rejected without a wasted DB round-trip.
	switch req.WidgetType {
	case "kpi_card", "line_chart", "bar_chart", "table":
		// valid
	default:
		respond.Error(w, http.StatusBadRequest, "UNSUPPORTED_WIDGET_TYPE",
			fmt.Sprintf("unsupported widgetType %q; supported: kpi_card, line_chart, bar_chart, table", req.WidgetType))
		return
	}
	if req.Query.MetricID == "" {
		respond.Error(w, http.StatusBadRequest, "MISSING_METRIC_ID", "query.metricId is required")
		return
	}

	start, err := time.Parse(time.RFC3339, req.Query.Start)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_START", "start must be RFC3339: "+err.Error())
		return
	}
	end, err := time.Parse(time.RFC3339, req.Query.End)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_END", "end must be RFC3339: "+err.Error())
		return
	}
	if !end.After(start) {
		respond.Error(w, http.StatusBadRequest, "INVALID_TIME_RANGE", "end must be after start")
		return
	}
	switch req.Query.Granularity {
	case "", "day":
		req.Query.Granularity = "day"
	case "week", "month":
		// valid
	default:
		respond.Error(w, http.StatusBadRequest, "INVALID_GRANULARITY",
			fmt.Sprintf("unsupported granularity %q; supported: day, week, month", req.Query.Granularity))
		return
	}

	q := domain.MetricQuery{
		MetricID:    req.Query.MetricID,
		WorkspaceID: req.Query.WorkspaceID,
		Granularity: req.Query.Granularity,
		Start:       start,
		End:         end,
		Filters:     req.Query.Filters,
		GroupBy:     req.Query.GroupBy,
	}

	result, err := h.svc.Execute(r.Context(), q)
	if err != nil {
		if errors.Is(err, biz.ErrMetricNotFound) {
			respond.Error(w, http.StatusNotFound, "METRIC_NOT_FOUND", err.Error())
			return
		}
		respond.Error(w, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}

	data, err := adaptToWidgetShape(req.WidgetType, result)
	if err != nil {
		// Should not reach here since widgetType is pre-validated above, but guard defensively.
		respond.Error(w, http.StatusInternalServerError, "ADAPT_FAILED", err.Error())
		return
	}

	respond.JSON(w, http.StatusOK, metricWidgetResponse{
		WidgetType:   req.WidgetType,
		Quality:      result.Quality,
		QualityNotes: result.QualityNotes,
		Data:         data,
	})
}

// adaptToWidgetShape converts a MetricQueryResult into the widget-specific data shape.
func adaptToWidgetShape(widgetType string, result domain.MetricQueryResult) (any, error) {
	switch widgetType {
	case "kpi_card":
		return adaptKPICard(result), nil
	case "line_chart", "bar_chart":
		return adaptTimeSeries(result), nil
	case "table":
		return adaptTable(result), nil
	default:
		return nil, fmt.Errorf("unsupported widget type: %s", widgetType)
	}
}

func adaptKPICard(result domain.MetricQueryResult) kpiCardData {
	// Return the last non-nil value as the KPI figure.
	var latestVal any
	var latestBucket string
	for _, row := range result.Data.Rows {
		if len(row) >= 2 && row[1] != nil {
			latestVal = row[1]
			if len(row) >= 1 {
				if s, ok := row[0].(string); ok {
					latestBucket = s
				}
			}
		}
	}
	return kpiCardData{Value: latestVal, BucketISO: latestBucket}
}

func adaptTimeSeries(result domain.MetricQueryResult) timeSeriesData {
	ts := timeSeriesData{
		Labels: make([]string, 0, len(result.Data.Rows)),
		Series: make([]*float64, 0, len(result.Data.Rows)),
	}
	for _, row := range result.Data.Rows {
		label := ""
		if len(row) >= 1 {
			if s, ok := row[0].(string); ok {
				label = s
			}
		}
		ts.Labels = append(ts.Labels, label)

		var val *float64
		if len(row) >= 2 && row[1] != nil {
			if f, ok := row[1].(float64); ok {
				v := f
				val = &v
			}
		}
		ts.Series = append(ts.Series, val)
	}
	return ts
}

func adaptTable(result domain.MetricQueryResult) tableWidgetData {
	return tableWidgetData{
		Columns: result.Data.Columns,
		Rows:    result.Data.Rows,
	}
}
