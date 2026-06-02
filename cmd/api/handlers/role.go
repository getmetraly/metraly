// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"encoding/json"
	"net/http"
)

type RoleStats struct {
	Icon     string    `json:"icon"`
	Label    string    `json:"label"`
	Value    string    `json:"value"`
	Trend    string    `json:"trend"`
	TrendDir string    `json:"trendDir"`
	Color    string    `json:"color"`
	Spark    []float64 `json:"spark"`
}
type RoleResponse struct {
	Role    string                 `json:"role"`
	Stats   []RoleStats            `json:"stats"`
	Payload map[string]interface{} `json:"payload"`
}

func RoleHandler(w http.ResponseWriter, r *http.Request) {
	role := r.URL.Query().Get("role")
	if role == "" {
		role = "cto"
	}
	var resp RoleResponse
	switch role {
	case "cto":
		resp = RoleResponse{
			Role: "cto",
			Stats: []RoleStats{
				{Icon: "trendingUp", Label: "Engineering Health", Value: "84", Trend: "+3 pts", TrendDir: "up", Color: "cyan", Spark: makeSeries(1, 10, 80, 5)},
			},
			Payload: map[string]interface{}{
				"deployTrend":    makeSeries(1, 14, 4, 1),
				"velocityByTeam": []map[string]string{{"team": "Platform", "velocity": "42"}, {"team": "Frontend", "velocity": "38"}},
				"leadTimeTrend":  makeSeries(2, 14, 2, 0.5),
				"healthScore":    84,
			},
		}
	case "vp":
		resp = RoleResponse{
			Role: "vp",
			Stats: []RoleStats{
				{Icon: "trendingUp", Label: "Sprint Velocity", Value: "42 pts", Trend: "+5%", TrendDir: "up", Color: "cyan", Spark: makeSeries(3, 10, 40, 5)},
			},
			Payload: map[string]interface{}{
				"sprintVelocity": 42,
				"prCycleTime":    makeSeries(4, 14, 4, 2),
				"heatmap":        [][]int{{2, 4, 3, 5, 2, 3, 4}, {3, 5, 4, 6, 3, 4, 5}, {1, 3, 2, 4, 2, 3, 4}},
				"deliveryRisk":   "low",
			},
		}
	case "tl":
		resp = RoleResponse{
			Role: "tl",
			Stats: []RoleStats{
				{Icon: "checkCircle", Label: "CI Pass Rate", Value: "94%", Trend: "+2%", TrendDir: "up", Color: "success", Spark: makeSeries(5, 10, 92, 3)},
			},
			Payload: map[string]interface{}{
				"ciPassRate":    94,
				"prQueue":       5,
				"burndown":      makeSeries(6, 14, 50, 10),
				"failingBuilds": 2,
			},
		}
	case "devops":
		resp = RoleResponse{
			Role: "devops",
			Stats: []RoleStats{
				{Icon: "zap", Label: "Deploy Frequency", Value: "4.2/day", Trend: "+0.8", TrendDir: "up", Color: "cyan", Spark: makeSeries(7, 10, 4, 1)},
			},
			Payload: map[string]interface{}{
				"deployFreq":     4.2,
				"mttrTrend":      makeSeries(8, 14, 12, 5),
				"deployHeatData": [][]int{{1, 2, 3, 4, 5, 4, 3}, {2, 3, 5, 6, 5, 4, 3}},
				"incidents":      2,
			},
		}
	default:
		resp = RoleResponse{
			Role: "ic",
			Stats: []RoleStats{
				{Icon: "code", Label: "My PRs", Value: "8", Trend: "+2", TrendDir: "up", Color: "purple", Spark: makeSeries(9, 10, 6, 3)},
			},
			Payload: map[string]interface{}{
				"myPRs":          8,
				"ciRuns":         24,
				"reviewQueue":    3,
				"sprintProgress": 65,
			},
		}
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, `{"error":{"code":"ENCODE_ERROR","message":"failed to encode role dashboard response"}}`, http.StatusInternalServerError)
	}
}
