import type { WidgetConfig, WidgetType } from './widgets';
import type { TimeRange, TeamName, RepoName } from './common';
import type { ActivityEvent } from './user';

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

export type SystemTemplateId = 'all-widgets' | 'cto' | 'vp' | 'tl' | 'devops' | 'ic' | 'overview';

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
  icon?: string;
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

export interface DashboardIndexEntry {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sourceType: DashboardSourceType;
  sourceTemplateId?: SystemTemplateId;
  visibility: DashboardVisibility;
  updatedAt: string;
  hasDraft: boolean;
}
