import { useState, useEffect, useRef } from 'react';
import { getAppBootstrap, type AppBootstrap } from '../api/client';
import type { DashboardIndexEntry } from '../types/dashboard';

const CACHE_KEY = 'metraly.dashboards.v1';
const SCHEMA_VERSION = 3;

interface DashboardsCache {
  bootstrap: AppBootstrap;
  fetchedAt: string;
  schemaVersion: number;
}

function readCache(): AppBootstrap | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as DashboardsCache;
    if (cache.schemaVersion !== SCHEMA_VERSION) return null;
    return cache.bootstrap;
  } catch {
    return null;
  }
}

function writeCache(bootstrap: AppBootstrap) {
  try {
    const cache: DashboardsCache = {
      bootstrap,
      fetchedAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage unavailable — ignore
  }
}

export function getInitialDashboardId(): string | null {
  const cached = readCache();
  return cached?.selectedDashboardId ?? cached?.dashboards?.[0]?.id ?? null;
}

export interface UseDashboardsResult {
  dashboards: DashboardIndexEntry[];
  selectedDashboardId: string | null;
  iconOptions: { id: string; label: string; icon: string }[];
  sourceSummary: AppBootstrap['sourceSummary'] | null;
  features: AppBootstrap['features'] | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  source: 'cache' | 'network' | 'none';
  refresh: () => void;
}

export function useDashboards(): UseDashboardsResult {
  const cached = readCache();
  const [bootstrap, setBootstrap] = useState<AppBootstrap | null>(cached);
  const [isLoading, setIsLoading] = useState(cached === null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'cache' | 'network' | 'none'>(cached ? 'cache' : 'none');
  const refreshCountRef = useRef(0);

  const fetchFromNetwork = async (isBackground: boolean) => {
    if (isBackground) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
      setError(null);
    }
    try {
      const next = await getAppBootstrap();
      writeCache(next);
      setBootstrap(next);
      setSource('network');
      setError(null);
    } catch (err) {
      if (!isBackground) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboards');
        setSource('none');
      }
    } finally {
      if (isBackground) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const hasCachedData = cached !== null && (cached.dashboards?.length ?? 0) > 0;
    fetchFromNetwork(hasCachedData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = () => {
    refreshCountRef.current++;
    fetchFromNetwork(false);
  };

  return {
    dashboards: bootstrap?.dashboards ?? [],
    selectedDashboardId: bootstrap?.selectedDashboardId ?? null,
    iconOptions: bootstrap?.iconOptions ?? [],
    sourceSummary: bootstrap?.sourceSummary ?? null,
    features: bootstrap?.features ?? null,
    isLoading,
    isRefreshing,
    error,
    source,
    refresh,
  };
}
