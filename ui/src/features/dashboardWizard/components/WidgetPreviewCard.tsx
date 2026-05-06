// src/features/dashboardWizard/components/WidgetPreviewCard.tsx
import React from "react";
import { Icon } from "../../../components/shared/Icon";
import { useWizardStore } from "../store/wizardStore";
import { WizardWidget } from "../store/wizardStore";
import { widgetRegistry } from "../../../components/dashboard/widgetRegistry";
import { makeTimeSeries, makeHeatData } from "../../../utils/seeds";

const WIDGET_TYPE_MAP: Record<string, string> = {
  "dora-overview": "dora-overview",
  "deploy-freq": "stat-card",
  "lead-time": "stat-card",
  "mttr-trend": "stat-card",
  "ci-pass-rate": "stat-card",
  "failing-builds": "data-table",
  "pr-queue": "data-table",
  "pr-cycle": "metric-chart",
  "burndown": "sprint-burndown",
  "velocity": "metric-chart",
  "blocked-tasks": "data-table",
  "team-heatmap": "heatmap",
  "leaderboard": "leaderboard",
  "ai-summary": "ai-insight",
  "anomaly": "anomaly-detector",
};

const WIDGET_CONFIG_MAP: Record<string, Record<string, unknown>> = {
  "deploy-freq": { metricId: "deploy-freq", colorKey: "cyan" },
  "lead-time": { metricId: "lead-time", colorKey: "purple" },
  "mttr-trend": { metricId: "mttr", colorKey: "warning" },
  "ci-pass-rate": { metricId: "ci-pass", colorKey: "success" },
  "pr-cycle": { metricId: "pr-cycle", chartVariant: "area" },
  "burndown": {},
  "velocity": { metricId: "velocity", chartVariant: "area" },
  "failing-builds": { tableType: "ci-failures", maxRows: 5 },
  "pr-queue": { tableType: "pr-queue", maxRows: 5 },
  "blocked-tasks": { tableType: "blocked-tasks", maxRows: 5 },
  "team-heatmap": { rowGroupBy: "team" },
  "leaderboard": { metricId: "velocity" },
  "ai-summary": { variant: "card" },
  "anomaly": {},
  "dora-overview": {},
};

function createMockData(widgetId: string): unknown {
  const timeSeries = makeTimeSeries(12, 42, 8, 0.5, 0);
  const sparkline = makeTimeSeries(12, 50, 10, 0.3, 0);

  switch (widgetId) {
    case "dora-overview":
      return {
        deployFrequency: { currentValue: "4.2/day", level: "elite" },
        leadTime: { currentValue: "38h", level: "high" },
        changeFailureRate: { currentValue: "3.2%", level: "elite" },
        mttr: { currentValue: "18 min", level: "elite" },
      };
    case "deploy-freq":
    case "lead-time":
    case "mttr-trend":
    case "ci-pass-rate":
      return {
        value: widgetId === "ci-pass-rate" ? "94%" : "4.2",
        delta: "+12%",
        sparkline: { values: sparkline },
        unit: widgetId === "ci-pass-rate" ? "%" : "/day",
      };
    case "pr-cycle":
    case "velocity":
      return {
        current: { values: timeSeries },
        labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"],
        unit: "pts",
      };
    case "failing-builds":
      return {
        rows: [
          { title: "integration-tests", author: "api-gateway", time: "2h", status: "Failed" },
          { title: "docker-build", author: "monorepo", time: "5h", status: "Failed" },
          { title: "e2e-suite", author: "frontend", time: "9h", status: "Failed" },
        ],
      };
    case "pr-queue":
      return {
        rows: [
          { title: "feat/auth-tokens", author: "@j.kim", time: "3h", status: "Review" },
          { title: "fix/rate-limit", author: "@s.chen", time: "8h", status: "Review" },
          { title: "refactor/api", author: "@m.patel", time: "19h", status: "Review" },
        ],
      };
    case "blocked-tasks":
      return {
        rows: [
          { title: "Auth migration", author: "Backend", time: "High", status: "Critical" },
          { title: "iOS release blocker", author: "Mobile", time: "Critical", status: "Blocked" },
          { title: "Data pipeline v2", author: "Data", time: "Med", status: "Blocked" },
        ],
      };
    case "burndown":
      return {
        ideal: { values: [88, 75, 62, 50, 38, 25, 13, 0] },
        actual: { values: [88, 80, 65, 55, 42, 30, 22, 15] },
      };
    case "team-heatmap":
      return makeHeatData(3, 16, 0.4, 33);
    case "leaderboard":
      return [
        { team: "Alex Kim", valueRaw: 42 },
        { team: "Jamie Chen", valueRaw: 37 },
        { team: "Taylor Smith", valueRaw: 29 },
        { team: "Morgan Lee", valueRaw: 24 },
      ];
    case "ai-summary":
      return {
        title: "Weekly Team Insights",
        body: "Deploy frequency increased 15% this week. PR review time is up - consider adding more reviewers.",
        action: "View Details",
      };
    case "anomaly":
      return {
        anomalies: [],
      };
    default:
      return null;
  }
}

export const WidgetPreviewCard: React.FC<{ widget: WizardWidget }> = ({
  widget,
}) => {
  const widgetType = WIDGET_TYPE_MAP[widget.id];
  const widgetConfig = WIDGET_CONFIG_MAP[widget.id] || {};
  const mockData = createMockData(widget.id);
  const WidgetComponent = widgetType ? widgetRegistry[widgetType as keyof typeof widgetRegistry] : null;

  return (
    <div
      style={{
        background:
          widget.id === "ai-summary"
            ? "rgba(180,76,255,0.06)"
            : widget.id === "anomaly"
              ? "rgba(255,145,0,0.06)"
              : "var(--glass)",
        border:
          widget.id === "ai-summary"
            ? "1px solid rgba(180,76,255,0.2)"
            : widget.id === "anomaly"
              ? "1px solid rgba(255,145,0,0.2)"
              : "1px solid var(--border)",
        borderRadius: 10,
        height: "100%",
        width: "100%",
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        className="widget-drag-handle"
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "grab",
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            background: `${widget.color}18`,
            border: `1px solid ${widget.color}25`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={widget.icon} size={11} color={widget.color} />
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text)",
            flex: 1,
          }}
        >
          {widget.label}
        </span>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {WidgetComponent ? (
          <WidgetComponent config={widgetConfig as any} data={mockData} />
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            {widget.label}
          </div>
        )}
      </div>
    </div>
  );
};
