// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package main

import (
	"net/http/httptest"
	"testing"

	"github.com/getmetraly/metraly/cmd/api/auth"
	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/stretchr/testify/assert"
)

func TestProtectedRoutesHaveMiddleware(t *testing.T) {
	km, _ := auth.NewKeyManager("", true)
	r := NewRouter(RouterDeps{KeyManager: km})

	protected := []string{
		"/api/v1/me",
		"/api/v1/activity",
		"/api/v1/dashboards",
		"/api/v1/role/engineer", // P1-16: role route must be behind auth
	}

	for _, p := range protected {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", p, nil)
		req.Header.Set("Authorization", "Bearer invalid-token")
		r.ServeHTTP(w, req)

		assert.Equalf(t, "true", w.Header().Get("X-Auth-Checked"), "middleware missing on %s", p)
	}

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/v1/ingest/github", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	r.ServeHTTP(w, req)

	assert.Equal(t, "true", w.Header().Get("X-Auth-Checked"))
}

// TestNewRouter_PanicsWithoutKeyManager verifies the P1-15 guard:
// NewRouter panics when a protected service is provided without a KeyManager.
func TestNewRouter_PanicsWithoutKeyManager(t *testing.T) {
	assert.Panics(t, func() {
		// DashboardSvc is protected; passing it without KeyManager must panic.
		NewRouter(RouterDeps{
			KeyManager:   nil,
			DashboardSvc: &biz.DashboardSvc{},
		})
	}, "NewRouter must panic when KeyManager is nil but protected services are provided")
}
