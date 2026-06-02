// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

export type ResultStatus = 'ready' | 'empty' | 'stale' | 'partial' | 'error';

export interface DataQualityContract {
  level: 'full' | 'partial' | 'estimate' | 'empty';
  notes?: string[];
  coveragePercent: number;
  earliestDataAt?: string;
  latestDataAt?: string;
}

export interface LineageContract {
  metricId: string;
  formulaId: string;
  formulaVersion: number;
  sourceIds: string[];
  normalizedEventTypes: string[];
}

/**
 * Runtime envelope stored in the TanStack cache per QueryKey.
 * `result` is the widget-renderable payload (same shape the 13 renderers consume).
 */
export interface QueryResultEnvelope {
  queryKey: string;
  /** Widget-renderable payload; same shapes as existing renderers expect. */
  result: unknown;
  status: ResultStatus;
  quality?: DataQualityContract;
  lineage?: LineageContract;
  /** Dashboard version at fetch time. */
  version: number;
  /** Monotonic sequence for latest-wins guard. */
  sequence: number;
  /** ISO timestamp. */
  updatedAt: string;
}
