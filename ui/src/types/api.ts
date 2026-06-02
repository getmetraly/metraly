import type { DashboardFilters, WidgetLayout, SystemTemplateId, DashboardVisibility, DashboardWidgetInstance } from './dashboard';


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




