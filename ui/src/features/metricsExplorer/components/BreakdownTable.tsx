// src/features/metricsExplorer/components/BreakdownTable.tsx
import React from 'react';
import { DataTableCompat as DataTable, DORABadgeCompat as DORABadge } from '../../../design-system';

interface BreakdownTableProps {
  metricId?: string;
}

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
    <DataTable
      columns={['Repository / Team', 'Team', 'Value', 'DORA Level', 'vs prev']}
      rows={data.map((r: string[]) => [
        r[0], r[1],
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{r[2]}</span>,
        <DORABadge level={r[3]}/>,
        <span style={{ fontFamily: 'var(--font-mono)', color: r[4].startsWith('+') && r[4] !== '+0.0' ? '#00C853' : '#FF9100' }}>{r[4]}</span>
      ])}
    />
  );
};