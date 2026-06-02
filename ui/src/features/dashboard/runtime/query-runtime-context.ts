// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import { createContext, useContext } from 'react';
import type { QueryRuntimeContextValue } from './query-runtime.types';

export const QueryRuntimeContext = createContext<QueryRuntimeContextValue | null>(null);

export function useQueryRuntimeContext(): QueryRuntimeContextValue | null {
  return useContext(QueryRuntimeContext);
}
