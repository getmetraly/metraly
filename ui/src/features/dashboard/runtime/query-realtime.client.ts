// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import type { QueryClient } from '@tanstack/react-query';
import type { DataQualityContract, LineageContract, QueryResultEnvelope, QueryResultError, ResultStatus } from './metric-query-result.types';
import type { SnapshotQueryItem } from './query-snapshot.api';
import { useConnectionStore } from './connection-store';
import { tanstackQueryKey } from './query-key';
import { WsEventSchema } from './query-schemas';

export interface QueryResultUpdatedEvent {
  dashboardId: string;
  queryKey: string;
  status: ResultStatus;
  version: number;
  sequence: number;
  updatedAt: string;
  result?: unknown;
  error?: QueryResultError;
  quality?: DataQualityContract;
  lineage?: LineageContract;
}

export interface RealtimeSourceCallbacks {
  onConnected: () => void;
  onReconnecting: () => void;
  onError: (error: unknown) => void;
  onQueryResultUpdated: (event: QueryResultUpdatedEvent) => void;
}

export interface RealtimeSource {
  connect(
    dashboardId: string,
    queries: SnapshotQueryItem[],
    callbacks: RealtimeSourceCallbacks,
  ): void;
  disconnect(): void;
  isConnected(): boolean;
}

export class FakeRealtimeSource implements RealtimeSource {
  private callbacks: RealtimeSourceCallbacks | null = null;
  private connected = false;

  connect(
    _dashboardId: string,
    _queries: SnapshotQueryItem[],
    callbacks: RealtimeSourceCallbacks,
  ): void {
    this.callbacks = callbacks;
    this.connected = true;
    void Promise.resolve().then(() => callbacks.onConnected());
  }

  disconnect(): void {
    this.connected = false;
    this.callbacks = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  emit(rawEvent: unknown): void {
    if (!this.callbacks) {
      return;
    }
    const parsed = WsEventSchema.safeParse(rawEvent);
    if (!parsed.success) {
      return;
    }
    const event = parsed.data;
    if (event.type === 'connection.ready') {
      this.callbacks.onConnected();
      return;
    }
    if (event.type === 'queryResult.updated') {
      this.callbacks.onQueryResultUpdated({
        dashboardId: event.dashboardId,
        queryKey: event.queryKey,
        status: event.status,
        version: event.version,
        sequence: event.sequence,
        updatedAt: event.updatedAt,
        result: event.result,
        error: event.error,
        quality: event.quality,
        lineage: event.lineage,
      });
    }
  }

  triggerDisconnect(): void {
    this.connected = false;
    this.callbacks?.onReconnecting();
  }
}

export class WebSocketRealtimeSource implements RealtimeSource {
  private socket: WebSocket | null = null;
  private callbacks: RealtimeSourceCallbacks | null = null;
  private dashboardId = '';
  private queries: SnapshotQueryItem[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private sequences = new Map<string, number>();

  connect(
    dashboardId: string,
    queries: SnapshotQueryItem[],
    callbacks: RealtimeSourceCallbacks,
  ): void {
    this.callbacks = callbacks;
    this.dashboardId = dashboardId;
    this.queries = queries;
    this.sequences.clear();
    this.openSocket();
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.callbacks = null;
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private openSocket(): void {
    const wsBase = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1')
      .replace(/^http/, 'ws')
      .replace(/\/api\/v1$/, '');
    this.socket = new WebSocket(`${wsBase}/ws/dashboards/${this.dashboardId}/realtime`);

    this.socket.onopen = () => {
      this.socket?.send(JSON.stringify({
        type: 'subscribe.queryResults',
        dashboardId: this.dashboardId,
        queries: this.queries.map(({ queryKey, query }) => ({ queryKey, query })),
      }));
      this.callbacks?.onConnected();
    };

    this.socket.onmessage = (message) => {
      let raw: unknown;
      try {
        raw = JSON.parse(String(message.data));
      } catch {
        return;
      }
      const parsed = WsEventSchema.safeParse(raw);
      if (!parsed.success) {
        return;
      }
      const event = parsed.data;
      if (event.type === 'subscription.error') {
        this.callbacks?.onError(new Error(event.message ?? 'subscription error'));
        return;
      }
      if (event.type !== 'queryResult.updated') {
        return;
      }
      const prevSequence = this.sequences.get(event.queryKey) ?? -1;
      if (event.sequence <= prevSequence) {
        return;
      }
      this.sequences.set(event.queryKey, event.sequence);
      this.callbacks?.onQueryResultUpdated({
        dashboardId: event.dashboardId,
        queryKey: event.queryKey,
        status: event.status,
        version: event.version,
        sequence: event.sequence,
        updatedAt: event.updatedAt,
        result: event.result,
        error: event.error,
        quality: event.quality,
        lineage: event.lineage,
      });
    };

    this.socket.onclose = () => {
      if (!this.callbacks) {
        return;
      }
      this.callbacks.onReconnecting();
      this.reconnectTimer = setTimeout(() => {
        this.openSocket();
      }, 2_000);
    };

    this.socket.onerror = (error) => {
      this.callbacks?.onError(error);
    };
  }
}

export function applyQueryResultUpdate(
  queryClient: QueryClient,
  dashboardId: string,
  event: QueryResultUpdatedEvent,
): void {
  if (event.dashboardId !== dashboardId) {
    return;
  }
  const key = tanstackQueryKey(dashboardId, event.queryKey);
  const current = queryClient.getQueryData<QueryResultEnvelope>(key);
  if (current && event.sequence <= current.sequence) {
    return;
  }

  if (event.result !== undefined || event.status !== 'ready') {
    queryClient.setQueryData<QueryResultEnvelope>(key, {
      queryKey: event.queryKey,
      result: event.result,
      status: event.status,
      error: event.error,
      quality: event.quality ?? current?.quality,
      lineage: event.lineage ?? current?.lineage,
      version: event.version,
      sequence: event.sequence,
      updatedAt: event.updatedAt,
    });
  } else {
    void queryClient.invalidateQueries({ queryKey: key });
  }

  useConnectionStore.getState().setLastEventAt(Date.now());
}
