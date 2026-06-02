// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import type { SnapshotQueryItem } from './query-snapshot.api';
import type { DataQualityContract, LineageContract } from './metric-query-result.types';

export type ConnectionStatus = 'idle' | 'connected' | 'reconnecting' | 'polling' | 'error';
export type RuntimeStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'stale' | 'reconnecting' | 'error';

export interface QueryRuntimeState {
  queryKey: string | null;
  status: RuntimeStatus;
  result: unknown;
  quality?: DataQualityContract;
  lineage?: LineageContract;
  version?: number;
  sequence?: number;
  updatedAt?: string;
}

export interface ConnectionStoreState {
  status: ConnectionStatus;
  lastEventAt: number | null;
  retries: number;
  reconnectingQueryKeys: Set<string>;
  setStatus: (status: ConnectionStatus) => void;
  setLastEventAt: (timestamp: number) => void;
  incrementRetries: () => void;
  resetRetries: () => void;
  markQueryKeyReconnecting: (queryKey: string) => void;
  clearQueryKeyReconnecting: (queryKey: string) => void;
}

export interface QueryRuntimeContextValue {
  dashboardId: string;
  widgetQueryKeyMap: ReadonlyMap<string, string>;
  queriesByKey: ReadonlyMap<string, SnapshotQueryItem>;
}
