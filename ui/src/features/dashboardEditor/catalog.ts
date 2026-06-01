import { WIDGET_DESCRIPTORS } from "./widgetDescriptors";
import type { DashboardEditorWidgetSize } from "./model";

export interface DashboardTemplateDefinition {
  id: string;
  label: string;
  icon: string;
  color: string;
  desc: string;
}

export interface DashboardWidgetDefinition {
  cat: string;
  id: string;
  icon: string;
  label: string;
  desc: string;
  defaultSize?: {
    w: number;
    h: number;
  };
}

export const TEMPLATES: DashboardTemplateDefinition[] = [
  { id: "cto", label: "CTO", icon: "trendingUp", color: "var(--m-cyan-500)", desc: "Health score, DORA overview, team velocity trends" },
  { id: "vp", label: "VP Engineering", icon: "users", color: "var(--m-purple-500)", desc: "Sprint velocity, team load, delivery risk heatmap" },
  { id: "tl", label: "Tech Lead", icon: "gitPR", color: "var(--m-ok)", desc: "CI health, PR queue, sprint burndown" },
  { id: "devops", label: "DevOps / SRE", icon: "cpu", color: "var(--m-warn)", desc: "Deploy frequency, MTTR, incident tracking" },
  { id: "ic", label: "My Dashboard", icon: "activity", color: "var(--m-purple-500)", desc: "My PRs, CI runs, review queue, sprint tasks" },
  { id: "blank", label: "Blank Canvas", icon: "plus", color: "var(--m-fg-2)", desc: "Start from scratch and add widgets one by one" },
];

export const WIDGET_LIBRARY: DashboardWidgetDefinition[] = WIDGET_DESCRIPTORS.map((d) => ({
  cat: d.cat,
  id: d.libraryId,
  icon: d.icon,
  label: d.label,
  desc: d.desc,
  defaultSize: d.defaultSize,
}));

export const TEMPLATE_WIDGETS: Record<string, string[]> = {
  cto: ["dora-overview", "deploy-freq", "velocity", "ai-summary"],
  vp: ["velocity", "pr-cycle", "team-heatmap", "blocked-tasks", "ai-summary"],
  tl: ["ci-pass-rate", "pr-queue", "burndown", "failing-builds", "ai-summary"],
  devops: ["deploy-freq", "mttr-trend", "failing-builds", "anomaly"],
  ic: ["pr-queue", "ci-pass-rate", "burndown", "blocked-tasks"],
  blank: [],
};

const FULL_WIDTH_WIDGET_IDS = new Set([
  "dora-overview",
  "team-heatmap",
  "pr-queue",
  "failing-builds",
  "ai-summary",
]);

export function getWidgetColor(cat: string): string {
  const colors: Record<string, string> = {
    DORA: "var(--m-cyan-500)",
    "CI/CD": "var(--m-ok)",
    PR: "var(--m-purple-500)",
    Sprint: "var(--m-warn)",
    Team: "var(--m-cyan-500)",
    AI: "var(--m-purple-500)",
  };
  return colors[cat] || "var(--m-cyan-500)";
}

export function isFullWidthWidget(widgetId: string): boolean {
  return FULL_WIDTH_WIDGET_IDS.has(widgetId);
}

export function getDefaultWidgetSize(widgetId: string): DashboardEditorWidgetSize {
  return isFullWidthWidget(widgetId) ? "full" : "half";
}
