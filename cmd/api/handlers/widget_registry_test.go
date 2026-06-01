// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/stretchr/testify/require"
)

func TestWidgetProcessorRegistry_ProcessSupportedType(t *testing.T) {
	registry := &widgetProcessorRegistry{
		processors: map[string]widgetProcessor{
			"known": func(_ context.Context, _ string, _ json.RawMessage, _ *domain.Dashboard) (any, error) {
				return map[string]string{"ok": "yes"}, nil
			},
		},
		fallback: func(_ context.Context, widgetType string, _ json.RawMessage, _ *domain.Dashboard) (any, error) {
			return nil, fmt.Errorf("unsupported widget type: %s", widgetType)
		},
	}

	got, err := registry.Process(context.Background(), "known", nil, nil)
	require.NoError(t, err)
	require.Equal(t, map[string]string{"ok": "yes"}, got)
}

func TestWidgetProcessorRegistry_ProcessUnsupportedType(t *testing.T) {
	registry := &widgetProcessorRegistry{
		processors: map[string]widgetProcessor{},
		fallback: func(_ context.Context, widgetType string, _ json.RawMessage, _ *domain.Dashboard) (any, error) {
			return nil, fmt.Errorf("unsupported widget type: %s", widgetType)
		},
	}

	_, err := registry.Process(context.Background(), "missing", nil, nil)
	require.Error(t, err)
	require.EqualError(t, err, "unsupported widget type: missing")
}

func TestWidgetProcessorRegistry_Register(t *testing.T) {
	registry := &widgetProcessorRegistry{processors: map[string]widgetProcessor{}}
	registry.register("alpha", func(_ context.Context, _ string, _ json.RawMessage, _ *domain.Dashboard) (any, error) {
		return "alpha", nil
	})

	got, err := registry.Process(context.Background(), "alpha", nil, nil)
	require.NoError(t, err)
	require.Equal(t, "alpha", got)
}

// ── buildHeatmapData tests ──────────────────────────────────────────────────

func mustRawMsg(v any) json.RawMessage {
	b, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return b
}

func TestBuildHeatmapData_DefaultConfig_TeamLabels(t *testing.T) {
	got := buildHeatmapData(nil)

	require.Equal(t, "Team Activity", got.Title)
	require.Len(t, got.XLabels, 16, "default columns=16")
	require.Equal(t, []string{"Atlas", "Beacon", "Comet", "Delta", "Echo"}, got.YLabels)
	require.Len(t, got.Cells, 5*16, "5 teams × 16 weeks")
	require.Equal(t, "W1", got.XLabels[0])
	require.Equal(t, "W16", got.XLabels[15])
}

func TestBuildHeatmapData_TeamGroupByExplicit(t *testing.T) {
	cfg := mustRawMsg(map[string]any{"rowGroupBy": "team", "columns": 14})
	got := buildHeatmapData(cfg)

	require.Len(t, got.XLabels, 14)
	require.Equal(t, []string{"Atlas", "Beacon", "Comet", "Delta", "Echo"}, got.YLabels)
	require.Len(t, got.Cells, 5*14)
}

func TestBuildHeatmapData_WeekdayGroupBy(t *testing.T) {
	cfg := mustRawMsg(map[string]any{"rowGroupBy": "weekday", "columns": 8})
	got := buildHeatmapData(cfg)

	require.Equal(t, "Activity by Weekday", got.Title)
	require.Equal(t, []string{"Mon", "Tue", "Wed", "Thu", "Fri"}, got.YLabels)
	require.Len(t, got.XLabels, 8)
	require.Len(t, got.Cells, 5*8)
}

func TestBuildHeatmapData_Deterministic(t *testing.T) {
	cfg := mustRawMsg(map[string]any{"rowGroupBy": "team", "columns": 4})
	a := buildHeatmapData(cfg)
	b := buildHeatmapData(cfg)

	require.Equal(t, a, b, "output must be identical across calls")
}

func TestBuildHeatmapData_CellsHaveXYValueStatus(t *testing.T) {
	cfg := mustRawMsg(map[string]any{"rowGroupBy": "team", "columns": 4})
	got := buildHeatmapData(cfg)

	for i, c := range got.Cells {
		require.NotEmpty(t, c.X, "cell[%d].X must not be empty", i)
		require.NotEmpty(t, c.Y, "cell[%d].Y must not be empty", i)
		require.NotEmpty(t, c.Status, "cell[%d].Status must not be empty", i)
	}
}

func TestBuildHeatmapData_StatusMatchesValue(t *testing.T) {
	cfg := mustRawMsg(map[string]any{"rowGroupBy": "team", "columns": 16})
	got := buildHeatmapData(cfg)

	for i, c := range got.Cells {
		var want string
		switch {
		case c.Value >= 4:
			want = "ok"
		case c.Value >= 2:
			want = "warning"
		case c.Value >= 1:
			want = "neutral"
		default:
			want = "error"
		}
		require.Equal(t, want, c.Status, "cell[%d] value=%d status mismatch", i, c.Value)
	}
}

func TestBuildHeatmapData_ColumnsNormalization(t *testing.T) {
	cases := []struct {
		input int
		want  int
	}{
		{0, 16},  // unset → default
		{1, 4},   // below min → 4
		{3, 4},   // below min → 4
		{4, 4},   // min
		{14, 14}, // in range
		{24, 24}, // max
		{30, 24}, // above max → 24
	}
	for _, tc := range cases {
		cfg := mustRawMsg(map[string]any{"rowGroupBy": "team", "columns": tc.input})
		got := buildHeatmapData(cfg)
		require.Len(t, got.XLabels, tc.want, "columns=%d", tc.input)
	}
}

func TestBuildHeatmapData_CellsReferenceCorrectLabels(t *testing.T) {
	cfg := mustRawMsg(map[string]any{"rowGroupBy": "team", "columns": 4})
	got := buildHeatmapData(cfg)

	xSet := make(map[string]bool, len(got.XLabels))
	for _, l := range got.XLabels {
		xSet[l] = true
	}
	ySet := make(map[string]bool, len(got.YLabels))
	for _, l := range got.YLabels {
		ySet[l] = true
	}
	for i, c := range got.Cells {
		require.True(t, xSet[c.X], "cell[%d].X=%q not in xLabels", i, c.X)
		require.True(t, ySet[c.Y], "cell[%d].Y=%q not in yLabels", i, c.Y)
	}
}
