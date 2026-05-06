import type { CreateDashboardRequest, UpdateDashboardRequest } from "../../types/api";
import type { DashboardEditorState } from "./model";
import { toDashboardWidgetInstances } from "./model";

function maybeText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildCreateDashboardRequest(state: DashboardEditorState): CreateDashboardRequest {
  return {
    name: state.name.trim(),
    description: maybeText(state.desc),
    icon: state.icon || "",
    sourceType: state.selectedTemplate && state.selectedTemplate !== "blank" ? "forked" : "user-created",
    sourceTemplateId: state.selectedTemplate && state.selectedTemplate !== "blank" ? (state.selectedTemplate as CreateDashboardRequest["sourceTemplateId"]) : undefined,
    visibility: "private",
    defaultFilters: {
      timeRange: state.timeRange as CreateDashboardRequest["defaultFilters"]["timeRange"],
      team: state.team as CreateDashboardRequest["defaultFilters"]["team"],
      repo: "All repos",
    },
    widgets: toDashboardWidgetInstances(state.widgets),
    layout: state.layout,
  };
}

export function buildUpdateDashboardRequest(
  state: DashboardEditorState,
  version: number,
): UpdateDashboardRequest {
  return {
    name: state.name.trim(),
    description: maybeText(state.desc),
    icon: state.icon || "",
    visibility: "private",
    defaultFilters: {
      timeRange: state.timeRange as UpdateDashboardRequest["defaultFilters"]["timeRange"],
      team: state.team as UpdateDashboardRequest["defaultFilters"]["team"],
      repo: "All repos",
    },
    widgets: toDashboardWidgetInstances(state.widgets),
    layout: state.layout,
    version,
  };
}
