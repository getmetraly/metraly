// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardBuilderCanvas } from '../../../../components/dashboard/DashboardBuilderCanvas';
import type { Dashboard } from '../../../../types/dashboard';

function makeDashboard(): Dashboard {
  return {
    id: 'dash-edit-1',
    name: 'Edit Dashboard',
    sourceType: 'user-created',
    visibility: 'private',
    defaultFilters: { timeRange: '7d', team: 'All teams', repo: 'All repos' },
    widgets: [
      {
        instanceId: 'w-1',
        widgetType: 'stat-card',
        config: { type: 'stat-card', metricId: 'pr-cycle', showSparkline: true, colorKey: 'cyan' },
      },
    ],
    layout: [{ i: 'w-1', x: 0, y: 0, w: 3, h: 2 }],
    createdBy: 'user-1',
    createdAt: '2026-06-02T10:00:00Z',
    updatedAt: '2026-06-02T10:00:00Z',
    version: 3,
  };
}

describe('DashboardBuilderCanvas regression', () => {
  it('edit mode remains independent from QueryRuntimeProvider', () => {
    render(
      <DashboardBuilderCanvas
        mode="edit"
        dashboard={makeDashboard()}
        widgetData={{ 'dash-edit-1-w-1': { value: '42', delta: '+2%' } }}
        widgetSizes={{}}
      />,
    );

    expect(screen.getByText(/edit mode/i)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('preview mode continues using sample data path', () => {
    render(
      <DashboardBuilderCanvas
        mode="preview"
        dashboard={makeDashboard()}
        widgetData={{}}
        widgetSizes={{}}
      />,
    );

    expect(screen.getByText(/preview/i)).toBeInTheDocument();
    expect(screen.getByText(/using sample data/i)).toBeInTheDocument();
  });
});
