import { useState, useEffect, useRef } from "react";
import { getDashboardView as fetchDashboardView } from "../api/client";
import type { Dashboard } from "../types/dashboard";

interface UseDashboardResult {
  dashboard: Dashboard | null;
  widgetData: Record<string, any>;
  isLoading: boolean;
  isDashboardLoading: boolean;
  isWidgetDataLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDashboard(dashboardId: string): UseDashboardResult {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [widgetData, setWidgetData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [isWidgetDataLoading, setIsWidgetDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dashboardIdRef = useRef(dashboardId);

  useEffect(() => {
    dashboardIdRef.current = dashboardId;
  }, [dashboardId]);

  const load = async (requestId: string) => {
    try {
      setIsWidgetDataLoading(true);
      const view = await fetchDashboardView(requestId);
      if (dashboardIdRef.current !== requestId) return;

      setDashboard(view.dashboard);
      const dataMap: Record<string, any> = {};
      Object.entries(view.widgetData || {}).forEach(([instanceId, value]) => {
        dataMap[`${view.dashboard.id}-${instanceId}`] = value;
      });
      setWidgetData(dataMap);
      setIsDashboardLoading(false);
      setIsWidgetDataLoading(false);
      setError(null);
    } catch (err) {
      if (dashboardIdRef.current === requestId) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
        setIsDashboardLoading(false);
        setIsWidgetDataLoading(false);
      }
    } finally {
      if (dashboardIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const requestId = dashboardIdRef.current;
    setDashboard(null);
    setWidgetData({});
    setIsLoading(true);
    setIsDashboardLoading(true);
    setIsWidgetDataLoading(false);
    setError(null);
    load(requestId);
  }, [dashboardId]);

  const refresh = () => {
    const requestId = dashboardId;
    setDashboard(null);
    setWidgetData({});
    setIsLoading(true);
    setIsDashboardLoading(true);
    setIsWidgetDataLoading(false);
    setError(null);
    load(requestId);
  };

  return {
    dashboard,
    widgetData,
    isLoading,
    isDashboardLoading,
    isWidgetDataLoading,
    error,
    refresh,
  };
}
