// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/auth"
	"github.com/stretchr/testify/assert"
)

func TestRequireAuth_MissingToken(t *testing.T) {
	km, _ := auth.NewKeyManager("", true)
	handler := RequireAuth(km)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/me", nil)
	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestRequireAuth_InvalidToken(t *testing.T) {
	km, _ := auth.NewKeyManager("", true)
	handler := RequireAuth(km)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/me", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestRequireAuth_ValidToken(t *testing.T) {
	km, _ := auth.NewKeyManager("", true)
	claims := auth.Claims{Sub: "user1", Email: "test@example.com", Role: "viewer"}
	token, _ := km.Sign(claims, time.Minute*15)

	var receivedClaims *auth.Claims
	handler := RequireAuth(km)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedClaims = ClaimsFrom(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NotNil(t, receivedClaims)
	assert.Equal(t, "user1", receivedClaims.Sub)
}

func TestRequireRole_Allowed(t *testing.T) {
	km, _ := auth.NewKeyManager("", true)
	claims := auth.Claims{Sub: "user1", Email: "admin@example.com", Role: "admin"}
	token, _ := km.Sign(claims, time.Minute*15)

	handler := RequireAuth(km)(RequireRole("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})))

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/admin", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequireRole_Forbidden(t *testing.T) {
	km, _ := auth.NewKeyManager("", true)
	claims := auth.Claims{Sub: "user1", Email: "viewer@example.com", Role: "viewer"}
	token, _ := km.Sign(claims, time.Minute*15)

	handler := RequireAuth(km)(RequireRole("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})))

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/admin", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}
