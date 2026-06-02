// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import { QueryClient } from '@tanstack/react-query';

/**
 * Create a QueryClient with sensible Metraly defaults.
 * Call once at app level; call per-test to ensure isolation.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 20_000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

// Re-export for convenience
export { QueryClientProvider } from '@tanstack/react-query';
