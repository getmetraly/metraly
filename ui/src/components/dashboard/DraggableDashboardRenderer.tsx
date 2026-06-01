// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import React from "react";
import type { LayoutItem as RGLLayout } from "react-grid-layout/legacy";
import type { Dashboard } from "../../types/dashboard";
import { DashboardBuilderCanvas } from "./DashboardBuilderCanvas";

interface DraggableDashboardRendererProps {
  dashboard: Dashboard;
  widgetData?: Record<string, unknown>;
  isEditable?: boolean;
  onLayoutChange?: (layout: readonly RGLLayout[]) => void;
  onRemoveWidget?: (instanceId: string) => void;
  onToggleSize?: (instanceId: string) => void;
  widgetSizes?: Record<string, string>;
}

/**
 * Deprecated: use DashboardBuilderCanvas directly.
 * This wrapper is kept only for compatibility and contains no independent render logic.
 */
export const DraggableDashboardRenderer: React.FC<DraggableDashboardRendererProps> = ({
  dashboard,
  widgetData = {},
  isEditable = false,
  onLayoutChange,
  onRemoveWidget,
  onToggleSize,
  widgetSizes = {},
}) => {
  return (
    <DashboardBuilderCanvas
      mode={isEditable ? "edit" : "view"}
      dashboard={dashboard}
      widgetData={widgetData}
      onLayoutChange={onLayoutChange}
      onRemoveWidget={onRemoveWidget}
      onToggleSize={onToggleSize}
      widgetSizes={widgetSizes}
    />
  );
};
