import { create } from 'zustand';
import { Layout } from 'react-grid-layout';
import { nanoid } from 'nanoid';

export interface WizardWidget {
  id: string;
  instanceId: string;
  type: string;
  label: string;
  icon: string;
  color: string;
  cat: string;
}

interface WizardState {
  step: number;
  selectedTemplate: string | null;
  widgets: WizardWidget[];
  layout: Layout[];
  widgetSizes: Record<string, string>;
  name: string;
  desc: string;
  timeRange: string;
  team: string;
  setStep: (s: number) => void;
  setTemplate: (id: string) => void;
  addWidget: (id: string) => void;
  removeWidget: (instanceId: string) => void;
  updateLayout: (newLayout: Layout[]) => void;
  toggleWidgetSize: (instanceId: string) => void;
  setName: (n: string) => void;
  setDesc: (d: string) => void;
  setTimeRange: (t: string) => void;
  setTeam: (t: string) => void;
  setWidgets: (widgets: WizardWidget[]) => void;
  reset: () => void;
}

const TEMPLATES = [
  { id: 'cto', label: 'CTO', icon: 'trendingUp', color: '#00E5FF', desc: 'Health score, DORA overview, team velocity trends' },
  { id: 'vp', label: 'VP Engineering', icon: 'users', color: '#B44CFF', desc: 'Sprint velocity, team load, delivery risk heatmap' },
  { id: 'tl', label: 'Tech Lead', icon: 'gitPR', color: '#00C853', desc: 'CI health, PR queue, sprint burndown' },
  { id: 'devops', label: 'DevOps / SRE', icon: 'cpu', color: '#FF9100', desc: 'Deploy frequency, MTTR, incident tracking' },
  { id: 'ic', label: 'My Dashboard', icon: 'activity', color: '#B44CFF', desc: 'My PRs, CI runs, review queue, sprint tasks' },
  { id: 'blank', label: 'Blank Canvas', icon: 'plus', color: '#6B7A9A', desc: 'Start from scratch and add widgets one by one' },
];

const WIDGET_LIBRARY = [
  { cat: 'DORA', id: 'dora-overview', icon: 'zap', label: 'DORA Overview', desc: '4 key metrics at a glance' },
  { cat: 'DORA', id: 'deploy-freq', icon: 'zap', label: 'Deploy Frequency', desc: 'Chart + current value' },
  { cat: 'DORA', id: 'lead-time', icon: 'clock', label: 'Lead Time', desc: 'Time from commit → production' },
  { cat: 'DORA', id: 'mttr-trend', icon: 'activity', label: 'MTTR Trend', desc: 'Mean time to restore incidents' },
  { cat: 'CI/CD', id: 'ci-pass-rate', icon: 'activity', label: 'CI Pass Rate', desc: 'Build success trend' },
  { cat: 'CI/CD', id: 'failing-builds', icon: 'xCircle', label: 'Failing Builds', desc: 'Recent failures list' },
  { cat: 'PR', id: 'pr-queue', icon: 'gitPR', label: 'PR Review Queue', desc: 'Open PRs awaiting review' },
  { cat: 'PR', id: 'pr-cycle', icon: 'gitPR', label: 'PR Cycle Time', desc: 'Time to merge by author/team' },
  { cat: 'Sprint', id: 'burndown', icon: 'chart', label: 'Sprint Burndown', desc: 'Points remaining vs ideal' },
  { cat: 'Sprint', id: 'velocity', icon: 'trendingUp', label: 'Sprint Velocity', desc: 'Historical velocity trend' },
  { cat: 'Sprint', id: 'blocked-tasks', icon: 'alertTri', label: 'Blocked Tasks', desc: 'Items blocked this sprint' },
  { cat: 'Team', id: 'empty', icon: 'square', label: 'Empty Space', desc: 'Transparent spacer for layout flexibility', defaultSize: { w: 3, h: 2 } },
  { cat: 'Team', id: 'team-heatmap', icon: 'layers', label: 'Team Activity Map', desc: 'Commit heatmap per team' },
  { cat: 'Team', id: 'leaderboard', icon: 'star', label: 'Leaderboard', desc: 'Top contributors ranking' },
  { cat: 'AI', id: 'ai-summary', icon: 'sparkles', label: 'AI Summary', desc: 'Auto-generated insights' },
  { cat: 'AI', id: 'anomaly', icon: 'brain', label: 'Anomaly Detector', desc: 'ML-flagged metric changes' },
];

const TEMPLATE_WIDGETS: Record<string, string[]> = {
  cto: ['dora-overview', 'deploy-freq', 'velocity', 'ai-summary'],
  vp: ['velocity', 'pr-cycle', 'team-heatmap', 'blocked-tasks', 'ai-summary'],
  tl: ['ci-pass-rate', 'pr-queue', 'burndown', 'failing-builds', 'ai-summary'],
  devops: ['deploy-freq', 'mttr-trend', 'failing-builds', 'anomaly'],
  ic: ['pr-queue', 'ci-pass-rate', 'burndown', 'blocked-tasks'],
  blank: [],
};

