// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import { z } from 'zod';

// — Result kinds and granularity —

export const ResultKindSchema = z.enum([
  'timeseries', 'scalar', 'breakdown', 'dora', 'activity', 'table', 'heatmap', 'insight', 'anomaly',
]);

export const GranularitySchema = z.enum(['day', 'week', 'month']);

// — MetricQuery (frontend canonical) —

export const MetricQuerySchema = z.object({
  metricId: z.string().min(1),
  resultKind: ResultKindSchema,
  timeRange: z.string().min(1),
  granularity: GranularitySchema.optional(),
  filters: z.record(z.string(), z.array(z.string())).optional(),
  groupBy: z.array(z.string()).optional(),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type MetricQuerySchemaType = z.infer<typeof MetricQuerySchema>;

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

export const QueryResultEnvelopeSchema = z.object({
  queryKey: z.string().min(1),
  result: z.unknown(),
  status: ResultStatusSchema,
  quality: DataQualityContractSchema.optional(),
  lineage: LineageContractSchema.optional(),
  version: z.number().int(),
  sequence: z.number().int(),
  updatedAt: z.string().min(1),
});

export type QueryResultEnvelopeSchemaType = z.infer<typeof QueryResultEnvelopeSchema>;

// — Snapshot request + response —

export const SnapshotQueryItemSchema = z.object({
  queryKey: z.string().min(1),
  query: MetricQuerySchema,
});

export const SnapshotRequestSchema = z.object({
  queries: z.array(SnapshotQueryItemSchema).min(1),
});

export const SnapshotResponseSchema = z.object({
  dashboardId: z.string().min(1),
  results: z.array(QueryResultEnvelopeSchema),
});

export type SnapshotResponseSchemaType = z.infer<typeof SnapshotResponseSchema>;

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

export const WsQueryResultUpdatedSchema = z.object({
  type: z.literal('queryResult.updated'),
  dashboardId: z.string().min(1),
  queryKey: z.string().min(1),
  version: z.number().int(),
  sequence: z.number().int(),
  updatedAt: z.string().min(1),
  /** Optional inline result; if present, use it directly instead of triggering a refetch. */
  result: z.unknown().optional(),
});

export const WsEventSchema = z.discriminatedUnion('type', [
  WsConnectionReadySchema,
  WsSubscriptionAckSchema,
  WsSubscriptionErrorSchema,
  WsHeartbeatSchema,
  WsQueryResultUpdatedSchema,
]);

export type WsEvent = z.infer<typeof WsEventSchema>;
export type WsQueryResultUpdated = z.infer<typeof WsQueryResultUpdatedSchema>;
