// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package config

import (
	"os"
	"strconv"
	"strings"
)

type AppConfig struct {
	Port               string
	PostgresDSN        string
	RedisHost          string
	RedisPort          string
	JWTPrivateKey      string
	SourceSecretKey    string
	AccessTokenTTL     string
	RefreshTokenTTL    string
	OIDCIssuerURL      string
	OIDCClientID       string
	OIDCClientSecret   string
	OIDCRedirectURL    string
	SeedOnStart        bool
	SeedOnly           bool
	SeedAdminEmail     string
	SeedAdminPassword  string
	MetricsCacheTTL    int
	DashboardsCacheTTL int
	TemplatesCacheTTL  int

	// CORSAllowedOrigins is a comma-separated list of allowed origins.
	// Empty means no cross-origin requests are allowed (safe default for production).
	// Example: "https://metraly.io,https://app.metraly.io,http://localhost:3000"
	CORSAllowedOrigins []string

	// DefaultWorkspaceID is the workspace assigned to all users at token-mint time.
	// For the MVP all users share one workspace; a future phase will add a workspace table.
	// Must be set in production; defaults to "ws-default" for dev convenience.
	DefaultWorkspaceID string

	// AppEnv controls environment-specific behaviours.
	// Allowed values: "production" | "development" | "test"
	// Affects: ephemeral key allowance, startup-fail behaviour on missing secrets.
	AppEnv string

	// EnableLegacyMockEndpoints controls whether the public legacy /api/v1/teams and
	// /api/v1/dashboard mock endpoints are active.
	// Default: false in production (disabled), true in development (enabled).
	// Set ENABLE_LEGACY_MOCK_ENDPOINTS=true to override in non-production environments.
	EnableLegacyMockEndpoints bool
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getEnvInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

// IsProduction returns true when AppEnv is "production".
func (c AppConfig) IsProduction() bool { return c.AppEnv == "production" }

func Load() AppConfig {
	rawOrigins := getEnv("CORS_ALLOWED_ORIGINS", "")
	var origins []string
	for _, o := range strings.Split(rawOrigins, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			origins = append(origins, o)
		}
	}

	return AppConfig{
		Port:               getEnv("PORT", "8000"),
		PostgresDSN:        getEnv("POSTGRES_DSN", "postgres://metraly:metraly@localhost:5432/metraly?sslmode=disable"),
		RedisHost:          getEnv("REDIS_HOST", "redis"),
		RedisPort:          getEnv("REDIS_PORT", "6379"),
		JWTPrivateKey:      getEnv("JWT_PRIVATE_KEY", ""),
		SourceSecretKey:    getEnv("SOURCE_SECRET_KEY", ""),
		AccessTokenTTL:     getEnv("ACCESS_TOKEN_TTL", "900"),
		RefreshTokenTTL:    getEnv("REFRESH_TOKEN_TTL", "604800"),
		OIDCIssuerURL:      getEnv("OIDC_ISSUER_URL", ""),
		OIDCClientID:       getEnv("OIDC_CLIENT_ID", ""),
		OIDCClientSecret:   getEnv("OIDC_CLIENT_SECRET", ""),
		OIDCRedirectURL:    getEnv("OIDC_REDIRECT_URL", ""),
		SeedOnStart:        getEnv("SEED_ON_START", "false") == "true",
		SeedOnly:           getEnv("SEED_ONLY", "false") == "true",
		SeedAdminEmail:     getEnv("SEED_ADMIN_EMAIL", ""),
		SeedAdminPassword:  getEnv("SEED_ADMIN_PASSWORD", ""),
		MetricsCacheTTL:    getEnvInt("METRICS_CACHE_TTL", 300),
		DashboardsCacheTTL: getEnvInt("DASHBOARDS_CACHE_TTL", 30),
		TemplatesCacheTTL:  getEnvInt("TEMPLATES_CACHE_TTL", 3600),
		CORSAllowedOrigins: origins,
		DefaultWorkspaceID: getEnv("DEFAULT_WORKSPACE_ID", "ws-default"),
		AppEnv:             getEnv("APP_ENV", "development"),
		// Legacy mock endpoints: disabled in production by default; enabled in dev/test.
		// Override with ENABLE_LEGACY_MOCK_ENDPOINTS=true for non-production environments.
		EnableLegacyMockEndpoints: getEnv("APP_ENV", "development") != "production" ||
			getEnv("ENABLE_LEGACY_MOCK_ENDPOINTS", "false") == "true",
	}
}
