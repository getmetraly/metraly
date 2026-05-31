// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import React, { useEffect, useState } from "react";
import { Icon, DraggableDashboardRenderer } from "../../design-system";
import { useDashboard } from "../../hooks/useDashboard";
import { updateDashboard } from "../../api/client";
import type { Dashboard } from "../../types/dashboard";
import { WizardSidebar } from "../dashboardWizard/components/WizardSidebar";
import {
  createEditorStateFromDashboard,
  toDashboardWidgetInstances,
} from "../dashboardEditor/model";
import { buildUpdateDashboardRequest } from "../dashboardEditor/payload";
import { useWizardStore } from "../dashboardWizard/store/wizardStore";

const DASHBOARDS = [
  { id: "overview", label: "Overview", icon: "home", navId: "dashboard" },
  { id: "cto", label: "CTO", icon: "trendingUp", navId: "dash-cto" },
  { id: "vp", label: "VP Eng", icon: "users", navId: "dash-vp" },
  { id: "tl", label: "Tech Lead", icon: "gitPR", navId: "dash-tl" },
  { id: "devops", label: "DevOps", icon: "cpu", navId: "dash-devops" },
  { id: "ic", label: "My View", icon: "activity", navId: "dash-ic" },
];

interface DashboardScreenProps {
  initialDashboard?: string;
  onNewDashboard?: () => void;
  onNavigate?: (navId: string) => void;
  isEditMode?: boolean;
  demoMode?: boolean;
  onConfigureSources?: () => void;
}

