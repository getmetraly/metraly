import type { Dashboard, DashboardIndexEntry, DashboardFilters, WidgetLayout, SystemTemplateId, DashboardVisibility, DashboardWidgetInstance } from './dashboard';
import type { MetricId } from './metrics';

export type DashboardListResponse = DashboardIndexEntry[];

export interface SystemTemplatesResponse {
  templateId: SystemTemplateId;
  label: string;
  description: string;
  dashboard: Omit<Dashboard, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'version'>;
}

export type DashboardResponse = Dashboard;

export interface CreateDashboardRequest {
  name: string;
  description?: string;
  icon?: string;
  sourceType: 'user-created' | 'forked';
  sourceTemplateId?: SystemTemplateId;
  forkedFromId?: string;
  visibility: DashboardVisibility;
  teamId?: string;
  defaultFilters: DashboardFilters;
  widgets: DashboardWidgetInstance[];
  layout: WidgetLayout[];
}

export interface CreateDashboardResponse {
  dashboard: Dashboard;
}

export interface UpdateDashboardRequest {
  name?: string;
  description?: string;
  icon?: string;
  visibility?: DashboardVisibility;
  teamId?: string;
  defaultFilters?: DashboardFilters;
  widgets?: DashboardWidgetInstance[];
  layout?: WidgetLayout[];
  version: number;
}

export interface UpdateDashboardResponse {
  dashboard: Dashboard;
}

export interface ForkDashboardRequest {
  name?: string;
  visibility: DashboardVisibility;
}

export interface ForkDashboardResponse {
  dashboard: Dashboard;
}

export interface UpdateLayoutRequest {
  layout: WidgetLayout[];
  version: number;
}

export interface ShareDashboardRequest {
  visibility: DashboardVisibility;
  teamId?: string;
  generateShareToken?: boolean;
}

export interface ShareDashboardResponse {
  visibility: DashboardVisibility;
  shareToken?: string;
  shareUrl?: string;
}

export interface WidgetDataRequest {
  widgetType: string;
  config: unknown;
  resolvedFilters: DashboardFilters;
}

export interface DashboardDataRequest {
  dashboardId: string;
  widgets: WidgetDataRequest[];
}

export interface WidgetDataItem {
  instanceId: string;
  data: unknown | null;
  error?: string;
}

export interface DashboardDataResponse {
  widgets: WidgetDataItem[];
  fetchedAt: string;
}

export interface MetricDataResponse {
  metricId: MetricId;
  label: string;
  unit: string;
  current: { values: number[]; labels: string[]; unit: string };
  previous: { values: number[]; labels: string[]; unit: string };
}
