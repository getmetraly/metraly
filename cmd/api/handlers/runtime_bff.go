// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"context"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/middleware"
	"github.com/getmetraly/metraly/cmd/api/respond"
	"github.com/go-chi/chi/v5"
)

type RuntimeBFFHandler struct {
	dashboardSvc *biz.DashboardSvc
	sourceSvc    *biz.SourceSvc
	preview      *PreviewHandler
}

func NewRuntimeBFFHandler(dashboardSvc *biz.DashboardSvc, sourceSvc *biz.SourceSvc, preview *PreviewHandler) *RuntimeBFFHandler {
	return &RuntimeBFFHandler{dashboardSvc: dashboardSvc, sourceSvc: sourceSvc, preview: preview}
}

type appBootstrapResponse struct {
	User                bootstrapUser          `json:"user"`
	Workspace           bootstrapWorkspace     `json:"workspace"`
	Dashboards          []bootstrapDashboard   `json:"dashboards"`
	SelectedDashboardID string                 `json:"selectedDashboardId"`
	IconOptions         []dashboardIconOption  `json:"iconOptions"`
	Features            bootstrapFeatures      `json:"features"`
	SourceSummary       bootstrapSourceSummary `json:"sourceSummary"`
	FetchedAt           time.Time              `json:"fetchedAt"`
}

type bootstrapUser struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type bootstrapWorkspace struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type bootstrapDashboard struct {
	ID               string                     `json:"id"`
	Name             string                     `json:"name"`
	Description      string                     `json:"description,omitempty"`
	Icon             string                     `json:"icon,omitempty"`
	SourceType       domain.DashboardSourceType `json:"sourceType"`
	SourceTemplateID *string                    `json:"sourceTemplateId,omitempty"`
	WidgetCount      int                        `json:"widgetCount"`
	UpdatedAt        time.Time                  `json:"updatedAt"`
}

type dashboardIconOption struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Icon  string `json:"icon"`
}

type bootstrapFeatures struct {
	DashboardCreate     bool `json:"dashboardCreate"`
	DashboardEdit       bool `json:"dashboardEdit"`
	DashboardIconPicker bool `json:"dashboardIconPicker"`
	SourceSetup         bool `json:"sourceSetup"`
	SourceCollect       bool `json:"sourceCollect"`
}

type bootstrapSourceSummary struct {
	ConnectedCount int  `json:"connectedCount"`
	HasRealSources bool `json:"hasRealSources"`
	DemoMode       bool `json:"demoMode"`
}

type dashboardViewResponse struct {
	Dashboard     *domain.Dashboard  `json:"dashboard"`
	WidgetData    map[string]any     `json:"widgetData"`
	WidgetErrors  map[string]string  `json:"widgetErrors"`
	SourceContext dashboardSourceCtx `json:"sourceContext"`
	FetchedAt     time.Time          `json:"fetchedAt"`
	ViewVersion   int                `json:"viewVersion"`
}

type dashboardSourceCtx struct {
	Mode           string `json:"mode"`
	HasRealSources bool   `json:"hasRealSources"`
	Message        string `json:"message"`
}

func (h *RuntimeBFFHandler) AppBootstrap(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.dashboardSvc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}
	claims := middleware.ClaimsFrom(r.Context())
	if claims == nil || claims.Sub == "" || claims.Workspace == "" {
		respond.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	dashboards, err := h.dashboardSvc.List(r.Context(), claims.Sub)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "DASHBOARD_LIST_FAILED", "failed to list dashboards")
		return
	}

	sourceSummary := h.sourceSummary(r.Context(), claims.Workspace)
	viewDashboards := make([]bootstrapDashboard, 0, len(dashboards))
	selectedID := ""
	for _, d := range dashboards {
		viewDashboards = append(viewDashboards, bootstrapDashboard{
			ID:               d.ID,
			Name:             d.Name,
			Description:      d.Description,
			Icon:             sanitizeDashboardIcon(d.Icon),
			SourceType:       d.SourceType,
			SourceTemplateID: d.SourceTemplateID,
			WidgetCount:      len(d.Widgets),
			UpdatedAt:        d.UpdatedAt,
		})
		if d.ID == "sandbox-all-widgets" {
			selectedID = d.ID
		}
	}
	if selectedID == "" && len(viewDashboards) > 0 {
		selectedID = viewDashboards[0].ID
	}

	respond.JSON(w, http.StatusOK, appBootstrapResponse{
		User:                bootstrapUser{ID: claims.Sub, Name: nameFromEmail(claims.Email), Email: claims.Email},
		Workspace:           bootstrapWorkspace{ID: claims.Workspace, Name: workspaceNameFromID(claims.Workspace)},
		Dashboards:          viewDashboards,
		SelectedDashboardID: selectedID,
		IconOptions:         dashboardIconOptions(),
		Features: bootstrapFeatures{
			DashboardCreate:     true,
			DashboardEdit:       true,
			DashboardIconPicker: true,
			SourceSetup:         h.sourceSvc != nil,
			SourceCollect:       h.sourceSvc != nil,
		},
		SourceSummary: sourceSummary,
		FetchedAt:     time.Now().UTC(),
	})
}

