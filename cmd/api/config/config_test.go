// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package config_test

import (
	"os"
	"testing"

	"github.com/getmetraly/metraly/cmd/api/config"
)

func TestLoad_defaults(t *testing.T) {
	os.Unsetenv("PORT")
	os.Unsetenv("POSTGRES_DSN")
	os.Unsetenv("REDIS_HOST")

	cfg := config.Load()

	if cfg.Port != "8000" {
		t.Fatalf("expected port 8000, got %s", cfg.Port)
	}
	if cfg.PostgresDSN == "" {
		t.Fatal("expected non-empty postgres DSN")
	}
	if cfg.RedisHost != "redis" {
		t.Fatalf("expected redis host 'redis', got %s", cfg.RedisHost)
	}
}

func TestLoad_fromEnv(t *testing.T) {
	os.Setenv("PORT", "9090")
	os.Setenv("SEED_ADMIN_EMAIL", "admin@test.com")
	os.Setenv("SEED_ONLY", "true")
	defer os.Unsetenv("PORT")
	defer os.Unsetenv("SEED_ADMIN_EMAIL")
	defer os.Unsetenv("SEED_ONLY")

	cfg := config.Load()

	if cfg.Port != "9090" {
		t.Fatalf("expected 9090, got %s", cfg.Port)
	}
	if cfg.SeedAdminEmail != "admin@test.com" {
		t.Fatalf("expected admin@test.com, got %s", cfg.SeedAdminEmail)
	}
	if !cfg.SeedOnly {
		t.Fatal("expected SeedOnly to be true")
	}
}

func TestLoad_CacheTTLs(t *testing.T) {
	os.Setenv("METRICS_CACHE_TTL", "300")
	os.Setenv("DASHBOARDS_CACHE_TTL", "30")
	os.Setenv("TEMPLATES_CACHE_TTL", "3600")
	defer func() {
		os.Unsetenv("METRICS_CACHE_TTL")
		os.Unsetenv("DASHBOARDS_CACHE_TTL")
		os.Unsetenv("TEMPLATES_CACHE_TTL")
	}()

	cfg := config.Load()
	if cfg.MetricsCacheTTL != 300 {
		t.Fatalf("expected 300, got %d", cfg.MetricsCacheTTL)
	}
	if cfg.DashboardsCacheTTL != 30 {
		t.Fatalf("expected 30, got %d", cfg.DashboardsCacheTTL)
	}
	if cfg.TemplatesCacheTTL != 3600 {
		t.Fatalf("expected 3600, got %d", cfg.TemplatesCacheTTL)
	}
}
