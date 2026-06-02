// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/getmetraly/metraly/cmd/api/middleware"
)

type MeResponse struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

func MeHandler(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFrom(r.Context())
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	resp := MeResponse{
		Email: claims.Email,
		Role:  claims.Role,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, `{"error":{"code":"ENCODE_ERROR","message":"failed to encode current user response"}}`, http.StatusInternalServerError)
	}
}
