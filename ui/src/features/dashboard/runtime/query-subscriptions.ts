// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import type { MetricQuery } from './metric-query.types';
import type { WidgetConfig } from '../../../types/widgets';
import type { DashboardFilters } from '../../../types/dashboard';
import { buildQueryKey } from './query-key';
import { resolveWidgetQuery } from './resolve-widget-query';

export interface WidgetQueryEntry {
  widgetInstanceId: string;
  queryKey: string;
  query: MetricQuery;
}

export interface QuerySubscriptions {
  /** queryKey → set of widgetInstanceIds */
  readonly queryKeyToWidgets: ReadonlyMap<string, ReadonlySet<string>>;
  /** widgetInstanceId → queryKey */
  readonly widgetToQueryKey: ReadonlyMap<string, string>;
  /** unique queries to fetch */
  readonly queries: ReadonlyArray<{ queryKey: string; query: MetricQuery }>;
}

export interface WidgetInput {
  instanceId: string;
  config: WidgetConfig;
}

/**
 * Build deduplicated query subscriptions from the widget list.
 * Widgets with no query (spacers, section headers) are excluded.
 * Layout fields never affect the subscription map — only config changes matter.
 */
export function buildQuerySubscriptions(
  widgets: WidgetInput[],
  defaultFilters: DashboardFilters,
): QuerySubscriptions {
  const queryKeyToWidgets = new Map<string, Set<string>>();
  const widgetToQueryKey = new Map<string, string>();
  const seenQueryKeys = new Map<string, MetricQuery>();

  for (const widget of widgets) {
    const query = resolveWidgetQuery(widget.config, defaultFilters);
    if (!query) continue;
    const queryKey = buildQueryKey(query);
    widgetToQueryKey.set(widget.instanceId, queryKey);
    let widgetSet = queryKeyToWidgets.get(queryKey);
    if (!widgetSet) {
      widgetSet = new Set();
      queryKeyToWidgets.set(queryKey, widgetSet);
    }
    widgetSet.add(widget.instanceId);
    if (!seenQueryKeys.has(queryKey)) {
      seenQueryKeys.set(queryKey, query);
    }
  }

  const queries = Array.from(seenQueryKeys.entries()).map(([queryKey, query]) => ({ queryKey, query }));

  return { queryKeyToWidgets, widgetToQueryKey, queries };
}

/**
 * Compute the diff between two subscription sets.
 * Returns added and removed queryKeys (for resubscription logic).
 */
export function diffSubscriptions(
  prev: QuerySubscriptions,
  next: QuerySubscriptions,
): { added: string[]; removed: string[] } {
  const added: string[] = [];
  const removed: string[] = [];
  for (const qk of next.queryKeyToWidgets.keys()) {
    if (!prev.queryKeyToWidgets.has(qk)) added.push(qk);
  }
  for (const qk of prev.queryKeyToWidgets.keys()) {
    if (!next.queryKeyToWidgets.has(qk)) removed.push(qk);
  }
  return { added, removed };
}
