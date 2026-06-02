// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"encoding/json"
	"net/http"
)

type MetricResponse struct {
	ID      string    `json:"id"`
	Label   string    `json:"label"`
	Unit    string    `json:"unit"`
	Color   string    `json:"color"`
	Current float64   `json:"current"`
	Delta   float64   `json:"delta"`
	Series  []float64 `json:"series"`
	Compare []float64 `json:"compare"`
}

func MetricsHandler(w http.ResponseWriter, r *http.Request) {
	metric := r.URL.Query().Get("metric")
	_ = metric
	resp := MetricResponse{
		ID:      "deploy-freq",
		Label:   "Deployment Frequency",
		Unit:    "deploys/day",
		Color:   "#00E5FF",
		Current: 4.2,
		Delta:   0.8,
		Series:  makeSeries(100, 30, 4, 1),
		Compare: makeSeries(200, 30, 3.8, 1),
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, `{"error":{"code":"ENCODE_ERROR","message":"failed to encode metrics response"}}`, http.StatusInternalServerError)
	}
}
