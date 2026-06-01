// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics
// Copyright (C) 2026 Metraly Contributors
//
// useDashboardEditor — per-instance editor hook.
// Provides a scoped editor state (distinct from the global wizard store)
// for the edit shell (DashboardScreen), preventing cross-contamination
// between concurrent create/edit flows (P2-1 fix).

import { useState, useCallback } from 'react';
import type { Dashboard } from '../../types/dashboard';
import type { LayoutItem as RGLLayout } from 'react-grid-layout/legacy';
import {
  type DashboardEditorState,
  type DashboardEditorWidgetSize,
  createEditorStateFromDashboard,
  appendEditorWidget,
  removeEditorWidget,
  toggleEditorWidgetSize,
  moveEditorWidget,
  createEditorWidgetSizes,
} from './model';

export interface UseDashboardEditorReturn {
  state: DashboardEditorState;
  initFromDashboard: (dashboard: Dashboard) => void;
  addWidget: (widgetId: string) => void;
  removeWidget: (instanceId: string) => void;
  toggleWidgetSize: (instanceId: string) => void;
  moveWidget: (fromIndex: number, toIndex: number) => void;
  updateLayout: (newLayout: readonly RGLLayout[]) => void;
  setName: (name: string) => void;
  setDesc: (desc: string) => void;
  setTimeRange: (timeRange: string) => void;
  setTeam: (team: string) => void;
  setIcon: (icon: string) => void;
  reset: () => void;
}

const EMPTY_STATE: DashboardEditorState = {
  selectedTemplate: null,
  widgets: [],
  layout: [],
  widgetSizes: {},
  name: '',
  desc: '',
  timeRange: '30d',
  team: 'All teams',
  icon: 'activity',
};

export function useDashboardEditor(): UseDashboardEditorReturn {
  const [state, setState] = useState<DashboardEditorState>(EMPTY_STATE);

  const initFromDashboard = useCallback((dashboard: Dashboard) => {
    setState(createEditorStateFromDashboard(dashboard));
  }, []);

  const addWidget = useCallback((widgetId: string) => {
    setState((prev) => {
      const next = appendEditorWidget(prev.widgets, prev.layout, prev.widgetSizes, widgetId);
      return { ...prev, ...next };
    });
  }, []);

  const removeWidget = useCallback((instanceId: string) => {
    setState((prev) => {
      const next = removeEditorWidget(prev.widgets, prev.layout, prev.widgetSizes, instanceId);
      return { ...prev, ...next };
    });
  }, []);

  const toggleWidgetSize = useCallback((instanceId: string) => {
    setState((prev) => {
      const next = toggleEditorWidgetSize(prev.layout, prev.widgetSizes, instanceId);
      return { ...prev, ...next };
    });
  }, []);

  const moveWidget = useCallback((fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const nextWidgets = moveEditorWidget(prev.widgets, fromIndex, toIndex);
      if (nextWidgets === prev.widgets) return prev;
      const layoutById = new Map(prev.layout.map((item) => [item.i, item]));
      const nextLayout = nextWidgets.map((widget, idx) => {
        const existing = layoutById.get(widget.instanceId);
        return {
          i: widget.instanceId,
          x: existing?.x ?? 0,
          y: idx * 2,
          w: existing?.w ?? 6,
          h: existing?.h ?? 2,
        };
      });
      return {
        ...prev,
        widgets: nextWidgets,
        layout: nextLayout,
        widgetSizes: createEditorWidgetSizes(nextLayout),
      };
    });
  }, []);

  const updateLayout = useCallback((newLayout: readonly RGLLayout[]) => {
    setState((prev) => {
      const mutableLayout = [...newLayout];
      const widgetSizes: Record<string, DashboardEditorWidgetSize> = { ...prev.widgetSizes };
      mutableLayout.forEach((item) => {
        widgetSizes[item.i] = item.w === 12 ? 'full' : 'half';
      });
      return { ...prev, layout: mutableLayout, widgetSizes };
    });
  }, []);

  const setName = useCallback((name: string) => setState((p) => ({ ...p, name })), []);
  const setDesc = useCallback((desc: string) => setState((p) => ({ ...p, desc })), []);
  const setTimeRange = useCallback((timeRange: string) => setState((p) => ({ ...p, timeRange })), []);
  const setTeam = useCallback((team: string) => setState((p) => ({ ...p, team })), []);
  const setIcon = useCallback((icon: string) => setState((p) => ({ ...p, icon })), []);
  const reset = useCallback(() => setState(EMPTY_STATE), []);

  return {
    state,
    initFromDashboard,
    addWidget,
    removeWidget,
    toggleWidgetSize,
    moveWidget,
    updateLayout,
    setName,
    setDesc,
    setTimeRange,
    setTeam,
    setIcon,
    reset,
  };
}
