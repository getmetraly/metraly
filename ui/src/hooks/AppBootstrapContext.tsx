// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics
// Copyright (C) 2026 Metraly Contributors
//
// AppBootstrapContext — single shared bootstrap/dashboards store consumed by App, Sidebar, and Wizard.
// Replaces the 3 independent useDashboards() instances that diverged on mutations (P0-3 fix).

/* eslint-disable react-refresh/only-export-components -- context file exports hook + provider + util, all intentional */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getAppBootstrap, type AppBootstrap } from '../api/client';
import type { DashboardIndexEntry } from '../types/dashboard';

const CACHE_KEY = 'metraly.dashboards.v1';
const SCHEMA_VERSION = 4; // bumped from 3 to force invalidation after taxonomy fix

interface DashboardsCache {
  bootstrap: AppBootstrap;
  fetchedAt: string;
  schemaVersion: number;
}

function readCache(): AppBootstrap | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: DashboardsCache = JSON.parse(raw);
    if (parsed.schemaVersion !== SCHEMA_VERSION) return null;
    return parsed.bootstrap;
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

export interface AppBootstrapContextValue {
  dashboards: DashboardIndexEntry[];
  selectedDashboardId: string | null;
  iconOptions: AppBootstrap['iconOptions'];
  sourceSummary: AppBootstrap['sourceSummary'] | null;
  features: AppBootstrap['features'] | null;
  isLoading: boolean;
  error: string | null;
  /** Call after create/update/delete to re-fetch bootstrap and update all consumers. */
  refresh: () => void;
}

const AppBootstrapContext = createContext<AppBootstrapContextValue>({
  dashboards: [],
  selectedDashboardId: null,
  iconOptions: [],
  sourceSummary: null,
  features: null,
  isLoading: true,
  error: null,
  refresh: () => {},
});

export function AppBootstrapProvider({ children }: { children: React.ReactNode }) {
  const cached = readCache();
  const [bootstrap, setBootstrap] = useState<AppBootstrap | null>(cached);
  const [isLoading, setIsLoading] = useState(cached === null);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchFromNetwork = useCallback(async (silent = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (!silent) setIsLoading(true);
    try {
      const data = await getAppBootstrap();
      writeCache(data);
      setBootstrap(data);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load bootstrap';
      setError(msg);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void fetchFromNetwork(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    void fetchFromNetwork(true);
  }, [fetchFromNetwork]);

  const value: AppBootstrapContextValue = {
    dashboards: bootstrap?.dashboards ?? [],
    selectedDashboardId: bootstrap?.selectedDashboardId ?? null,
    iconOptions: bootstrap?.iconOptions ?? [],
    sourceSummary: bootstrap?.sourceSummary ?? null,
    features: bootstrap?.features ?? null,
    isLoading,
    error,
    refresh,
  };

  return (
    <AppBootstrapContext.Provider value={value}>
      {children}
    </AppBootstrapContext.Provider>
  );
}

export function useAppBootstrap(): AppBootstrapContextValue {
  return useContext(AppBootstrapContext);
}

/**
 * Returns the dashboard ID to open on first load / after a mutation.
 * Reads from the shared context if provided, falls back to localStorage cache.
 */
export function getInitialDashboardIdFromCache(): string | null {
  const cached = readCache();
  return cached?.selectedDashboardId ?? cached?.dashboards?.[0]?.id ?? null;
}
