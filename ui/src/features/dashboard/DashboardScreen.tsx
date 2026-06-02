// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import React, { useEffect, useState } from "react";
import { Icon, MetralyButton, CardShell, MetralyIcon, StateBlock } from "../../design-system";
import { DashboardBuilderCanvas } from "../../components/dashboard/DashboardBuilderCanvas";
import { useDashboard } from "../../hooks/useDashboard";
import { updateDashboard, deleteDashboard } from "../../api/client";
import type { Dashboard } from "../../types/dashboard";
import { WizardSidebar } from "../dashboardWizard/components/WizardSidebar";
import {
  type DashboardEditorState,
  toDashboardWidgetInstances,
} from "../dashboardEditor/model";
import { buildUpdateDashboardRequest } from "../dashboardEditor/payload";
import { useDashboardEditor } from "../dashboardEditor/useDashboardEditor";
import { useAppBootstrap } from "../../hooks/AppBootstrapContext";
import { QueryRuntimeProvider } from './runtime/QueryRuntimeProvider';


interface DashboardScreenProps {
  initialDashboard?: string;
  onNewDashboard?: () => void;
  isEditMode?: boolean;
  demoMode?: boolean;
  onConfigureSources?: () => void;
  onDeleted?: (dashboards: { id: string }[]) => void;
}

