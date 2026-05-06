import type { WidgetConfig } from '../widgets';
import type { DashboardWidgetInstance } from '../dashboard';

const widgetColorMap: Record<string, string> = {
  'deploy-freq': '#00E5FF',
  'lead-time': '#B44CFF',
  'cfr': '#FF9100',
  'mttr': '#00C853',
  'ci-pass': '#00E5FF',
  'ci-duration': '#B44CFF',
  'ci-queue': '#FF9100',
  'pr-cycle': '#00E5FF',
  'pr-review': '#B44CFF',
  'pr-merge': '#00C853',
  'velocity': '#00E5FF',
  'throughput': '#B44CFF',
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
    colorOverride: widgetColorMap[metricId] || '#00E5FF',
  } as WidgetConfig,
});
