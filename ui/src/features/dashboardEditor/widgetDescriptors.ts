// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics
// Copyright (C) 2026 Metraly Contributors

// widgetDescriptors.ts — single source of truth mapping catalog library IDs to runtime widget types.
// Backend, renderer, and editor all key off runtimeType; the libraryId is used only inside the editor UI.

import type { WidgetConfig } from "../../types/widgets";

export interface WidgetDescriptor {
  /** Catalog / editor-state ID (e.g. "deploy-freq") */
  libraryId: string;
  /** Runtime type persisted to backend and used by widgetRegistry (e.g. "stat-card") */
  runtimeType: string;
  label: string;
  icon: string;
  cat: string;
  desc: string;
  /** True if the widget occupies full row width by default */
  fullWidth: boolean;
  defaultConfig: WidgetConfig;
  defaultSize?: { w: number; h: number };
}

export const WIDGET_DESCRIPTORS: WidgetDescriptor[] = [
  {
    libraryId: "dora-overview",
    runtimeType: "dora-overview",
    label: "DORA Overview",
    icon: "zap",
    cat: "DORA",
    desc: "4 key metrics at a glance",
    fullWidth: true,
    defaultConfig: { type: "dora-overview" },
  },
  {
    libraryId: "deploy-freq",
    runtimeType: "stat-card",
    label: "Deploy Frequency",
    icon: "zap",
    cat: "DORA",
    desc: "Chart + current value",
    fullWidth: false,
    defaultConfig: { type: "stat-card", metricId: "deploy-freq", showSparkline: true, colorKey: "cyan" },
  },
  {
    libraryId: "lead-time",
    runtimeType: "stat-card",
    label: "Lead Time",
    icon: "clock",
    cat: "DORA",
    desc: "Time from commit -> production",
    fullWidth: false,
    defaultConfig: { type: "stat-card", metricId: "lead-time", showSparkline: true, colorKey: "purple" },
  },
  {
    libraryId: "mttr-trend",
    runtimeType: "stat-card",
    label: "MTTR Trend",
    icon: "activity",
    cat: "DORA",
    desc: "Mean time to restore incidents",
    fullWidth: false,
    defaultConfig: { type: "stat-card", metricId: "mttr", showSparkline: true, colorKey: "warning" },
  },
  {
    libraryId: "ci-pass-rate",
    runtimeType: "stat-card",
    label: "CI Pass Rate",
    icon: "activity",
    cat: "CI/CD",
    desc: "Build success trend",
    fullWidth: false,
    defaultConfig: { type: "stat-card", metricId: "ci-pass", showSparkline: true, colorKey: "success" },
  },
  {
    libraryId: "failing-builds",
    runtimeType: "data-table",
    label: "Failing Builds",
    icon: "xCircle",
    cat: "CI/CD",
    desc: "Recent failures list",
    fullWidth: true,
    defaultConfig: { type: "data-table", tableType: "ci-failures", maxRows: 5 },
  },
  {
    libraryId: "pr-queue",
    runtimeType: "data-table",
    label: "PR Review Queue",
    icon: "gitPR",
    cat: "PR",
    desc: "Open PRs awaiting review",
    fullWidth: true,
    defaultConfig: { type: "data-table", tableType: "pr-queue", maxRows: 5 },
  },
  {
    libraryId: "pr-cycle",
    runtimeType: "metric-chart",
    label: "PR Cycle Time",
    icon: "gitPR",
    cat: "PR",
    desc: "Time to merge by author/team",
    fullWidth: false,
    defaultConfig: { type: "metric-chart", metricId: "pr-cycle", chartVariant: "area", showCompare: false },
  },
  {
    libraryId: "burndown",
    runtimeType: "sprint-burndown",
    label: "Sprint Burndown",
    icon: "chart",
    cat: "Sprint",
    desc: "Points remaining vs ideal",
    fullWidth: false,
    defaultConfig: { type: "sprint-burndown", showTaskList: true },
  },
  {
    libraryId: "velocity",
    runtimeType: "metric-chart",
    label: "Sprint Velocity",
    icon: "trendingUp",
    cat: "Sprint",
    desc: "Historical velocity trend",
    fullWidth: false,
    defaultConfig: { type: "metric-chart", metricId: "velocity", chartVariant: "area", showCompare: false },
  },
  {
    libraryId: "compare-bar-chart",
    runtimeType: "compare-bar-chart",
    label: "Compare Bar Chart",
    icon: "bar2",
    cat: "Team",
    desc: "Compare current vs previous values across groups",
    fullWidth: false,
    defaultConfig: { type: "compare-bar-chart", metricId: "velocity", groupBy: "team", primaryLabel: "This sprint", compareLabel: "Last sprint" },
  },
  {
    libraryId: "blocked-tasks",
    runtimeType: "data-table",
    label: "Blocked Tasks",
    icon: "alertTri",
    cat: "Sprint",
    desc: "Items blocked this sprint",
    fullWidth: false,
    defaultConfig: { type: "data-table", tableType: "blocked-tasks", maxRows: 5 },
  },
  {
    libraryId: "empty",
    runtimeType: "section-header",
    label: "Empty Space",
    icon: "square",
    cat: "Team",
    desc: "Transparent spacer for layout flexibility",
    fullWidth: false,
    defaultConfig: { type: "section-header", title: "Empty Space" },
    defaultSize: { w: 3, h: 2 },
  },
  {
    libraryId: "team-heatmap",
    runtimeType: "heatmap",
    label: "Team Activity Map",
    icon: "layers",
    cat: "Team",
    desc: "Commit heatmap per team",
    fullWidth: true,
    defaultConfig: { type: "heatmap", rowGroupBy: "team", columns: 4 },
  },
  {
    libraryId: "leaderboard",
    runtimeType: "leaderboard",
    label: "Leaderboard",
    icon: "star",
    cat: "Team",
    desc: "Top contributors ranking",
    fullWidth: false,
    defaultConfig: { type: "leaderboard", metricId: "velocity", groupBy: "team", limit: 5 },
  },
  {
    libraryId: "health-gauge",
    runtimeType: "health-gauge",
    label: "Health Gauge",
    icon: "heart",
    cat: "Team",
    desc: "Single score health summary",
    fullWidth: false,
    defaultConfig: { type: "health-gauge", showDimensions: false },
  },
  {
    libraryId: "recent-activity",
    runtimeType: "recent-activity",
    label: "Recent Activity",
    icon: "activity",
    cat: "Activity",
    desc: "Latest events from connected systems",
    fullWidth: false,
    defaultConfig: { type: "recent-activity", maxItems: 8 },
  },
  {
    libraryId: "ai-summary",
    runtimeType: "ai-insight",
    label: "AI Summary",
    icon: "sparkles",
    cat: "AI",
    desc: "Auto-generated insights",
    fullWidth: true,
    defaultConfig: { type: "ai-insight", variant: "card" },
  },
  {
    libraryId: "anomaly",
    runtimeType: "anomaly-detector",
    label: "Anomaly Detector",
    icon: "brain",
    cat: "AI",
    desc: "ML-flagged metric changes",
    fullWidth: false,
    defaultConfig: { type: "anomaly-detector", watchMetrics: ["deploy-freq"] },
  },
];

