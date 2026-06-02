// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

export type ResultKind =
  | 'timeseries'
  | 'scalar'
  | 'breakdown'
  | 'dora'
  | 'activity'
  | 'table'
  | 'heatmap'
  | 'insight'
  | 'anomaly';

export type Granularity = 'day' | 'week' | 'month';

/** Frontend canonical metric query — excludes layout and pure visual config. */
export interface MetricQuery {
  metricId: string;
  resultKind: ResultKind;
  /** Relative token: "30d" | "7d" | "90d" | "now-7d" etc. Resolved to start/end only when calling the backend. */
  timeRange: string;
  granularity?: Granularity;
  /** Forward-compat multi-value filters. MVP backend uses first value only. */
  filters?: Record<string, string[]>;
  groupBy?: string[];
  /** Data-affecting options (heatmap columns, topicHint, tableType, etc.) */
  params?: Record<string, string | number | boolean>;
}
