// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import { useQueryClient } from '@tanstack/react-query';
import { useQueryRuntimeContext } from './query-runtime-context';
import { tanstackQueryKey, tanstackSnapshotKey } from './query-key';

export function useRefreshQuery() {
  const queryClient = useQueryClient();
  const runtimeContext = useQueryRuntimeContext();

  return (queryKey: string) => {
    if (!runtimeContext) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: tanstackQueryKey(runtimeContext.dashboardId, queryKey) });
  };
}

export function useRefreshDashboardQueries() {
  const queryClient = useQueryClient();
  const runtimeContext = useQueryRuntimeContext();

  return () => {
    if (!runtimeContext) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: tanstackSnapshotKey(runtimeContext.dashboardId) });
  };
}
