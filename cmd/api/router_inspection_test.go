// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package main

import (
	"net/http/httptest"
	"testing"

	"github.com/getmetraly/metraly/cmd/api/auth"
	"github.com/stretchr/testify/assert"
)

func TestProtectedRoutesHaveMiddleware(t *testing.T) {
	km, _ := auth.NewKeyManager("")
	r := NewRouter(RouterDeps{KeyManager: km})

	protected := []string{
		"/api/v1/me",
		"/api/v1/activity",
		"/api/v1/dashboards",
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
