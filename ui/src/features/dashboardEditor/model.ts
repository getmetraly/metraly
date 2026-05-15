import { nanoid } from "nanoid";
import type { LayoutItem as RGLLayout } from "react-grid-layout/legacy";
import type { Dashboard, DashboardWidgetInstance } from "../../types/dashboard";
import { TEMPLATE_WIDGETS, TEMPLATES, WIDGET_LIBRARY, getDefaultWidgetSize, getWidgetColor, isFullWidthWidget } from "./catalog";
import { createDefaultWidgetConfig } from "./widgetConfig";
import type { WidgetConfig } from "../../types/widgets";

export type DashboardEditorWidgetSize = "full" | "half";

export interface DashboardEditorWidget {
  id: string;
  instanceId: string;
  type: string;
  label: string;
  icon: string;
  color: string;
  cat: string;
  config: WidgetConfig;
}

export interface DashboardEditorMetadata {
  name: string;
  desc: string;
  timeRange: string;
  team: string;
  icon: string;
}

export interface DashboardEditorState extends DashboardEditorMetadata {
  selectedTemplate: string | null;
  widgets: DashboardEditorWidget[];
  layout: RGLLayout[];
  widgetSizes: Record<string, DashboardEditorWidgetSize>;
}

export function createEditorWidget(widgetId: string): DashboardEditorWidget | null {
  const definition = WIDGET_LIBRARY.find((widget) => widget.id === widgetId);
  if (!definition) {
    return null;
  }

  return {
    id: definition.id,
    instanceId: nanoid(),
    type: definition.id,
    label: definition.label,
    icon: definition.icon,
    color: getWidgetColor(definition.cat),
    cat: definition.cat,
    config: createDefaultWidgetConfig(definition),
  };
}

export function createEditorWidgetsFromTemplate(templateId: string): DashboardEditorWidget[] {
  const templateWidgets = TEMPLATE_WIDGETS[templateId] || [];
  return templateWidgets
    .map((widgetId) => createEditorWidget(widgetId))
    .filter((widget): widget is DashboardEditorWidget => widget !== null);
}

export function createEditorLayout(widgets: DashboardEditorWidget[]): RGLLayout[] {
  const layout: RGLLayout[] = [];
  widgets.forEach((widget, index) => {
    layout.push({
      i: widget.instanceId,
      x: 0,
      y: index * 2,
      w: getDefaultWidgetSize(widget.id) === "full" ? 12 : 6,
      h: 2,
    });
  });
  return layout;
}

export function createEditorWidgetSizes(layout: RGLLayout[]): Record<string, DashboardEditorWidgetSize> {
  const widgetSizes: Record<string, DashboardEditorWidgetSize> = {};
  layout.forEach((item) => {
    widgetSizes[item.i] = item.w === 12 ? "full" : "half";
  });
  return widgetSizes;
}

export function normalizeEditorLayout(
  layout: RGLLayout[],
  widgetSizes: Record<string, DashboardEditorWidgetSize>,
): RGLLayout[] {
  return layout.map((item) => {
    const size = widgetSizes[item.i] || (item.w === 12 ? "full" : "half");
    return {
      ...item,
      w: size === "full" ? 12 : 6,
    };
  });
}

export function appendEditorWidget(
  widgets: DashboardEditorWidget[],
  layout: RGLLayout[],
  widgetSizes: Record<string, DashboardEditorWidgetSize>,
  widgetId: string,
): {
  widgets: DashboardEditorWidget[];
  layout: RGLLayout[];
  widgetSizes: Record<string, DashboardEditorWidgetSize>;
} {
  const widget = createEditorWidget(widgetId);
  if (!widget) {
    return { widgets, layout, widgetSizes };
  }

  const nextWidgets = [...widgets, widget];
  const nextLayout = [
    ...layout,
    {
      i: widget.instanceId,
      x: 0,
      y: layout.reduce((max, item) => Math.max(max, item.y + item.h), 0),
      w: isFullWidthWidget(widget.id) ? 12 : 6,
      h: 2,
    },
  ];
  const nextSizes = {
    ...widgetSizes,
    [widget.instanceId]: getDefaultWidgetSize(widget.id),
  };

  return {
    widgets: nextWidgets,
    layout: nextLayout,
    widgetSizes: nextSizes,
  };
}

