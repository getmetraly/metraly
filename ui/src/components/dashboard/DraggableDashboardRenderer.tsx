// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import React from "react";
import { Responsive, Layout as RGLLayout } from "react-grid-layout";
import { WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import type { Dashboard } from "../../types/dashboard";
import { widgetRegistry } from "./widgetRegistry";
import type { WidgetConfig } from "../../types/widgets";
import type { MetricTimeSeries } from "../../types/metrics";
import { Icon } from "../shared/Icon";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DraggableDashboardRendererProps {
  dashboard: Dashboard;
  widgetData?: Record<string, MetricTimeSeries>;
  isEditable?: boolean;
  onLayoutChange?: (layout: RGLLayout[]) => void;
  onRemoveWidget?: (instanceId: string) => void;
  onToggleSize?: (instanceId: string) => void;
  widgetSizes?: Record<string, string>;
}

export const DraggableDashboardRenderer: React.FC<DraggableDashboardRendererProps> = ({
  dashboard,
  widgetData = {},
  isEditable = false,
  onLayoutChange,
  onRemoveWidget,
  onToggleSize,
  widgetSizes = {},
}) => {
  const handleLayoutChange = (currentLayout: RGLLayout[]) => {
    if (onLayoutChange) {
      onLayoutChange(currentLayout);
    }
  };

  const layoutWithMeta: RGLLayout[] = dashboard.layout.map((item) => ({
    ...item,
    isResizable: true,
    isDraggable: isEditable,
  }));

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={{ lg: layoutWithMeta }}
      breakpoints={{ lg: 1200, md: 996, sm: 768 }}
      cols={{ lg: 12, md: 10, sm: 6 }}
      rowHeight={100}
      isDraggable={isEditable}
      isResizable={isEditable}
      onLayoutChange={handleLayoutChange}
      compactType="vertical"
      margin={[16, 16]}
    >
      {dashboard.widgets.map((widget) => {
        const scopedInstanceId = `${dashboard.id}-${widget.instanceId}`;
        const WidgetComponent = widgetRegistry[widget.widgetType];
        const layoutItem = dashboard.layout.find((l) => l.i === widget.instanceId);
        const w = layoutItem?.w || 6;
        const h = Math.max(layoutItem?.h || 2, 2);
        const isFull = widgetSizes[widget.instanceId] === 'full';

        if (!WidgetComponent) {
          return (
            <div key={scopedInstanceId} style={{ background: "var(--glass)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
              Unknown widget type: {widget.widgetType}
            </div>
          );
        }

        const isEmpty = widget.widgetType === 'empty';
        return (
          <div
            key={scopedInstanceId}
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              background: isEditable && isEmpty ? 'rgba(0,229,255,0.03)' : 'transparent',
              border: isEditable && isEmpty ? '1px dashed var(--cyan)' : 'none',
              borderRadius: 8,
            }}
          >
            {isEditable && (
              <div style={{ position: "absolute", top: 8, right: 8, zIndex: 100, display: "flex", gap: 4, alignItems: "center" }}>
                <button
                  onClick={() => onToggleSize?.(widget.instanceId)}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 5,
                    fontSize: 11,
                    cursor: "pointer",
                    border: isFull ? "1px solid rgba(0,229,255,0.3)" : "1px solid var(--border)",
                    background: isFull ? "rgba(0,229,255,0.08)" : "transparent",
                    color: isFull ? "var(--cyan)" : "var(--muted)",
                  }}
                >
                  {isFull ? "Full" : "Flex"}
                </button>
                <button
                  onClick={() => onRemoveWidget?.(widget.instanceId)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted)",
                    padding: 2,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Icon name="x" size={13} />
                </button>
              </div>
            )}
            <WidgetComponent config={widget.config} data={widgetData[scopedInstanceId]} />
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
};