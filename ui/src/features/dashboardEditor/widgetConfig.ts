import { DESCRIPTOR_BY_LIBRARY_ID } from "./widgetDescriptors";
import type { WidgetConfig } from "../../types/widgets";
import type { DashboardWidgetDefinition } from "./catalog";

export function createDefaultWidgetConfig(definition: DashboardWidgetDefinition): WidgetConfig {
  const descriptor = DESCRIPTOR_BY_LIBRARY_ID.get(definition.id);
  if (descriptor) {
    return { ...descriptor.defaultConfig };
  }
  // fallback
  return { type: 'stat-card', metricId: 'deploy-freq', showSparkline: true, colorKey: 'cyan' };
}
