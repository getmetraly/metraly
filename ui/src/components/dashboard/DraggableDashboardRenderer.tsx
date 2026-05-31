// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import React, { useState } from "react";
import { Responsive, WidthProvider, LayoutItem as RGLLayout } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import type { Dashboard } from "../../types/dashboard";
import { widgetRegistry } from "./widgetRegistry";
import type { MetricTimeSeries } from "../../types/metrics";
import { DashboardWidget, DashboardDropZone, PulseMarker, MetralyButton } from "../../design-system";
import { Icon } from "../shared/Icon";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DraggableDashboardRendererProps {
  dashboard: Dashboard;
  widgetData?: Record<string, MetricTimeSeries>;
  isEditable?: boolean;
  onLayoutChange?: (layout: readonly RGLLayout[]) => void;
  onRemoveWidget?: (instanceId: string) => void;
  onToggleSize?: (instanceId: string) => void;
  widgetSizes?: Record<string, string>;
}

/** Label map for widget type → readable title in edit-mode toolbar */
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
  "gauge": "Health Gauge",
  "compare-bar": "Compare Bar",
  "section-header": "Section Header",
  "recent-activity": "Recent Activity",
  "empty": "Empty Space",
};

export const DraggableDashboardRenderer: React.FC<DraggableDashboardRendererProps> = ({
  dashboard,
  widgetData = {},
  isEditable = false,
  onLayoutChange,
  onRemoveWidget,
  onToggleSize,
  widgetSizes = {},
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleLayoutChange = (currentLayout: readonly RGLLayout[]) => {
    onLayoutChange?.(currentLayout);
  };

  const layoutWithMeta: RGLLayout[] = dashboard.layout.map((item) => ({
    ...item,
    isResizable: true,
    isDraggable: isEditable,
  }));

  return (
    <>
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

      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layoutWithMeta }}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={100}
        isDraggable={isEditable}
        isResizable={isEditable}
        onLayoutChange={handleLayoutChange}
        onDragStart={(_layout, oldItem) => setDraggingId(oldItem.i)}
        onDragStop={() => setDraggingId(null)}
        compactType="vertical"
        margin={[16, 16]}
        draggableHandle=".metraly-widget-shell-drag-handle"
      >
        {dashboard.widgets.map((widget) => {
          const scopedInstanceId = `${dashboard.id}-${widget.instanceId}`;
          const WidgetComponent = widgetRegistry[widget.widgetType];
          const isFull = widgetSizes[widget.instanceId] === 'full';
          const isEmpty = widget.widgetType === 'empty';
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

          if (isEditable) {
            return (
              <DashboardWidget
                key={widget.instanceId}
                id={widget.instanceId}
                title={widgetTitle}
                subtitle={widget.widgetType}
                fullWidth={isFull}
                dragging={draggingId === widget.instanceId}
                onDragStart={() => {}}
                onRemove={() => onRemoveWidget?.(widget.instanceId)}
                footer={
                  !isEmpty ? (
                    <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 8px 6px", gap: 4 }}>
                      <MetralyButton
                        type="button"
                        size="sm"
                        variant={isFull ? 'secondary' : 'ghost'}
                        aria-label={isFull ? 'Switch to flexible width' : 'Switch to full width'}
                        onClick={() => onToggleSize?.(widget.instanceId)}
                        iconLeft={<Icon name={isFull ? "minimize2" : "maximize2"} size={12} />}
                      >
                        {isFull ? 'Full' : 'Flex'}
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
                  <WidgetComponent config={widget.config} data={widgetData[scopedInstanceId]} />
                )}
              </DashboardWidget>
            );
          }

          return (
            <div key={widget.instanceId} style={{ width: "100%", height: "100%" }}>
              <WidgetComponent config={widget.config} data={widgetData[scopedInstanceId]} />
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
