import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { expect, test } from 'vitest';
import {
  DataTableCompat,
  DORABadgeCompat,
  StatCardCompat,
  StatusBadgeCompat,
} from './brandbook-legacy';
import { BreakdownTable } from '../../features/metricsExplorer/components/BreakdownTable';

test('status badge compat maps legacy and canonical labels accessibly', async () => {
  const { container, getByText } = render(
    <div>
      <StatusBadgeCompat status="On track" />
      <StatusBadgeCompat status="Preview" />
    </div>,
  );

  expect(getByText('On track')).toBeInTheDocument();
  expect(getByText('Preview')).toBeInTheDocument();
  expect((await axe(container)).violations).toHaveLength(0);
});

test('dora badge compat renders value and remains accessible', async () => {
  const { container, getByText } = render(
    <DORABadgeCompat label="Deploy" level="Elite" value="4.2/day" />,
  );

  expect(getByText('Deploy 4.2/day')).toBeInTheDocument();
  expect((await axe(container)).violations).toHaveLength(0);
});

test('data table compat renders a semantic table', async () => {
  const { container, getByRole } = render(
    <DataTableCompat
      title="Delivery risk"
      columns={['Service', 'Owner', 'Status']}
      rows={[
        ['api-gateway', 'Platform', <StatusBadgeCompat key="ok" status="On track" />],
        ['mobile-app', 'Mobile', <StatusBadgeCompat key="warn" status="At risk" />],
      ]}
    />,
  );

  expect(getByRole('table', { name: 'Delivery risk' })).toBeInTheDocument();
  expect((await axe(container)).violations).toHaveLength(0);
});

test('breakdown table stays accessible through compat barrel adapters', async () => {
  const { container, getByRole } = render(<BreakdownTable metricId="deploy-freq" />);

  expect(getByRole('table', { name: 'Metric breakdown' })).toBeInTheDocument();
  expect((await axe(container)).violations).toHaveLength(0);
});

test('stat card compat renders trend badge in footer when trend is provided', async () => {
  const { container, getByText } = render(
    <StatCardCompat
      icon="chart"
      label="Deploy frequency"
      value="4.2/day"
      trend="+8%"
      trendDir="up"
      color="cyan"
    />,
  );

  expect(getByText('Deploy frequency')).toBeInTheDocument();
  expect(getByText('+8%')).toBeInTheDocument();
  expect((await axe(container)).violations).toHaveLength(0);
});

test('stat card compat renders without trend badge when trend is absent', async () => {
  const { container, getByText } = render(
    <StatCardCompat
      icon="chart"
      label="Lead time"
      value="38h"
      color="purple"
    />,
  );

  expect(getByText('Lead time')).toBeInTheDocument();
  expect((await axe(container)).violations).toHaveLength(0);
});
