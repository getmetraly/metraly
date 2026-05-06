import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDashboardOverview } from './useDashboardOverview';

const getDORA = vi.fn();
const getInsights = vi.fn();
const getActivity = vi.fn();

vi.mock('../api/client', () => ({
  getDORA: () => getDORA(),
  getInsights: () => getInsights(),
  getActivity: () => getActivity(),
}));

describe('useDashboardOverview', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('loads overview data from the backend client', async () => {
    getDORA.mockResolvedValue({
      deployFrequency: {
        currentValue: '4.2/wk',
        currentValueRaw: 4.2,
        timeSeries: { values: [3.8, 4.0, 4.2], labels: ['Jan 1', 'Jan 2', 'Jan 3'], unit: '/wk' },
      },
      leadTime: {
        currentValue: '38.5h',
        currentValueRaw: 38.5,
        timeSeries: { values: [40, 39, 38.5], labels: ['Jan 1', 'Jan 2', 'Jan 3'], unit: 'h' },
      },
      changeFailureRate: {
        currentValue: '4.5%',
        currentValueRaw: 4.5,
        timeSeries: { values: [4.8, 4.6, 4.5], labels: ['Jan 1', 'Jan 2', 'Jan 3'], unit: '%' },
      },
      mttr: {
        currentValue: '42.0m',
        currentValueRaw: 42,
        timeSeries: { values: [45, 43, 42], labels: ['Jan 1', 'Jan 2', 'Jan 3'], unit: 'm' },
      },
    });
    getInsights.mockResolvedValue([
      { title: 'Queue pressure', body: 'Review latency is climbing.', action: 'Open queue' },
    ]);
    getActivity.mockResolvedValue([
      { id: 'evt-1', actor: 'Jamie', description: 'Opened a PR', relativeTime: '2m ago', color: 'var(--cyan)' },
    ]);

    const { result } = renderHook(() => useDashboardOverview());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.metrics).toHaveLength(4);
    expect(result.current.insights).toEqual([
      { title: 'Queue pressure', body: 'Review latency is climbing.', action: 'Open queue' },
    ]);
    expect(result.current.recentActivity).toHaveLength(1);
    expect(getDORA).toHaveBeenCalledTimes(1);
    expect(getInsights).toHaveBeenCalledTimes(1);
    expect(getActivity).toHaveBeenCalledTimes(1);
  });
});
