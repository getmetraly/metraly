import { WidgetConfig, WidgetType } from './widgets';
import { TimeRange, TeamName, RepoName } from './common';
import { ActivityEvent } from './user';

export interface DashboardFilters {
  timeRange: TimeRange;
  team: TeamName | 'All teams';
  repo: RepoName | 'All repos';
}

export interface WidgetLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  static?: boolean;
}

export type SystemTemplateId = 'cto' | 'vp' | 'tl' | 'devops' | 'ic' | 'overview';

export type DashboardSourceType =
  | 'system-template'
  | 'user-created'
  | 'forked';

export type DashboardVisibility = 'private' | 'team' | 'org';

export interface DashboardWidgetInstance {
  instanceId: string;
  widgetType: WidgetType;
  config: WidgetConfig;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  sourceType: DashboardSourceType;
  sourceTemplateId?: SystemTemplateId;
  forkedFromId?: string;
  visibility: DashboardVisibility;
  teamId?: string;
  shareToken?: string;
  defaultFilters: DashboardFilters;
  widgets: DashboardWidgetInstance[];
  layout: WidgetLayout[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  recentActivity?: ActivityEvent[];
}

export interface DashboardDraft {
  dashboardId: string;
  changes: Partial<Pick<Dashboard, 'name' | 'description' | 'widgets' | 'defaultFilters' | 'visibility'>>;
  localLayout?: WidgetLayout[];
  draftedAt: string;
  baseVersion: number;
}

export interface DashboardCacheEntry {
  dashboard: Dashboard;
  fetchedAt: string;
  staleSec: number;
  draft?: DashboardDraft;
}

export interface DashboardIndexEntry {
  id: string;
  name: string;
  sourceType: DashboardSourceType;
  sourceTemplateId?: SystemTemplateId;
  visibility: DashboardVisibility;
  updatedAt: string;
  hasDraft: boolean;
}

export interface EmptyWidget {
  type: 'empty';
  instanceId: string;
}

export interface SystemTemplate {
  templateId: SystemTemplateId;
  label: string;
  description: string;
  dashboard: Omit<Dashboard, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'version'>;
}
