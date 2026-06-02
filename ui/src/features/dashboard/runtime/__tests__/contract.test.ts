// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import { describe, it, expect } from 'vitest';
import { MetricQuerySchema, QueryResultEnvelopeSchema, SnapshotResponseSchema, WsEventSchema } from '../query-schemas';

import readyFixture from '../__fixtures__/metric-query-result.ready.json';
import emptyFixture from '../__fixtures__/metric-query-result.empty.json';
import staleFixture from '../__fixtures__/metric-query-result.stale.json';
import errorFixture from '../__fixtures__/metric-query-result.error.json';
import metricQuery7d from '../__fixtures__/metric-query.pr-cycle-time.7d.json';
import metricQuery30d from '../__fixtures__/metric-query.pr-cycle-time.30d.json';
import wsNewer from '../__fixtures__/ws-event.query-result-updated.newer.json';
import wsOlder from '../__fixtures__/ws-event.query-result-updated.older.json';
import wsSubError from '../__fixtures__/ws-event.subscription-error.json';
import wsHeartbeat from '../__fixtures__/ws-event.heartbeat.json';

describe('Contract: MetricQuery schema', () => {
  it('parses 7d fixture', () => {
    expect(() => MetricQuerySchema.parse(metricQuery7d)).not.toThrow();
  });
  it('parses 30d fixture', () => {
    expect(() => MetricQuerySchema.parse(metricQuery30d)).not.toThrow();
  });
  it('rejects missing metricId', () => {
    expect(() => MetricQuerySchema.parse({ resultKind: 'timeseries', timeRange: '7d' })).toThrow();
  });
  it('rejects unknown resultKind', () => {
    expect(() => MetricQuerySchema.parse({ metricId: 'pr-cycle', resultKind: 'unknown', timeRange: '7d' })).toThrow();
  });
});

describe('Contract: QueryResultEnvelope schema', () => {
  it('parses ready fixture', () => {
    expect(() => QueryResultEnvelopeSchema.parse(readyFixture)).not.toThrow();
  });
  it('parses empty fixture', () => {
    expect(() => QueryResultEnvelopeSchema.parse(emptyFixture)).not.toThrow();
  });
  it('parses stale fixture', () => {
    expect(() => QueryResultEnvelopeSchema.parse(staleFixture)).not.toThrow();
  });
  it('parses error fixture', () => {
    expect(() => QueryResultEnvelopeSchema.parse(errorFixture)).not.toThrow();
  });
  it('rejects missing queryKey', () => {
    const { queryKey: _qk, ...rest } = readyFixture as Record<string, unknown>;
    expect(() => QueryResultEnvelopeSchema.parse(rest)).toThrow();
  });
  it('rejects invalid status', () => {
    expect(() => QueryResultEnvelopeSchema.parse({ ...readyFixture, status: 'unknown' })).toThrow();
  });
});

describe('Contract: WsEvent schema', () => {
  it('parses queryResult.updated (newer)', () => {
    expect(() => WsEventSchema.parse(wsNewer)).not.toThrow();
  });
  it('parses queryResult.updated (older)', () => {
    expect(() => WsEventSchema.parse(wsOlder)).not.toThrow();
  });
  it('parses subscription.error', () => {
    expect(() => WsEventSchema.parse(wsSubError)).not.toThrow();
  });
  it('parses heartbeat', () => {
    expect(() => WsEventSchema.parse(wsHeartbeat)).not.toThrow();
  });
  it('rejects unknown event type', () => {
    expect(() => WsEventSchema.parse({ type: 'unknown.event', payload: {} })).toThrow();
  });
  it('rejects malformed queryResult.updated (missing queryKey)', () => {
    expect(() => WsEventSchema.parse({ type: 'queryResult.updated', dashboardId: 'd1', version: 1, sequence: 1, updatedAt: '2026-06-02T10:00:00Z' })).toThrow();
  });
});

describe('Contract: SnapshotResponse schema', () => {
  it('parses valid response', () => {
    const response = { dashboardId: 'dash-1', results: [readyFixture] };
    expect(() => SnapshotResponseSchema.parse(response)).not.toThrow();
  });
  it('rejects missing dashboardId', () => {
    expect(() => SnapshotResponseSchema.parse({ results: [readyFixture] })).toThrow();
  });
});
