// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import { describe, it, expect } from 'vitest';
import { buildQuerySubscriptions } from '../query-subscriptions';
import type { DashboardFilters } from '../../../../types/dashboard';

const defaultFilters: DashboardFilters = { timeRange: '7d', team: 'All teams', repo: 'All repos' };

describe('buildQuerySubscriptions', () => {
  it('deduplicates widgets sharing the same query', () => {
    // Both widgets have the same metricId, resultKind, timeRange — differ only in visual config
    const subs = buildQuerySubscriptions([
      { instanceId: 'w-1', config: { type: 'metric-chart', metricId: 'pr-cycle', chartVariant: 'area', showCompare: false } },
      { instanceId: 'w-2', config: { type: 'metric-chart', metricId: 'pr-cycle', chartVariant: 'bar', showCompare: true } },
    ], defaultFilters);
    // One unique query
    expect(subs.queries).toHaveLength(1);
    // Both widgets map to the same queryKey
    expect(subs.widgetToQueryKey.get('w-1')).toBe(subs.widgetToQueryKey.get('w-2'));
  });

  it('creates separate query entries for different metrics', () => {
    const subs = buildQuerySubscriptions([
      { instanceId: 'w-1', config: { type: 'metric-chart', metricId: 'pr-cycle', chartVariant: 'area', showCompare: false } },
      { instanceId: 'w-2', config: { type: 'stat-card', metricId: 'lead-time', showSparkline: true, colorKey: 'cyan' } },
    ], defaultFilters);
    expect(subs.queries).toHaveLength(2);
    expect(subs.widgetToQueryKey.get('w-1')).not.toBe(subs.widgetToQueryKey.get('w-2'));
  });

  it('excludes widgets with no data query (section-header, empty)', () => {
    const subs = buildQuerySubscriptions([
      { instanceId: 'w-header', config: { type: 'section-header', title: 'My Section' } },
      { instanceId: 'w-empty', config: { type: 'empty' } },
    ], defaultFilters);
    expect(subs.queries).toHaveLength(0);
    expect(subs.widgetToQueryKey.size).toBe(0);
  });

  it('maps queryKey to set of widgetIds', () => {
    const subs = buildQuerySubscriptions([
      { instanceId: 'w-1', config: { type: 'metric-chart', metricId: 'pr-cycle', chartVariant: 'area', showCompare: false } },
      { instanceId: 'w-2', config: { type: 'metric-chart', metricId: 'pr-cycle', chartVariant: 'bar', showCompare: false } },
    ], defaultFilters);
    const qk = subs.widgetToQueryKey.get('w-1')!;
    const set = subs.queryKeyToWidgets.get(qk)!;
    expect(set.has('w-1')).toBe(true);
    expect(set.has('w-2')).toBe(true);
  });
});