function makeDraftDashboard(
  dashboard: Dashboard,
  editor: ReturnType<typeof useWizardStore.getState>,
): Dashboard {
  return {
    ...dashboard,
    name: editor.name,
    description: editor.desc,
    icon: editor.icon || dashboard.icon || "",
    defaultFilters: {
      ...dashboard.defaultFilters,
      timeRange: editor.timeRange as Dashboard["defaultFilters"]["timeRange"],
      team: editor.team as Dashboard["defaultFilters"]["team"],
    },
    widgets: toDashboardWidgetInstances(editor.widgets),
    layout: editor.layout,
  };
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  initialDashboard = "overview",
  onNewDashboard,
  onNavigate,
  isEditMode: externalEditMode,
  demoMode = false,
  onConfigureSources,
}) => {
  const [dashboardId, setDashboardId] = useState(initialDashboard);
  const [internalEditMode, setInternalEditMode] = useState(false);
  const [isWizardSidebarOpen, setWizardSidebarOpen] = useState(false);
  const [isSidebarPinned, setSidebarPinned] = useState(false);
  const [saveError, setSaveError] = useState("");

  const {
    dashboard,
    widgetData,
    isLoading,
    refresh,
  } = useDashboard(dashboardId);

  const isEditMode = externalEditMode ?? internalEditMode;

  const widgets = useWizardStore((s) => s.widgets);
  const widgetSizes = useWizardStore((s) => s.widgetSizes);
  const name = useWizardStore((s) => s.name);
  const desc = useWizardStore((s) => s.desc);
  const timeRange = useWizardStore((s) => s.timeRange);
  const team = useWizardStore((s) => s.team);
  const addWidget = useWizardStore((s) => s.addWidget);
  const removeWidget = useWizardStore((s) => s.removeWidget);
  const toggleWidgetSize = useWizardStore((s) => s.toggleWidgetSize);
  const moveWidget = useWizardStore((s) => s.moveWidget);
  const updateLayout = useWizardStore((s) => s.updateLayout);
  const setName = useWizardStore((s) => s.setName);
  const setDesc = useWizardStore((s) => s.setDesc);
  const setTimeRange = useWizardStore((s) => s.setTimeRange);
  const setTeam = useWizardStore((s) => s.setTeam);
  const resetEditor = useWizardStore((s) => s.reset);

  useEffect(() => {
    setDashboardId(initialDashboard);
  }, [initialDashboard]);

  useEffect(() => {
    if (!dashboard || !isEditMode) {
      return;
    }
    useWizardStore.setState((current) => ({
      ...current,
      step: 0,
      ...createEditorStateFromDashboard(dashboard),
    }));
    setWizardSidebarOpen(true);
  }, [dashboard, isEditMode]);

  useEffect(() => {
    if (!dashboard) {
      return;
    }
    if (!isEditMode) {
      resetEditor();
    }
  }, [dashboard, isEditMode, resetEditor]);

  const selectedWidgets = widgets;

  const draftDashboard = dashboard && isEditMode
    ? makeDraftDashboard(dashboard, useWizardStore.getState())
    : dashboard;

  const handleDashboardChange = (newDashboard: string) => {
    setInternalEditMode(false);
    setWizardSidebarOpen(false);
    resetEditor();
    setDashboardId(newDashboard);
    const selected = DASHBOARDS.find((r) => r.id === newDashboard);
    if (selected && onNavigate) {
      onNavigate(selected.navId);
    }
  };

  const handleEnterEditMode = () => {
    if (!dashboard) {
      return;
    }
    setSaveError("");
    useWizardStore.setState((current) => ({
      ...current,
      step: 0,
      ...createEditorStateFromDashboard(dashboard),
    }));
    setInternalEditMode(true);
    setWizardSidebarOpen(true);
    setSidebarPinned(true);
  };

  const handleExitEditMode = () => {
    setSaveError("");
    setInternalEditMode(false);
    setWizardSidebarOpen(false);
    setSidebarPinned(false);
    resetEditor();
  };

  const handleSaveLayout = async () => {
    if (!dashboard) {
      return;
    }
    setSaveError("");
    try {
      await updateDashboard(
        dashboard.id,
        buildUpdateDashboardRequest(useWizardStore.getState(), dashboard.version),
      );
      await refresh();
      handleExitEditMode();
    } catch (error) {
      console.error("Failed to save dashboard:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to save dashboard");
    }
  };

  const handleToggleWidget = (id: string) => {
    const selected = widgets.find((widget) => widget.instanceId === id);
    if (selected) {
      removeWidget(selected.instanceId);
      return;
    }
    addWidget(id);
  };

  const renderDashboard = () => {
    if (isLoading) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <span style={{ color: "var(--muted)" }}>Loading dashboard…</span>
        </div>
      );
    }
    if (!draftDashboard) {
      return null;
    }

    if (isEditMode) {
      return (
        <DraggableDashboardRenderer
          dashboard={draftDashboard}
          widgetData={widgetData}
          isEditable={true}
          onLayoutChange={updateLayout}
          onRemoveWidget={removeWidget}
          onToggleSize={toggleWidgetSize}
          widgetSizes={widgetSizes}
        />
      );
    }

    return <DraggableDashboardRenderer dashboard={draftDashboard} widgetData={widgetData} />;
  };

  const TabBar = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "10px 24px 0",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}
    >
      {DASHBOARDS.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => handleDashboardChange(r.id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            background: "none",
            border: "none",
            cursor: "pointer",
            borderBottom:
              dashboardId === r.id ? "2px solid var(--cyan)" : "2px solid transparent",
            color: dashboardId === r.id ? "var(--cyan)" : "var(--muted2)",
            fontFamily: "var(--font-body)",
            fontSize: 13,
            fontWeight: dashboardId === r.id ? 600 : 400,
            transition: "all 0.15s",
            marginBottom: -1,
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            if (dashboardId !== r.id) e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            if (dashboardId !== r.id) e.currentTarget.style.color = "var(--muted2)";
          }}
        >
          <Icon name={r.icon} size={13} color="currentColor" />
          {r.label}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      {isEditMode ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <button
            type="button"
            onClick={handleExitEditMode}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 8,
              cursor: "pointer",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--muted)",
              fontSize: 12.5,
              fontWeight: 400,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveLayout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 16px",
              borderRadius: 8,
              cursor: "pointer",
              background: "var(--grad)",
              border: "none",
              color: "#fff",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <Icon name="check" size={13} /> Apply
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={handleEnterEditMode}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 8,
              cursor: "pointer",
              background: "color-mix(in srgb, var(--cyan) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--cyan) 20%, transparent)",
              color: "var(--cyan)",
              fontSize: 12.5,
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            <Icon name="sliders" size={13} /> Customize
          </button>
          {onNewDashboard && (
            <button
              type="button"
              onClick={onNewDashboard}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 8,
                cursor: "pointer",
                background: "color-mix(in srgb, var(--cyan) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--cyan) 20%, transparent)",
                color: "var(--cyan)",
                fontSize: 12.5,
                fontWeight: 500,
                marginBottom: 6,
                marginLeft: 8,
              }}
            >
              <Icon name="plus" size={13} /> New Dashboard
            </button>
          )}
        </>
      )}
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
      <TabBar />
      {demoMode && (
        <div
          style={{
            margin: "16px 24px 0",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid color-mix(in srgb, var(--cyan) 18%, transparent)",
            background: "color-mix(in srgb, var(--cyan) 6%, transparent)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "color-mix(in srgb, var(--cyan) 15%, transparent)",
                border: "1px solid color-mix(in srgb, var(--cyan) 25%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="sparkles" size={13} color="var(--cyan)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>
                Synthetic Sandbox Inc. demo
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted2)" }}>
                This overview is backed by synthetic data. Use it to explore the
                preview flow or move to source setup.
              </div>
            </div>
          </div>
          {onConfigureSources && (
            <button
              type="button"
              onClick={onConfigureSources}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                cursor: "pointer",
                background: "color-mix(in srgb, var(--cyan) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--cyan) 20%, transparent)",
                color: "var(--cyan)",
                fontSize: 12.5,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="settings" size={12} color="currentColor" />
              Configure sources
            </button>
          )}
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
              selectedWidgets={selectedWidgets}
              widgetSizes={widgetSizes}
              onToggleWidget={handleToggleWidget}
              onToggleSize={toggleWidgetSize}
              onMoveWidget={moveWidget}
              showDefaultFilters={false}
              showDelete={false}
              name={name}
              desc={desc}
              timeRange={timeRange}
              team={team}
              onNameChange={setName}
              onDescChange={setDesc}
              onTimeRangeChange={setTimeRange}
              onTeamChange={setTeam}
              onDelete={() => {
                handleExitEditMode();
              }}
            />
          </div>
        )}
        {saveError && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "fixed",
              right: 24,
              bottom: 24,
              zIndex: 1100,
              maxWidth: 360,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
              background: "color-mix(in srgb, var(--error) 12%, transparent)",
              color: "var(--error)",
              fontSize: 13,
            }}
          >
            {saveError}
          </div>
        )}
      </div>
    </div>
  );
};
