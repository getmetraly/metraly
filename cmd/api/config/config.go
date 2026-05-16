// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package config

import (
	"os"
	"strconv"
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

func Load() AppConfig {
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
	}
}
