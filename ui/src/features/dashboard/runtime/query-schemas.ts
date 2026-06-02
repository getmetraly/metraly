// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import { z } from 'zod';

// — Result kinds, shapes, granularity, time range —

export const ResultKindSchema = z.enum([
  'timeseries', 'scalar', 'breakdown', 'dora', 'activity', 'table', 'heatmap', 'insight', 'anomaly',
]);

export const ResultShapeSchema = z.enum([
  'stat-card', 'metric-chart', 'compare-bar-chart', 'leaderboard',
  'health-gauge', 'sprint-burndown', 'anomaly-detector', 'data-table',
  'dora-overview', 'recent-activity', 'heatmap', 'ai-insight',
]);

export const GranularitySchema = z.enum(['day', 'week', 'month']);

export const TimeRangePresetSchema = z.enum([
  'last_7d', 'last_14d', 'last_30d', 'last_60d', 'last_90d',
]);

// — MetricQuery (frontend canonical) —

export const MetricQuerySchema = z.object({
  metricId: z.string().min(1),
  resultKind: ResultKindSchema,
  resultShape: ResultShapeSchema,
  timeRangePreset: TimeRangePresetSchema,
  granularity: GranularitySchema.optional(),
  filters: z.record(z.string(), z.array(z.string())).optional(),
  groupBy: z.array(z.string()).optional(),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional(),
});


// — Quality + Lineage —

export const DataQualityContractSchema = z.object({
  level: z.enum(['full', 'partial', 'estimate', 'empty']),
  notes: z.array(z.string()).optional(),
  coveragePercent: z.number(),
  earliestDataAt: z.string().optional(),
  latestDataAt: z.string().optional(),
});

export const LineageContractSchema = z.object({
  metricId: z.string(),
  formulaId: z.string(),
  formulaVersion: z.number(),
  sourceIds: z.array(z.string()),
  normalizedEventTypes: z.array(z.string()),
});

// — QueryResultEnvelope —

export const ResultStatusSchema = z.enum(['ready', 'empty', 'stale', 'partial', 'error']);

export const QueryResultErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  retryable: z.boolean().optional(),
});

export const QueryResultEnvelopeSchema = z.object({
  queryKey: z.string().min(1),
  result: z.unknown().optional(),
  status: ResultStatusSchema,
  error: QueryResultErrorSchema.optional(),
  quality: DataQualityContractSchema.optional(),
  lineage: LineageContractSchema.optional(),
  version: z.number().int(),
  sequence: z.number().int(),
  updatedAt: z.string().min(1),
}).superRefine((value, ctx) => {
  if (value.status === 'ready' && value.result === undefined) {
    ctx.addIssue({
      code: 'custom',
      message: 'ready result requires result payload',
      path: ['result'],
    });
  }
  if (value.status === 'error' && !value.error) {
    ctx.addIssue({
      code: 'custom',
      message: 'error status requires error payload',
      path: ['error'],
    });
  }
});


// — Snapshot request + response —



export const SnapshotResponseSchema = z.object({
  dashboardId: z.string().min(1),
  results: z.array(QueryResultEnvelopeSchema),
});


// — WebSocket events —

export const WsConnectionReadySchema = z.object({
  type: z.literal('connection.ready'),
  serverTime: z.string().optional(),
});

export const WsSubscriptionAckSchema = z.object({
  type: z.literal('subscription.ack'),
  dashboardId: z.string(),
  queryKeys: z.array(z.string()),
});

export const WsSubscriptionErrorSchema = z.object({
  type: z.literal('subscription.error'),
  dashboardId: z.string().optional(),
  queryKey: z.string().optional(),
  code: z.string().optional(),
  message: z.string().optional(),
});

export const WsHeartbeatSchema = z.object({
  type: z.literal('heartbeat'),
  serverTime: z.string().optional(),
});

const WsQueryResultUpdatedSchema = z.object({
  type: z.literal('queryResult.updated'),
  dashboardId: z.string().min(1),
  queryKey: z.string().min(1),
  status: ResultStatusSchema.default('ready'),
  result: z.unknown().optional(),
  error: QueryResultErrorSchema.optional(),
  quality: DataQualityContractSchema.optional(),
  lineage: LineageContractSchema.optional(),
  version: z.number().int(),
  sequence: z.number().int(),
  updatedAt: z.string().min(1),
});

export const WsEventSchema = z.discriminatedUnion('type', [
  WsConnectionReadySchema,
  WsSubscriptionAckSchema,
  WsSubscriptionErrorSchema,
  WsHeartbeatSchema,
  WsQueryResultUpdatedSchema,
]);

