// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import type { WidgetConfig } from '../../../types/widgets';
import type { DashboardFilters } from '../../../types/dashboard';
import type { MetricQuery } from './metric-query.types';

/**
 * Resolve a widget config to its MetricQuery.
 * Returns null for widgets that need no data query (layout spacers, section headers).
 * The dashboard defaultFilters are merged as query-level filters (widget filtersOverride wins).
 */
export function resolveWidgetQuery(
  config: WidgetConfig,
  defaultFilters: DashboardFilters,
): MetricQuery | null {
  const baseTimeRange = defaultFilters.timeRange || '30d';
  const baseFilters: Record<string, string[]> = {};
  if (defaultFilters.team && defaultFilters.team !== 'All teams') {
    baseFilters['team'] = [defaultFilters.team];
  }
  if (defaultFilters.repo && defaultFilters.repo !== 'All repos') {
    baseFilters['repo'] = [defaultFilters.repo];
  }

  const override = config.filtersOverride as Partial<DashboardFilters> | undefined;
  const overrideFilters: Record<string, string[]> = {};
  const overrideTimeRange = override?.timeRange;
  if (override?.team && override.team !== 'All teams') {
    overrideFilters['team'] = [override.team];
  }
  if (override?.repo && override.repo !== 'All repos') {
    overrideFilters['repo'] = [override.repo];
  }

  const mergedFilters = { ...baseFilters, ...overrideFilters };
  const timeRange = overrideTimeRange || baseTimeRange;
  const filters = Object.keys(mergedFilters).length > 0 ? mergedFilters : undefined;

  switch (config.type) {
    case 'stat-card':
      return { metricId: config.metricId, resultKind: 'scalar', timeRange, filters };
    case 'metric-chart':
      return { metricId: config.metricId, resultKind: 'timeseries', timeRange, filters };
    case 'compare-bar-chart':
      return {
        metricId: config.metricId,
        resultKind: 'breakdown',
        timeRange,
        filters,
        groupBy: [config.groupBy],
      };
    case 'leaderboard':
      return {
        metricId: config.metricId,
        resultKind: 'breakdown',
        timeRange,
        filters,
        groupBy: [config.groupBy],
        params: { limit: config.limit },
      };
    case 'heatmap':
      return {
        metricId: 'activity',
        resultKind: 'heatmap',
        timeRange,
        filters,
        params: {
          rowGroupBy: config.rowGroupBy,
          ...(config.columns !== undefined ? { columns: config.columns } : {}),
        },
      };
    case 'dora-overview':
      return { metricId: 'dora', resultKind: 'dora', timeRange, filters };
    case 'recent-activity':
      return {
        metricId: 'activity',
        resultKind: 'activity',
        timeRange,
        filters,
        params: { maxItems: config.maxItems ?? 8 },
      };
    case 'ai-insight':
      return {
        metricId: 'insight',
        resultKind: 'insight',
        timeRange,
        filters,
        ...(config.topicHint ? { params: { topicHint: config.topicHint } } : {}),
      };
    case 'anomaly-detector':
      return {
        metricId: 'anomaly',
        resultKind: 'anomaly',
        timeRange,
        filters,
        params: { watchMetrics: config.watchMetrics.join(',') },
      };
    case 'data-table':
      return {
        metricId: config.tableType,
        resultKind: 'table',
        timeRange,
        filters,
        params: { tableType: config.tableType, maxRows: config.maxRows },
      };
    case 'health-gauge':
      return { metricId: 'health-score', resultKind: 'scalar', timeRange, filters };
    case 'sprint-burndown':
      return { metricId: 'burndown', resultKind: 'timeseries', timeRange, filters };
    case 'section-header':
    case 'empty':
      return null;
    default: {
      // TypeScript exhaustive check
      const _never: never = config;
      void _never;
      return null;
    }
  }
}
