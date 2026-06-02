// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardWidget } from '../../../../design-system';
import type { RuntimeStatus } from '../query-runtime.types';

function mapRuntimeStatusToWidgetState(status: RuntimeStatus) {
  switch (status) {
    case 'ready':
      return 'live';
    case 'loading':
      return 'info';
    case 'empty':
      return 'noData';
    case 'stale':
    case 'reconnecting':
      return 'stale';
    case 'error':
      return 'error';
    case 'idle':
    default:
      return 'disabled';
  }
}

describe('dashboard runtime widget state UI mapping', () => {
  it.each<RuntimeStatus>(['idle', 'loading', 'ready', 'empty', 'stale', 'reconnecting', 'error'])(
    'renders DashboardWidget for %s state',
    (status) => {
      render(
        <DashboardWidget
          title="Widget"
          state={mapRuntimeStatusToWidgetState(status)}
          stateLabel={status}
          stateTitle={`${status} title`}
          stateDescription={`${status} description`}
        />,
      );

      expect(screen.getByText('Widget')).toBeInTheDocument();
      expect(screen.getByText(status)).toBeInTheDocument();
    },
  );

  it('maps reconnecting to stale because brandbook has no reconnecting state', () => {
    expect(mapRuntimeStatusToWidgetState('reconnecting')).toBe('stale');
  });
});
