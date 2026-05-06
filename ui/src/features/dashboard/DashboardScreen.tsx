// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors
import React, { useState, useEffect, useCallback } from "react";
import { Layout as RGLLayout } from "react-grid-layout";
import { Icon } from "../../components/shared/Icon";
import { DashboardRenderer } from "../../components/dashboard/DashboardRenderer";
import { DraggableDashboardRenderer } from "../../components/dashboard/DraggableDashboardRenderer";
import { useDashboard } from "../../hooks/useDashboard";
import { mockApi } from "../../api/mockApi";
import type { WidgetLayout } from "../../types/dashboard";
import { WizardSidebar } from "../dashboardWizard/components/WizardSidebar";
import { WIDGET_LIBRARY } from "../dashboardWizard/store/wizardStore";
import type { WizardWidget } from "../dashboardWizard/store/wizardStore";

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
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  initialDashboard = "overview",
  onNewDashboard,
  onNavigate,
  isEditMode: externalEditMode,
}) => {
  const [dashboardId, setDashboardId] = useState(initialDashboard);
  const [localLayout, setLocalLayout] = useState<RGLLayout[]>([]);
  const [widgetSizes, setWidgetSizes] = useState<Record<string, string>>({});
  const [localWidgetMap, setLocalWidgetMap] = useState<Record<string, string>>({});
  const [internalEditMode, setInternalEditMode] = useState(false);
  const [isWizardSidebarOpen, setWizardSidebarOpen] = useState(false);
  const [isSidebarPinned, setSidebarPinned] = useState(false);
  const [localName, setLocalName] = useState('');
  const [localDesc, setLocalDesc] = useState('');
  const [localTimeRange, setLocalTimeRange] = useState('7d');
  const [localTeam, setLocalTeam] = useState('All teams');
  const { dashboard, widgetData, isLoading } = useDashboard(dashboardId);

  const isEditMode = externalEditMode ?? internalEditMode;

    const getWizardWidgets = useCallback((): WizardWidget[] => {
      const widgets: WizardWidget[] = [];
      for (const [instanceId, widgetType] of Object.entries(localWidgetMap)) {
        const libraryItem = WIDGET_LIBRARY.find(l => l.id === widgetType);
        widgets.push({
          id: widgetType,
          instanceId,
          type: widgetType,
          label: libraryItem?.label || widgetType,
          icon: libraryItem?.icon || 'box',
          color: libraryItem ? ({ DORA: '#00E5FF', 'CI/CD': '#00C853', PR: '#B44CFF', Sprint: '#FF9100', Team: '#00EFFF', AI: '#B44CFF' }[libraryItem.cat] || '#00EFFF') : '#00EFFF',
          cat: libraryItem?.cat || 'Team',
        });
      }
      return widgets;
    }, [localWidgetMap]);

  useEffect(() => {
    setDashboardId(initialDashboard);
  }, [initialDashboard]);

  useEffect(() => {
    if (dashboard?.layout) {
      setLocalLayout(dashboard.layout as RGLLayout[]);
    }
  }, [dashboard?.layout, dashboardId]);

  useEffect(() => {
    if (dashboard?.widgets) {
      const sizes: Record<string, string> = {};
      const widgetMap: Record<string, string> = {};
      dashboard.widgets.forEach((w) => {
        const layoutItem = dashboard.layout.find((l) => l.i === w.instanceId);
        sizes[w.instanceId] = (layoutItem?.w === 12) ? 'full' : 'half';
        widgetMap[w.instanceId] = w.widgetType;
      });
      setWidgetSizes(sizes);
      setLocalWidgetMap(widgetMap);
    }
  }, [dashboard?.widgets, dashboard?.layout, dashboardId]);

  useEffect(() => {
    if (dashboard) {
      setLocalName(dashboard.name || '');
      setLocalDesc(dashboard.description || '');
      setLocalTimeRange(dashboard.defaultFilters?.timeRange || '7d');
      setLocalTeam(dashboard.defaultFilters?.team || 'All teams');
    }
  }, [dashboard]);

  const handleDashboardChange = (newDashboard: string) => {
    setDashboardId(newDashboard);
    const selected = DASHBOARDS.find((r) => r.id === newDashboard);
    if (selected && onNavigate) {
      onNavigate(selected.navId);
    }
  };

  const handleLayoutChange = useCallback((newLayout: RGLLayout[]) => {
    setLocalLayout(newLayout);
  }, []);

    const handleRemoveWidget = useCallback((instanceId: string) => {
      setLocalLayout((prev) => prev.filter((l) => l.i !== instanceId));
      setWidgetSizes((prev) => {
        const next = { ...prev };
        delete next[instanceId];
        return next;
      });
      setLocalWidgetMap((prev) => {
        const next = { ...prev };
        delete next[instanceId];
        return next;
      });
    }, []);

    const handleAddWidget = useCallback((widgetId: string) => {
      const widget = WIDGET_LIBRARY.find((w: any) => w.id === widgetId);
      if (!widget) return;
      
      const newInstanceId = `widget-${Date.now()}`;
      const newLayoutItem = { 
        i: newInstanceId, 
        x: 0, 
        y: Infinity, 
        w: widget.defaultSize?.w || 6, 
        h: widget.defaultSize?.h || 4, 
        minW: 3, 
        minH: 2 
      };
      
      setLocalLayout((prev: any) => [...prev, newLayoutItem]);
      setWidgetSizes((prev: any) => ({ ...prev, [newInstanceId]: 'half' }));
      // Add new mapping of instanceId -> widget type
      setLocalWidgetMap((prev) => ({ ...prev, [newInstanceId]: widgetId }));
    }, []);

  const handleToggleSize = useCallback((instanceId: string) => {
    const currentSize = widgetSizes[instanceId] || 'half';
    const newSize = currentSize === 'full' ? 'half' : 'full';

    setWidgetSizes((prev) => ({ ...prev, [instanceId]: newSize }));

    setLocalLayout((layout) =>
      layout.map((l) =>
        l.i === instanceId
          ? { ...l, w: newSize === 'full' ? 12 : 6 }
          : l
      )
    );
  }, [widgetSizes]);

    const handleSaveLayout = useCallback(async () => {
      if (!dashboard) return;
      const newLayout: WidgetLayout[] = localLayout.map((item) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      }));
      const remainingIds = new Set(localLayout.map((l) => l.i));
      // Build widgets from localWidgetMap, preserving order defined by layout
      const newWidgets = localLayout
        .filter((l) => localWidgetMap[l.i])
        .map((l) => ({
          instanceId: l.i,
          widgetType: localWidgetMap[l.i],
        } as any));
      try {
        await mockApi.updateDashboard(dashboard.id, {
          layout: newLayout,
          widgets: newWidgets,
          version: dashboard.version,
        });
        console.log("Layout saved:", newLayout, "widgets:", newWidgets.length);
      } catch (err) {
        console.error("Failed to save layout:", err);
      }
      setInternalEditMode(false);
    }, [localLayout, localWidgetMap, dashboard]);

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
          <span style={{ color: "var(--muted)" }}>Loading dashboard...</span>
        </div>
      );
    }
    if (!dashboard) return null;

    if (isEditMode) {
      return (
        <DraggableDashboardRenderer
          dashboard={{
            ...dashboard,
            layout: localLayout as any,
          }}
          widgetData={widgetData}
          isEditable={true}
          onLayoutChange={handleLayoutChange}
          onRemoveWidget={handleRemoveWidget}
          onToggleSize={handleToggleSize}
          widgetSizes={widgetSizes}
        />
      );
    }

    return <DashboardRenderer dashboard={dashboard} widgetData={widgetData} />;
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
            onClick={() => setInternalEditMode(false)}
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
            onClick={() => {
              setWizardSidebarOpen(true);
              setSidebarPinned(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 8,
              cursor: "pointer",
              background: "rgba(0,229,255,0.08)",
              border: "1px solid rgba(0,229,255,0.2)",
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
              onClick={onNewDashboard}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 8,
                cursor: "pointer",
                background: "rgba(0,229,255,0.08)",
                border: "1px solid rgba(0,229,255,0.2)",
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
        {isEditMode ? (
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: 400,
            zIndex: 1000,
          }}>
            <WizardSidebar
              isOpen={isWizardSidebarOpen}
              isPinned={isSidebarPinned}
              onClose={() => setWizardSidebarOpen(false)}
              onTogglePin={() => setSidebarPinned(!isSidebarPinned)}
              selectedWidgets={getWizardWidgets()}
              widgetSizes={widgetSizes}
              onToggleWidget={(id: string) => {
                // If `id` matches a known instance id, it's a removal request; otherwise it's a widget type to add.
                const isInstance = !!localWidgetMap[id];
                if (isInstance) {
                  // Remove existing widget instance
                  handleRemoveWidget(id);
                  setLocalWidgetMap(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                  });
                } else {
                  // Add a new widget of type `id`
                  handleAddWidget(id);
                  // handleAddWidget will add to localWidgetMap; no need to set here.
                }
              }}
              onToggleSize={handleToggleSize}
              onMoveWidget={(from: number, to: number) => {
                // Reorder logic if needed
              }}
              name={localName}
              desc={localDesc}
              timeRange={localTimeRange}
              team={localTeam}
              onNameChange={setLocalName}
              onDescChange={setLocalDesc}
              onTimeRangeChange={setLocalTimeRange}
              onTeamChange={setLocalTeam}
              onDelete={async () => {
                if (dashboard && confirm('Are you sure you want to delete this dashboard?')) {
                  handleDashboardChange('overview');
                }
              }}
            />
          </div>
        ) : (
          <WizardSidebar
            isOpen={isWizardSidebarOpen}
            isPinned={isSidebarPinned}
            onClose={() => setWizardSidebarOpen(false)}
            onTogglePin={() => setSidebarPinned(!isSidebarPinned)}
            selectedWidgets={getWizardWidgets()}
            widgetSizes={widgetSizes}
            onToggleWidget={(id: string) => {
              // If `id` matches a known instance id, it's a removal request; otherwise it's a widget type to add.
              const isInstance = !!localWidgetMap[id];
              if (isInstance) {
                // Remove existing widget instance
                handleRemoveWidget(id);
                setLocalWidgetMap(prev => {
                  const next = { ...prev };
                  delete next[id];
                  return next;
                });
              } else {
                // Add a new widget of type `id`
                handleAddWidget(id);
                // handleAddWidget will add to localWidgetMap; no need to set here.
              }
            }}
            onToggleSize={handleToggleSize}
            onMoveWidget={(from: number, to: number) => {
              // Reorder logic if needed
            }}
            name={localName}
            desc={localDesc}
            timeRange={localTimeRange}
            team={localTeam}
            onNameChange={setLocalName}
            onDescChange={setLocalDesc}
            onTimeRangeChange={setLocalTimeRange}
            onTeamChange={setLocalTeam}
            onDelete={async () => {
              if (dashboard && confirm('Are you sure you want to delete this dashboard?')) {
                handleDashboardChange('overview');
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