/** Look up a descriptor by catalog library ID. Returns undefined if not found. */
export const DESCRIPTOR_BY_LIBRARY_ID = new Map<string, WidgetDescriptor>(
  WIDGET_DESCRIPTORS.map((d) => [d.libraryId, d]),
);

/**
 * Look up the FIRST descriptor whose runtimeType matches.
 * When multiple library IDs share a runtime type (e.g. deploy-freq / lead-time → stat-card),
 * this returns the first match; callers that need an exact library ID must use config.metricId etc.
 */
export function descriptorByRuntimeType(runtimeType: string): WidgetDescriptor | undefined {
  return WIDGET_DESCRIPTORS.find((d) => d.runtimeType === runtimeType);
}

/**
 * Reconstruct the editor library ID from a persisted widget instance.
 * Uses config fields (metricId, tableType) to disambiguate widgets that share a runtimeType.
 */
export function libraryIdFromWidget(
  runtimeType: string,
  config: Record<string, unknown>,
): string {
  // stat-card: disambiguate by metricId
  if (runtimeType === "stat-card") {
    const metricId = config["metricId"] as string | undefined;
    if (metricId === "deploy-freq") return "deploy-freq";
    if (metricId === "lead-time") return "lead-time";
    if (metricId === "mttr") return "mttr-trend";
    if (metricId === "ci-pass") return "ci-pass-rate";
    return "deploy-freq"; // fallback
  }
  // data-table: disambiguate by tableType
  if (runtimeType === "data-table") {
    const tableType = config["tableType"] as string | undefined;
    if (tableType === "ci-failures") return "failing-builds";
    if (tableType === "pr-queue") return "pr-queue";
    if (tableType === "blocked-tasks") return "blocked-tasks";
    return "failing-builds"; // fallback
  }
  // metric-chart: disambiguate by metricId
  if (runtimeType === "metric-chart") {
    const metricId = config["metricId"] as string | undefined;
    if (metricId === "pr-cycle") return "pr-cycle";
    if (metricId === "velocity") return "velocity";
    return "velocity"; // fallback
  }
  // 1:1 mappings
  const descriptor = WIDGET_DESCRIPTORS.find((d) => d.runtimeType === runtimeType);
  return descriptor?.libraryId ?? runtimeType;
}
