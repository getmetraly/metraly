// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import { create } from 'zustand';
import type { ConnectionStoreState, ConnectionStatus } from './query-runtime.types';

export const useConnectionStore = create<ConnectionStoreState>((set) => ({
  status: 'idle',
  lastEventAt: null,
  retries: 0,
  reconnectingQueryKeys: new Set<string>(),
  setStatus: (s: ConnectionStatus) => set({ status: s }),
  setLastEventAt: (t: number) => set({ lastEventAt: t }),
  incrementRetries: () => set((state) => ({ retries: state.retries + 1 })),
  resetRetries: () => set({ retries: 0 }),
  markQueryKeyReconnecting: (qk: string) =>
    set((state) => ({ reconnectingQueryKeys: new Set([...state.reconnectingQueryKeys, qk]) })),
  clearQueryKeyReconnecting: (qk: string) =>
    set((state) => {
      const next = new Set(state.reconnectingQueryKeys);
      next.delete(qk);
      return { reconnectingQueryKeys: next };
    }),
}));
