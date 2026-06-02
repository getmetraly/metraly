// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"encoding/json"
	"net/http"
)

type Insight struct {
	Title  string `json:"title"`
	Body   string `json:"body"`
	Action string `json:"action"`
}
type InsightsResponse struct {
	Insights  []Insight `json:"insights"`
	UpdatedAt string    `json:"updatedAt"`
}

func InsightsHandler(w http.ResponseWriter, r *http.Request) {
	resp := InsightsResponse{
		Insights: []Insight{
			{Title: "CI slowdown detected", Body: "Pipeline times increased 15% over the last week", Action: "View affected jobs"},
			{Title: "High PR review queue", Body: "5 PRs have been waiting > 24 hours for review", Action: "Review queue"},
			{Title: "Deploy frequency up", Body: "Team velocity increased 20% this sprint", Action: "View trends"},
		},
		UpdatedAt: "2026-05-01T12:00:00Z",
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, `{"error":{"code":"ENCODE_ERROR","message":"failed to encode insights response"}}`, http.StatusInternalServerError)
	}
}
