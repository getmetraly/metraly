import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';
import {
  DataTableCompat,
  DORABadgeCompat,
  StatusBadgeCompat,
} from '../design-system';
import { BreakdownTable } from '../features/metricsExplorer/components/BreakdownTable';

const meta = {
  title: 'Compat/Surfaces',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function CompatSurfaceShowcase({ mobile = false }: { mobile?: boolean }) {
  return (
    <div
      data-story-ready="true"
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        padding: mobile ? 16 : 24,
        display: 'grid',
        gap: 24,
      }}
    >
      <section style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Status adapter
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <StatusBadgeCompat status="On track" />
          <StatusBadgeCompat status="At risk" />
          <StatusBadgeCompat status="Blocked" />
          <StatusBadgeCompat status="Done" />
          <StatusBadgeCompat status="Open" />
          <StatusBadgeCompat status="Preview" />
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          DORA adapter
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <DORABadgeCompat label="Deploy" level="Elite" value="4.2/day" />
          <DORABadgeCompat label="Lead Time" level="High" value="38h" />
          <DORABadgeCompat label="CFR" level="Med" value="12%" />
          <DORABadgeCompat label="MTTR" level="Low" value="2h" />
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Table adapter
        </div>
        <div style={{ background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 12, padding: mobile ? 12 : 16 }}>
          <DataTableCompat
            title="Delivery risk"
            columns={['Service', 'Owner', 'Status']}
            rows={[
              ['api-gateway', 'Platform', <StatusBadgeCompat key="r1" status="On track" />],
              ['mobile-app', 'Mobile', <StatusBadgeCompat key="r2" status="At risk" />],
              ['billing-worker', 'Backend', <StatusBadgeCompat key="r3" status="Blocked" />],
            ]}
          />
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Screen consumer via compat barrel
        </div>
        <div style={{ background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 12, padding: mobile ? 12 : 16, overflowX: 'auto' }}>
          <BreakdownTable metricId="deploy-freq" />
        </div>
      </section>
    </div>
  );
}

export const Default: Story = {
  render: () => <CompatSurfaceShowcase />,
};

export const Mobile: Story = {
  render: () => <CompatSurfaceShowcase mobile />,
};
