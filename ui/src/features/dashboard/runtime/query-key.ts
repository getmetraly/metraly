// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import type { MetricQuery } from './metric-query.types';

/** Visual-only fields excluded from QueryKey. */
const VISUAL_PARAMS: Record<string, true> = {
  colorKey: true, chartVariant: true, showSparkline: true, colorOverride: true,
  primaryLabel: true, compareLabel: true, showCompare: true, showDimensions: true,
  showTaskList: true, userId: true, variant: true,
};
const DEFAULT_GRANULARITY = 'day';

/**
 * Build a canonical, deterministic QueryKey string from a MetricQuery.
 *
 * Rules:
 * - Excludes layout fields (x/y/w/h/etc.), widget identity, and pure visual config.
 * - Sorts filters keys and values; sorts groupBy; sorts params keys.
 * - Uses relative timeRange token (not resolved absolute times).
 * - Stable across re-renders and page reloads.
 */
export function buildQueryKey(query: MetricQuery): string {
  const filters = query.filters
    ? Object.fromEntries(
        Object.keys(query.filters)
          .sort()
          .map((k) => [k, [...(query.filters![k] ?? [])].sort()]),
      )
    : undefined;

  const groupBy = query.groupBy ? [...query.groupBy].sort() : undefined;

  const params = query.params
    ? Object.fromEntries(
        Object.keys(query.params)
          .filter((k) => !(k in VISUAL_PARAMS))
          .sort()
          .map((k) => [k, query.params![k]]),
      )
    : undefined;

  const canonical: Record<string, unknown> = {
    metricId: query.metricId,
    resultKind: query.resultKind,
    timeRange: query.timeRange,
    granularity: query.granularity ?? DEFAULT_GRANULARITY,
  };
  if (filters && Object.keys(filters).length > 0) canonical.filters = filters;
  if (groupBy && groupBy.length > 0) canonical.groupBy = groupBy;
  if (params && Object.keys(params).length > 0) canonical.params = params;

  return JSON.stringify(canonical);
}

/**
 * Build the TanStack Query queryKey array for a single queryKey.
 * Shape: ['queryResult', dashboardId, queryKey]
 */
export function tanstackQueryKey(dashboardId: string, queryKey: string): [string, string, string] {
  return ['queryResult', dashboardId, queryKey];
}

/**
 * Build the TanStack Query queryKey array for the batched snapshot.
 * Shape: ['dashboardSnapshot', dashboardId]
 */
export function tanstackSnapshotKey(dashboardId: string): [string, string] {
  return ['dashboardSnapshot', dashboardId];
}
