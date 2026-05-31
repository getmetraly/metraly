// src/features/metricsExplorer/components/BreakdownTable.tsx
import React from 'react';
import { MetralyTable, StateBadge } from '../../../design-system';

interface BreakdownTableProps {
  metricId?: string;
}

type BreakdownRow = {
  name: string;
  team: string;
  value: React.ReactNode;
  level: React.ReactNode;
  delta: React.ReactNode;
};

const DORA_LEVEL_STATE_MAP: Record<string, "success" | "live" | "warning" | "error" | "info"> = {
  Elite: 'success',
  High: 'live',
  Med: 'warning',
  Low: 'error',
};

export const BreakdownTable: React.FC<BreakdownTableProps> = ({ metricId }) => {
  const rows: Record<string, string[][]> = {
    'deploy-freq': [
      ['api-gateway',   'Platform', '6.2/day', 'Elite', '+1.4'],
      ['frontend-app',  'Frontend', '3.8/day', 'Elite', '+0.6'],
      ['mobile-app',    'Mobile',   '1.2/day', 'High',  '−0.3'],
      ['data-pipeline', 'Data',     '0.4/day', 'Med',   '+0.1'],
      ['auth-service',  'Backend',  '5.1/day', 'Elite', '+0.9'],
    ],
    'lead-time': [
      ['Platform', '—', '28h', 'High',  '−4h'],
      ['Backend',  '—', '22h', 'High',  '−8h'],
      ['Frontend', '—', '52h', 'Med',   '+3h'],
      ['Mobile',   '—', '61h', 'Med',   '−2h'],
      ['Data',     '—', '44h', 'High',  '−5h'],
    ],
  };
  const data = rows[metricId || 'deploy-freq'] || [];
  return (
    <MetralyTable<BreakdownRow>
      columns={[
        { key: 'name', header: 'Repository / Team' },
        { key: 'team', header: 'Team' },
        { key: 'value', header: 'Value' },
        { key: 'level', header: 'DORA Level' },
        { key: 'delta', header: 'vs prev' },
      ]}
      data={data.map((r: string[]) => ({
        name: r[0],
        team: r[1],
        value: <span style={{ fontFamily: 'var(--m-font-mono)', color: 'var(--m-fg-0)' }}>{r[2]}</span>,
        level: <StateBadge state={DORA_LEVEL_STATE_MAP[r[3]] ?? 'info'} label={r[3]} />,
        delta: (
          <span
            style={{
              fontFamily: 'var(--m-font-mono)',
              color: r[4].startsWith('+') && r[4] !== '+0.0' ? 'var(--m-ok)' : 'var(--m-warn)',
            }}
          >
            {r[4]}
          </span>
        ),
      }))}
      dense
      mobilePresentation="stacked"
      ariaLabel="Metric breakdown"
    />
  );
};