// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import React, { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { DashboardFilters, DashboardWidgetInstance } from '../../../types/dashboard';
import type { QueryRuntimeContextValue } from './query-runtime.types';
import { useConnectionStore } from './connection-store';
import { QueryRuntimeContext } from './query-runtime-context';
import { tanstackSnapshotKey } from './query-key';
import { type RealtimeSource, WebSocketRealtimeSource, applyQueryResultUpdate } from './query-realtime.client';
import type { SnapshotQueryItem } from './query-snapshot.api';
import { buildQuerySubscriptions } from './query-subscriptions';
import { useDashboardQueryResults } from './useDashboardQueryResults';

const ENABLE_WS_REALTIME = import.meta.env.VITE_ENABLE_WS_REALTIME === 'true';

interface QueryRuntimeProviderProps {
  dashboardId: string;
  widgets: DashboardWidgetInstance[];
  defaultFilters: DashboardFilters;
  realtimeSource?: RealtimeSource | null;
  children: React.ReactNode;
}

export function QueryRuntimeProvider({
  dashboardId,
  widgets,
  defaultFilters,
  realtimeSource,
  children,
}: QueryRuntimeProviderProps) {
  const queryClient = useQueryClient();
  const setStatus = useConnectionStore((state) => state.setStatus);
  const incrementRetries = useConnectionStore((state) => state.incrementRetries);
  const resetRetries = useConnectionStore((state) => state.resetRetries);
  const markQueryKeyReconnecting = useConnectionStore((state) => state.markQueryKeyReconnecting);
  const clearQueryKeyReconnecting = useConnectionStore((state) => state.clearQueryKeyReconnecting);

  const subscriptions = useMemo(
    () => buildQuerySubscriptions(
      widgets.map((widget) => ({ instanceId: widget.instanceId, config: widget.config })),
      defaultFilters,
    ),
    [widgets, defaultFilters],
  );

  const queries = useMemo<SnapshotQueryItem[]>(
    () => subscriptions.queries.map((item) => ({ queryKey: item.queryKey, query: item.query })),
    [subscriptions.queries],
  );
  const queriesByKey = useMemo(() => {
    const record = new Map<string, SnapshotQueryItem>();
    for (const item of queries) {
      record.set(item.queryKey, item);
    }
    return record;
  }, [queries]);
  const querySignature = useMemo(
    () => queries.map((item) => item.queryKey).sort().join('|'),
    [queries],
  );

  const snapshotQuery = useDashboardQueryResults(dashboardId, queries);

  useEffect(() => {
    if (queries.length === 0) {
      setStatus('idle');
      return;
    }
    void snapshotQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardId, querySignature]);

  useEffect(() => {
    if (queries.length === 0) {
      setStatus('idle');
      return;
    }

    const runtimeSource = realtimeSource === undefined
      ? (ENABLE_WS_REALTIME ? new WebSocketRealtimeSource() : null)
      : realtimeSource;

    if (!runtimeSource) {
      setStatus('polling');
      return () => {
        setStatus('idle');
      };
    }

    runtimeSource.connect(dashboardId, queries, {
      onConnected: () => {
        setStatus('connected');
        resetRetries();
        subscriptions.queryKeyToWidgets.forEach((_widgets, queryKey) => {
          clearQueryKeyReconnecting(queryKey);
        });
      },
      onReconnecting: () => {
        setStatus('reconnecting');
        incrementRetries();
        subscriptions.queryKeyToWidgets.forEach((_widgets, queryKey) => {
          markQueryKeyReconnecting(queryKey);
        });
        void queryClient.invalidateQueries({ queryKey: tanstackSnapshotKey(dashboardId) });
      },
      onError: () => {
        setStatus('polling');
      },
      onQueryResultUpdated: (event) => {
        applyQueryResultUpdate(queryClient, dashboardId, event);
      },
    });

    return () => {
      runtimeSource.disconnect();
      setStatus('idle');
    };
  }, [
    clearQueryKeyReconnecting,
    dashboardId,
    incrementRetries,
    markQueryKeyReconnecting,
    queries,
    queryClient,
    realtimeSource,
    resetRetries,
    setStatus,
    subscriptions.queryKeyToWidgets,
  ]);

  const contextValue = useMemo<QueryRuntimeContextValue>(
    () => ({
      dashboardId,
      widgetQueryKeyMap: subscriptions.widgetToQueryKey,
      queriesByKey,
    }),
    [dashboardId, queriesByKey, subscriptions.widgetToQueryKey],
  );

  return (
    <QueryRuntimeContext.Provider value={contextValue}>
      {children}
    </QueryRuntimeContext.Provider>
  );
}