func (h *RuntimeBFFHandler) DashboardView(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.dashboardSvc == nil {
		respond.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "dashboard service unavailable")
		return
	}
	claims := middleware.ClaimsFrom(r.Context())
	if claims == nil || claims.Sub == "" || claims.Workspace == "" {
		respond.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}
	dashboardID := chi.URLParam(r, "id")
	if dashboardID == "" {
		respond.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "dashboard id is required")
		return
	}
	dashboard, err := h.dashboardSvc.GetByIDForUser(r.Context(), dashboardID, claims.Sub)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	widgetData := make(map[string]any, len(dashboard.Widgets))
	widgetErrors := map[string]string{}
	for _, widget := range dashboard.Widgets {
		if h.preview == nil {
			widgetErrors[widget.InstanceID] = "preview service unavailable"
			continue
		}
		data, dataErr := h.preview.widgetDataFor(r.Context(), widget.WidgetType, widget.Config, dashboard)
		if dataErr != nil {
			widgetErrors[widget.InstanceID] = dataErr.Error()
			continue
		}
		widgetData[widget.InstanceID] = data
	}

	sourceSummary := h.sourceSummary(r.Context(), claims.Workspace)
	ctx := dashboardSourceCtx{
		Mode:           "demo",
		HasRealSources: sourceSummary.HasRealSources,
		Message:        "Demo data is synthetic. Connect sources to replace it with real metrics.",
	}
	if sourceSummary.HasRealSources {
		ctx.Mode = "mixed"
		ctx.Message = "Sources are connected. Some widgets may still use fallback demo data until sync completes."
	}

	respond.JSON(w, http.StatusOK, dashboardViewResponse{
		Dashboard:     dashboard,
		WidgetData:    widgetData,
		WidgetErrors:  widgetErrors,
		SourceContext: ctx,
		FetchedAt:     time.Now().UTC(),
		ViewVersion:   1,
	})
}

func (h *RuntimeBFFHandler) sourceSummary(ctx context.Context, workspaceID string) bootstrapSourceSummary {
	if h == nil || h.sourceSvc == nil || workspaceID == "" {
		return bootstrapSourceSummary{ConnectedCount: 0, HasRealSources: false, DemoMode: true}
	}
	sources, err := h.sourceSvc.ListSources(ctx, workspaceID)
	if err != nil {
		return bootstrapSourceSummary{ConnectedCount: 0, HasRealSources: false, DemoMode: true}
	}
	connected := 0
	for _, source := range sources {
		if source.Status == domain.SourceStatusReady || source.Status == domain.SourceStatusSyncing || source.Status == domain.SourceStatusDegraded {
			connected++
		}
	}
	return bootstrapSourceSummary{ConnectedCount: connected, HasRealSources: len(sources) > 0, DemoMode: len(sources) == 0}
}

func dashboardIconOptions() []dashboardIconOption {
	options := []dashboardIconOption{
		{ID: "sparkles", Label: "Demo", Icon: "sparkles"},
		{ID: "dashboard", Label: "Dashboard", Icon: "dashboard"},
		{ID: "bar2", Label: "Metrics", Icon: "bar2"},
		{ID: "trendingUp", Label: "Trends", Icon: "trendingUp"},
		{ID: "activity", Label: "Activity", Icon: "activity"},
		{ID: "rocket", Label: "Velocity", Icon: "rocket"},
		{ID: "star", Label: "Focus", Icon: "star"},
		{ID: "zap", Label: "Ops", Icon: "zap"},
		{ID: "cpu", Label: "Systems", Icon: "cpu"},
	}
	sort.SliceStable(options, func(i, j int) bool { return options[i].ID < options[j].ID })
	return options
}

func sanitizeDashboardIcon(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "sparkles"
	}
	for _, option := range dashboardIconOptions() {
		if option.ID == trimmed {
			return trimmed
		}
	}
	return "sparkles"
}

func nameFromEmail(email string) string {
	trimmed := strings.TrimSpace(email)
	if trimmed == "" {
		return "User"
	}
	if strings.Contains(trimmed, "admin") {
		return "Admin"
	}
	left := strings.Split(trimmed, "@")[0]
	if left == "" {
		return "User"
	}
	return strings.ToUpper(left[:1]) + left[1:]
}

func workspaceNameFromID(workspaceID string) string {
	if workspaceID == "sandbox" {
		return "Sandbox Inc."
	}
	if workspaceID == "" {
		return "Workspace"
	}
	return strings.ToUpper(workspaceID[:1]) + workspaceID[1:]
}
