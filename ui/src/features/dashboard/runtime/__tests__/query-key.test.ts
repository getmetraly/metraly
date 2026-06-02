// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import { describe, it, expect } from 'vitest';
import { buildQueryKey } from '../query-key';
import type { MetricQuery } from '../metric-query.types';

describe('buildQueryKey', () => {
  it('is deterministic for same query', () => {
    const q: MetricQuery = { metricId: 'pr-cycle', resultKind: 'timeseries', timeRange: '7d' };
    expect(buildQueryKey(q)).toBe(buildQueryKey(q));
  });

  it('same query produces same key regardless of filter key order', () => {
    const q1: MetricQuery = {
      metricId: 'pr-cycle', resultKind: 'timeseries', timeRange: '7d',
      filters: { team: ['eng'], repo: ['api'] },
    };
    const q2: MetricQuery = {
      metricId: 'pr-cycle', resultKind: 'timeseries', timeRange: '7d',
      filters: { repo: ['api'], team: ['eng'] },
    };
    expect(buildQueryKey(q1)).toBe(buildQueryKey(q2));
  });

  it('same query produces same key regardless of groupBy order', () => {
    const q1: MetricQuery = { metricId: 'pr-cycle', resultKind: 'breakdown', timeRange: '30d', groupBy: ['team', 'repo'] };
    const q2: MetricQuery = { metricId: 'pr-cycle', resultKind: 'breakdown', timeRange: '30d', groupBy: ['repo', 'team'] };
    expect(buildQueryKey(q1)).toBe(buildQueryKey(q2));
  });

  it('different metricId produces different key', () => {
    const q1: MetricQuery = { metricId: 'pr-cycle', resultKind: 'timeseries', timeRange: '7d' };
    const q2: MetricQuery = { metricId: 'lead-time', resultKind: 'timeseries', timeRange: '7d' };
    expect(buildQueryKey(q1)).not.toBe(buildQueryKey(q2));
  });

  it('different timeRange produces different key', () => {
    const q1: MetricQuery = { metricId: 'pr-cycle', resultKind: 'timeseries', timeRange: '7d' };
    const q2: MetricQuery = { metricId: 'pr-cycle', resultKind: 'timeseries', timeRange: '30d' };
    expect(buildQueryKey(q1)).not.toBe(buildQueryKey(q2));
  });

  it('different resultKind produces different key', () => {
    const q1: MetricQuery = { metricId: 'pr-cycle', resultKind: 'timeseries', timeRange: '7d' };
    const q2: MetricQuery = { metricId: 'pr-cycle', resultKind: 'scalar', timeRange: '7d' };
    expect(buildQueryKey(q1)).not.toBe(buildQueryKey(q2));
  });

  it('excludes visual params (colorKey, chartVariant, showSparkline)', () => {
    const q1: MetricQuery = { metricId: 'pr-cycle', resultKind: 'timeseries', timeRange: '7d' };
    const q2: MetricQuery = { metricId: 'pr-cycle', resultKind: 'timeseries', timeRange: '7d', params: { colorKey: 'cyan', chartVariant: 'area', showSparkline: true } };
    expect(buildQueryKey(q1)).toBe(buildQueryKey(q2));
  });

  it('includes data-affecting params (tableType, maxRows)', () => {
    const q1: MetricQuery = { metricId: 'pr-queue', resultKind: 'table', timeRange: '30d', params: { tableType: 'pr-queue', maxRows: 5 } };
    const q2: MetricQuery = { metricId: 'pr-queue', resultKind: 'table', timeRange: '30d', params: { tableType: 'pr-queue', maxRows: 10 } };
    expect(buildQueryKey(q1)).not.toBe(buildQueryKey(q2));
  });

  it('uses default granularity when not specified', () => {
    const q1: MetricQuery = { metricId: 'pr-cycle', resultKind: 'timeseries', timeRange: '7d' };
    const q2: MetricQuery = { metricId: 'pr-cycle', resultKind: 'timeseries', timeRange: '7d', granularity: 'day' };
    expect(buildQueryKey(q1)).toBe(buildQueryKey(q2));
  });

  it('filter values are sorted', () => {
    const q1: MetricQuery = { metricId: 'pr-cycle', resultKind: 'timeseries', timeRange: '7d', filters: { team: ['b-team', 'a-team'] } };
    const q2: MetricQuery = { metricId: 'pr-cycle', resultKind: 'timeseries', timeRange: '7d', filters: { team: ['a-team', 'b-team'] } };
    expect(buildQueryKey(q1)).toBe(buildQueryKey(q2));
  });
});
