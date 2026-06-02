// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import type { WidgetConfig } from '../../../types/widgets';
import type { DashboardFilters } from '../../../types/dashboard';
import type { MetricQuery, TimeRangePreset } from './metric-query.types';

const DEFAULT_PRESET: TimeRangePreset = 'last_30d';

/**
 * Map a legacy short token ("30d", "7d", etc.) to a canonical preset.
 * This function exists ONLY for reading stored dashboard defaultFilters that
 * were saved before the canonical preset migration. New writes must use presets.
 */
function coerceToPreset(raw: string | undefined): TimeRangePreset {
  switch (raw) {
    case 'last_7d': return 'last_7d';
    case 'last_14d': return 'last_14d';
    case 'last_30d': return 'last_30d';
    case 'last_60d': return 'last_60d';
    case 'last_90d': return 'last_90d';
    // Legacy stored values — coerce at read boundary only:
    case '7d': case 'now-7d': return 'last_7d';
    case '14d': return 'last_14d';
    case '30d': case 'now-30d': return 'last_30d';
    case '60d': return 'last_60d';
    case '90d': return 'last_90d';
    default: return DEFAULT_PRESET;
  }
}

/**
 * Resolve a widget config to its MetricQuery.
 * Returns null for widgets that need no data query (layout spacers, section headers).
 * The dashboard defaultFilters are merged as query-level filters (widget filtersOverride wins).
 */
export function resolveWidgetQuery(
  config: WidgetConfig,
  defaultFilters: DashboardFilters,
): MetricQuery | null {
  const timeRangePreset = coerceToPreset(defaultFilters.timeRange);
  const baseFilters: Record<string, string[]> = {};
  if (defaultFilters.team && defaultFilters.team !== 'All teams') {
    baseFilters['team'] = [defaultFilters.team];
  }
  if (defaultFilters.repo && defaultFilters.repo !== 'All repos') {
    baseFilters['repo'] = [defaultFilters.repo];
  }

  const override = config.filtersOverride as Partial<DashboardFilters> | undefined;
  const overrideFilters: Record<string, string[]> = {};
  const overrideTimeRangePreset = override?.timeRange ? coerceToPreset(override.timeRange) : undefined;
  if (override?.team && override.team !== 'All teams') {
    overrideFilters['team'] = [override.team];
  }
  if (override?.repo && override.repo !== 'All repos') {
    overrideFilters['repo'] = [override.repo];
  }

  const mergedFilters = { ...baseFilters, ...overrideFilters };
  const preset = overrideTimeRangePreset ?? timeRangePreset;
  const filters = Object.keys(mergedFilters).length > 0 ? mergedFilters : undefined;

  switch (config.type) {
    case 'stat-card':
      return {
        metricId: config.metricId,
        resultKind: 'scalar',
        resultShape: 'stat-card',
        timeRangePreset: preset,
        filters,
      };
    case 'metric-chart':
      return {
        metricId: config.metricId,
        resultKind: 'timeseries',
        resultShape: 'metric-chart',
        timeRangePreset: preset,
        filters,
        ...(config.showCompare ? { params: { includePrevious: true } } : {}),
      };
    case 'compare-bar-chart':
      return {
        metricId: config.metricId,
        resultKind: 'breakdown',
        resultShape: 'compare-bar-chart',
        timeRangePreset: preset,
        filters,
        groupBy: [config.groupBy],
        params: { compare: true },
      };
    case 'leaderboard':
      return {
        metricId: config.metricId,
        resultKind: 'breakdown',
        resultShape: 'leaderboard',
        timeRangePreset: preset,
        filters,
        groupBy: [config.groupBy],
        params: { limit: config.limit },
      };
    case 'heatmap':
      return {
        metricId: 'activity',
        resultKind: 'heatmap',
        resultShape: 'heatmap',
        timeRangePreset: preset,
        filters,
        params: {
          rowGroupBy: config.rowGroupBy,
          ...(config.columns !== undefined ? { columns: config.columns } : {}),
        },
      };
    case 'dora-overview':
      return {
        metricId: 'dora',
        resultKind: 'dora',
        resultShape: 'dora-overview',
        timeRangePreset: preset,
        filters,
      };
    case 'recent-activity':
      return {
        metricId: 'activity',
        resultKind: 'activity',
        resultShape: 'recent-activity',
        timeRangePreset: preset,
        filters,
        params: { maxItems: config.maxItems ?? 8 },
      };
    case 'ai-insight':
      return {
        metricId: 'insight',
        resultKind: 'insight',
        resultShape: 'ai-insight',
        timeRangePreset: preset,
        filters,
        ...(config.topicHint ? { params: { topicHint: config.topicHint } } : {}),
      };
    case 'anomaly-detector':
      return {
        metricId: 'anomaly',
        resultKind: 'anomaly',
        resultShape: 'anomaly-detector',
        timeRangePreset: preset,
        filters,
        params: { watchMetrics: (config.watchMetrics ?? []).join(',') },
      };
    case 'data-table':
      return {
        metricId: config.tableType,
        resultKind: 'table',
        resultShape: 'data-table',
        timeRangePreset: preset,
        filters,
        params: { tableType: config.tableType, maxRows: config.maxRows },
      };
    case 'health-gauge':
      return {
        metricId: 'health-score',
        resultKind: 'scalar',
        resultShape: 'health-gauge',
        timeRangePreset: preset,
        filters,
      };
    case 'sprint-burndown':
      return {
        metricId: 'burndown',
        resultKind: 'timeseries',
        resultShape: 'sprint-burndown',
        timeRangePreset: preset,
        filters,
        params: {
          showTaskList: config.showTaskList,
          ...(config.userId ? { userId: config.userId } : {}),
        },
      };
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
