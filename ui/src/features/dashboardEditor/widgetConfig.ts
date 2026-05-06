import type { WidgetConfig } from "../../types/widgets";
import type { DashboardWidgetDefinition } from "./catalog";

type WidgetConfigFactory = (definition: DashboardWidgetDefinition) => WidgetConfig;

const FACTORIES: Record<string, WidgetConfigFactory> = {
  "dora-overview": () => ({ type: "dora-overview" }),
  "deploy-freq": () => ({ type: "stat-card", metricId: "deploy-freq", showSparkline: true, colorKey: "cyan" }),
  "lead-time": () => ({ type: "stat-card", metricId: "lead-time", showSparkline: true, colorKey: "purple" }),
  "mttr-trend": () => ({ type: "stat-card", metricId: "mttr", showSparkline: true, colorKey: "warning" }),
  "ci-pass-rate": () => ({ type: "stat-card", metricId: "ci-pass", showSparkline: true, colorKey: "success" }),
  "failing-builds": () => ({ type: "data-table", tableType: "ci-failures", maxRows: 5 }),
  "pr-queue": () => ({ type: "data-table", tableType: "pr-queue", maxRows: 5 }),
  "pr-cycle": () => ({ type: "metric-chart", metricId: "pr-cycle", chartVariant: "area", showCompare: false }),
  "burndown": () => ({ type: "sprint-burndown", showTaskList: true }),
  "velocity": () => ({ type: "metric-chart", metricId: "velocity", chartVariant: "area", showCompare: false }),
  "blocked-tasks": () => ({ type: "data-table", tableType: "blocked-tasks", maxRows: 5 }),
  "team-heatmap": () => ({ type: "heatmap", rowGroupBy: "team", columns: 4 }),
  "leaderboard": () => ({ type: "leaderboard", metricId: "velocity", groupBy: "team", limit: 5 }),
  "ai-summary": () => ({ type: "ai-insight", variant: "card" }),
  "anomaly": () => ({ type: "anomaly-detector", watchMetrics: ["deploy-freq"] }),
  "empty": () => ({ type: "section-header", title: "Empty Space" }),
};

export function createDefaultWidgetConfig(definition: DashboardWidgetDefinition): WidgetConfig {
  const factory = FACTORIES[definition.id];
  if (factory) {
    return factory(definition);
  }
  return {
    type: "stat-card",
    metricId: "deploy-freq",
    showSparkline: true,
    colorKey: "cyan",
  };
}
