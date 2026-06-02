// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import { describe, it, expect } from 'vitest';
import { resolveWidgetQuery } from '../resolve-widget-query';
import type { DashboardFilters } from '../../../../types/dashboard';

const defaultFilters: DashboardFilters = { timeRange: '30d', team: 'All teams', repo: 'All repos' };

describe('resolveWidgetQuery', () => {
  it('stat-card → scalar', () => {
    const q = resolveWidgetQuery({ type: 'stat-card', metricId: 'pr-cycle', showSparkline: true, colorKey: 'cyan' }, defaultFilters);
    expect(q).not.toBeNull();
    expect(q!.resultKind).toBe('scalar');
    expect(q!.metricId).toBe('pr-cycle');
    expect(q!.timeRange).toBe('30d');
  });

  it('metric-chart → timeseries', () => {
    const q = resolveWidgetQuery({ type: 'metric-chart', metricId: 'lead-time', chartVariant: 'area', showCompare: false }, defaultFilters);
    expect(q!.resultKind).toBe('timeseries');
  });

  it('leaderboard → breakdown with groupBy', () => {
    const q = resolveWidgetQuery({ type: 'leaderboard', metricId: 'velocity', groupBy: 'team', limit: 5 }, defaultFilters);
    expect(q!.resultKind).toBe('breakdown');
    expect(q!.groupBy).toEqual(['team']);
  });

  it('section-header → null', () => {
    const q = resolveWidgetQuery({ type: 'section-header', title: 'Header' }, defaultFilters);
    expect(q).toBeNull();
  });

  it('empty → null', () => {
    const q = resolveWidgetQuery({ type: 'empty' }, defaultFilters);
    expect(q).toBeNull();
  });

  it('dora-overview → dora resultKind', () => {
    const q = resolveWidgetQuery({ type: 'dora-overview' }, defaultFilters);
    expect(q!.resultKind).toBe('dora');
  });

  it('merges team filter when team is set', () => {
    const filters: DashboardFilters = { timeRange: '7d', team: 'eng', repo: 'All repos' };
    const q = resolveWidgetQuery({ type: 'stat-card', metricId: 'pr-cycle', showSparkline: false, colorKey: 'cyan' }, filters);
    expect(q!.filters?.['team']).toEqual(['eng']);
  });

  it('does not add filter when team is All teams', () => {
    const q = resolveWidgetQuery({ type: 'stat-card', metricId: 'pr-cycle', showSparkline: false, colorKey: 'cyan' }, defaultFilters);
    expect(q!.filters).toBeUndefined();
  });
});
