import {
  DashboardFilters,
  WidgetLayout,
  Dashboard,
  DashboardIndexEntry,
  SystemTemplate,
  DashboardWidgetInstance,
  WidgetDataRequest,
  WidgetDataItem,
  DashboardDataResponse,
  CreateDashboardRequest,
  CreateDashboardResponse,
  UpdateDashboardRequest,
  UpdateDashboardResponse,
  ForkDashboardRequest,
  ForkDashboardResponse,
  UpdateLayoutRequest,
  ShareDashboardRequest,
  ShareDashboardResponse,
} from "../types/api";
import {
  WidgetConfig,
  WidgetType,
  MetricChartConfig,
  CompareBarChartConfig,
  StatCardConfig,
  DORAOverviewConfig,
  GaugeConfig,
  HeatmapConfig,
  DataTableConfig,
  LeaderboardConfig,
  SprintBurndownConfig,
  AIInsightConfig,
  AnomalyDetectorConfig,
} from "../types/widgets";
import {
  MetricId,
  MetricTimeSeries,
  MetricDataResponse,
  MetricBreakdownItem,
  DORAMetricDetail,
  DORAResponse,
} from "../types/metrics";
import {
  Plugin,
  ConnectSourceRequest,
  IntegrationStatus,
  InstallPluginResponse,
} from "../types/plugins";
import {
  AIInsight,
  AIChatRequest,
  AIChatResponse,
} from "../types/ai";
import {
  CurrentUser,
  SystemStatus,
  MeResponse,
  ActivityEvent,
} from "../types/user";
import { TeamName, DORALevel } from "../types/common";

// ──────────────────────────────────────────────
// 1. Генераторы фейковых данных
// ──────────────────────────────────────────────

