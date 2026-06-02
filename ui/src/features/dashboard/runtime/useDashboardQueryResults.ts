// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryResultEnvelope } from './metric-query-result.types';
import { tanstackSnapshotKey } from './query-key';
import { fetchSnapshotAndSeedCache, type SnapshotQueryItem } from './query-snapshot.api';

const SNAPSHOT_STALE_TIME_MS = 20_000;
const SNAPSHOT_GC_TIME_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 30_000;

export function useDashboardQueryResults(
  dashboardId: string,
  queries: SnapshotQueryItem[],
) {
  const queryClient = useQueryClient();

  return useQuery<QueryResultEnvelope[]>({
    queryKey: tanstackSnapshotKey(dashboardId),
    enabled: dashboardId.length > 0 && queries.length > 0,
    queryFn: () => fetchSnapshotAndSeedCache(dashboardId, queries, queryClient),
    staleTime: SNAPSHOT_STALE_TIME_MS,
    gcTime: SNAPSHOT_GC_TIME_MS,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: () => (document.hidden ? false : POLL_INTERVAL_MS),
  });
}
