// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors
//
// @title Metraly API
// @version 1.0
// @description Team Engineering Metrics API
// @contact.name Metraly
// @license.name AGPL-3.0-or-later
// @license.url https://www.gnu.org/licenses/agpl-3.0.html

package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/getmetraly/metraly/cmd/api/auth"
	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/config"
	"github.com/getmetraly/metraly/cmd/api/handlers"
	localMiddleware "github.com/getmetraly/metraly/cmd/api/middleware"
	"github.com/getmetraly/metraly/cmd/api/repo"
	"github.com/getmetraly/metraly/cmd/api/respond"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// @Summary Health check
// @Description Returns the health status of the API
// @Tags health
// @Accept json
// @Produce json
// @Success 200 {string} string
// @Router /api/v1/health [get]
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

func meHandler(w http.ResponseWriter, r *http.Request) {
	handlers.MeHandler(w, r)
}

func activityHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"data":[]}`))
}

func serviceUnavailableHandler(w http.ResponseWriter, r *http.Request) {
	handlers.ServiceUnavailable(w, "dashboard service unavailable")
}

type RouterDeps struct {
	KeyManager   *auth.KeyManager
	AuthSvc      *auth.Service
	DashboardSvc *biz.DashboardSvc
	TemplateSvc  *biz.TemplateSvc
	MetricsSvc   *biz.MetricsSvc
	IngestionSvc *biz.IngestionSvc
	SourceSvc       *biz.SourceSvc
	CollectorSvc    *biz.CollectorSvc
	CollectorRunRepo handlers.CollectorRunFetcher
	MetricCatalog    *biz.MetricCatalog
	FormulaValidator *biz.FormulaValidator
	MetricQuerySvc   *biz.MetricQuerySvc
	ActivityRepo    repo.ActivityRepo
	InsightRepo     repo.AIInsightRepo
}

// NewRouter creates and returns a chi router with all API routes configured.
func NewRouter(deps RouterDeps) *chi.Mux {
	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)

	// Public routes
	r.Get("/api/v1/health", healthHandler)
	r.Get("/api/v1/role/{role}", roleHandler)

	authHandler := handlers.NewAuthHandler(deps.AuthSvc)
	r.Post("/api/v1/auth/login", authHandler.Login)
	r.Post("/api/v1/auth/refresh", authHandler.Refresh)
	r.Post("/api/v1/auth/logout", authHandler.Logout)
	r.Get("/api/v1/auth/oidc/login", authHandler.OIDCLogin)
	r.Get("/api/v1/auth/oidc/callback", authHandler.OIDCCallback)

	dashboardHandler := handlers.NewDashboardHandler(deps.DashboardSvc)
	previewHandler := handlers.NewPreviewHandler(deps.DashboardSvc, deps.TemplateSvc, deps.MetricsSvc, deps.ActivityRepo, deps.InsightRepo)
	ingestionHandler := handlers.NewIngestionHandler(deps.IngestionSvc)

	// Protected routes
	if deps.KeyManager != nil {
		r.Group(func(r chi.Router) {
			r.Use(localMiddleware.RequireAuth(deps.KeyManager))
			r.Get("/api/v1/dashboards", dashboardHandler.List)
			r.Post("/api/v1/dashboards", dashboardHandler.Create)
			r.Get("/api/v1/dashboards/{id}", dashboardHandler.Get)
			r.Put("/api/v1/dashboards/{id}", dashboardHandler.Update)
			r.Post("/api/v1/dashboards/{id}/fork", dashboardHandler.Fork)
			r.Put("/api/v1/dashboards/{id}/layout", dashboardHandler.UpdateLayout)
			r.Put("/api/v1/dashboards/{id}/share", dashboardHandler.UpdateShare)
			r.Get("/api/v1/dashboards/{id}/data", previewHandler.DashboardData)
			r.Post("/api/v1/widgets/data", previewHandler.WidgetsData)
			r.Post("/api/v1/ingest/github", ingestionHandler.GitHub)
			r.Post("/api/v1/ingest/pm", ingestionHandler.PM)
			r.Get("/api/v1/templates", previewHandler.Templates)
			r.Get("/api/v1/dora", previewHandler.DORA)
			r.Get("/api/v1/metrics", previewHandler.Metric)
			r.Get("/api/v1/metrics/{metricId}", previewHandler.Metric)
			r.Get("/api/v1/metrics/{metricId}/breakdown", previewHandler.Breakdown)
			r.Get("/api/v1/insights", previewHandler.Insights)
			r.Get("/api/v1/activity", previewHandler.Activity)
			r.Get("/api/v1/me", meHandler)
			r.With(localMiddleware.RequireRole("admin")).Get("/api/v1/admin/summary", adminSummaryHandler)
			if deps.SourceSvc != nil {
				sourceHandler := handlers.NewSourceHandler(deps.SourceSvc)
				r.Get("/api/v1/sources", sourceHandler.List)
				r.Post("/api/v1/sources", sourceHandler.Create)
				r.Get("/api/v1/sources/{id}", sourceHandler.Get)
				r.Post("/api/v1/sources/{id}/test", sourceHandler.Test)
			}
			if deps.CollectorSvc != nil {
				collectorHandler := handlers.NewCollectorHandler(deps.CollectorSvc, deps.CollectorRunRepo)
				r.Post("/api/v1/sources/{id}/collect", collectorHandler.Trigger)
				r.Get("/api/v1/sources/{id}/collector-runs", collectorHandler.ListRuns)
				r.Get("/api/v1/collector-runs/{id}", collectorHandler.GetRun)
			}
			if deps.MetricCatalog != nil {
				catalogHandler := handlers.NewMetricCatalogHandler(deps.MetricCatalog, deps.FormulaValidator)
				r.Get("/api/v1/metrics/catalog", catalogHandler.ListMetrics)
				r.Get("/api/v1/metrics/catalog/{metricId}", catalogHandler.GetMetric)
				r.Post("/api/v1/formulas/validate", catalogHandler.ValidateFormula)
			}
			if deps.MetricQuerySvc != nil {
				queryHandler := handlers.NewMetricQueryHandler(deps.MetricQuerySvc)
				r.Post("/api/v1/metrics/query", queryHandler.Query)
				widgetHandler := handlers.NewWidgetDataHandler(deps.MetricQuerySvc)
				r.Post("/api/v1/metrics/widget-data", widgetHandler.Query)
			}
		})
	} else if deps.DashboardSvc != nil {
		r.Get("/api/v1/dashboards", dashboardHandler.List)
		r.Post("/api/v1/dashboards", dashboardHandler.Create)
		r.Get("/api/v1/dashboards/{id}", dashboardHandler.Get)
		r.Put("/api/v1/dashboards/{id}", dashboardHandler.Update)
		r.Post("/api/v1/dashboards/{id}/fork", dashboardHandler.Fork)
		r.Put("/api/v1/dashboards/{id}/layout", dashboardHandler.UpdateLayout)
		r.Put("/api/v1/dashboards/{id}/share", dashboardHandler.UpdateShare)
		r.Post("/api/v1/ingest/github", ingestionHandler.GitHub)
		r.Post("/api/v1/ingest/pm", ingestionHandler.PM)
		if deps.SourceSvc != nil {
			sourceHandler := handlers.NewSourceHandler(deps.SourceSvc)
			r.Get("/api/v1/sources", sourceHandler.List)
			r.Post("/api/v1/sources", sourceHandler.Create)
			r.Get("/api/v1/sources/{id}", sourceHandler.Get)
			r.Post("/api/v1/sources/{id}/test", sourceHandler.Test)
		}
		if deps.CollectorSvc != nil {
			collectorHandler := handlers.NewCollectorHandler(deps.CollectorSvc, deps.CollectorRunRepo)
			r.Post("/api/v1/sources/{id}/collect", collectorHandler.Trigger)
			r.Get("/api/v1/sources/{id}/collector-runs", collectorHandler.ListRuns)
			r.Get("/api/v1/collector-runs/{id}", collectorHandler.GetRun)
		}
		if deps.MetricCatalog != nil {
			catalogHandler := handlers.NewMetricCatalogHandler(deps.MetricCatalog, deps.FormulaValidator)
			r.Get("/api/v1/metrics/catalog", catalogHandler.ListMetrics)
			r.Get("/api/v1/metrics/catalog/{metricId}", catalogHandler.GetMetric)
			r.Post("/api/v1/formulas/validate", catalogHandler.ValidateFormula)
		}
		if deps.MetricQuerySvc != nil {
			queryHandler := handlers.NewMetricQueryHandler(deps.MetricQuerySvc)
			r.Post("/api/v1/metrics/query", queryHandler.Query)
			widgetHandler := handlers.NewWidgetDataHandler(deps.MetricQuerySvc)
			r.Post("/api/v1/metrics/widget-data", widgetHandler.Query)
		}
	} else {
		r.Get("/api/v1/dashboards", serviceUnavailableHandler)
		r.Post("/api/v1/dashboards", serviceUnavailableHandler)
	}

	// Legacy endpoints for existing UI (public)
	r.Get("/api/v1/teams", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`[{"id":1,"name":"Platform"},{"id":2,"name":"Mobile"},{"id":3,"name":"Backend"}]`))
	})
	r.Get("/api/v1/dashboard", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"prsOpened":14,"prsMerged":28,"blockedTasks":7,"ciFailures":3}`))
	})
	r.Get("/api/v1/teams/{id}", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"id":"1","name":"Platform"}`))
	})
	r.Get("/api/v1/teams/{id}/overview", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"prsOpened":5,"prsMerged":12,"blockedTasks":2,"ciFailures":1}`))
	})
	r.Get("/api/v1/teams/{id}/activity", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"data":[{"type":"pr_opened","date":"2026-05-01","count":5},{"type":"pr_merged","date":"2026-05-01","count":3}]}`))
	})
	r.Get("/api/v1/teams/{id}/velocity", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"data":[{"week":"2026-W17","points":25},{"week":"2026-W18","points":32}]}`))
	})
	r.Get("/api/v1/teams/{id}/insights", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"insights":["PR review time increased by 15%","Consider adding more automated tests"]}`))
	})
	r.Get("/api/v1/teams/comparison", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`[{"id":"1","name":"Platform","prs":45,"velocity":28},{"id":"2","name":"Mobile","prs":32,"velocity":22}]`))
	})

	return r
}

func adminSummaryHandler(w http.ResponseWriter, r *http.Request) {
	respond.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// @Summary Get DORA metrics
// @Description Returns DORA metrics (deployment frequency, lead time, MTTR, change failure rate)
// @Tags dora
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/dora [get]
func doraHandler(w http.ResponseWriter, r *http.Request) {
	handlers.DORAHandler(w, r)
}

// @Summary Get engineering metrics
// @Description Returns engineering metrics (PRs, tasks, CI/CD)
// @Tags metrics
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/metrics [get]
func metricsHandler(w http.ResponseWriter, r *http.Request) {
	handlers.MetricsHandler(w, r)
}

// @Summary Get role-specific dashboard
// @Description Returns dashboard data for a specific role (engineer, lead, manager)
// @Tags role
// @Accept json
// @Produce json
// @Param role path string true "Role name"
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/role/{role} [get]
func roleHandler(w http.ResponseWriter, r *http.Request) {
	handlers.RoleHandler(w, r)
}

// @Summary Get insights
// @Description Returns AI-generated insights for the team
// @Tags insights
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/insights [get]
func insightsHandler(w http.ResponseWriter, r *http.Request) {
	handlers.InsightsHandler(w, r)
}

func main() {
	cfg := config.Load()
	ctx := context.Background()

	deps, err := newRuntime(ctx, cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "api startup failed: %v\n", err)
		os.Exit(1)
	}
	defer deps.Close()
	if cfg.SeedOnly {
		return
	}

	r := NewRouter(RouterDeps{
		KeyManager:       deps.keyManager,
		AuthSvc:          deps.authSvc,
		DashboardSvc:     deps.dashboardSvc,
		TemplateSvc:      deps.templateSvc,
		MetricsSvc:       deps.metricsSvc,
		IngestionSvc:     deps.ingestionSvc,
		SourceSvc:        deps.sourceSvc,
		CollectorSvc:     deps.collectorSvc,
		CollectorRunRepo: deps.sourceRepo,
		MetricCatalog:    deps.metricCatalog,
		FormulaValidator: deps.formulaValidator,
		MetricQuerySvc:   deps.metricQuerySvc,
		ActivityRepo:     deps.activityRepo,
		InsightRepo:      deps.insightRepo,
	})

	// Swagger documentation
	swaggerDir := "../docs/tech/app/docs/swagger"
	if _, err := os.Stat(swaggerDir); os.IsNotExist(err) {
		swaggerDir = "../docs/swagger"
	}
	fs := http.FileServer(http.Dir(swaggerDir))
	r.Handle("/swagger/*", http.StripPrefix("/swagger/", fs))

	srv := &http.Server{Addr: ":" + cfg.Port, Handler: r}

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-quit
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		srv.Shutdown(ctx)
	}()

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		os.Exit(1)
	}
}
