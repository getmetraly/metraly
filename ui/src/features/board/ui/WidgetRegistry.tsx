import React from 'react';
import type { WidgetType } from '../../api/types/widgets';

// Placeholder components for each widget type.  In a real application these
// would import the actual implementations (e.g. MetricChart, DataTable).
const MetricChartWidget = () => <div>Metric Chart</div>;
const DataTableWidget = () => <div>Data Table</div>;
const LeaderboardWidget = () => <div>Leaderboard</div>;
const StatCardWidget = () => <div>Stat Card</div>;
const DoraOverviewWidget = () => <div>DORA Overview</div>;
const HeatmapWidget = () => <div>Heatmap</div>;
const SprintBurndownWidget = () => <div>Sprint Burndown</div>;
const AnomalyDetectorWidget = () => <div>Anomaly Detector</div>;
const AiInsightWidget = () => <div>AI Insight</div>;

/**
 * Mapping from widget type strings to React components.  Extend this map
 * whenever you add a new widget type.
 */
export const WidgetRegistry: Record<WidgetType, React.ComponentType<any>> = {
  'metric-chart': MetricChartWidget as any,
  'data-table': DataTableWidget as any,
  leaderboard: LeaderboardWidget as any,
  'stat-card': StatCardWidget as any,
  'dora-overview': DoraOverviewWidget as any,
  heatmap: HeatmapWidget as any,
  'sprint-burndown': SprintBurndownWidget as any,
  'anomaly-detector': AnomalyDetectorWidget as any,
  'ai-insight': AiInsightWidget as any,
};