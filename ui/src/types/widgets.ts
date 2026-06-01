import { DashboardFilters } from './dashboard';
import { MetricId } from './metrics';

interface BaseWidgetConfig {
  /** Override dashboard filters for this widget */
  filtersOverride?: Partial<DashboardFilters>;
}

export interface MetricChartConfig extends BaseWidgetConfig {
  type: 'metric-chart';
  metricId: MetricId;
  chartVariant: 'area' | 'bar' | 'bar-horizontal';
  showCompare: boolean;
  colorOverride?: string;
}

export interface CompareBarChartConfig extends BaseWidgetConfig {
  type: 'compare-bar-chart';
  metricId: MetricId;
  groupBy: 'team' | 'repo';
  primaryLabel: string;
  compareLabel: string;
}

export interface StatCardConfig extends BaseWidgetConfig {
  type: 'stat-card';
  metricId: MetricId;
  showSparkline: boolean;
  colorKey: 'cyan' | 'purple' | 'success' | 'warning' | 'error';
}

export interface DORAOverviewConfig extends BaseWidgetConfig {
  type: 'dora-overview';
}

export interface GaugeConfig extends BaseWidgetConfig {
  type: 'health-gauge';
  showDimensions: boolean;
}

export interface HeatmapConfig extends BaseWidgetConfig {
  type: 'heatmap';
  rowGroupBy: 'team' | 'weekday';
  colorOverride?: string;
  columns?: number;
}

export type TableDataType =
  | 'pr-queue'
  | 'ci-failures'
  | 'incidents'
  | 'delivery-risk'
  | 'my-prs'
  | 'review-queue'
  | 'blocked-tasks';

export interface DataTableConfig extends BaseWidgetConfig {
  type: 'data-table';
  tableType: TableDataType;
  maxRows: number;
}

export interface LeaderboardConfig extends BaseWidgetConfig {
  type: 'leaderboard';
  metricId: MetricId;
  groupBy: 'team' | 'repo' | 'author';
  limit: number;
}

export interface SprintBurndownConfig extends BaseWidgetConfig {
  type: 'sprint-burndown';
  showTaskList: boolean;
  userId?: string;
}

export interface AIInsightConfig extends BaseWidgetConfig {
  type: 'ai-insight';
  variant: 'card' | 'inline';
  topicHint?: string;
}

export interface AnomalyDetectorConfig extends BaseWidgetConfig {
  type: 'anomaly-detector';
  watchMetrics: MetricId[];
}

export interface SectionHeaderConfig extends BaseWidgetConfig {
  type: 'section-header';
  title: string;
  rightText?: string;
}

export interface RecentActivityConfig extends BaseWidgetConfig {
  type: 'recent-activity';
  maxItems?: number;
}

export interface EmptyWidgetConfig extends BaseWidgetConfig {
  type: 'empty';
}

export type WidgetConfig =
  | MetricChartConfig
  | CompareBarChartConfig
  | StatCardConfig
  | DORAOverviewConfig
  | GaugeConfig
  | HeatmapConfig
  | DataTableConfig
  | LeaderboardConfig
  | SprintBurndownConfig
  | AIInsightConfig
  | AnomalyDetectorConfig
  | SectionHeaderConfig
  | RecentActivityConfig
  | EmptyWidgetConfig;

export type WidgetType = WidgetConfig['type'];

export type HeatmapCellStatus = 'ok' | 'warning' | 'neutral' | 'error';

export interface HeatmapCellDatum {
  x: string;
  y: string;
  value: number;
  status?: HeatmapCellStatus;
}

export interface HeatmapWidgetData {
  title?: string;
  xLabels: string[];
  yLabels: string[];
  cells: HeatmapCellDatum[];
  summary?: string;
}
