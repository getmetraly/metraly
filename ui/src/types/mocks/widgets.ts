import type { WidgetConfig } from '../widgets';
import type { DashboardWidgetInstance } from '../dashboard';

const widgetColorMap: Record<string, string> = {
  'deploy-freq': 'var(--m-cyan-500)',
  'lead-time': 'var(--m-purple-500)',
  'cfr': 'var(--m-warn)',
  'mttr': 'var(--m-ok)',
  'ci-pass': 'var(--m-cyan-500)',
  'ci-duration': 'var(--m-purple-500)',
  'ci-queue': 'var(--m-warn)',
  'pr-cycle': 'var(--m-cyan-500)',
  'pr-review': 'var(--m-purple-500)',
  'pr-merge': 'var(--m-ok)',
  'velocity': 'var(--m-cyan-500)',
  'throughput': 'var(--m-purple-500)',
};

export const createMockStatCardWidget = (metricId: string, instanceId: string): DashboardWidgetInstance => ({
  instanceId,
  widgetType: 'stat-card',
  config: {
    type: 'stat-card',
    metricId,
    showSparkline: true,
    colorKey: 'cyan',
  } as WidgetConfig,
});

export const createMockMetricChartWidget = (metricId: string, instanceId: string): DashboardWidgetInstance => ({
  instanceId,
  widgetType: 'metric-chart',
  config: {
    type: 'metric-chart',
    metricId,
    chartVariant: 'area',
    showCompare: false,
    colorOverride: widgetColorMap[metricId] || 'var(--m-cyan-500)',
  } as WidgetConfig,
});
