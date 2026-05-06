import { useState, useEffect } from 'react';
import { getActivity, getDORA, getInsights } from '../api/client';
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

function formatDelta(
  detail: { currentValueRaw: number; timeSeries: { values: number[] } },
  higherIsBetter = true,
): {
  trend: string;
  trendDir: 'up' | 'down' | 'neutral';
} {
  const values = detail.timeSeries.values;
  if (values.length < 2) {
    return { trend: 'No recent change', trendDir: 'neutral' };
  }
  const delta = detail.currentValueRaw - values[values.length - 2];
  if (Math.abs(delta) < 0.05) {
    return { trend: 'No recent change', trendDir: 'neutral' };
  }
  return {
    trend: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} vs prev`,
    trendDir: higherIsBetter
      ? (delta > 0 ? 'up' : 'down')
      : (delta < 0 ? 'up' : 'down'),
  };
}

function metricFromDetail(
  icon: string,
  label: string,
  color: string,
  value: string,
  detail: { currentValueRaw: number; timeSeries: { values: number[] } },
  higherIsBetter = true,
): Metric {
  const trend = formatDelta(detail, higherIsBetter);
  return {
    icon,
    label,
    value,
    trend: trend.trend,
    trendDir: trend.trendDir,
    color,
    sparkData: detail.timeSeries.values.slice(-8),
  };
}

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
        const [dora, insights, recentActivity] = await Promise.all([
          getDORA(),
          getInsights(),
          getActivity(),
        ]);

        const mappedInsights: Insight[] = insights.map((ins) => ({
          title: ins.title,
          body: ins.body,
          action: ins.action,
        }));

        const metrics: Metric[] = [
          metricFromDetail('zap', 'Deployment Frequency', 'cyan', dora.deployFrequency.currentValue, dora.deployFrequency, true),
          metricFromDetail('clock', 'Lead Time for Changes', 'purple', dora.leadTime.currentValue, dora.leadTime, false),
          metricFromDetail('xCircle', 'Change Failure Rate', 'warning', dora.changeFailureRate.currentValue, dora.changeFailureRate, false),
          metricFromDetail('activity', 'MTTR', 'success', dora.mttr.currentValue, dora.mttr, false),
        ];

        setData({
          metrics,
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
