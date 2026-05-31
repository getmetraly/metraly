// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import React from "react";
import { Responsive, WidthProvider, LayoutItem as RGLLayout } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import type { Dashboard } from "../../types/dashboard";
import { widgetRegistry } from "./widgetRegistry";
import type { MetricTimeSeries } from "../../types/metrics";
import { Icon } from "../shared/Icon";
import { CardShell, MetralyButton } from "../../design-system";

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

export const DraggableDashboardRenderer: React.FC<DraggableDashboardRendererProps> = ({
  dashboard,
  widgetData = {},
  isEditable = false,
  onLayoutChange,
  onRemoveWidget,
  onToggleSize,
  widgetSizes = {},
}) => {
  const handleLayoutChange = (currentLayout: readonly RGLLayout[]) => {
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
        const isFull = widgetSizes[widget.instanceId] === 'full';

        if (!WidgetComponent) {
          return (
            <CardShell key={scopedInstanceId} style={{ padding: 16 }}>
              Unknown widget type: {widget.widgetType}
            </CardShell>
          );
        }

        const isEmpty = widget.widgetType === 'empty';
        return (
          <div
            key={widget.instanceId}
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              background: isEditable && isEmpty ? 'color-mix(in srgb, var(--cyan) 3%, transparent)' : 'transparent',
              border: isEditable && isEmpty ? '1px dashed var(--cyan)' : 'none',
              borderRadius: 8,
            }}
          >
            {isEditable && (
              <div style={{ position: "absolute", top: 8, right: 8, zIndex: 100, display: "flex", gap: 4, alignItems: "center" }}>
                <MetralyButton
                  type="button"
                  size="sm"
                  variant={isFull ? 'secondary' : 'ghost'}
                  aria-label={isFull ? 'Make widget flexible width' : 'Make widget full width'}
                  onClick={() => onToggleSize?.(widget.instanceId)}
                >
                  {isFull ? 'Full' : 'Flex'}
                </MetralyButton>
                <MetralyButton
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Remove widget"
                  onClick={() => onRemoveWidget?.(widget.instanceId)}
                  iconLeft={<Icon name="x" size={13} />}
                />
              </div>
            )}
            <WidgetComponent config={widget.config} data={widgetData[scopedInstanceId]} />
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
};
