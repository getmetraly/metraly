// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import React, { useState } from "react";
import { Responsive, WidthProvider, LayoutItem as RGLLayout } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import type { Dashboard } from "../../types/dashboard";
import { widgetRegistry } from "./widgetRegistry";
// widgetData is Record<string, unknown> — individual widget components use their own type assertions
import { DashboardWidget, DashboardDropZone, PulseMarker, MetralyButton } from "../../design-system";
import { Icon } from "../shared/Icon";

const ResponsiveGridLayout = WidthProvider(Responsive);

/** Label map for widget type → readable title */
const WIDGET_TITLE: Record<string, string> = {
  "stat-card": "Stat Card",
  "metric-chart": "Metric Chart",
  "data-table": "Data Table",
  "dora-overview": "DORA Overview",
  "heatmap": "Activity Heatmap",
  "sprint-burndown": "Sprint Burndown",
  "leaderboard": "Leaderboard",
  "ai-insight": "AI Insight",
  "anomaly-detector": "Anomaly Detector",
  "health-gauge": "Health Gauge",
  "compare-bar-chart": "Compare Bar Chart",
  "section-header": "Section Header",
  "recent-activity": "Recent Activity",
  "empty": "Empty Space",
};

/** Generate stub data for a widget type so preview mode renders without a backend. */
function sampleWidgetData(widgetType: string, _config?: unknown): unknown {
  switch (widgetType) {
    case "stat-card":
      return { currentValue: '4.2/d', currentValueRaw: 4.2, delta: '+12%', level: 'good', timeSeries: [30, 35, 38, 40, 42] };
    case "metric-chart":
      return {
        current: { values: [10, 20, 30, 25, 35], labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'], unit: '' },
        previous: { values: [8, 18, 25, 22, 30], labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'], unit: '' },
        summary: 'Preview metric chart',
        metricId: 'preview',
        label: 'Metric',
      };
    case "data-table":
      return {
        rows: [
          { id: '1', title: 'PR #101: Fix auth flow', author: 'alice', status: 'Review', time: '2h' },
          { id: '2', title: 'PR #102: Refactor pipeline', author: 'bob', status: 'Review', time: '4h' },
        ],
      };
    case "heatmap":
      return {
        title: 'Team Activity',
        xLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        yLabels: ['Atlas', 'Beacon', 'Comet'],
        cells: [[2, 5, 3, 7, 4], [1, 4, 6, 3, 5], [3, 2, 4, 5, 3]],
        summary: 'Sample',
      };
    case "dora-overview":
      return {
        deployFrequency: { currentValue: '4.2/d', level: 'elite' },
        leadTime: { currentValue: '2.1h', level: 'high' },
        changeFailureRate: { currentValue: '3.1%', level: 'high' },
        mttr: { currentValue: '28min', level: 'elite' },
      };
    case "leaderboard":
      return [
        { team: 'Beacon', value: '42 pts', valueRaw: 42 },
        { team: 'Delta', value: '35 pts', valueRaw: 35 },
        { team: 'Atlas', value: '32 pts', valueRaw: 32 },
      ];
    case "sprint-burndown":
      return {
        ideal: { values: [100, 80, 60, 40, 20, 0] },
        actual: { values: [100, 90, 72, 55, 38, 20] },
      };
    case "ai-insight":
      return {
        title: 'Preview Insight',
        body: 'Sample data mode — save the dashboard to load real AI insights from your connected sources.',
        action: 'Connect sources',
      };
    case "anomaly-detector":
      return {
        status: 'healthy',
        summary: 'All signals within normal range (preview)',
        signalsChecked: 5,
        lastChecked: 'now',
        window: '30d',
        thresholds: [
          { name: 'Deploy Frequency', value: '4.2/d', status: 'ok' },
          { name: 'CI Pass Rate', value: '94%', status: 'ok' },
        ],
        anomalies: [],
      };
    case "compare-bar-chart":
      return {
        labels: ['Atlas', 'Beacon', 'Comet', 'Delta', 'Echo'],
        primary: { label: 'This sprint', values: [42, 58, 35, 28, 20] },
        secondary: { label: 'Last sprint', values: [38, 52, 38, 30, 18] },
        summary: 'Team velocity comparison',
      };
    case "recent-activity":
      return {
        activities: [
          { id: '1', actor: 'Beacon CD', description: 'Deployment frequency improved', timestamp: '2h ago' },
          { id: '2', actor: 'Atlas Bot', description: 'PR review queue exceeded threshold', timestamp: '6h ago' },
          { id: '3', actor: 'Comet CI', description: 'Flaky test fixed in integration suite', timestamp: '10h ago' },
        ],
      };
    case "health-gauge":
      return { score: 82, label: 'Good', status: 'ok', summary: 'Preview health score' };
    case "section-header":
      return {};
    default:
      return {};
  }
}

export type CanvasMode = "view" | "edit" | "preview";

interface DashboardBuilderCanvasProps {
  mode: CanvasMode;
  dashboard: Dashboard;
  /** Only used in view and edit modes; ignored in preview mode. */
  widgetData?: Record<string, unknown>;
  onLayoutChange?: (layout: readonly RGLLayout[]) => void;
  onRemoveWidget?: (instanceId: string) => void;
  onToggleSize?: (instanceId: string) => void;
  widgetSizes?: Record<string, string>;
}

export const DashboardBuilderCanvas: React.FC<DashboardBuilderCanvasProps> = ({
  mode,
  dashboard,
  widgetData = {},
  onLayoutChange,
  onRemoveWidget,
  onToggleSize,
  widgetSizes = {},
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [sampleNoticeDismissed, setSampleNoticeDismissed] = useState(false);

  const isEditable = mode === "edit";
  const isPreview = mode === "preview";
  const isInteractive = isEditable || isPreview;

  const layoutWithMeta: RGLLayout[] = dashboard.layout.map((item) => ({
    ...item,
    isResizable: isInteractive,
    isDraggable: isInteractive,
  }));

  return (
    <>
      {/* Edit mode bar */}
      {isEditable && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            background: "var(--m-cyan-bg)",
            border: "1px dashed var(--m-cyan-500)",
            borderRadius: "var(--m-r-3)",
            fontFamily: "var(--m-font-mono)",
            fontSize: 11,
            color: "var(--m-cyan-500)",
            letterSpacing: "0.04em",
            marginBottom: 12,
            flexShrink: 0,
          }}
        >
          <PulseMarker tone="new" size="sm" aria-hidden="true" />
          <span style={{ textTransform: "uppercase" }}>Edit mode</span>
          <span style={{ color: "var(--m-fg-2)", textTransform: "none" }}>
            · Drag grip dots to reorder · Drag corners to resize
          </span>
        </div>
      )}

      {/* Preview mode bar */}
      {isPreview && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            background: "var(--m-amber-bg, rgba(245,158,11,0.08))",
            border: "1px dashed var(--m-amber-500, #f59e0b)",
            borderRadius: "var(--m-r-3)",
            fontFamily: "var(--m-font-mono)",
            fontSize: 11,
            color: "var(--m-amber-500, #f59e0b)",
            letterSpacing: "0.04em",
            marginBottom: sampleNoticeDismissed ? 12 : 4,
            flexShrink: 0,
          }}
        >
          <PulseMarker tone="warning" size="sm" aria-hidden="true" />
          <span style={{ textTransform: "uppercase" }}>Preview</span>
          <span style={{ color: "var(--m-fg-2)", textTransform: "none" }}>
            · Drag grip dots to reorder · Drag corners to resize
          </span>
        </div>
      )}

      {/* Sample data notice */}
      {isPreview && !sampleNoticeDismissed && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "6px 12px",
            marginBottom: 12,
            background: "var(--m-bg-2)",
            border: "1px solid var(--m-line)",
            borderRadius: "var(--m-r-2)",
            fontSize: 11,
            color: "var(--m-fg-2)",
            flexShrink: 0,
          }}
        >
          <span>Using sample data — save the dashboard to load live metrics.</span>
          <button
            type="button"
            aria-label="Dismiss sample data notice"
            onClick={() => setSampleNoticeDismissed(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 4px",
              color: "var(--m-fg-3)",
              lineHeight: 1,
            }}
          >
            <Icon name="x" size={12} />
          </button>
        </div>
      )}

      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layoutWithMeta }}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={100}
        isDraggable={isInteractive}
        isResizable={isInteractive}
        onLayoutChange={(currentLayout) => onLayoutChange?.(currentLayout)}
        onDragStart={(_layout, oldItem) => setDraggingId(oldItem.i)}
        onDragStop={() => setDraggingId(null)}
        compactType="vertical"
        margin={[16, 16]}
        draggableHandle=".metraly-widget-shell-drag-handle"
      >
        {dashboard.widgets.map((widget) => {
          const scopedInstanceId = `${dashboard.id}-${widget.instanceId}`;
          const WidgetComponent = widgetRegistry[widget.widgetType];
          const isFull = widgetSizes[widget.instanceId] === "full";
          const isEmpty = widget.widgetType === "empty";
          const widgetTitle = WIDGET_TITLE[widget.widgetType] ?? widget.widgetType;

          if (!WidgetComponent) {
            return (
              <DashboardWidget
                key={widget.instanceId}
                title="Unknown widget"
                state="error"
                stateTitle="Unknown widget type"
                stateDescription={widget.widgetType}
              />
            );
          }

          const resolvedData = isPreview
            ? sampleWidgetData(widget.widgetType, widget.config)
            : widgetData[scopedInstanceId];

          if (isEditable || isPreview) {
            return (
              <DashboardWidget
                key={widget.instanceId}
                id={widget.instanceId}
                title={widgetTitle}
                subtitle={widget.widgetType}
                fullWidth={isFull}
                dragging={draggingId === widget.instanceId}
                onDragStart={() => {}}
                onRemove={isEditable ? () => onRemoveWidget?.(widget.instanceId) : undefined}
                footer={
                  isEditable && !isEmpty ? (
                    <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 8px 6px", gap: 4 }}>
                      <MetralyButton
                        type="button"
                        size="sm"
                        variant={isFull ? "secondary" : "ghost"}
                        aria-label={isFull ? "Switch to flexible width" : "Switch to full width"}
                        onClick={() => onToggleSize?.(widget.instanceId)}
                        iconLeft={<Icon name={isFull ? "minimize2" : "maximize2"} size={12} />}
                      >
                        {isFull ? "Full" : "Flex"}
                      </MetralyButton>
                    </div>
                  ) : undefined
                }
              >
                {isEmpty ? (
                  <div
                    style={{
                      height: "100%",
                      minHeight: 60,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px dashed var(--m-line-strong)",
                      borderRadius: 6,
                      color: "var(--m-fg-2)",
                      fontSize: 12,
                      pointerEvents: "none",
                    }}
                  >
                    Layout spacer
                  </div>
                ) : (
                  <WidgetComponent
                    config={widget.config}
                    data={resolvedData}
                    renderMode={isPreview ? "preview" : "edit"}
                  />
                )}
              </DashboardWidget>
            );
          }

          // view mode
          return (
            <div key={widget.instanceId} style={{ width: "100%", height: "100%" }}>
              <WidgetComponent config={widget.config} data={resolvedData} />
            </div>
          );
        })}
      </ResponsiveGridLayout>

      {isEditable && (
        <div style={{ marginTop: 12, gridColumn: "1 / -1" }}>
          <DashboardDropZone state="idle" label="Drag a widget here" />
        </div>
      )}
    </>
  );
};