function getWidgetColor(cat: string): string {
  const colors: Record<string, string> = {
    DORA: '#00E5FF', 'CI/CD': '#00C853', PR: '#B44CFF',
    Sprint: '#FF9100', Team: '#00E5FF', AI: '#B44CFF',
  };
  return colors[cat] || '#00E5FF';
}

export const useWizardStore = create<WizardState>((set, get) => ({
  step: 0,
  selectedTemplate: null,
  widgets: [],
  layout: [],
  widgetSizes: {},
  name: '',
  desc: '',
  timeRange: '30d',
  team: 'All teams',

  setStep: (s) => set({ step: s }),

  setTemplate: (id) => {
    const templateWidgets = TEMPLATE_WIDGETS[id] || [];
    const widgets = templateWidgets.map(wid => {
      const w = WIDGET_LIBRARY.find(x => x.id === wid);
      return {
        id: wid,
        instanceId: nanoid(),
        type: wid,
        label: w?.label || wid,
        icon: w?.icon || 'layers',
        color: getWidgetColor(w?.cat || ''),
        cat: w?.cat || '',
      };
    });
    const widgetSizes: Record<string, string> = {};
    const layout = widgets.map((w, idx) => {
      const isFull = ['dora-overview', 'team-heatmap', 'pr-queue', 'failing-builds', 'ai-summary'].includes(w.id);
      widgetSizes[w.instanceId] = isFull ? 'full' : 'half';
      return {
        i: w.instanceId,
        x: 0,
        y: idx * 2,
        w: isFull ? 12 : 6,
        h: 2,
      };
    });
    set({
      selectedTemplate: id,
      widgets,
      layout,
      widgetSizes,
      name: id === 'blank' ? 'My Dashboard' : `${TEMPLATES.find(t => t.id === id)?.label || ''} Dashboard`,
    });
  },

  addWidget: (widgetId) => {
    const w = WIDGET_LIBRARY.find(x => x.id === widgetId);
    if (!w) return;
    const instanceId = nanoid();
    const isFull = ['dora-overview', 'team-heatmap', 'pr-queue', 'failing-builds', 'ai-summary'].includes(widgetId);
    const newWidget: WizardWidget = {
      id: w.id,
      instanceId,
      type: w.id,
      label: w.label,
      icon: w.icon,
      color: getWidgetColor(w.cat),
      cat: w.cat,
    };
    const { widgets, layout, widgetSizes } = get();
    const maxY = layout.reduce((acc, l) => Math.max(acc, l.y + l.h), 0);
    set({
      widgets: [...widgets, newWidget],
      layout: [...layout, { i: instanceId, x: 0, y: maxY, w: isFull ? 12 : 6, h: 2 }],
      widgetSizes: { ...widgetSizes, [instanceId]: isFull ? 'full' : 'half' },
    });
  },

  removeWidget: (instanceId) => set(state => ({
    widgets: state.widgets.filter(w => w.instanceId !== instanceId),
    layout: state.layout.filter(l => l.i !== instanceId),
    widgetSizes: (() => { const s = { ...state.widgetSizes }; delete s[instanceId]; return s; })(),
  })),

  updateLayout: (newLayout) => set(state => {
    const updatedLayout = newLayout.map(item => {
      const size = state.widgetSizes[item.i];
      const w = size === 'full' ? 12 : 6;
      return { ...item, w };
    });
    return { layout: updatedLayout };
  }),

  toggleWidgetSize: (instanceId) => set(state => {
    const current = state.widgetSizes[instanceId] || 'half';
    const next = current === 'full' ? 'half' : 'full';
    const newSizes = { ...state.widgetSizes, [instanceId]: next };
    const newLayout = state.layout.map(l => l.i === instanceId ? { ...l, w: next === 'full' ? 12 : 6 } : l);
    return { widgetSizes: newSizes, layout: newLayout };
  }),

  setName: (name) => set({ name }),
  setDesc: (desc) => set({ desc }),
  setTimeRange: (timeRange) => set({ timeRange }),
  setTeam: (team) => set({ team }),
  setWidgets: (newWidgets) => {
    const layout = newWidgets.map((w, idx) => ({
      i: w.instanceId,
      x: 0,
      y: idx * 2,
      w: (w.id === 'dora-overview' || w.id === 'team-heatmap' || w.id === 'pr-queue' || w.id === 'failing-builds' || w.id === 'ai-summary') ? 12 : 6,
      h: 2,
    }));
    set({ widgets: newWidgets, layout });
  },
  moveWidget: (fromIndex, toIndex) => set(state => {
    if (toIndex < 0 || toIndex >= state.widgets.length) return state;
    const newWidgets = [...state.widgets];
    const [moved] = newWidgets.splice(fromIndex, 1);
    newWidgets.splice(toIndex, 0, moved);
    return { widgets: newWidgets };
  }),
  reset: () => set({ step: 0, selectedTemplate: null, widgets: [], layout: [], widgetSizes: {}, name: '', desc: '', timeRange: '30d', team: 'All teams' }),
}));

export { TEMPLATES, WIDGET_LIBRARY, TEMPLATE_WIDGETS };