export function removeEditorWidget(
  widgets: DashboardEditorWidget[],
  layout: RGLLayout[],
  widgetSizes: Record<string, DashboardEditorWidgetSize>,
  instanceId: string,
): {
  widgets: DashboardEditorWidget[];
  layout: RGLLayout[];
  widgetSizes: Record<string, DashboardEditorWidgetSize>;
} {
  const nextWidgets = widgets.filter((widget) => widget.instanceId !== instanceId);
  const nextLayout = layout.filter((item) => item.i !== instanceId);
  const nextSizes = { ...widgetSizes };
  delete nextSizes[instanceId];

  return {
    widgets: nextWidgets,
    layout: nextLayout,
    widgetSizes: nextSizes,
  };
}

export function toggleEditorWidgetSize(
  layout: RGLLayout[],
  widgetSizes: Record<string, DashboardEditorWidgetSize>,
  instanceId: string,
): {
  layout: RGLLayout[];
  widgetSizes: Record<string, DashboardEditorWidgetSize>;
} {
  const currentSize = widgetSizes[instanceId] || "half";
  const nextSize: DashboardEditorWidgetSize = currentSize === "full" ? "half" : "full";
  const nextSizes = {
    ...widgetSizes,
    [instanceId]: nextSize,
  };

  return {
    layout: normalizeEditorLayout(layout, nextSizes),
    widgetSizes: nextSizes,
  };
}

export function moveEditorWidget(
  widgets: DashboardEditorWidget[],
  fromIndex: number,
  toIndex: number,
): DashboardEditorWidget[] {
  if (
    fromIndex < 0 ||
    fromIndex >= widgets.length ||
    toIndex < 0 ||
    toIndex >= widgets.length
  ) {
    return widgets;
  }
  const nextWidgets = [...widgets];
  const [moved] = nextWidgets.splice(fromIndex, 1);
  nextWidgets.splice(toIndex, 0, moved);
  return nextWidgets;
}

export function createEditorStateFromTemplate(templateId: string): DashboardEditorState {
  const widgets = createEditorWidgetsFromTemplate(templateId);
  const layout = createEditorLayout(widgets);
  return {
    selectedTemplate: templateId,
    widgets,
    layout,
    widgetSizes: createEditorWidgetSizes(layout),
    name: templateId === "blank" ? "My Dashboard" : `${TEMPLATES.find((template) => template.id === templateId)?.label || ""} Dashboard`,
    desc: "",
    timeRange: "30d",
    team: "All teams",
    icon: TEMPLATES.find((template) => template.id === templateId)?.icon || "plus",
  };
}

export function createEditorStateFromDashboard(dashboard: Dashboard): DashboardEditorState {
  const widgets = dashboard.widgets.map((widget) => {
    const definition = WIDGET_LIBRARY.find((item) => item.id === widget.widgetType);
    return {
      id: widget.widgetType,
      instanceId: widget.instanceId,
      type: widget.widgetType,
      label: definition?.label || widget.widgetType,
      icon: definition?.icon || "box",
      color: getWidgetColor(definition?.cat || ""),
      cat: definition?.cat || "Team",
      config: widget.config,
    };
  });
  const layout = dashboard.layout.map((item) => ({ ...item }));
  return {
    selectedTemplate: dashboard.sourceTemplateId || null,
    widgets,
    layout,
    widgetSizes: createEditorWidgetSizes(layout),
    name: dashboard.name || "",
    desc: dashboard.description || "",
    timeRange: dashboard.defaultFilters?.timeRange || "30d",
    team: dashboard.defaultFilters?.team || "All teams",
    icon: dashboard.icon || "plus",
  };
}

export function toDashboardWidgetInstances(widgets: DashboardEditorWidget[]): DashboardWidgetInstance[] {
  return widgets.map((widget) => ({
    instanceId: widget.instanceId,
    widgetType: widget.type as DashboardWidgetInstance["widgetType"],
    config: widget.config,
  }));
}
