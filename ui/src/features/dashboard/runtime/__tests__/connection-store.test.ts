// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore } from '../connection-store';

beforeEach(() => {
  // Reset Zustand store state between tests
  useConnectionStore.setState({
    status: 'idle',
    lastEventAt: null,
    retries: 0,
    reconnectingQueryKeys: new Set(),
  });
});

describe('useConnectionStore', () => {
  it('sets status', () => {
    useConnectionStore.getState().setStatus('connected');
    expect(useConnectionStore.getState().status).toBe('connected');
  });

  it('sets status to reconnecting', () => {
    useConnectionStore.getState().setStatus('reconnecting');
    expect(useConnectionStore.getState().status).toBe('reconnecting');
  });

  it('increments retries', () => {
    useConnectionStore.getState().incrementRetries();
    useConnectionStore.getState().incrementRetries();
    expect(useConnectionStore.getState().retries).toBe(2);
  });

  it('resets retries', () => {
    useConnectionStore.getState().incrementRetries();
    useConnectionStore.getState().resetRetries();
    expect(useConnectionStore.getState().retries).toBe(0);
  });

  it('marks and clears reconnecting query key', () => {
    useConnectionStore.getState().markQueryKeyReconnecting('qk-1');
    expect(useConnectionStore.getState().reconnectingQueryKeys.has('qk-1')).toBe(true);
    useConnectionStore.getState().clearQueryKeyReconnecting('qk-1');
    expect(useConnectionStore.getState().reconnectingQueryKeys.has('qk-1')).toBe(false);
  });

  it('marks multiple query keys independently', () => {
    useConnectionStore.getState().markQueryKeyReconnecting('qk-1');
    useConnectionStore.getState().markQueryKeyReconnecting('qk-2');
    useConnectionStore.getState().clearQueryKeyReconnecting('qk-1');
    expect(useConnectionStore.getState().reconnectingQueryKeys.has('qk-1')).toBe(false);
    expect(useConnectionStore.getState().reconnectingQueryKeys.has('qk-2')).toBe(true);
  });

  it('sets lastEventAt', () => {
    const t = Date.now();
    useConnectionStore.getState().setLastEventAt(t);
    expect(useConnectionStore.getState().lastEventAt).toBe(t);
  });
});
