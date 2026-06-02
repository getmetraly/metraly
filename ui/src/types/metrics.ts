export type MetricId =
  | 'deploy-freq'
  | 'lead-time'
  | 'cfr'
  | 'mttr'
  | 'ci-pass'
  | 'ci-duration'
  | 'ci-queue'
  | 'pr-cycle'
  | 'pr-review'
  | 'pr-merge'
  | 'velocity'
  | 'throughput'
  | 'health-score'
  | 'sprint-burndown';

export interface MetricTimeSeries {
  values: number[];
  /** ISO dates or short labels */
  labels: string[];
  unit: string;
}


export interface MetricDataResponse {
  metricId: MetricId;
  label: string;
  unit: string;
  current: MetricTimeSeries;
  /** Previous period data for compare mode */
  previous: MetricTimeSeries;
  /** Labels for chart axis */
  labels?: string[];
}

import type { DORALevel } from './common';


export interface DORAMetricDetail {
  id: 'deploy-freq' | 'lead-time' | 'cfr' | 'mttr';
  label: string;
  currentValue: string;
  currentValueRaw: number;
  delta: string;
  level: DORALevel;
  benchmarkNote: string;
  timeSeries: MetricTimeSeries;
}

export interface DORAResponse {
  deployFrequency: DORAMetricDetail;
  leadTime: DORAMetricDetail;
  changeFailureRate: DORAMetricDetail;
  mttr: DORAMetricDetail;
}
