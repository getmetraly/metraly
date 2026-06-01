import { useState, useEffect, useRef } from "react";
import { getDashboard as fetchDashboard, getDashboardData as fetchDashboardData } from "../api/client";
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

  useEffect(() => {
    const requestId = dashboardIdRef.current;

    setDashboard(null);
    setWidgetData({});
    setIsLoading(true);
    setIsDashboardLoading(true);
    setIsWidgetDataLoading(false);
    setError(null);

    async function fetchData() {
      try {
        const dash = await fetchDashboard(requestId);
        if (dashboardIdRef.current !== requestId) return;
        setDashboard(dash);
        setIsDashboardLoading(false);
        setIsWidgetDataLoading(true);

        const dataResponse = await fetchDashboardData(requestId);
        if (dashboardIdRef.current !== requestId) return;

        const dataMap: Record<string, any> = {};
        dataResponse.widgets.forEach((item) => {
          dataMap[`${dash.id}-${item.instanceId}`] = item.data;
        });
        setWidgetData(dataMap);
        setIsWidgetDataLoading(false);
      } catch (err) {
        if (dashboardIdRef.current === requestId) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (dashboardIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    }

    fetchData();
  }, [dashboardId]);

  const refresh = () => {
    setDashboard(null);
    setWidgetData({});
    setIsLoading(true);
    setIsDashboardLoading(true);
    setIsWidgetDataLoading(false);
    setError(null);

    const requestId = dashboardId;
    async function fetchRefresh() {
      try {
        const dash = await fetchDashboard(requestId);
        if (dashboardIdRef.current !== requestId) return;
        setDashboard(dash);
        setIsDashboardLoading(false);
        setIsWidgetDataLoading(true);

        const dataResponse = await fetchDashboardData(requestId);
        if (dashboardIdRef.current !== requestId) return;

        const dataMap: Record<string, any> = {};
        dataResponse.widgets.forEach((item) => {
          dataMap[`${dash.id}-${item.instanceId}`] = item.data;
        });
        setWidgetData(dataMap);
        setIsWidgetDataLoading(false);
      } catch (err) {
        if (dashboardIdRef.current === requestId) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (dashboardIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    }

    fetchRefresh();
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
