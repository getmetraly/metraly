export function sampleWidgetData(widgetType: string): unknown {
  switch (widgetType) {
    case "stat-card":
      return {
        value: "4.2/d",
        currentValue: "4.2/d",
        currentValueRaw: 4.2,
        delta: "+12%",
        level: "good",
        timeSeries: [30, 35, 38, 40, 42],
        sparkline: { values: [30, 35, 38, 40, 42] },
        summary: "Preview metric",
      };
    case "metric-chart":
      return {
        metricId: "preview",
        label: "Metric",
        unit: "",
        labels: ["Jan", "Feb", "Mar", "Apr", "May"],
        current: {
          values: [10, 20, 30, 25, 35],
          labels: ["Jan", "Feb", "Mar", "Apr", "May"],
          unit: "",
        },
        previous: {
          values: [8, 18, 25, 22, 30],
          labels: ["Jan", "Feb", "Mar", "Apr", "May"],
          unit: "",
        },
        summary: "Preview metric chart",
      };
    case "compare-bar-chart":
      return {
        metricId: "velocity",
        label: "Velocity",
        unit: "pts",
        labels: ["Atlas", "Beacon", "Comet", "Delta", "Echo"],
        primary: { label: "This sprint", values: [42, 58, 35, 28, 20] },
        secondary: { label: "Last sprint", values: [38, 52, 38, 30, 18] },
        summary: "Team velocity comparison",
      };
    case "sprint-burndown":
      return {
        labels: ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6"],
        ideal: { values: [100, 80, 60, 40, 20, 0] },
        actual: { values: [100, 90, 72, 55, 38, 20] },
        remaining: 20,
        status: "behind",
      };
    case "recent-activity":
      return {
        activities: [
          {
            id: "1",
            actor: "Beacon CD",
            title: "Deployment frequency improved",
            description: "Beacon increased deployments without raising change failure rate.",
            relativeTime: "2h ago",
            timestamp: "2h ago",
            kind: "deploy",
            severity: "info",
          },
        ],
      };
    case "dora-overview":
      return {
        deployFrequency: {
          currentValue: "4.2/d",
          currentValueRaw: 4.2,
          delta: "+12%",
          level: "elite",
          benchmarkNote: "Elite range",
          timeSeries: { values: [3.4, 3.8, 4.0, 4.2] },
        },
        leadTime: {
          currentValue: "2.1h",
          currentValueRaw: 2.1,
          delta: "-8%",
          level: "high",
          benchmarkNote: "High range",
          timeSeries: { values: [2.7, 2.5, 2.3, 2.1] },
        },
        changeFailureRate: {
          currentValue: "3.1%",
          currentValueRaw: 3.1,
          delta: "-1.2pp",
          level: "high",
          benchmarkNote: "Healthy",
          timeSeries: { values: [4.8, 4.0, 3.5, 3.1] },
        },
        mttr: {
          currentValue: "28min",
          currentValueRaw: 28,
          delta: "-5min",
          level: "elite",
          benchmarkNote: "Fast recovery",
          timeSeries: { values: [36, 32, 30, 28] },
        },
      };
    case "anomaly-detector":
      return {
        status: "healthy",
        summary: "All signals within normal range (preview)",
        signalsChecked: 5,
        lastChecked: "now",
        window: "30d",
        thresholds: [
          { name: "Deploy Frequency", value: "4.2/d", status: "ok" },
          { name: "CI Pass Rate", value: "94%", status: "ok" },
        ],
        anomalies: [],
      };
    case "heatmap":
      return {
        title: "Team Activity",
        xLabels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        yLabels: ["Atlas", "Beacon", "Comet"],
        cells: [
          [2, 5, 3, 7, 4],
          [1, 4, 6, 3, 5],
          [3, 2, 4, 5, 3],
        ],
        summary: "Sample activity",
      };
    case "health-gauge":
      return { score: 82, label: "Good", status: "ok", summary: "Preview health score" };
    case "data-table":
      return {
        rows: [
          { id: "1", title: "PR #101: Fix auth flow", author: "alice", status: "Review", time: "2h" },
        ],
      };
    case "leaderboard":
      return [
        { team: "Beacon", name: "Beacon", value: "42 pts", valueRaw: 42 },
        { team: "Delta", name: "Delta", value: "35 pts", valueRaw: 35 },
      ];
    case "ai-insight":
      return {
        title: "Preview Insight",
        body: "Sample data mode — save the dashboard to load backend data.",
        action: "Connect sources",
      };
    case "section-header":
      return {};
    default:
      return {};
  }
}
