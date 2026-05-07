// Minimal API type definitions for testing purposes.  These should mirror the
// shape of the actual API types used by the real application but are kept
// deliberately simple for the integration tests.

export type DashboardId = string;

export interface WidgetLayout {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardWidgetInstance {
  instanceId: string;
  widgetType: string;
  config: Record<string, unknown>;
}

export interface Dashboard {
  id: DashboardId;
  name: string;
  widgets: DashboardWidgetInstance[];
  layout: WidgetLayout[];
  version: number;
  description?: string;
  sourceType?: string;
}

export interface DashboardIndexEntry {
  id: DashboardId;
  name: string;
}

export interface CreateDashboardRequest {
  name: string;
  widgets: DashboardWidgetInstance[];
  layout: WidgetLayout[];
  sourceType?: string;
}

export interface UpdateDashboardRequest {
  name?: string;
  widgets?: DashboardWidgetInstance[];
  layout?: WidgetLayout[];
  version: number;
}

export interface UpdateLayoutRequest {
  layout: WidgetLayout[];
  version: number;
}