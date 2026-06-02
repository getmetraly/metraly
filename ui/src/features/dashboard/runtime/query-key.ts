// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import type { MetricQuery } from './metric-query.types';

/** Visual-only fields excluded from QueryKey. Never data-affecting. */
const VISUAL_PARAMS: Record<string, true> = {
  colorKey: true, chartVariant: true, showSparkline: true, colorOverride: true,
  primaryLabel: true, compareLabel: true, showDimensions: true, variant: true,
};
const DEFAULT_GRANULARITY = 'day';

/**
 * Build a canonical, deterministic QueryKey string from a MetricQuery.
 *
 * Rules:
 * - Excludes layout fields, widget identity, and pure visual config.
 * - Sorts filter keys and values; does NOT sort groupBy (order is data-affecting).
 * - Sorts params keys after removing visual-only ones.
 * - Uses canonical timeRangePreset token (not resolved absolute times).
 * - resultShape is data-affecting: included to prevent unsafe deduplication.
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
    resultShape: query.resultShape,
    timeRangePreset: query.timeRangePreset,
    granularity: query.granularity ?? DEFAULT_GRANULARITY,
  };
  if (filters && Object.keys(filters).length > 0) canonical.filters = filters;
  // groupBy order preserved — do not sort; order is intentionally data-affecting
  if (query.groupBy?.length) canonical.groupBy = query.groupBy;
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
 * Includes querySignature so that a changed query set triggers a new fetch.
 * Shape: ['dashboardSnapshot', dashboardId, querySignature]
 */
export function tanstackSnapshotKey(
  dashboardId: string,
  querySignature: string,
): [string, string, string] {
  return ['dashboardSnapshot', dashboardId, querySignature];
}

