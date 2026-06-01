// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics
// Copyright (C) 2026 Metraly Contributors
//
// Editor round-trip tests: verify that the taxonomy fix (P0-1) holds end-to-end.
// No library IDs should leak into persisted widgetType; all persisted types must
// be valid runtime types that the backend widgetProcessorRegistry accepts.

import { describe, it, expect } from 'vitest';
import { createEditorStateFromTemplate, toDashboardWidgetInstances, createEditorStateFromDashboard, createEditorWidget } from './model';
import { buildCreateDashboardRequest } from './payload';
import { WIDGET_LIBRARY } from './catalog';
import type { Dashboard } from '../../types/dashboard';

// The 13 runtime types registered in the backend widget_registry.go + section-header
const SUPPORTED_RUNTIME_TYPES: Record<string, true> = {
  'stat-card': true,
  'metric-chart': true,
  'leaderboard': true,
  'data-table': true,
  'dora-overview': true,
  'heatmap': true,
  'sprint-burndown': true,
  'ai-insight': true,
  'anomaly-detector': true,
  'compare-bar-chart': true,
  'recent-activity': true,
  'section-header': true,
  'health-gauge': true,
};
describe('editor round-trip taxonomy fix (P0-1)', () => {
  it('createEditorStateFromTemplate → buildCreateDashboardRequest: all widgetTypes are runtime types', () => {
    for (const templateId of ['cto', 'vp', 'tl', 'devops', 'ic']) {
      const state = createEditorStateFromTemplate(templateId);
      const request = buildCreateDashboardRequest(state);
      for (const widget of request.widgets) {
        expect(
          !!SUPPORTED_RUNTIME_TYPES[widget.widgetType],
          `template "${templateId}" widget "${widget.instanceId}" has library id "${widget.widgetType}" instead of a runtime type`,
        ).toBe(true);
      }
    }
  });

  it('toDashboardWidgetInstances: emits config.type not widget.type (library id)', () => {
    const state = createEditorStateFromTemplate('cto');
    const instances = toDashboardWidgetInstances(state.widgets);
    for (const inst of instances) {
      expect(
        !!SUPPORTED_RUNTIME_TYPES[inst.widgetType],
        `widgetType "${inst.widgetType}" is not a runtime type`,
      ).toBe(true);
    }
  });

  it('every WIDGET_LIBRARY entry produces a valid runtime type when converted', () => {
    // Add one of each library widget
    const allWidgetsState = {
      ...createEditorStateFromTemplate('blank'),
      widgets: WIDGET_LIBRARY.map((def) => createEditorWidget(def.id)).filter((w): w is NonNullable<typeof w> => w !== null),
    };
    const instances = toDashboardWidgetInstances(allWidgetsState.widgets);
    for (const inst of instances) {
      expect(
        !!SUPPORTED_RUNTIME_TYPES[inst.widgetType],
        `library widget produced non-runtime type "${inst.widgetType}"`,
      ).toBe(true);
    }
  });

  it('createEditorStateFromDashboard: round-trips runtime widget type through label/icon lookup', () => {
    // Simulate what the backend returns after a create: runtime types as widgetType
    const savedDashboard: Dashboard = {
      id: 'test-dash',
      name: 'Test',
      description: '',
      sourceType: 'user-created',
      visibility: 'private',
      defaultFilters: { timeRange: '30d', team: 'All teams', repo: 'All repos' },
      widgets: [
        { instanceId: 'w1', widgetType: 'stat-card', config: { type: 'stat-card', metricId: 'deploy-freq', showSparkline: true, colorKey: 'cyan' } as never },
        { instanceId: 'w2', widgetType: 'metric-chart', config: { type: 'metric-chart', metricId: 'velocity', chartVariant: 'area', showCompare: false } as never },
        { instanceId: 'w3', widgetType: 'dora-overview', config: { type: 'dora-overview' } as never },
        { instanceId: 'w4', widgetType: 'data-table', config: { type: 'data-table', tableType: 'pr-queue', maxRows: 5 } as never },
        { instanceId: 'w5', widgetType: 'heatmap', config: { type: 'heatmap', rowGroupBy: 'team', columns: 4 } as never },
      ],
      layout: [
        { i: 'w1', x: 0, y: 0, w: 6, h: 2 },
        { i: 'w2', x: 6, y: 0, w: 6, h: 2 },
        { i: 'w3', x: 0, y: 2, w: 12, h: 2 },
        { i: 'w4', x: 0, y: 4, w: 12, h: 2 },
        { i: 'w5', x: 0, y: 6, w: 12, h: 2 },
      ],
      version: 1,
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const editorState = createEditorStateFromDashboard(savedDashboard);
    // All editor widgets should have non-empty labels (not just the raw widgetType)
    for (const widget of editorState.widgets) {
      expect(widget.label).toBeTruthy();
      expect(widget.label).not.toBe(''); // was returning widgetType as fallback before fix
    }

    // Re-serializing should still produce valid runtime types (no library id leakage)
    const reserialised = toDashboardWidgetInstances(editorState.widgets);
    for (const inst of reserialised) {
      expect(
        !!SUPPORTED_RUNTIME_TYPES[inst.widgetType],
        `round-tripped widgetType "${inst.widgetType}" is not a runtime type`,
      ).toBe(true);
    }
  });

  it('buildCreateDashboardRequest: no library id leaks into widgets array', () => {
    const state = createEditorStateFromTemplate('devops');
    const request = buildCreateDashboardRequest(state);
    const libraryIds = new Set(WIDGET_LIBRARY.map((w) => w.id));
    for (const widget of request.widgets) {
      expect(
        libraryIds.has(widget.widgetType),
        `widgetType "${widget.widgetType}" looks like a library id — should be a runtime type`,
      ).toBe(false);
    }
  });
});
