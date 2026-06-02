// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '../query-client';
import { QueryRuntimeProvider } from '../QueryRuntimeProvider';
import { FakeRealtimeSource } from '../query-realtime.client';
import { DashboardBuilderCanvas } from '../../../../components/dashboard/DashboardBuilderCanvas';
import type { Dashboard } from '../../../../types/dashboard';

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock('../../../../api/client', () => ({
  client: {
    post: postMock,
  },
}));

function makeDashboard(): Dashboard {
  return {
    id: 'dash-test-1',
    name: 'Test Dashboard',
    sourceType: 'user-created',
    visibility: 'private',
    defaultFilters: { timeRange: '7d', team: 'All teams', repo: 'All repos' },
    widgets: [
      {
        instanceId: 'w-1',
        widgetType: 'stat-card',
        config: { type: 'stat-card', metricId: 'pr-cycle', showSparkline: true, colorKey: 'cyan' },
      },
      {
        instanceId: 'w-2',
        widgetType: 'stat-card',
        config: { type: 'stat-card', metricId: 'lead-time', showSparkline: true, colorKey: 'purple' },
      },
    ],
    layout: [
      { i: 'w-1', x: 0, y: 0, w: 3, h: 2 },
      { i: 'w-2', x: 3, y: 0, w: 3, h: 2 },
    ],
    createdBy: 'user-1',
    createdAt: '2026-06-02T10:00:00Z',
    updatedAt: '2026-06-02T10:00:00Z',
    version: 3,
  };
}

describe('QueryRuntimeProvider integration', () => {
  it('renders initial snapshot data and updates only the affected widget on realtime event', async () => {
    const dashboard = makeDashboard();
    const fakeRealtimeSource = new FakeRealtimeSource();
    postMock.mockReset();
    postMock.mockImplementation(async (_url: string, body: { queries: Array<{ queryKey: string }> }) => ({
      data: {
        dashboardId: dashboard.id,
        results: body.queries.map(({ queryKey }) => {
          if (queryKey.includes('pr-cycle')) {
            return {
              queryKey,
              result: { value: '42', delta: '+2%' },
              status: 'ready',
              version: 3,
              sequence: 1,
              updatedAt: '2026-06-02T10:00:00Z',
            };
          }
          return {
            queryKey,
            result: { value: '17', delta: '-1%' },
            status: 'ready',
            version: 3,
            sequence: 1,
            updatedAt: '2026-06-02T10:00:00Z',
          };
        }),
      },
    }));

    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <QueryRuntimeProvider
          dashboardId={dashboard.id}
          widgets={dashboard.widgets}
          defaultFilters={dashboard.defaultFilters}
          realtimeSource={fakeRealtimeSource}
        >
          <DashboardBuilderCanvas mode="view" dashboard={dashboard} widgetData={{}} />
        </QueryRuntimeProvider>
      </QueryClientProvider>,
    );

    await screen.findByText('42');
    await screen.findByText('17');

    await act(async () => {
      fakeRealtimeSource.emit({
        type: 'queryResult.updated',
        dashboardId: dashboard.id,
        queryKey: '{"metricId":"pr-cycle","resultKind":"scalar","timeRange":"7d","granularity":"day"}',
        version: 3,
        sequence: 2,
        updatedAt: '2026-06-02T10:05:00Z',
        result: { value: '43', delta: '+3%' },
      });
    });

    await screen.findByText('43');
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('reconnects by invalidating and refetching the snapshot', async () => {
    const dashboard = makeDashboard();
    const fakeRealtimeSource = new FakeRealtimeSource();
    postMock.mockReset();
    postMock.mockImplementation(async (_url: string, body: { queries: Array<{ queryKey: string }> }) => ({
      data: {
        dashboardId: dashboard.id,
        results: body.queries.map(({ queryKey }) => ({
          queryKey,
          result: { value: postMock.mock.calls.length >= 3 ? '44' : '42', delta: '+2%' },
          status: 'ready',
          version: 3,
          sequence: postMock.mock.calls.length >= 3 ? 3 : 1,
          updatedAt: '2026-06-02T10:06:00Z',
        })),
      },
    }));

    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <QueryRuntimeProvider
          dashboardId={dashboard.id}
          widgets={dashboard.widgets.slice(0, 1)}
          defaultFilters={dashboard.defaultFilters}
          realtimeSource={fakeRealtimeSource}
        >
          <DashboardBuilderCanvas
            mode="view"
            dashboard={{ ...dashboard, widgets: dashboard.widgets.slice(0, 1), layout: dashboard.layout.slice(0, 1) }}
            widgetData={{}}
          />
        </QueryRuntimeProvider>
      </QueryClientProvider>,
    );

    await screen.findByText('42');

    await act(async () => {
      fakeRealtimeSource.triggerDisconnect();
    });

    await waitFor(() => expect(postMock.mock.calls.length).toBeGreaterThanOrEqual(3));
    await screen.findByText('44');
  });
});
