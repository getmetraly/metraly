// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '../query-client';
import { useDashboardQueryResults } from '../useDashboardQueryResults';

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock('../../../../api/client', () => ({
  client: {
    post: postMock,
  },
}));

function HookProbe({ dashboardId }: { dashboardId: string }) {
  useDashboardQueryResults(dashboardId, [
    {
      queryKey: '{"metricId":"pr-cycle","resultKind":"scalar","timeRange":"7d","granularity":"day"}',
      query: { metricId: 'pr-cycle', resultKind: 'scalar', timeRange: '7d', granularity: 'day' },
    },
  ]);
  return null;
}

describe('useDashboardQueryResults polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    postMock.mockReset();
    postMock.mockResolvedValue({
      data: {
        dashboardId: 'dash-poll',
        results: [
          {
            queryKey: '{"metricId":"pr-cycle","resultKind":"scalar","timeRange":"7d","granularity":"day"}',
            result: { value: '42', delta: '+2%' },
            status: 'ready',
            version: 3,
            sequence: 1,
            updatedAt: '2026-06-02T10:00:00Z',
          },
        ],
      },
    });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls on the configured interval while visible', async () => {
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <HookProbe dashboardId="dash-poll" />
      </QueryClientProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(postMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(postMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  }, 10_000);

  it('does not poll while document is hidden', async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <HookProbe dashboardId="dash-poll" />
      </QueryClientProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(postMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(postMock).toHaveBeenCalledTimes(1);
  }, 10_000);
});
