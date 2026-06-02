// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { QueryResultEnvelope } from '../metric-query-result.types';
import { tanstackQueryKey } from '../query-key';
import { applyQueryResultUpdate } from '../query-realtime.client';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 0,
      },
    },
  });
}

function makeEnvelope(queryKey: string, sequence: number, result: unknown): QueryResultEnvelope {
  return {
    queryKey,
    result,
    status: 'ready',
    version: 3,
    sequence,
    updatedAt: '2026-06-02T10:00:00Z',
  };
}

describe('runtime cache', () => {
  it('updates only the affected query key', () => {
    const queryClient = makeQueryClient();
    const dashboardId = 'dash-1';
    const queryKeyA = 'qk-a';
    const queryKeyB = 'qk-b';

    const keyA = tanstackQueryKey(dashboardId, queryKeyA);
    const keyB = tanstackQueryKey(dashboardId, queryKeyB);

    const envelopeA = makeEnvelope(queryKeyA, 1, { value: 10 });
    const envelopeB = makeEnvelope(queryKeyB, 1, { value: 20 });
    queryClient.setQueryData(keyA, envelopeA);
    queryClient.setQueryData(keyB, envelopeB);

    const beforeB = queryClient.getQueryData<QueryResultEnvelope>(keyB);

    applyQueryResultUpdate(queryClient, dashboardId, {
      dashboardId,
      queryKey: queryKeyA,
      version: 3,
      sequence: 2,
      updatedAt: '2026-06-02T10:05:00Z',
      result: { value: 11 },
    });

    const afterA = queryClient.getQueryData<QueryResultEnvelope>(keyA);
    const afterB = queryClient.getQueryData<QueryResultEnvelope>(keyB);

    expect(afterA?.sequence).toBe(2);
    expect((afterA?.result as { value: number }).value).toBe(11);
    expect(afterB).toBe(beforeB);
  });

  it('ignores older sequences', () => {
    const queryClient = makeQueryClient();
    const dashboardId = 'dash-1';
    const queryKey = 'qk-a';
    const key = tanstackQueryKey(dashboardId, queryKey);

    queryClient.setQueryData(key, makeEnvelope(queryKey, 4, { value: 10 }));

    applyQueryResultUpdate(queryClient, dashboardId, {
      dashboardId,
      queryKey,
      version: 3,
      sequence: 3,
      updatedAt: '2026-06-02T10:05:00Z',
      result: { value: 9 },
    });

    const after = queryClient.getQueryData<QueryResultEnvelope>(key);
    expect(after?.sequence).toBe(4);
    expect((after?.result as { value: number }).value).toBe(10);
  });

  it('uses a fresh QueryClient per test', () => {
    const queryClient = makeQueryClient();
    const dashboardId = 'dash-1';
    const key = tanstackQueryKey(dashboardId, 'qk-a');
    expect(queryClient.getQueryData(key)).toBeUndefined();
  });
});
