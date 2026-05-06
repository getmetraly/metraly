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
