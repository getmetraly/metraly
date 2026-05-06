import { useState, useEffect } from 'react';
import { mockApi } from '../api/mockApi';
import type { ActivityEvent } from '../types/user';

interface Metric {
  icon: string;
  label: string;
  value: string;
  trend: string;
  trendDir: 'up' | 'down' | 'neutral';
  color: string;
  sparkData: number[];
}

interface Insight {
  title: string;
  body: string;
  action?: string;
}

interface DashboardOverviewData {
  metrics: Metric[];
  insights: Insight[];
  recentActivity: ActivityEvent[];
  isLoading: boolean;
  error: string | null;
}

const mockMetrics: Metric[] = [
  { icon: 'gitPR', label: 'PRs awaiting review', value: '14', trend: '+3 today', trendDir: 'down', color: 'cyan', sparkData: [4,7,5,9,6,8,11,14] },
  { icon: 'xCircle', label: 'Failed builds (24h)', value: '3', trend: '−5 vs avg', trendDir: 'up', color: 'error', sparkData: [12,9,11,7,5,8,4,3] },
  { icon: 'alertTri', label: 'Blocked tasks', value: '7', trend: 'No change', trendDir: 'neutral', color: 'warning', sparkData: [5,6,7,7,6,8,7,7] },
  { icon: 'clock', label: 'Median CI time', value: '4m 22s', trend: '−18s', trendDir: 'up', color: 'purple', sparkData: [8,7,9,6,7,5,5,4] },
];

export function useDashboardOverview(): DashboardOverviewData {
  const [data, setData] = useState<DashboardOverviewData>({
    metrics: [],
    insights: [],
    recentActivity: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [insights, recentActivity] = await Promise.all([
          mockApi.getAIInsights(),
          mockApi.getRecentActivity(),
        ]);

        // Map mockApi data to component format
        const mappedInsights: Insight[] = insights.map((ins) => ({
          title: ins.title,
          body: ins.body,
          action: ins.action,
        }));

        setData({
          metrics: mockMetrics,
          insights: mappedInsights,
          recentActivity,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to load dashboard data',
        }));
      }
    }

    fetchData();
  }, []);

  return data;
}
