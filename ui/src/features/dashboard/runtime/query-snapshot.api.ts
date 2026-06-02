// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import type { QueryClient } from '@tanstack/react-query';
import { client } from '../../../api/client';
import type { MetricQuery } from './metric-query.types';
import type { QueryResultEnvelope } from './metric-query-result.types';
import { tanstackQueryKey } from './query-key';
import { QueryResultEnvelopeSchema, SnapshotResponseSchema } from './query-schemas';

const DAYS_BY_TOKEN: Record<string, number> = {
  '7d': 7,
  'now-7d': 7,
  '14d': 14,
  '30d': 30,
  'now-30d': 30,
  '60d': 60,
  '90d': 90,
};

export interface SnapshotQueryItem {
  queryKey: string;
  query: MetricQuery;
}

export interface BackendSnapshotQuery {
  metricId: string;
  resultKind: string;
  granularity: string;
  start: string;
  end: string;
  filters?: Record<string, string>;
  groupBy?: string[];
  params?: Record<string, string | number | boolean>;
}

function resolveTimeRange(token: string): { start: string; end: string } {
  const now = new Date();
  const days = DAYS_BY_TOKEN[token] ?? 30;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return { start: start.toISOString(), end: now.toISOString() };
}

function toBackendQuery(query: MetricQuery): BackendSnapshotQuery {
  const { start, end } = resolveTimeRange(query.timeRange);
  return {
    metricId: query.metricId,
    resultKind: query.resultKind,
    granularity: query.granularity ?? 'day',
    start,
    end,
    ...(query.filters
      ? {
          filters: Object.fromEntries(
            Object.entries(query.filters).map(([key, values]) => [key, values[0] ?? '']),
          ),
        }
      : {}),
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

export function createFakeSnapshotAdapter(fixtures: QueryResultEnvelope[]) {
  return async (
    dashboardId: string,
    _queries: SnapshotQueryItem[],
    queryClient: QueryClient,
  ): Promise<QueryResultEnvelope[]> => seedCache(dashboardId, queryClient, fixtures);
}
