/*
 * In-memory mock API for dashboard integration tests.
 *
 * Uses canonical types from `types/` so mock-based tests exercise the same
 * shapes as the real API client. Required fields that tests typically do not
 * care about (visibility, defaultFilters, audit timestamps) are filled with
 * sensible stub defaults so callers only need to supply the meaningful parts
 * of each request.
 */

import type {
  CreateDashboardRequest,
  UpdateDashboardRequest,
  UpdateLayoutRequest,
} from '../types/api';
import type {
  Dashboard,
  DashboardIndexEntry,
  DashboardWidgetInstance,
  WidgetLayout,
} from '../types/dashboard';

// ---------------------------------------------------------------------------
// Stub defaults for required fields that integration tests rarely control
// ---------------------------------------------------------------------------

const STUB_DEFAULTS = {
  createdBy: 'mock-user',
  visibility: 'private' as const,
  sourceType: 'user-created' as const,
  defaultFilters: {
    timeRange: '30d' as const,
    team: 'All teams' as const,
    repo: 'All repos' as const,
  },
} satisfies Pick<Dashboard, 'createdBy' | 'visibility' | 'sourceType' | 'defaultFilters'>;

// ---------------------------------------------------------------------------

const dashboards = new Map<string, Dashboard>();
let nextId = 1;

function generateId(): string {
  return `dash-${nextId++}`;
}

function isoDate(): string {
  return new Date().toISOString();
}

function cloneDashboard(dash: Dashboard): Dashboard {
  return {
    ...dash,
    widgets: dash.widgets.map((w) => ({ ...w } as DashboardWidgetInstance)),
    layout: dash.layout.map((l) => ({ ...l } as WidgetLayout)),
  };
}

// Minimal create-request — callers supply name + content; required API fields
// are filled with stub defaults so tests stay focused on behavior, not shape.
type MockCreateRequest = Pick<CreateDashboardRequest, 'name' | 'widgets' | 'layout'> &
  Partial<Omit<CreateDashboardRequest, 'name' | 'widgets' | 'layout'>>;

export const mockApi = {
  async getDashboardList(): Promise<DashboardIndexEntry[]> {
    return Array.from(dashboards.values()).map((d) => ({
      id: d.id,
      name: d.name,
      sourceType: d.sourceType,
      visibility: d.visibility,
      updatedAt: d.updatedAt,
      hasDraft: false,
    }));
  },

  async getDashboard(id: string): Promise<Dashboard> {
    const dash = dashboards.get(id);
    if (!dash) throw new Error(`Dashboard not found: ${id}`);
    return cloneDashboard(dash);
  },

  async createDashboard(
    req: MockCreateRequest & { wizardWidgetIds?: string[] },
  ): Promise<{ dashboard: Dashboard }> {
    const now = isoDate();
    const dash: Dashboard = {
      ...STUB_DEFAULTS,
      id: generateId(),
      name: req.name,
      description: req.description,
      icon: req.icon,
      sourceTemplateId: req.sourceTemplateId,
      forkedFromId: req.forkedFromId,
      teamId: req.teamId,
      widgets: req.widgets,
      layout: req.layout,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    dashboards.set(dash.id, dash);
    return { dashboard: cloneDashboard(dash) };
  },

  async updateDashboard(
    id: string,
    req: UpdateDashboardRequest,
  ): Promise<{ dashboard: Dashboard }> {
    const dash = dashboards.get(id);
    if (!dash) throw new Error(`Dashboard not found: ${id}`);
    if (req.version !== dash.version) throw new Error('Version conflict');
    if (req.name !== undefined) dash.name = req.name;
    if (req.widgets !== undefined) dash.widgets = req.widgets;
    if (req.layout !== undefined) dash.layout = req.layout;
    dash.version += 1;
    dash.updatedAt = isoDate();
    return { dashboard: cloneDashboard(dash) };
  },

  async updateLayout(id: string, req: UpdateLayoutRequest): Promise<void> {
    const dash = dashboards.get(id);
    if (!dash) throw new Error(`Dashboard not found: ${id}`);
    if (req.version !== dash.version) throw new Error('Version conflict');
    dash.layout = req.layout;
    dash.version += 1;
    dash.updatedAt = isoDate();
  },

  /** Remove all stored dashboards. Useful for test teardown. */
  _reset(): void {
    dashboards.clear();
    nextId = 1;
  },
};
