import { create } from "zustand";
import type { Layout } from "react-grid-layout";
import type {
  DashboardEditorState,
  DashboardEditorWidget,
} from "../../dashboardEditor/model";
import {
  appendEditorWidget,
  createEditorStateFromTemplate,
  createEditorWidgetSizes,
  moveEditorWidget,
  normalizeEditorLayout,
  removeEditorWidget,
  toggleEditorWidgetSize,
} from "../../dashboardEditor/model";
import {
  TEMPLATE_WIDGETS,
  TEMPLATES,
  WIDGET_LIBRARY,
} from "../../dashboardEditor/catalog";

export type WizardWidget = DashboardEditorWidget;

interface WizardState extends DashboardEditorState {
  step: number;
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
  setWidgets: (widgets: DashboardEditorWidget[]) => void;
  moveWidget: (fromIndex: number, toIndex: number) => void;
  reset: () => void;
}

const createInitialState = (): DashboardEditorState => ({
  selectedTemplate: null,
  widgets: [],
  layout: [],
  widgetSizes: {},
  name: "",
  desc: "",
  timeRange: "30d",
  team: "All teams",
  icon: "",
});

export const useWizardStore = create<WizardState>((set, get) => ({
  step: 0,
  ...createInitialState(),

  setStep: (s) => set({ step: s }),

  setTemplate: (id) => {
    const next = createEditorStateFromTemplate(id);
    set({
      selectedTemplate: next.selectedTemplate,
      widgets: next.widgets,
      layout: next.layout,
      widgetSizes: next.widgetSizes,
      name: next.name,
      desc: next.desc,
      timeRange: next.timeRange,
      team: next.team,
      icon: next.icon,
    });
  },

  addWidget: (widgetId) => {
    const state = get();
    const next = appendEditorWidget(state.widgets, state.layout, state.widgetSizes, widgetId);
    set({
      widgets: next.widgets,
      layout: next.layout,
      widgetSizes: next.widgetSizes,
    });
  },

  removeWidget: (instanceId) => {
    const state = get();
    const next = removeEditorWidget(state.widgets, state.layout, state.widgetSizes, instanceId);
    set({
      widgets: next.widgets,
      layout: next.layout,
      widgetSizes: next.widgetSizes,
    });
  },

  updateLayout: (newLayout) => {
    const state = get();
    const widgetSizes = { ...state.widgetSizes };
    newLayout.forEach((item) => {
      widgetSizes[item.i] = item.w === 12 ? "full" : "half";
    });
    set({
      layout: normalizeEditorLayout(newLayout, widgetSizes),
      widgetSizes,
    });
  },

  toggleWidgetSize: (instanceId) => {
    const state = get();
    const next = toggleEditorWidgetSize(state.layout, state.widgetSizes, instanceId);
    set({
      layout: next.layout,
      widgetSizes: next.widgetSizes,
    });
  },

  setName: (name) => set({ name }),
  setDesc: (desc) => set({ desc }),
  setTimeRange: (timeRange) => set({ timeRange }),
  setTeam: (team) => set({ team }),

  setWidgets: (newWidgets) => {
    const layout = newWidgets.map((widget, idx) => ({
      i: widget.instanceId,
      x: 0,
      y: idx * 2,
      w: widget.id === "dora-overview" || widget.id === "team-heatmap" || widget.id === "pr-queue" || widget.id === "failing-builds" || widget.id === "ai-summary" ? 12 : 6,
      h: 2,
    }));
    set({
      widgets: newWidgets,
      layout,
      widgetSizes: createEditorWidgetSizes(layout),
    });
  },

  moveWidget: (fromIndex, toIndex) => {
    const state = get();
    const nextWidgets = moveEditorWidget(state.widgets, fromIndex, toIndex);
    if (nextWidgets === state.widgets) {
      return;
    }
    const layoutById = new Map(state.layout.map((item) => [item.i, item]));
    const nextLayout = nextWidgets.map((widget, idx) => {
      const existing = layoutById.get(widget.instanceId);
      return {
        i: widget.instanceId,
        x: existing?.x ?? 0,
        y: idx * 2,
        w: existing?.w ?? (widget.id === "dora-overview" || widget.id === "team-heatmap" || widget.id === "pr-queue" || widget.id === "failing-builds" || widget.id === "ai-summary" ? 12 : 6),
        h: existing?.h ?? 2,
      };
    });
    set({
      widgets: nextWidgets,
      layout: nextLayout,
      widgetSizes: createEditorWidgetSizes(nextLayout),
    });
  },

  reset: () => set({ step: 0, selectedTemplate: null, ...createInitialState() }),
}));

export { TEMPLATE_WIDGETS, TEMPLATES, WIDGET_LIBRARY };
