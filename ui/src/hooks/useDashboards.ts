import { useState, useEffect, useRef } from 'react';
import { getDashboardList } from '../api/client';
import type { DashboardIndexEntry } from '../types/dashboard';

const CACHE_KEY = 'metraly.dashboards.v1';
const SCHEMA_VERSION = 1;

interface DashboardsCache {
  dashboards: DashboardIndexEntry[];
  fetchedAt: string;
  schemaVersion: number;
}

function readCache(): DashboardIndexEntry[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as DashboardsCache;
    if (cache.schemaVersion !== SCHEMA_VERSION) return null;
    return cache.dashboards;
  } catch {
    return null;
  }
}

function writeCache(dashboards: DashboardIndexEntry[]) {
  try {
    const cache: DashboardsCache = { dashboards, fetchedAt: new Date().toISOString(), schemaVersion: SCHEMA_VERSION };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage unavailable — ignore
  }
}

export function getInitialDashboardId(): string | null {
  const cached = readCache();
  return cached?.[0]?.id ?? null;
}

export interface UseDashboardsResult {
  dashboards: DashboardIndexEntry[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  source: 'cache' | 'network' | 'none';
  refresh: () => void;
}

export function useDashboards(): UseDashboardsResult {
  const cached = readCache();
  const [dashboards, setDashboards] = useState<DashboardIndexEntry[]>(cached ?? []);
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
      const list = await getDashboardList();
      writeCache(list);
      setDashboards(list);
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
    const hasCachedData = cached !== null && cached.length > 0;
    fetchFromNetwork(!hasCachedData ? false : true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = () => {
    refreshCountRef.current++;
    fetchFromNetwork(false);
  };

  return { dashboards, isLoading, isRefreshing, error, source, refresh };
}
