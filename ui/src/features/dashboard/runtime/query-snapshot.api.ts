// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import type { QueryClient } from '@tanstack/react-query';
import { client } from '../../../api/client';
import type { MetricQuery } from './metric-query.types';
import { resolveTimeRangePreset } from './metric-query.types';
import type { QueryResultEnvelope } from './metric-query-result.types';
import { tanstackQueryKey } from './query-key';
import { QueryResultEnvelopeSchema, SnapshotResponseSchema } from './query-schemas';

export interface SnapshotQueryItem {
  queryKey: string;
  query: MetricQuery;
}

export interface BackendSnapshotQuery {
  metricId: string;
  resultKind: string;
  resultShape: string;
  granularity: string;
  start: string;
  end: string;
  filters?: Record<string, string>;
  groupBy?: string[];
  params?: Record<string, string | number | boolean | string[]>;
}

/**
 * MVP backend accepts one value per filter. Multi-value execution is deferred.
 * QueryKey still includes all values to avoid unsafe dedupe.
 */
function toBackendFilters(filters?: Record<string, string[]>): Record<string, string> | undefined {
  if (!filters) return undefined;
  const out: Record<string, string> = {};
  for (const [key, values] of Object.entries(filters)) {
    if (values.length === 0) continue;
    // MVP limitation: multi-value filters use first value only.
    out[key] = values[0];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function toBackendQuery(query: MetricQuery): BackendSnapshotQuery {
  const { start, end } = resolveTimeRangePreset(query.timeRangePreset);
  return {
    metricId: query.metricId,
    resultKind: query.resultKind,
    resultShape: query.resultShape,
    granularity: query.granularity ?? 'day',
    start,
    end,
    filters: toBackendFilters(query.filters),
    ...(query.groupBy ? { groupBy: query.groupBy } : {}),
    ...(query.params ? { params: query.params } : {}),
  };
}

function seedCache(
  dashboardId: string,
  queryClient: QueryClient,
  envelopes: QueryResultEnvelope[],
): QueryResultEnvelope[] {
  for (const envelope of envelopes) {
    queryClient.setQueryData<QueryResultEnvelope>(
      tanstackQueryKey(dashboardId, envelope.queryKey),
      envelope,
    );
  }
  return envelopes;
}

export async function fetchSnapshotAndSeedCache(
  dashboardId: string,
  queries: SnapshotQueryItem[],
  queryClient: QueryClient,
): Promise<QueryResultEnvelope[]> {
  const response = await client.post(`/dashboards/${dashboardId}/query-results/snapshot`, {
    queries: queries.map(({ queryKey, query }) => ({ queryKey, query: toBackendQuery(query) })),
  });
  const parsed = SnapshotResponseSchema.parse(response.data);
  return seedCache(dashboardId, queryClient, parsed.results);
}

export async function fetchSingleQueryAndSeedCache(
  dashboardId: string,
  item: SnapshotQueryItem,
  queryClient: QueryClient,
): Promise<QueryResultEnvelope> {
  const results = await fetchSnapshotAndSeedCache(dashboardId, [item], queryClient);
  const matching = results.find((result) => result.queryKey === item.queryKey);
  if (!matching) {
    throw new Error(`missing snapshot result for queryKey ${item.queryKey}`);
  }
  return QueryResultEnvelopeSchema.parse(matching);
}

