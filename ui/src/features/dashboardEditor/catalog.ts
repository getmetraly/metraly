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

export const WIDGET_LIBRARY: DashboardWidgetDefinition[] = [
  { cat: "DORA", id: "dora-overview", icon: "zap", label: "DORA Overview", desc: "4 key metrics at a glance" },
  { cat: "DORA", id: "deploy-freq", icon: "zap", label: "Deploy Frequency", desc: "Chart + current value" },
  { cat: "DORA", id: "lead-time", icon: "clock", label: "Lead Time", desc: "Time from commit -> production" },
  { cat: "DORA", id: "mttr-trend", icon: "activity", label: "MTTR Trend", desc: "Mean time to restore incidents" },
  { cat: "CI/CD", id: "ci-pass-rate", icon: "activity", label: "CI Pass Rate", desc: "Build success trend" },
  { cat: "CI/CD", id: "failing-builds", icon: "xCircle", label: "Failing Builds", desc: "Recent failures list" },
  { cat: "PR", id: "pr-queue", icon: "gitPR", label: "PR Review Queue", desc: "Open PRs awaiting review" },
  { cat: "PR", id: "pr-cycle", icon: "gitPR", label: "PR Cycle Time", desc: "Time to merge by author/team" },
  { cat: "Sprint", id: "burndown", icon: "chart", label: "Sprint Burndown", desc: "Points remaining vs ideal" },
  { cat: "Sprint", id: "velocity", icon: "trendingUp", label: "Sprint Velocity", desc: "Historical velocity trend" },
  { cat: "Sprint", id: "blocked-tasks", icon: "alertTri", label: "Blocked Tasks", desc: "Items blocked this sprint" },
  { cat: "Team", id: "empty", icon: "square", label: "Empty Space", desc: "Transparent spacer for layout flexibility", defaultSize: { w: 3, h: 2 } },
  { cat: "Team", id: "team-heatmap", icon: "layers", label: "Team Activity Map", desc: "Commit heatmap per team" },
  { cat: "Team", id: "leaderboard", icon: "star", label: "Leaderboard", desc: "Top contributors ranking" },
  { cat: "AI", id: "ai-summary", icon: "sparkles", label: "AI Summary", desc: "Auto-generated insights" },
  { cat: "AI", id: "anomaly", icon: "brain", label: "Anomaly Detector", desc: "ML-flagged metric changes" },
];

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
