// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/getmetraly/metraly/cmd/api/auth"
	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/stretchr/testify/assert"
)

type fakeAuthService struct {
	loginPair      *auth.TokenPair
	loginErr       error
	refreshToken   string
	refreshExpires int
	refreshErr     error
	refreshTokenIn string
	logoutErr      error
	logoutTokenIn  string
}

func (f *fakeAuthService) Login(ctx context.Context, email, password string) (*auth.TokenPair, error) {
	return f.loginPair, f.loginErr
}

func (f *fakeAuthService) Refresh(ctx context.Context, rawToken string) (string, int, error) {
	f.refreshTokenIn = rawToken
	return f.refreshToken, f.refreshExpires, f.refreshErr
}

func (f *fakeAuthService) Logout(ctx context.Context, rawToken string) error {
	f.logoutTokenIn = rawToken
	return f.logoutErr
}

func TestAuthHandler_Login(t *testing.T) {
	svc := &fakeAuthService{
		loginPair: &auth.TokenPair{
			AccessToken:  "access",
			RefreshToken: "refresh",
			ExpiresIn:    900,
			User:         &domain.User{ID: "u1", Email: "test@example.com", Role: "admin"},
		},
	}

	h := NewAuthHandler(svc)
	body := bytes.NewBufferString(`{"email":"test@example.com","password":"secret"}`)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", body)

	h.Login(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp auth.TokenPair
	err := json.NewDecoder(w.Body).Decode(&resp)
	assert.NoError(t, err)
	assert.Equal(t, "access", resp.AccessToken)
	assert.Equal(t, "refresh", resp.RefreshToken)
	assert.Equal(t, "test@example.com", resp.User.Email)
}

func TestAuthHandler_Refresh(t *testing.T) {
	svc := &fakeAuthService{
		refreshToken:   "access",
		refreshExpires: 900,
	}
	h := NewAuthHandler(svc)
	body := bytes.NewBufferString(`{"refresh_token":"refresh-token"}`)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", body)

	h.Refresh(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "refresh-token", svc.refreshTokenIn)
	var resp refreshResponse
	err := json.NewDecoder(w.Body).Decode(&resp)
	assert.NoError(t, err)
	assert.Equal(t, "access", resp.AccessToken)
	assert.Equal(t, 900, resp.ExpiresIn)
}

func TestAuthHandler_Logout(t *testing.T) {
	svc := &fakeAuthService{}
	h := NewAuthHandler(svc)
	body := bytes.NewBufferString(`{"refresh_token":"refresh-token"}`)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", body)

	h.Logout(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
	assert.Equal(t, "refresh-token", svc.logoutTokenIn)
}

func TestAuthHandler_Unauthorized(t *testing.T) {
	svc := &fakeAuthService{loginErr: biz.ErrUnauthorized}
	h := NewAuthHandler(svc)
	body := bytes.NewBufferString(`{"email":"test@example.com","password":"bad"}`)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", body)

	h.Login(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAuthHandler_ServiceUnavailable(t *testing.T) {
	h := NewAuthHandler(nil)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(`{"email":"x","password":"y"}`))

	h.Login(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
}

func TestAuthHandler_InvalidJSON(t *testing.T) {
	h := NewAuthHandler(&fakeAuthService{})
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(`{`))

	h.Login(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

var _ authService = (*fakeAuthService)(nil)
