// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/auth"
)

func TestGracefulShutdown(t *testing.T) {
	km, _ := auth.NewKeyManager("")
	r := NewRouter(RouterDeps{KeyManager: km})
	srv := &http.Server{Addr: "localhost:18000", Handler: r}

	go func() {
		_ = srv.ListenAndServe()
	}()

	// Give the server a moment to start
	time.Sleep(100 * time.Millisecond)

	// Gracefully shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		t.Fatalf("graceful shutdown failed: %v", err)
	}

	// Verify server is down
	_, err := http.Get("http://localhost:18000/api/v1/health")
	if err == nil {
		t.Fatal("expected server to be down")
	}
}

func TestNewRouter(t *testing.T) {
	r := NewRouter(RouterDeps{})
	if r == nil {
		t.Fatal("NewRouter returned nil")
	}

	// Test that public routes work without auth
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/health", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestNewRouterWithAuth(t *testing.T) {
	km, _ := auth.NewKeyManager("")
	r := NewRouter(RouterDeps{KeyManager: km})

	// Test that protected routes require auth
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/dashboards", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}

	// Test that X-Auth-Checked header is set
	if w.Header().Get("X-Auth-Checked") != "true" {
		t.Fatal("X-Auth-Checked header not set")
	}
}

func TestNewRouterIngestionRouteRequiresAuth(t *testing.T) {
	km, _ := auth.NewKeyManager("")
	r := NewRouter(RouterDeps{KeyManager: km})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/v1/ingest/github", bytes.NewBufferString(`{"source":"github","eventType":"pull_request","team":"Atlas"}`))
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestNewRouter_DashboardServiceUnavailable(t *testing.T) {
	r := NewRouter(RouterDeps{})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/dashboards", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", w.Code)
	}
}

func TestNewRouter_AuthRoutesRegistered(t *testing.T) {
	km, _ := auth.NewKeyManager("")
	r := NewRouter(RouterDeps{KeyManager: km})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewBufferString(`{"email":"test@example.com","password":"secret"}`))
	r.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected auth route to be registered and unavailable, got %d", w.Code)
	}
}

func TestNewRouter_AdminRoleGate(t *testing.T) {
	km, _ := auth.NewKeyManager("")
	r := NewRouter(RouterDeps{KeyManager: km})

	viewerClaims := auth.Claims{Sub: "user-1", Email: "viewer@example.com", Role: "viewer"}
	viewerToken, _ := km.Sign(viewerClaims, time.Minute*15)
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/admin/summary", nil)
	req.Header.Set("Authorization", "Bearer "+viewerToken)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected viewer to be forbidden, got %d", w.Code)
	}

	adminClaims := auth.Claims{Sub: "user-2", Email: "admin@example.com", Role: "admin"}
	adminToken, _ := km.Sign(adminClaims, time.Minute*15)
	w = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/v1/admin/summary", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected admin to pass, got %d", w.Code)
	}

	var resp map[string]string
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode admin response: %v", err)
	}
	if resp["status"] != "ok" {
		t.Fatalf("expected status ok, got %#v", resp)
	}
}