function makeDraftDashboard(
  dashboard: Dashboard,
  editorState: DashboardEditorState,
): Dashboard {
  return {
    ...dashboard,
    name: editorState.name,
    description: editorState.desc,
    icon: editorState.icon || dashboard.icon || "",
    defaultFilters: {
      ...dashboard.defaultFilters,
      timeRange: editorState.timeRange as Dashboard["defaultFilters"]["timeRange"],
      team: editorState.team as Dashboard["defaultFilters"]["team"],
    },
    widgets: toDashboardWidgetInstances(editorState.widgets),
    layout: editorState.layout,
  };
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  initialDashboard = "",
  onNewDashboard,
  isEditMode: externalEditMode,
  demoMode = false,
  onConfigureSources,
  onDeleted,
}) => {
  const [dashboardId, setDashboardId] = useState(initialDashboard);
  const [internalEditMode, setInternalEditMode] = useState(false);
  const [isWizardSidebarOpen, setWizardSidebarOpen] = useState(false);
  const [isSidebarPinned, setSidebarPinned] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    dashboard,
    widgetData,
    isDashboardLoading,
    error,
    refresh,
  } = useDashboard(dashboardId);

  const { refresh: refreshBootstrap } = useAppBootstrap();

  const isEditMode = externalEditMode ?? internalEditMode;

  const editor = useDashboardEditor();

  useEffect(() => {
    setDashboardId(initialDashboard);
  }, [initialDashboard]);

  useEffect(() => {
    if (!dashboard || !isEditMode) {
      return;
    }
    editor.initFromDashboard(dashboard);
    setWizardSidebarOpen(true);
  }, [dashboard, isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dashboard) {
      return;
    }
    if (!isEditMode) {
      editor.reset();
    }
  }, [dashboard, isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const draftDashboard = dashboard && isEditMode
    ? makeDraftDashboard(dashboard, editor.state)
    : dashboard;

  const handleEnterEditMode = () => {
    if (!dashboard) {
      return;
    }
    setSaveError("");
    editor.initFromDashboard(dashboard);
    setInternalEditMode(true);
    setWizardSidebarOpen(true);
    setSidebarPinned(true);
  };

  const handleExitEditMode = () => {
    setSaveError("");
    setInternalEditMode(false);
    setWizardSidebarOpen(false);
    setSidebarPinned(false);
    editor.reset();
  };

  const handleSaveLayout = async () => {
    if (!dashboard) {
      return;
    }
    setSaveError("");
    try {
      await updateDashboard(
        dashboard.id,
        buildUpdateDashboardRequest(editor.state, dashboard.version),
      );
      // Refresh bootstrap when name/icon changed (sidebar/title needs update)
      const nameOrIconChanged = editor.state.name !== dashboard.name || editor.state.icon !== dashboard.icon;
      if (nameOrIconChanged) { await refreshBootstrap(); }
      await refresh();
      handleExitEditMode();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save dashboard";
      // Version conflict UX (D9): show error with Reload latest action
      if (msg.includes("VERSION_CONFLICT") || msg.includes("version is stale")) {
        setSaveError("VERSION_CONFLICT");
      } else {
        setSaveError(msg);
      }
    }
  };

  const handleDelete = async () => {
    if (!dashboard || isDeleting) { return; }
    if (!window.confirm(`Delete "${dashboard.name}"? This cannot be undone.`)) { return; }
    setIsDeleting(true);
    try {
      await deleteDashboard(dashboard.id);
      const refreshed = await refreshBootstrap();
      const nextDashboards = refreshed?.dashboards ?? [];
      handleExitEditMode();
      onDeleted?.(nextDashboards);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete dashboard';
      setSaveError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleWidget = (id: string) => {
    const selected = editor.state.widgets.find((widget) => widget.instanceId === id);
    if (selected) {
      editor.removeWidget(selected.instanceId);
      return;
    }
    editor.addWidget(id);
  };

  const renderDashboard = () => {
    if (isDashboardLoading) {
      return (
        <div className="metraly-dashboard-state">
          <StateBlock
            variant="loading"
            title="Loading dashboard…"
            description="Fetching widgets and telemetry."
            density="compact"
          />
        </div>
      );
    }
    if (error) {
      return (
        <div className="metraly-dashboard-state">
          <StateBlock
            variant="error"
            title="Unable to load dashboard"
            description={error}
            action={<MetralyButton type="button" variant="secondary" size="sm" onClick={refresh}>Retry</MetralyButton>}
            density="compact"
          />
        </div>
      );
    }
    if (!draftDashboard) {
      return (
        <div className="metraly-dashboard-state">
          <StateBlock
            variant="empty"
            title="Dashboard unavailable"
            description="No dashboard definition is available for this role yet."
            density="compact"
          />
        </div>
      );
    }

    if (isEditMode) {
      return (
        <DashboardBuilderCanvas
          mode="edit"
          dashboard={draftDashboard}
          widgetData={widgetData}
          onLayoutChange={editor.updateLayout}
          onRemoveWidget={editor.removeWidget}
          onToggleSize={editor.toggleWidgetSize}
          widgetSizes={editor.state.widgetSizes}
        />
      );
    }

    return (
      <QueryRuntimeProvider
        dashboardId={draftDashboard.id}
        widgets={draftDashboard.widgets}
        defaultFilters={draftDashboard.defaultFilters}
      >
        <DashboardBuilderCanvas mode="view" dashboard={draftDashboard} widgetData={widgetData} />
      </QueryRuntimeProvider>
    );
  };


  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "0 16px 0 24px", borderBottom: "1px solid var(--m-line)", flexShrink: 0, gap: 8 }}>
        <div style={{ flex: 1 }} />
        {isEditMode ? (
          <div style={{ display: "flex", gap: 6, padding: "6px 0" }}>
            <MetralyButton variant="neutral" size="sm" onClick={handleExitEditMode}>
              Cancel
            </MetralyButton>
            <MetralyButton variant="primary" size="sm" iconLeft={<Icon name="check" size={13} color="currentColor" />} onClick={() => { void handleSaveLayout(); }}>
              Apply
            </MetralyButton>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6, padding: "6px 0" }}>
            <MetralyButton variant="secondary" size="sm" iconLeft={<Icon name="sliders" size={13} color="currentColor" />} onClick={handleEnterEditMode}>
              Customize
            </MetralyButton>
            {onNewDashboard && (
              <MetralyButton variant="secondary" size="sm" iconLeft={<Icon name="plus" size={13} color="currentColor" />} onClick={onNewDashboard}>
                New Dashboard
              </MetralyButton>
            )}
          </div>
        )}
      </div>
      {demoMode && (
        <div style={{ margin: "16px 24px 0" }}>
          <CardShell
            tone="cyan"
            density="compact"
            leading={<MetralyIcon name="sparkles" size="sm" />}
            title="Synthetic Sandbox Inc. demo"
            subtitle="This overview is backed by synthetic data. Use it to explore the preview flow or move to source setup."
            actions={
              onConfigureSources ? (
                <MetralyButton variant="ghost" size="sm" iconLeft={<MetralyIcon name="settings" size="sm" />} onClick={onConfigureSources}>
                  Configure sources
                </MetralyButton>
              ) : undefined
            }
          />
        </div>
      )}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflow: "auto", padding: isEditMode ? "12px 20px" : "20px 24px" }}>
            {renderDashboard()}
          </div>
        </div>
        {isEditMode && (
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: 400,
              zIndex: 1000,
            }}
          >
            <WizardSidebar
              isOpen={isWizardSidebarOpen}
              isPinned={isSidebarPinned}
              onClose={() => setWizardSidebarOpen(false)}
              onTogglePin={() => setSidebarPinned(!isSidebarPinned)}
              selectedWidgets={editor.state.widgets}
              widgetSizes={editor.state.widgetSizes}
              onToggleWidget={handleToggleWidget}
              onToggleSize={editor.toggleWidgetSize}
              onMoveWidget={editor.moveWidget}
              showDefaultFilters={false}
              showDelete={true}
              name={editor.state.name}
              desc={editor.state.desc}
              timeRange={editor.state.timeRange}
              team={editor.state.team}
              onNameChange={editor.setName}
              onDescChange={editor.setDesc}
              onTimeRangeChange={editor.setTimeRange}
              onTeamChange={editor.setTeam}
              onDelete={() => { void handleDelete(); }}
            />
          </div>
        )}
        {saveError && (
          <div role="status" aria-live="polite" style={{ position: "fixed", right: 24, bottom: 24, zIndex: 1100, maxWidth: 400, padding: "10px 12px", borderRadius: 8, border: "1px solid color-mix(in srgb, var(--m-err) 30%, transparent)", background: "color-mix(in srgb, var(--m-err) 12%, transparent)", color: "var(--m-err)", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: 1 }}>
              {saveError === "VERSION_CONFLICT"
                ? "This dashboard was updated elsewhere. Reload to see the latest version."
                : saveError}
            </span>
            {saveError === "VERSION_CONFLICT" && (
              <MetralyButton type="button" variant="secondary" size="sm" onClick={() => { setSaveError(""); refresh(); }}>
                Reload latest
              </MetralyButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