let seed = 42;
function pseudoRandom(): number {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

const teamNames: TeamName[] = [
  "Platform",
  "Backend",
  "Frontend",
  "Mobile",
  "Data",
];
const allMetricIds: MetricId[] = [
  "deploy-freq",
  "lead-time",
  "cfr",
  "mttr",
  "ci-pass",
  "ci-duration",
  "ci-queue",
  "pr-cycle",
  "pr-review",
  "pr-merge",
  "velocity",
  "throughput",
  "health-score",
  "sprint-burndown",
];
const doraLevels: DORALevel[] = ["Elite", "High", "Med", "Low"];

const metricColorMap: Record<string, string> = {
  "deploy-freq": "#00E5FF",
  "lead-time": "#B44CFF",
  "cfr": "#FF9100",
  "mttr": "#00C853",
  "ci-pass": "#00E5FF",
  "ci-duration": "#B44CFF",
  "ci-queue": "#FF9100",
  "pr-cycle": "#00E5FF",
  "pr-review": "#B44CFF",
  "pr-merge": "#00C853",
  "velocity": "#00E5FF",
  "throughput": "#B44CFF",
  "health-score": "#FF9100",
  "sprint-burndown": "#00C853",
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(pseudoRandom() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(pseudoRandom() * (max - min + 1)) + min;
}

function isoDate(daysOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString();
}

function fakeTimeSeries(
  length: number,
  minVal: number,
  maxVal: number,
  unit: string,
): MetricTimeSeries {
  const values: number[] = [];
  const labels: string[] = [];
  for (let i = 0; i < length; i++) {
    values.push(
      Math.round((minVal + pseudoRandom() * (maxVal - minVal)) * 100) / 100,
    );
    labels.push(`Day ${i + 1}`);
  }
  return { values, labels, unit };
}

const WIZARD_WIDGET_MAP: Record<string, { type: WidgetType; metricId?: string; tableType?: string }> = {
  'dora-overview': { type: 'dora-overview' },
  'deploy-freq': { type: 'metric-chart', metricId: 'deploy-freq' },
  'lead-time': { type: 'metric-chart', metricId: 'lead-time' },
  'mttr-trend': { type: 'metric-chart', metricId: 'mttr' },
  'ci-pass-rate': { type: 'metric-chart', metricId: 'ci-pass' },
  'failing-builds': { type: 'data-table', tableType: 'ci-failures' },
  'pr-queue': { type: 'data-table', tableType: 'pr-queue' },
  'pr-cycle': { type: 'metric-chart', metricId: 'pr-cycle' },
  'burndown': { type: 'sprint-burndown' },
  'velocity': { type: 'metric-chart', metricId: 'velocity' },
  'blocked-tasks': { type: 'data-table', tableType: 'blocked-tasks' },
  'team-heatmap': { type: 'heatmap' },
  'leaderboard': { type: 'leaderboard', metricId: 'deploy-freq' },
  'ai-summary': { type: 'ai-insight', metricId: 'deploy-freq' },
  'anomaly': { type: 'anomaly-detector', metricId: 'deploy-freq' },
};

function generateWidgetConfig(type: WidgetType, role?: string, wizardId?: string): WidgetConfig {
  // If wizard ID provided, use mapping
  if (wizardId && WIZARD_WIDGET_MAP[wizardId]) {
    const map = WIZARD_WIDGET_MAP[wizardId];
    if (map.type === 'metric-chart') {
      return { type: 'metric-chart', metricId: map.metricId || 'deploy-freq', chartVariant: 'area', showCompare: false } as MetricChartConfig;
    }
    if (map.type === 'data-table') {
      return { type: 'data-table', tableType: map.tableType || 'pr-queue', maxRows: 5 } as DataTableConfig;
    }
    if (map.type === 'leaderboard') {
      return { type: 'leaderboard', metricId: map.metricId || 'deploy-freq', groupBy: 'team', limit: 5 } as LeaderboardConfig;
    }
    if (map.type === 'ai-insight') {
      return {
        type: 'ai-insight', variant: 'card', topicHint: map.metricId,
        containerStyle: {
          borderRadius: 14, padding: '18px 20px',
          borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
        },
        unseenStyle: {
          background: 'linear-gradient(var(--glass), var(--glass)) padding-box, linear-gradient(135deg, var(--cyan), var(--purple)) border-box',
          backgroundClip: 'padding-box, border-box',
          borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
        },
      } as any;
    }
    if (map.type === 'anomaly-detector') {
      return { type: 'anomaly-detector', watchMetrics: [map.metricId as any] } as AnomalyDetectorConfig;
    }
    if (map.type === 'sprint-burndown') {
      return { type: 'sprint-burndown', showTaskList: true } as SprintBurndownConfig;
    }
    if (map.type === 'heatmap') {
      return { type: 'heatmap', rowGroupBy: 'team', columns: 4 } as HeatmapConfig;
    }
    if (map.type === 'dora-overview') {
      return { type: 'dora-overview' } as DORAOverviewConfig;
    }
  }

  // Fallback: role-based random config
  const roleMetrics: Record<string, string[]> = {
    cto: ["deploy-freq", "lead-time", "cfr", "mttr", "velocity", "throughput"],
    vp: ["velocity", "throughput", "pr-cycle", "lead-time"],
    tl: ["ci-pass", "ci-duration", "pr-review", "pr-merge", "sprint-burndown"],
    devops: ["deploy-freq", "mttr", "ci-duration", "ci-pass"],
    ic: ["ci-pass", "pr-cycle", "pr-merge", "velocity"],
  };
  const metrics = role ? roleMetrics[role] || allMetricIds : allMetricIds;
  const pickMetric = () => pickRandom(metrics);

  switch (type) {
    case "metric-chart": {
      const mcMetricId = pickMetric();
      return {
        type: "metric-chart",
        metricId: mcMetricId,
        chartVariant: pickRandom(["area", "bar", "bar-horizontal"]),
        showCompare: pseudoRandom() > 0.5,
        colorOverride: metricColorMap[mcMetricId] || "#00E5FF",
      } as MetricChartConfig;
    }
    case "compare-bar-chart":
      return {
        type: "compare-bar-chart",
        metricId: pickMetric(),
        groupBy: pickRandom(["team", "repo"]),
        primaryLabel: "Current Sprint",
        compareLabel: "Previous Sprint",
      } as CompareBarChartConfig;
    case "stat-card":
      return {
        type: "stat-card",
        metricId: pickMetric(),
        showSparkline: pseudoRandom() > 0.3,
        colorKey: pickRandom(["cyan", "purple", "success", "warning", "error"]),
      } as StatCardConfig;
    case "dora-overview":
      return { type: "dora-overview" } as DORAOverviewConfig;
    case "health-gauge":
      return {
        type: "health-gauge",
        showDimensions: pseudoRandom() > 0.5,
      } as GaugeConfig;
    case "heatmap":
      return {
        type: "heatmap",
        rowGroupBy: pickRandom(["team", "weekday"]),
        columns: 4,
        colorOverride:
          pseudoRandom() > 0.5
            ? "#" +
              Math.floor(pseudoRandom() * 0xffffff)
                .toString(16)
                .padStart(6, "0")
            : undefined,
      } as HeatmapConfig;
    case "data-table":
      return {
        type: "data-table",
        tableType: pickRandom([
          "pr-queue",
          "ci-failures",
          "incidents",
          "delivery-risk",
          "my-prs",
          "review-queue",
          "blocked-tasks",
        ]),
        maxRows: randomInt(5, 20),
      } as DataTableConfig;
    case "leaderboard":
      return {
        type: "leaderboard",
        metricId: pickRandom(allMetricIds),
        groupBy: pickRandom(["team", "repo", "author"]),
        limit: randomInt(5, 10),
      } as LeaderboardConfig;
    case "sprint-burndown":
      return {
        type: "sprint-burndown",
        showTaskList: pseudoRandom() > 0.5,
        userId: pseudoRandom() > 0.5 ? `user-${randomInt(1, 5)}` : undefined,
      } as SprintBurndownConfig;
    case "ai-insight":
      return {
        type: "ai-insight",
        variant: pickRandom(["card", "inline"]),
        topicHint: pseudoRandom() > 0.5 ? "deployment frequency" : undefined,
        containerStyle: {
          borderRadius: 14, padding: '18px 20px',
          borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
        },
        unseenStyle: {
          background: 'linear-gradient(var(--glass), var(--glass)) padding-box, linear-gradient(135deg, var(--cyan), var(--purple)) border-box',
          backgroundClip: 'padding-box, border-box',
          borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
        },
      } as any;
    case "anomaly-detector":
      return {
        type: "anomaly-detector",
        watchMetrics: [pickRandom(allMetricIds), pickRandom(allMetricIds)],
      } as AnomalyDetectorConfig;
    default:
      throw new Error(`Unknown widget type: ${type}`);
  }
}

function generateWidgets(count: number, role?: string): DashboardWidgetInstance[] {
  const roleTypes: Record<string, WidgetType[]> = {
    cto: ["dora-overview", "stat-card", "metric-chart", "metric-chart", "heatmap"],
    vp: ["stat-card", "metric-chart", "leaderboard", "heatmap", "data-table"],
    tl: ["stat-card", "metric-chart", "data-table", "sprint-burndown", "leaderboard"],
    devops: ["metric-chart", "stat-card", "heatmap", "anomaly-detector", "data-table"],
    ic: ["stat-card", "metric-chart", "stat-card", "leaderboard", "data-table"],
  };
  const types = role ? roleTypes[role] : [
    "metric-chart", "compare-bar-chart", "stat-card", "dora-overview",
    "health-gauge", "heatmap", "data-table", "leaderboard",
    "sprint-burndown", "ai-insight", "anomaly-detector",
  ];
  return Array.from({ length: count }, (_, i) => {
    const type = pickRandom(types);
    return {
      instanceId: `widget-${i}-${randomInt(1000, 9999)}`,
      widgetType: type,
      config: generateWidgetConfig(type, role),
    };
  });
}

function generateLayout(widgets: DashboardWidgetInstance[]): WidgetLayout[] {
  const layouts: WidgetLayout[] = [];
  let currentY = 0;
  let currentX = 0;

  const widthByType: Record<string, number> = {
    'leaderboard': 4,
    'data-table': 6,
    'dora-overview': 12,
    'sprint-burndown': 6,
    'heatmap': 4,
    'metric-chart': 6,
    'stat-card': 3,
    'ai-insight': 4,
    'anomaly-detector': 4,
    'health-gauge': 3,
    'compare-bar-chart': 6,
    'section-header': 12,
    'recent-activity': 12,
  };

  const heightByType: Record<string, number> = {
    'leaderboard': 4,
    'data-table': 4,
    'dora-overview': 2,
    'sprint-burndown': 3,
    'heatmap': 3,
    'metric-chart': 3,
    'stat-card': 4,
    'ai-insight': 1,
    'anomaly-detector': 1,
    'health-gauge': 1,
    'compare-bar-chart': 2,
    'section-header': 1,
    'recent-activity': 4,
  };

  for (let i = 0; i < widgets.length; i++) {
    const w = widgets[i].widgetType;
    const width = widthByType[w] || 6;
    const height = heightByType[w] || 2;

    if (currentX + width > 12) {
      currentX = 0;
      currentY += 2;
    }

    layouts.push({
      i: widgets[i].instanceId,
      x: currentX,
      y: currentY,
      w: width,
      h: height,
      minW: 2,
      minH: 1,
      static: false,
    });

    currentX += width;
    if (currentX >= 12) {
      currentX = 0;
      currentY += 2;
    }
  }

  return layouts;
}

function generateRecentActivity(): ActivityEvent[] {
  const events = [
    {
      actor: "push → main",
      description: "CI pipeline triggered for feat/auth-tokens",
      color: "var(--cyan)",
    },
    {
      actor: "alex.kim",
      description: "Merged PR #812: Add rate limiting middleware",
      color: "var(--success)",
    },
    {
      actor: "sara.chen",
      description: "PR #814 opened: Refactor API layer",
      color: "var(--warning)",
    },
    {
      actor: "ci-bot",
      description: "Deploy to staging failed — build #4221",
      color: "var(--error)",
    },
  ];
  return events.map((e, i) => ({
    id: `activity-${i}`,
    actor: e.actor,
    description: e.description,
    relativeTime: ["2 min ago", "14 min ago", "31 min ago", "1 hr ago"][i],
    color: e.color,
  }));
}

const sampleDashboardId = "dash-1";
// Инициализация хранилища дашбордов
const dashboards: Map<string, Dashboard> = new Map();

function initDashboards() {
  const defaultFilters: DashboardFilters = {
    timeRange: "30d",
    team: "All teams",
    repo: "All repos",
  };

  // Пользовательский дашборд
  const userWidgets = generateWidgets(6);
  const userLayout = generateLayout(userWidgets);
  const userDash: Dashboard = {
    id: sampleDashboardId,
    name: "My Engineering Overview",
    description: "Personal dashboard for daily standups",
    sourceType: "user-created",
    sourceTemplateId: undefined,
    forkedFromId: undefined,
    visibility: "private",
    defaultFilters,
    widgets: userWidgets,
    layout: userLayout,
    recentActivity: generateRecentActivity(),
    createdBy: "user-1",
    createdAt: isoDate(-30),
    updatedAt: isoDate(-1),
    version: 3,
  };
  dashboards.set(userDash.id, userDash);

  // Role dashboards - custom widgets based on prototype
  const dashboardConfigs = [
    { id: "dash-cto", name: "CTO Dashboard", sourceTemplateId: "cto" as const },
    { id: "dash-vp", name: "VP Engineering Dashboard", sourceTemplateId: "vp" as const },
    { id: "dash-tl", name: "Tech Lead Dashboard", sourceTemplateId: "tl" as const },
    { id: "dash-devops", name: "DevOps Dashboard", sourceTemplateId: "devops" as const },
    { id: "dash-ic", name: "My Dashboard", sourceTemplateId: "ic" as const },
  ];

  // Overview dashboard - based on original DashboardScreen.tsx
  const overviewWidgets: DashboardWidgetInstance[] = [
    // Row 1: StatCards (Engineering Health, Deploy Freq, Lead Time, CFR)
    { instanceId: "overview-stat-1", widgetType: "stat-card", config: { type: "stat-card", metricId: "health-score", showSparkline: true, colorKey: "cyan" } as StatCardConfig },
    { instanceId: "overview-stat-2", widgetType: "stat-card", config: { type: "stat-card", metricId: "deploy-freq", showSparkline: true, colorKey: "success" } as StatCardConfig },
    { instanceId: "overview-stat-3", widgetType: "stat-card", config: { type: "stat-card", metricId: "lead-time", showSparkline: true, colorKey: "purple" } as StatCardConfig },
    { instanceId: "overview-stat-4", widgetType: "stat-card", config: { type: "stat-card", metricId: "cfr", showSparkline: true, colorKey: "warning" } as StatCardConfig },
    // Section header for AI Insights
    { instanceId: "overview-sh-ai", widgetType: "section-header", config: { type: "section-header", title: "AI Insights", rightText: "Updated 2 min ago" } as any },
    // Row 2: AI Insights
    { instanceId: "overview-ai-1", widgetType: "ai-insight", config: {
      type: "ai-insight", variant: "card", topicHint: "deployment frequency",
      containerStyle: {
        borderRadius: 14, padding: '18px 20px',
        borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
      },
      unseenStyle: {
        background: 'linear-gradient(var(--glass), var(--glass)) padding-box, linear-gradient(135deg, var(--cyan), var(--purple)) border-box',
        backgroundClip: 'padding-box, border-box',
        borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
      },
    } as any },
    { instanceId: "overview-ai-2", widgetType: "ai-insight", config: {
      type: "ai-insight", variant: "card", topicHint: "PR review time",
      containerStyle: {
        borderRadius: 14, padding: '18px 20px',
        borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
      },
      unseenStyle: {
        background: 'linear-gradient(var(--glass), var(--glass)) padding-box, linear-gradient(135deg, var(--cyan), var(--purple)) border-box',
        backgroundClip: 'padding-box, border-box',
        borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
      },
    } as any },
    { instanceId: "overview-ai-3", widgetType: "ai-insight", config: {
      type: "ai-insight", variant: "card", topicHint: "PR review time improving",
      containerStyle: {
        borderRadius: 14, padding: '18px 20px',
        borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
      },
      unseenStyle: {
        background: 'linear-gradient(var(--glass), var(--glass)) padding-box, linear-gradient(135deg, var(--cyan), var(--purple)) border-box',
        backgroundClip: 'padding-box, border-box',
        borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
      },
    } as any },
    // Recent Activity widget
    { instanceId: "overview-activity", widgetType: "recent-activity", config: { type: "recent-activity", maxItems: 10 } as any },
  ];
  const overviewLayout = generateLayout(overviewWidgets);
  const overviewDash: Dashboard = {
    id: "dash-overview",
    name: "Overview",
    description: "Engineering overview dashboard",
    sourceType: "system-template",
    sourceTemplateId: "overview",
    visibility: "org",
    defaultFilters: { timeRange: "30d", team: "All teams", repo: "All repos" },
    widgets: overviewWidgets,
    layout: overviewLayout,
    recentActivity: generateRecentActivity(),
    createdBy: "system",
    createdAt: isoDate(-60),
    updatedAt: isoDate(-1),
    version: 1,
  };
  dashboards.set(overviewDash.id, overviewDash);

  for (const role of dashboardConfigs) {
    let widgets: DashboardWidgetInstance[];
    let layout: WidgetLayout[];

    if (role.id === "dash-cto") {
      // CTO Dashboard - based on prototype dashboard-roles.jsx CTODashboard
      widgets = [
        // Row 1: StatCards
        { instanceId: "cto-stat-1", widgetType: "stat-card", config: { type: "stat-card", metricId: "health-score", showSparkline: true, colorKey: "cyan" } as StatCardConfig },
        { instanceId: "cto-stat-2", widgetType: "stat-card", config: { type: "stat-card", metricId: "deploy-freq", showSparkline: true, colorKey: "success" } as StatCardConfig },
        { instanceId: "cto-stat-3", widgetType: "stat-card", config: { type: "stat-card", metricId: "lead-time", showSparkline: true, colorKey: "purple" } as StatCardConfig },
        { instanceId: "cto-stat-4", widgetType: "stat-card", config: { type: "stat-card", metricId: "cfr", showSparkline: true, colorKey: "warning" } as StatCardConfig },
        // Row 2: Health Gauge + DORA Overview
        { instanceId: "cto-gauge-1", widgetType: "health-gauge", config: { type: "health-gauge", showDimensions: true } as GaugeConfig },
        { instanceId: "cto-dora-1", widgetType: "dora-overview", config: { type: "dora-overview" } as DORAOverviewConfig },
        // Row 3: Deployment Frequency + Team Velocity
        { instanceId: "cto-chart-1", widgetType: "metric-chart", config: { type: "metric-chart", metricId: "deploy-freq", chartVariant: "area", showCompare: false, colorOverride: "#00E5FF" } as MetricChartConfig },
        { instanceId: "cto-bar-1", widgetType: "metric-chart", config: { type: "metric-chart", metricId: "velocity", chartVariant: "bar", showCompare: true, colorOverride: "#00E5FF" } as MetricChartConfig },
        // Row 4: Lead Time
        { instanceId: "cto-chart-2", widgetType: "metric-chart", config: { type: "metric-chart", metricId: "lead-time", chartVariant: "area", showCompare: true, colorOverride: "#B44CFF" } as MetricChartConfig },
        // AI Insight
        { instanceId: "cto-ai-1", widgetType: "ai-insight", config: {
          type: "ai-insight", variant: "inline", topicHint: "security",
          containerStyle: {
            borderRadius: 14, padding: '18px 20px',
            borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
          },
          unseenStyle: {
            background: 'linear-gradient(var(--glass), var(--glass)) padding-box, linear-gradient(135deg, var(--cyan), var(--purple)) border-box',
            backgroundClip: 'padding-box, border-box',
            borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
          },
        } as any },
      ];
      layout = generateLayout(widgets);
    } else if (role.id === "dash-vp") {
      // VP Engineering Dashboard - based on prototype VPDashboard
      widgets = [
        // Row 1: StatCards
        { instanceId: "vp-stat-1", widgetType: "stat-card", config: { type: "stat-card", metricId: "velocity", showSparkline: true, colorKey: "cyan" } as StatCardConfig },
        { instanceId: "vp-stat-2", widgetType: "stat-card", config: { type: "stat-card", metricId: "pr-cycle", showSparkline: true, colorKey: "warning" } as StatCardConfig },
        { instanceId: "vp-stat-3", widgetType: "stat-card", config: { type: "stat-card", metricId: "throughput", showSparkline: true, colorKey: "warning" } as StatCardConfig },
        { instanceId: "vp-stat-4", widgetType: "stat-card", config: { type: "stat-card", metricId: "pr-merge", showSparkline: true, colorKey: "purple" } as StatCardConfig },
        // Row 2: Sprint Velocity + PR Cycle Time by Team
        { instanceId: "vp-chart-1", widgetType: "metric-chart", config: { type: "metric-chart", metricId: "velocity", chartVariant: "area", showCompare: true, colorOverride: "#00E5FF" } as MetricChartConfig },
        { instanceId: "vp-bar-1", widgetType: "metric-chart", config: { type: "metric-chart", metricId: "pr-cycle", chartVariant: "bar-horizontal", showCompare: false, colorOverride: "#B44CFF" } as MetricChartConfig },
        // Row 3: Team Activity Heatmap + Delivery Risk
        { instanceId: "vp-heat-1", widgetType: "heatmap", config: { type: "heatmap", rowGroupBy: "team", columns: 14 } as HeatmapConfig },
        { instanceId: "vp-table-1", widgetType: "data-table", config: { type: "data-table", tableType: "delivery-risk", maxRows: 5 } as DataTableConfig },
        // AI Insight
        { instanceId: "vp-ai-1", widgetType: "ai-insight", config: {
          type: "ai-insight", variant: "inline", topicHint: "pr cycle time",
          containerStyle: {
            borderRadius: 14, padding: '18px 20px',
            borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
          },
          unseenStyle: {
            background: 'linear-gradient(var(--glass), var(--glass)) padding-box, linear-gradient(135deg, var(--cyan), var(--purple)) border-box',
            backgroundClip: 'padding-box, border-box',
            borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
          },
        } as any },
      ];
      layout = generateLayout(widgets);
    } else if (role.id === "dash-tl") {
      // Tech Lead Dashboard - based on prototype TLDashboard
      widgets = [
        // Row 1: StatCards
        { instanceId: "tl-stat-1", widgetType: "stat-card", config: { type: "stat-card", metricId: "ci-pass", showSparkline: true, colorKey: "success" } as StatCardConfig },
        { instanceId: "tl-stat-2", widgetType: "stat-card", config: { type: "stat-card", metricId: "pr-review", showSparkline: true, colorKey: "warning" } as StatCardConfig },
        { instanceId: "tl-stat-3", widgetType: "stat-card", config: { type: "stat-card", metricId: "ci-duration", showSparkline: true, colorKey: "cyan" } as StatCardConfig },
        { instanceId: "tl-stat-4", widgetType: "stat-card", config: { type: "stat-card", metricId: "ci-queue", showSparkline: true, colorKey: "error" } as StatCardConfig },
        // Row 2: CI Pass Rate + Sprint Burndown
        { instanceId: "tl-chart-1", widgetType: "metric-chart", config: { type: "metric-chart", metricId: "ci-pass", chartVariant: "area", showCompare: false, colorOverride: "#00C853" } as MetricChartConfig },
        { instanceId: "tl-burndown-1", widgetType: "sprint-burndown", config: { type: "sprint-burndown", showTaskList: true } as SprintBurndownConfig },
        // Row 3: PR Review Queue + Recent Failures
        { instanceId: "tl-table-1", widgetType: "data-table", config: { type: "data-table", tableType: "pr-queue", maxRows: 5 } as DataTableConfig },
        { instanceId: "tl-table-2", widgetType: "data-table", config: { type: "data-table", tableType: "ci-failures", maxRows: 5 } as DataTableConfig },
        // AI Insight
        { instanceId: "tl-ai-1", widgetType: "ai-insight", config: {
          type: "ai-insight", variant: "inline", topicHint: "flaky tests",
          containerStyle: {
            borderRadius: 14, padding: '18px 20px',
            borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
          },
          unseenStyle: {
            background: 'linear-gradient(var(--glass), var(--glass)) padding-box, linear-gradient(135deg, var(--cyan), var(--purple)) border-box',
            backgroundClip: 'padding-box, border-box',
            borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
          },
        } as any },
      ];
      layout = generateLayout(widgets);
    } else if (role.id === "dash-devops") {
      // DevOps Dashboard - based on prototype DevOpsDashboard
      widgets = [
        // Row 1: StatCards
        { instanceId: "devops-stat-1", widgetType: "stat-card", config: { type: "stat-card", metricId: "deploy-freq", showSparkline: true, colorKey: "success" } as StatCardConfig },
        { instanceId: "devops-stat-2", widgetType: "stat-card", config: { type: "stat-card", metricId: "mttr", showSparkline: true, colorKey: "cyan" } as StatCardConfig },
        { instanceId: "devops-stat-3", widgetType: "stat-card", config: { type: "stat-card", metricId: "cfr", showSparkline: true, colorKey: "warning" } as StatCardConfig },
        { instanceId: "devops-stat-4", widgetType: "stat-card", config: { type: "stat-card", metricId: "health-score", showSparkline: false, colorKey: "success" } as StatCardConfig },
        // Row 2: Deploy Frequency + MTTR Trend
        { instanceId: "devops-chart-1", widgetType: "metric-chart", config: { type: "metric-chart", metricId: "deploy-freq", chartVariant: "area", showCompare: false, colorOverride: "#00C853" } as MetricChartConfig },
        { instanceId: "devops-chart-2", widgetType: "metric-chart", config: { type: "metric-chart", metricId: "mttr", chartVariant: "area", showCompare: false, colorOverride: "#FF9100" } as MetricChartConfig },
        // Row 3: Deploy Activity Heatmap + Recent Incidents
        { instanceId: "devops-heat-1", widgetType: "heatmap", config: { type: "heatmap", rowGroupBy: "weekday", columns: 16 } as HeatmapConfig },
        { instanceId: "devops-table-1", widgetType: "data-table", config: { type: "data-table", tableType: "incidents", maxRows: 5 } as DataTableConfig },
        // AI Insight
        { instanceId: "devops-ai-1", widgetType: "ai-insight", config: {
          type: "ai-insight", variant: "inline", topicHint: "incident response",
          containerStyle: {
            borderRadius: 14, padding: '18px 20px',
            borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
          },
          unseenStyle: {
            background: 'linear-gradient(var(--glass), var(--glass)) padding-box, linear-gradient(135deg, var(--cyan), var(--purple)) border-box',
            backgroundClip: 'padding-box, border-box',
            borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
          },
        } as any },
      ];
      layout = generateLayout(widgets);
    } else if (role.id === "dash-ic") {
      // IC (My View) Dashboard - based on prototype ICDashboard
      widgets = [
        // Row 1: StatCards
        { instanceId: "ic-stat-1", widgetType: "stat-card", config: { type: "stat-card", metricId: "pr-merge", showSparkline: false, colorKey: "cyan" } as StatCardConfig },
        { instanceId: "ic-stat-2", widgetType: "stat-card", config: { type: "stat-card", metricId: "ci-pass", showSparkline: true, colorKey: "success" } as StatCardConfig },
        { instanceId: "ic-stat-3", widgetType: "stat-card", config: { type: "stat-card", metricId: "pr-review", showSparkline: true, colorKey: "warning" } as StatCardConfig },
        { instanceId: "ic-stat-4", widgetType: "stat-card", config: { type: "stat-card", metricId: "velocity", showSparkline: false, colorKey: "purple" } as StatCardConfig },
        // Row 2: My PRs + My CI Pass Rate
        { instanceId: "ic-table-1", widgetType: "data-table", config: { type: "data-table", tableType: "my-prs", maxRows: 5 } as DataTableConfig },
        { instanceId: "ic-chart-1", widgetType: "metric-chart", config: { type: "metric-chart", metricId: "ci-pass", chartVariant: "area", showCompare: false, colorOverride: "#00C853" } as MetricChartConfig },
        // Row 3: My Review Queue + Sprint Progress
        { instanceId: "ic-table-2", widgetType: "data-table", config: { type: "data-table", tableType: "review-queue", maxRows: 5 } as DataTableConfig },
        { instanceId: "ic-burndown-1", widgetType: "sprint-burndown", config: { type: "sprint-burndown", showTaskList: true } as SprintBurndownConfig },
        // AI Insight
        { instanceId: "ic-ai-1", widgetType: "ai-insight", config: {
          type: "ai-insight", variant: "inline", topicHint: "CI failure",
          containerStyle: {
            borderRadius: 14, padding: '18px 20px',
            borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
          },
          unseenStyle: {
            background: 'linear-gradient(var(--glass), var(--glass)) padding-box, linear-gradient(135deg, var(--cyan), var(--purple)) border-box',
            backgroundClip: 'padding-box, border-box',
            borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)', borderLeft: '3px solid rgba(0,0,0,0)',
          },
        } as any },
      ];
      layout = generateLayout(widgets);
    } else {
      widgets = generateWidgets(4, role.sourceTemplateId);
      layout = generateLayout(widgets);
    }

    dashboards.set(role.id, {
      id: role.id,
      name: role.name,
      description: `Dashboard for ${role.sourceTemplateId} role`,
      sourceType: "system-template" as const,
      sourceTemplateId: role.sourceTemplateId,
      visibility: "org" as const,
      defaultFilters: { timeRange: "30d", team: "All teams", repo: "All repos" },
      widgets,
      layout,
      createdBy: "system",
      createdAt: isoDate(-60),
      updatedAt: isoDate(-1),
      version: 1,
    });
  }

  // Ещё пара дашбордов для списка
  for (let i = 1; i <= 4; i++) {
    const id = `dash-${i + 1}`;
    const widgets = generateWidgets(randomInt(3, 8));
    const layout = generateLayout(widgets);
    const dash: Dashboard = {
      id,
      name: `Team ${i} Dashboard`,
      description: `Dashboard for team ${i}`,
      sourceType: i % 2 === 0 ? "forked" : "user-created",
      forkedFromId: i % 2 === 0 ? sampleDashboardId : undefined,
      visibility: i % 2 === 0 ? "team" : "private",
      teamId: i % 2 === 0 ? `team-${i}` : undefined,
      defaultFilters: { ...defaultFilters, team: pickRandom(teamNames) },
      widgets,
      layout,
      createdBy: "user-1",
      createdAt: isoDate(-60 + i * 7),
      updatedAt: isoDate(-i),
      version: 1,
    };
    dashboards.set(id, dash);
  }
}

initDashboards();

// ──────────────────────────────────────────────
// 2. Вспомогательные функции для ответов
// ──────────────────────────────────────────────

function delay(ms = 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateDORAData(): DORAResponse {
  const makeDetail = (
    id: "deploy-freq" | "lead-time" | "cfr" | "mttr",
    label: string,
    unit: string,
    base: number,
  ): DORAMetricDetail => {
    const currentRaw = base + pseudoRandom() * base * 0.4;
    const delta =
      (pseudoRandom() > 0.5 ? "+" : "-") +
      (Math.random() * 20).toFixed(1) +
      "%";
    const level: DORALevel = pickRandom(doraLevels);
    return {
      id,
      label,
      currentValue: `${currentRaw.toFixed(1)}${unit}`,
      currentValueRaw: currentRaw,
      delta,
      level,
      benchmarkNote: `Benchmark: ${level} level`,
      timeSeries: fakeTimeSeries(14, base * 0.8, base * 1.2, unit),
    };
  };

  return {
    deployFrequency: makeDetail("deploy-freq", "Deploy Frequency", "/week", 12),
    leadTime: makeDetail("lead-time", "Lead Time for Changes", "h", 8.5),
    changeFailureRate: makeDetail("cfr", "Change Failure Rate", "%", 5.2),
    mttr: makeDetail("mttr", "Mean Time to Recovery", "min", 45),
  };
}

function generateMetricData(metricId: MetricId): MetricDataResponse {
  const labelMap: Record<MetricId, string> = {
    "deploy-freq": "Deploy Frequency",
    "lead-time": "Lead Time",
    cfr: "Change Failure Rate",
    mttr: "MTTR",
    "ci-pass": "CI Pass Rate",
    "ci-duration": "CI Duration",
    "ci-queue": "CI Queue Time",
    "pr-cycle": "PR Cycle Time",
    "pr-review": "PR Review Time",
    "pr-merge": "PR Merge Time",
    velocity: "Velocity",
    throughput: "Throughput",
    "health-score": "Health Score",
    "sprint-burndown": "Sprint Burndown",
  };
  const unitMap: Record<MetricId, string> = {
    "deploy-freq": "/week",
    "lead-time": "h",
    cfr: "%",
    mttr: "min",
    "ci-pass": "%",
    "ci-duration": "min",
    "ci-queue": "min",
    "pr-cycle": "h",
    "pr-review": "h",
    "pr-merge": "min",
    velocity: "pts",
    throughput: "items",
    "health-score": "%",
    "sprint-burndown": "pts",
  };
  const days = 14;
  const labels = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  return {
    metricId,
    label: labelMap[metricId],
    unit: unitMap[metricId],
    current: fakeTimeSeries(14, 0, 100, unitMap[metricId]),
    previous: fakeTimeSeries(14, 0, 100, unitMap[metricId]),
    labels,
  };
}

function generateBreakdown(metricId: MetricId): MetricBreakdownItem[] {
  return teamNames.map((team) => ({
    name: metricId,
    team,
    value: `${(pseudoRandom() * 50).toFixed(1)}`,
    valueRaw: pseudoRandom() * 100,
    doraLevel: pickRandom(doraLevels),
    delta:
      (pseudoRandom() > 0.5 ? "+" : "-") +
      (pseudoRandom() * 30).toFixed(1) +
      "%",
  }));
}

// ──────────────────────────────────────────────
// 3. Mock API объект
// ──────────────────────────────────────────────

export const mockApi = {
  // ── Дашборды ────────────────────────────────
  async getDashboardList(): Promise<DashboardIndexEntry[]> {
    await delay();
    return Array.from(dashboards.values()).map((d) => ({
      id: d.id,
      name: d.name,
      sourceType: d.sourceType,
      sourceTemplateId: d.sourceTemplateId,
      visibility: d.visibility,
      updatedAt: d.updatedAt,
      hasDraft: false, // для простоты
    }));
  },

  async getRecentActivity(): Promise<ActivityEvent[]> {
    await delay();
    return generateRecentActivity();
  },

  async getDashboard(id: string): Promise<Dashboard> {
    await delay();
    const dash = dashboards.get(id);
    if (!dash) throw new Error("Dashboard not found");
    return { ...dash, layout: dash.layout.map((l) => ({ ...l })) }; // неглубокая копия
  },

  async createDashboard(
    req: CreateDashboardRequest & { wizardWidgetIds?: string[] },
  ): Promise<CreateDashboardResponse> {
    await delay();
    const id = `dash-${dashboards.size + 1}`;

    // Convert wizard widget IDs to widget instances if provided
    let widgets = req.widgets;
    if (req.wizardWidgetIds && req.wizardWidgetIds.length > 0) {
      widgets = req.wizardWidgetIds.map((wId, i) => {
        const map = WIZARD_WIDGET_MAP[wId] || { type: 'stat-card' as WidgetType };
        const widgetType = map.type;
        let config: WidgetConfig;
        if (widgetType === 'metric-chart') {
          config = { type: 'metric-chart', metricId: map.metricId || 'deploy-freq', chartVariant: 'area', showCompare: false };
        } else if (widgetType === 'data-table') {
          config = { type: 'data-table', tableType: map.tableType || 'pr-queue', maxRows: 5 };
        } else if (widgetType === 'leaderboard') {
          config = { type: 'leaderboard', metricId: map.metricId || 'deploy-freq', groupBy: 'team', limit: 5 };
        } else if (widgetType === 'ai-insight') {
          config = { type: 'ai-insight', variant: 'card', topicHint: map.metricId };
        } else if (widgetType === 'anomaly-detector') {
          config = { type: 'anomaly-detector', watchMetrics: [map.metricId as any] };
        } else if (widgetType === 'sprint-burndown') {
          config = { type: 'sprint-burndown', showTaskList: true };
        } else if (widgetType === 'heatmap') {
          config = { type: 'heatmap', rowGroupBy: 'team', columns: 4 };
        } else if (widgetType === 'dora-overview') {
          config = { type: 'dora-overview' };
        } else {
          config = { type: 'stat-card', metricId: map.metricId || 'deploy-freq', showSparkline: true, colorKey: 'cyan' };
        }
        return { instanceId: `widget-${i}`, widgetType, config };
      });
    }

    const newDash: Dashboard = {
      id,
      name: req.name,
      description: req.description,
      sourceType: req.sourceType,
      sourceTemplateId: req.sourceTemplateId,
      forkedFromId: req.forkedFromId,
      visibility: req.visibility,
      teamId: req.teamId,
      defaultFilters: req.defaultFilters,
      widgets,
      layout: req.layout,
      createdBy: "current-user",
      createdAt: isoDate(0),
      updatedAt: isoDate(0),
      version: 1,
    };
    dashboards.set(id, newDash);
    return { dashboard: newDash };
  },

  async updateDashboard(
    id: string,
    req: UpdateDashboardRequest,
  ): Promise<UpdateDashboardResponse> {
    await delay();
    const dash = dashboards.get(id);
    if (!dash) throw new Error("Dashboard not found");
    if (req.version !== dash.version) throw new Error("Version conflict");
    Object.assign(dash, {
      name: req.name ?? dash.name,
      description: req.description ?? dash.description,
      visibility: req.visibility ?? dash.visibility,
      teamId: req.teamId ?? dash.teamId,
      defaultFilters: req.defaultFilters ?? dash.defaultFilters,
      widgets: req.widgets ?? dash.widgets,
      layout: req.layout ?? dash.layout,
      updatedAt: isoDate(0),
      version: dash.version + 1,
    });
    return { dashboard: { ...dash } };
  },

  async forkDashboard(
    id: string,
    req: ForkDashboardRequest,
  ): Promise<ForkDashboardResponse> {
    await delay();
    const original = dashboards.get(id);
    if (!original) throw new Error("Original dashboard not found");
    const newId = `dash-${dashboards.size + 1}`;
    const forked: Dashboard = {
      id: newId,
      name: req.name || `${original.name} (fork)`,
      description: original.description,
      sourceType: "forked",
      sourceTemplateId: undefined,
      forkedFromId: id,
      visibility: req.visibility,
      defaultFilters: { ...original.defaultFilters },
      widgets: original.widgets.map((w) => ({ ...w })),
      layout: original.layout.map((l) => ({ ...l })),
      createdBy: "current-user",
      createdAt: isoDate(0),
      updatedAt: isoDate(0),
      version: 1,
    };
    dashboards.set(newId, forked);
    return { dashboard: forked };
  },

  async updateLayout(id: string, req: UpdateLayoutRequest): Promise<void> {
    await delay();
    const dash = dashboards.get(id);
    if (!dash) throw new Error("Dashboard not found");
    if (req.version !== dash.version) throw new Error("Version conflict");
    dash.layout = req.layout;
    dash.version += 1;
    dash.updatedAt = isoDate(0);
  },

  async shareDashboard(
    id: string,
    req: ShareDashboardRequest,
  ): Promise<ShareDashboardResponse> {
    await delay();
    const dash = dashboards.get(id);
    if (!dash) throw new Error("Dashboard not found");
    dash.visibility = req.visibility;
    if (req.teamId) dash.teamId = req.teamId;
    const response: ShareDashboardResponse = { visibility: req.visibility };
    if (req.generateShareToken) {
      dash.shareToken = `share-${randomInt(1000, 9999)}`;
      response.shareToken = dash.shareToken;
      response.shareUrl = `https://app.example.com/shared/${dash.shareToken}`;
    }
    dash.updatedAt = isoDate(0);
    dash.version += 1;
    return response;
  },

  // ── Данные виджетов ─────────────────────────
  async getWidgetData(req: WidgetDataRequest): Promise<WidgetDataItem> {
    await delay(100);
    // Генерируем данные в зависимости от типа виджета
    const { instanceId, widgetType, config } = req;
    let data: any;

    switch (widgetType) {
      case "metric-chart":
        data = generateMetricData((config as MetricChartConfig).metricId);
        break;
      case "compare-bar-chart":
        data = {
          primary: fakeTimeSeries(7, 0, 50, "%"),
          compare: fakeTimeSeries(7, 0, 50, "%"),
        };
        break;
      case "stat-card":
        data = {
          value: (pseudoRandom() * 100).toFixed(1),
          delta:
            (pseudoRandom() > 0.5 ? "+" : "-") +
            (pseudoRandom() * 20).toFixed(1) +
            "%",
          sparkline: fakeTimeSeries(10, 0, 100, "%"),
        };
        break;
      case "dora-overview":
        data = generateDORAData();
        break;
      case "health-gauge":
        data = {
          score: pseudoRandom() * 100,
          dimensions: {
            quality: pseudoRandom() * 100,
            speed: pseudoRandom() * 100,
            reliability: pseudoRandom() * 100,
          },
        };
        break;
      case "heatmap":
        data = {
          rowGroupBy: pickRandom(["team", "weekday"]),
        };
        break;
      case "data-table": {
        const tableType = (config as DataTableConfig).tableType;
        const timeAgo = ["2 min ago", "14 min ago", "1 hr ago", "3 hrs ago", "Yesterday", "2 days ago"];
        let rows: any[];

        if (tableType === "pr-queue") {
          const prTitles = ["Add rate limiting middleware", "Refactor API layer", "Fix auth token expiry", "Update dependencies", "Add unit tests", "Optimize DB queries", "Fix memory leak", "Update docs"];
          rows = Array.from({ length: (config as DataTableConfig).maxRows }, (_, i) => ({
            id: i,
            title: prTitles[i % prTitles.length],
            status: "Review",
            time: pickRandom(timeAgo),
            author: pickRandom(["alex.kim", "sara.chen", "jake.wu", "maria.g"]),
          }));
        } else if (tableType === "ci-failures") {
          const buildNames = ["test-suite", "lint-check", "build-prod", "e2e-tests", "security-scan"];
          rows = Array.from({ length: (config as DataTableConfig).maxRows }, (_, i) => ({
            id: i,
            title: `${pickRandom(buildNames)} #${4200 + i}`,
            status: "Failed",
            time: pickRandom(timeAgo),
          }));
        } else if (tableType === "blocked-tasks") {
          const taskNames = ["Update API schema", "Fix flaky test", "Migrate to new auth", "Refactor payment module", "Add monitoring"];
          rows = Array.from({ length: (config as DataTableConfig).maxRows }, (_, i) => ({
            id: i,
            title: taskNames[i % taskNames.length],
            status: "Blocked",
            time: pickRandom(timeAgo),
            blockedBy: "Awaiting review",
          }));
        } else if (tableType === "delivery-risk") {
          const tasks = [
            { name: 'Auth refactor', team: 'Backend', status: 'At risk' },
            { name: 'iOS release v4.2', team: 'Mobile', status: 'Blocked' },
            { name: 'Data pipeline v2', team: 'Data', status: 'At risk' },
            { name: 'API gateway', team: 'Platform', status: 'On track' },
            { name: 'Design system', team: 'Frontend', status: 'On track' },
          ];
          rows = tasks.slice(0, (config as DataTableConfig).maxRows).map((t, i) => ({
            id: i,
            name: t.name,
            team: t.team,
            status: t.status,
          }));
        } else if (tableType === "incidents") {
          const incidents = [
            { service: 'api-gateway', severity: 'P1', mttr: '12 min', status: 'Done' },
            { service: 'auth-service', severity: 'P2', mttr: '31 min', status: 'Done' },
            { service: 'data-pipeline', severity: 'P2', mttr: '—', status: 'Open' },
            { service: 'cdn-proxy', severity: 'P3', mttr: '8 min', status: 'Done' },
            { service: 'notification-svc', severity: 'P3', mttr: '—', status: 'Open' },
          ];
          rows = incidents.slice(0, (config as DataTableConfig).maxRows).map((inc, i) => ({
            id: i,
            service: inc.service,
            severity: inc.severity,
            mttr: inc.mttr,
            status: inc.status,
          }));
        } else if (tableType === "my-prs") {
          const prs = [
            { title: 'feat/auth-tokens', branch: 'feat/auth-tokens', age: '3h', reviews: '1/2' },
            { title: 'fix/rate-limiting', branch: 'fix/rate-limit', age: '8h', reviews: '0/2' },
            { title: 'chore/upgrade-ts', branch: 'chore/ts-5', age: '2d', reviews: '2/2' },
          ];
          rows = prs.slice(0, (config as DataTableConfig).maxRows).map((pr, i) => ({
            id: i,
            title: pr.title,
            branch: pr.branch,
            age: pr.age,
            reviews: pr.reviews,
          }));
        } else if (tableType === "review-queue") {
          const reviews = [
            { pr: 'refactor/api-layer', author: '@s.chen', size: '+342 −89', waiting: '6h' },
            { pr: 'feat/webhooks-v2', author: '@a.garcia', size: '+218 −44', waiting: '14h' },
            { pr: 'fix/memory-leak', author: '@m.patel', size: '+31 −12', waiting: '2h' },
          ];
          rows = reviews.slice(0, (config as DataTableConfig).maxRows).map((r, i) => ({
            id: i,
            pr: r.pr,
            author: r.author,
            size: r.size,
            waiting: r.waiting,
          }));
        } else {
          rows = Array.from({ length: (config as DataTableConfig).maxRows }, (_, i) => ({
            id: i,
            title: `Item ${i}`,
            status: pickRandom(["Open", "Done", "Blocked"]),
            time: pickRandom(timeAgo),
          }));
        }
        data = { rows };
        break;
      }
      case "leaderboard":
        data = generateBreakdown((config as LeaderboardConfig).metricId).slice(
          0,
          (config as LeaderboardConfig).limit,
        );
        break;
      case "sprint-burndown":
        data = {
          ideal: fakeTimeSeries(10, 0, 50, "pts"),
          actual: fakeTimeSeries(10, 0, 50, "pts"),
        };
        break;
      case "ai-insight": {
        const topic = (config as AIInsightConfig).topicHint || "general";
        const titles: Record<string, string> = {
          "deployment frequency": "Deployment frequency up 23%",
          "PR review time": "PR review time improving",
          "PR review time improving": "Team PR velocity up 42%",
          "security": "Security vulnerabilities detected",
        };
        const bodies: Record<string, string> = {
          "deployment frequency": "Deployment frequency has increased 23% over the last 30 days. Consider reviewing the CI pipeline for bottlenecks.",
          "PR review time": "Average PR review time is 18% faster this sprint. The new review SLA is working well.",
          "PR review time improving": "PR review time improving across all teams. Frontend team leads with 42% improvement.",
          "security": "3 new security vulnerabilities detected in the last week. 2 are high priority.",
        };
        const actions: Record<string, string> = {
          "deployment frequency": "View CI pipeline",
          "PR review time": "See review metrics",
          "PR review time improving": "View team breakdown",
          "security": "Review security report",
        };
        data = {
          title: titles[topic] || `AI Insight: ${topic}`,
          body: bodies[topic] || `AI insight related to ${topic}.`,
          action: actions[topic] || "View details",
        };
        break;
      }
      case "anomaly-detector":
        data = {
          anomalies: [
            {
              metric: pickRandom(allMetricIds),
              detectedAt: isoDate(-1),
              score: pseudoRandom(),
            },
          ],
        };
        break;
      case "recent-activity":
        data = {
          activities: generateRecentActivity(),
        };
        break;
      case "section-header":
        data = {};
        break;
      default:
        data = {};
    }
    return { instanceId, data };
  },

  async getDashboardData(
    dashboardId: string,
    widgets: WidgetDataRequest[],
  ): Promise<DashboardDataResponse> {
    await delay(300);
    const dataItems = await Promise.all(
      widgets.map((w) => this.getWidgetData(w)),
    );
    return { widgets: dataItems, fetchedAt: isoDate(0) };
  },

  // ── Пользователь ────────────────────────────
  async getMe(): Promise<MeResponse> {
    await delay();
    const user: CurrentUser = {
      id: "user-1",
      displayName: "Alex Johnson",
      initials: "AJ",
      role: "Engineering Lead",
      avatarUrl: "https://i.pravatar.cc/150?u=user-1",
    };
    const system: SystemStatus = {
      status: "nominal",
      label: "All systems operational",
    };
    const pinnedIds = [sampleDashboardId, "dash-2"];
    const dashList = await this.getDashboardList();
    return {
      user,
      system,
      pinnedDashboardIds: pinnedIds,
      dashboards: dashList,
    };
  },

  async getSystemTemplates(): Promise<SystemTemplate[]> {
    await delay();
    const template: SystemTemplate = {
      templateId: "cto",
      label: "CTO Overview",
      description: "High-level metrics for engineering leadership",
      dashboard: {
        name: "CTO Dashboard",
        description: "Pre-built dashboard for CTOs",
        sourceType: "system-template",
        sourceTemplateId: "cto",
        visibility: "org",
        defaultFilters: {
          timeRange: "30d",
          team: "All teams",
          repo: "All repos",
        },
        widgets: generateWidgets(4),
        layout: [],
      },
    };
    return [template];
  },

  // ── Плагины и интеграции ────────────────────
  async getPlugins(): Promise<Plugin[]> {
    await delay();
    const plugins: Plugin[] = [
      {
        id: "gh",
        name: "GitHub",
        category: "Sources",
        description: "Sync repos, PRs, deployments",
        rating: 4.8,
        installCount: "12.3k",
        installed: true,
        accentColor: "#2da44e",
      },
      {
        id: "jira",
        name: "Jira",
        category: "Sources",
        description: "Track issues and sprints",
        rating: 4.2,
        installCount: "8.1k",
        installed: false,
        accentColor: "#0052cc",
      },
      {
        id: "slack",
        name: "Slack",
        category: "Alerts",
        description: "Send notifications",
        rating: 4.5,
        installCount: "15.7k",
        installed: true,
        accentColor: "#4A154B",
      },
      {
        id: "pd",
        name: "PagerDuty",
        category: "Alerts",
        description: "Incident alerts",
        rating: 4.0,
        installCount: "3.4k",
        installed: false,
        accentColor: "#06AC38",
      },
      {
        id: "ai-1",
        name: "AI Insights",
        category: "AI",
        description: "Smart recommendations",
        rating: 4.9,
        installCount: "5.2k",
        installed: true,
        accentColor: "#7C3AED",
      },
      {
        id: "csv",
        name: "CSV Exporter",
        category: "Exporters",
        description: "Export data to CSV",
        rating: 4.3,
        installCount: "9.8k",
        installed: false,
        accentColor: "#2563EB",
      },
    ];
    return plugins;
  },

  async installPlugin(pluginId: string): Promise<InstallPluginResponse> {
    await delay(500);
    return { pluginId, installed: true };
  },

  async connectSource(req: ConnectSourceRequest): Promise<IntegrationStatus> {
    await delay(800);
    return {
      sourceId: req.sourceId,
      name: req.sourceId.charAt(0).toUpperCase() + req.sourceId.slice(1),
      connected: true,
      status: "active",
    };
  },

  // ── AI ───────────────────────────────────────
  async getAIInsights(): Promise<AIInsight[]> {
    await delay();
    return [
      {
        id: "ins-1",
        title: "Deployment frequency dropped",
        body: "Deploy frequency is 15% lower this week compared to last week.",
        action: "Check CI pipeline",
        generatedAt: isoDate(-1),
      },
      {
        id: "ins-2",
        title: "PR review time improving",
        body: "Average review time decreased by 20% over the last 30 days.",
        generatedAt: isoDate(-2),
      },
      {
        id: "ins-3",
        title: "PR review time improving",
        body: "Average review time decreased by 30% over the last 80 days.",
        generatedAt: isoDate(-3),
      },
    ];
  },

  async sendAIChat(req: AIChatRequest): Promise<AIChatResponse> {
    await delay(1000);
    const lastMsg = req.messages[req.messages.length - 1]?.content || "";
    return {
      reply: `You asked about "${lastMsg.substring(0, 30)}...". Based on the data, I suggest looking at CI pipeline metrics.`,
      relatedMetrics: ["ci-duration", "ci-pass"],
    };
  },

  // ── Метрики ──────────────────────────────────
  async getMetricData(
    metricId: MetricId,
    _params?: any,
  ): Promise<MetricDataResponse> {
    await delay(200);
    return generateMetricData(metricId);
  },

  async getDORAData(): Promise<DORAResponse> {
    await delay();
    return generateDORAData();
  },

  async getBreakdown(metricId: MetricId): Promise<MetricBreakdownItem[]> {
    await delay();
    return generateBreakdown(metricId);
  },
};
