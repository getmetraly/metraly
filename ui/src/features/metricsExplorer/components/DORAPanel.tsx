// src/features/metricsExplorer/components/DORAPanel.tsx
import React from 'react';
import { StateBadge, Icon, CardShell } from '../../../design-system';

interface DORACard {
  id: string;
  label: string;
  value: string;
  delta: string;
  good: boolean;
  level: string;
  color: string;
  icon: string;
  note: string;
}

interface DORAPanelProps {
  onSelect?: (id: string) => void;
  selected?: string[];
}

const DORA_LEVEL_STATE_MAP: Record<string, "success" | "live" | "warning" | "error"> = {
  Elite: 'success',
  High: 'live',
  Med: 'warning',
  Low: 'error',
};

export const DORAPanel: React.FC<DORAPanelProps> = ({ onSelect, selected }) => {
  const cards: DORACard[] = [
    { id: 'deploy-freq', label: 'Deployment Frequency', value: '4.2/day', delta: '+0.8', good: true, level: 'Elite', color: 'var(--m-cyan-500)', icon: 'zap', note: 'On-demand (multiple/day)' },
    { id: 'lead-time',   label: 'Lead Time for Changes', value: '38h',    delta: '−6h',  good: true, level: 'High',  color: 'var(--m-purple-500)', icon: 'clock', note: '1 day – 1 week range' },
    { id: 'cfr',         label: 'Change Failure Rate',   value: '3.2%',   delta: '−1.1%',good: true, level: 'Elite', color: 'var(--m-warn)', icon: 'alertTri', note: '0–15% is Elite' },
    { id: 'mttr',        label: 'MTTR',                  value: '18 min', delta: '−6 min',good: true, level: 'Elite', color: 'var(--m-ok)', icon: 'activity', note: 'Less than 1 hour = Elite' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))', gap: 12, marginBottom: 20 }}>
      {cards.map((c, i) => (
        <CardShell
          key={c.id}
          className={`fade-up-${i+1}`}
          tone={selected?.includes(c.id) ? 'cyan' : 'neutral'}
          state={selected?.includes(c.id) ? 'selected' : 'default'}
          onClick={() => onSelect?.(c.id)}
          style={{ cursor: 'pointer', padding: '14px 16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <Icon name={c.icon} size={14} color={c.color} />
            <StateBadge state={DORA_LEVEL_STATE_MAP[c.level] ?? 'info'} label={c.level} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--m-font-display)', color: 'var(--m-fg-0)' }}>{c.value}</div>
          <div style={{ fontSize: 11.5, color: 'var(--m-fg-2)', marginTop: 4 }}>{c.label}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: c.good ? 'var(--m-ok)' : 'var(--m-err)', fontFamily: 'var(--m-font-mono)' }}>{c.delta}</span>
            <span style={{ fontSize: 10, color: 'var(--m-fg-2)', opacity: 0.7 }}>{c.note}</span>
          </div>
        </CardShell>
      ))}
    </div>
  );
};