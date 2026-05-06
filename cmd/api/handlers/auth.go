// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"reflect"

	"github.com/getmetraly/metraly/cmd/api/auth"
	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/respond"
)

type authService interface {
	Login(ctx context.Context, email, password string) (*auth.TokenPair, error)
	Refresh(ctx context.Context, rawToken string) (string, int, error)
	Logout(ctx context.Context, rawToken string) error
}

type AuthHandler struct {
	svc authService
}

func NewAuthHandler(svc authService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type refreshResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if !h.ready() {
		ServiceUnavailable(w, "auth service unavailable")
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	pair, err := h.svc.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, biz.ErrUnauthorized) {
			respond.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid credentials")
			return
		}
		respond.Error(w, http.StatusInternalServerError, "AUTH_LOGIN_FAILED", err.Error())
		return
	}

	respond.JSON(w, http.StatusOK, pair)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	if !h.ready() {
		ServiceUnavailable(w, "auth service unavailable")
		return
	}

	var req refreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	if req.RefreshToken == "" {
		respond.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "refresh_token is required")
		return
	}

	accessToken, expiresIn, err := h.svc.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		if errors.Is(err, biz.ErrUnauthorized) {
			respond.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid refresh token")
			return
		}
		respond.Error(w, http.StatusInternalServerError, "AUTH_REFRESH_FAILED", err.Error())
		return
	}

	respond.JSON(w, http.StatusOK, refreshResponse{AccessToken: accessToken, ExpiresIn: expiresIn})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if !h.ready() {
		ServiceUnavailable(w, "auth service unavailable")
		return
	}

	var req refreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	if req.RefreshToken == "" {
		respond.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "refresh_token is required")
		return
	}

	if err := h.svc.Logout(r.Context(), req.RefreshToken); err != nil {
		respond.Error(w, http.StatusInternalServerError, "AUTH_LOGOUT_FAILED", err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) OIDCLogin(w http.ResponseWriter, r *http.Request) {
	ServiceUnavailable(w, "oidc login is disabled")
}

func (h *AuthHandler) OIDCCallback(w http.ResponseWriter, r *http.Request) {
	ServiceUnavailable(w, "oidc callback is disabled")
}

func (h *AuthHandler) ready() bool {
	return h != nil && !isNilAuthService(h.svc)
}

func isNilAuthService(s authService) bool {
	if s == nil {
		return true
	}
	v := reflect.ValueOf(s)
	switch v.Kind() {
	case reflect.Chan, reflect.Func, reflect.Interface, reflect.Map, reflect.Ptr, reflect.Slice:
		return v.IsNil()
	default:
		return false
	}
}
