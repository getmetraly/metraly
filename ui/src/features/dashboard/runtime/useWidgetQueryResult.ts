// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryRuntimeState } from './query-runtime.types';
import { useConnectionStore } from './connection-store';
import { tanstackQueryKey } from './query-key';
import { useQueryRuntimeContext } from './query-runtime-context';
import { fetchSingleQueryAndSeedCache } from './query-snapshot.api';
import type { QueryResultEnvelope } from './metric-query-result.types';

const QUERY_STALE_TIME_MS = 20_000;
const QUERY_GC_TIME_MS = 5 * 60 * 1000;

export function useWidgetQueryResult(widgetInstanceId: string): QueryRuntimeState {
  const runtimeContext = useQueryRuntimeContext();
  const queryClient = useQueryClient();
  const connectionStatus = useConnectionStore((state) => state.status);
  const reconnectingQueryKeys = useConnectionStore((state) => state.reconnectingQueryKeys);

  const dashboardId = runtimeContext?.dashboardId ?? '__no_dashboard__';
  const queryKey = runtimeContext?.widgetQueryKeyMap.get(widgetInstanceId) ?? null;
  const queryItem = queryKey ? runtimeContext?.queriesByKey.get(queryKey) ?? null : null;

  const queryState = useQuery<QueryResultEnvelope>({
    queryKey: queryKey ? tanstackQueryKey(dashboardId, queryKey) : ['queryResult', dashboardId, widgetInstanceId, 'idle'],
    enabled: Boolean(queryKey && queryItem),
    queryFn: () => fetchSingleQueryAndSeedCache(dashboardId, queryItem as NonNullable<typeof queryItem>, queryClient),
    staleTime: QUERY_STALE_TIME_MS,
    gcTime: QUERY_GC_TIME_MS,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  if (!queryKey || !queryItem) {
    return { queryKey: null, status: 'idle', result: undefined };
  }

  if (queryState.isPending) {
    return { queryKey, status: 'loading', result: undefined };
  }

  if (queryState.isError || !queryState.data) {
    return { queryKey, status: 'error', result: undefined };
  }

  const data = queryState.data;

  if (connectionStatus === 'reconnecting' || reconnectingQueryKeys.has(queryKey)) {
    return {
      queryKey,
      status: 'reconnecting',
      result: data.result,
      quality: data.quality,
      lineage: data.lineage,
      version: data.version,
      sequence: data.sequence,
      updatedAt: data.updatedAt,
    };
  }

  if (data.status === 'empty') {
    return {
      queryKey,
      status: 'empty',
      result: data.result,
      quality: data.quality,
      lineage: data.lineage,
      version: data.version,
      sequence: data.sequence,
      updatedAt: data.updatedAt,
    };
  }

  if (queryState.isStale || data.status === 'stale') {
    return {
      queryKey,
      status: 'stale',
      result: data.result,
      quality: data.quality,
      lineage: data.lineage,
      version: data.version,
      sequence: data.sequence,
      updatedAt: data.updatedAt,
    };
  }

  return {
    queryKey,
    status: 'ready',
    result: data.result,
    quality: data.quality,
    lineage: data.lineage,
    version: data.version,
    sequence: data.sequence,
    updatedAt: data.updatedAt,
  };
}
