/*
 * A very simple in‑memory mock API for dashboards.  This is not feature
 * complete but is sufficient to support integration tests for the board
 * repository.
 */

import type {
  Dashboard,
  DashboardIndexEntry,
  CreateDashboardRequest,
  UpdateDashboardRequest,
  UpdateLayoutRequest,
  DashboardWidgetInstance,
  WidgetLayout,
} from './types/api';

// Internal store of dashboards keyed by ID.
const dashboards = new Map<string, Dashboard>();
let nextId = 1;

function generateId(): string {
  return `dash-${nextId++}`;
}

function isoDate(): string {
  return new Date().toISOString();
}

export const mockApi = {
  async getDashboardList(): Promise<DashboardIndexEntry[]> {
    return Array.from(dashboards.values()).map((d) => ({ id: d.id, name: d.name }));
  },

  async getDashboard(id: string): Promise<Dashboard> {
    const dash = dashboards.get(id);
    if (!dash) throw new Error('Dashboard not found');
    // Return a shallow copy to prevent accidental mutations.
    return {
      ...dash,
      widgets: dash.widgets.map((w) => ({ ...w } as DashboardWidgetInstance)),
      layout: dash.layout.map((l) => ({ ...l } as WidgetLayout)),
    };
  },

  async createDashboard(
    req: CreateDashboardRequest & { wizardWidgetIds?: string[] },
  ): Promise<{ dashboard: Dashboard }> {
    const id = generateId();
    // If wizardWidgetIds specified, convert them into widget instances.  For
    // simplicity we ignore wizardWidgetIds here and rely on req.widgets.
    const widgets = req.widgets;
    const layout = req.layout;
    const dash: Dashboard = {
      id,
      name: req.name,
      widgets,
      layout,
      version: 1,
      sourceType: req.sourceType,
    };
    dashboards.set(id, dash);
    return { dashboard: dash };
  },

  async updateDashboard(id: string, req: UpdateDashboardRequest): Promise<{ dashboard: Dashboard }> {
    const dash = dashboards.get(id);
    if (!dash) throw new Error('Dashboard not found');
    if (req.version !== dash.version) throw new Error('Version conflict');
    if (req.name !== undefined) dash.name = req.name;
    if (req.widgets !== undefined) dash.widgets = req.widgets;
    if (req.layout !== undefined) dash.layout = req.layout;
    dash.version += 1;
    return { dashboard: { ...dash } };
  },

  async updateLayout(id: string, req: UpdateLayoutRequest): Promise<void> {
    const dash = dashboards.get(id);
    if (!dash) throw new Error('Dashboard not found');
    if (req.version !== dash.version) throw new Error('Version conflict');
    dash.layout = req.layout;
    dash.version += 1;
  },
};