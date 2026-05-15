// src/features/metricsExplorer/components/DORAPanel.tsx
import React from 'react';
import { DORABadgeCompat as DORABadge } from '../../../design-system';
import { Icon } from '../../../components/shared/Icon';

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

export const DORAPanel: React.FC<DORAPanelProps> = ({ onSelect, selected }) => {
  const cards: DORACard[] = [
    { id: 'deploy-freq', label: 'Deployment Frequency', value: '4.2/day', delta: '+0.8', good: true, level: 'Elite', color: '#00E5FF', icon: 'zap', note: 'On-demand (multiple/day)' },
    { id: 'lead-time',   label: 'Lead Time for Changes', value: '38h',    delta: '−6h',  good: true, level: 'High',  color: '#B44CFF', icon: 'clock', note: '1 day – 1 week range' },
    { id: 'cfr',         label: 'Change Failure Rate',   value: '3.2%',   delta: '−1.1%',good: true, level: 'Elite', color: '#FF9100', icon: 'alertTri', note: '0–15% is Elite' },
    { id: 'mttr',        label: 'MTTR',                  value: '18 min', delta: '−6 min',good: true, level: 'Elite', color: '#00C853', icon: 'activity', note: 'Less than 1 hour = Elite' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
      {cards.map((c, i) => (
        <div key={c.id} className={`fade-up-${i+1}`} onClick={() => onSelect?.(c.id)} style={{
          background: selected?.includes(c.id) ? 'var(--glass2)' : 'var(--glass)',
          border: selected?.includes(c.id) ? `1px solid ${c.color}55` : '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.18s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <Icon name={c.icon} size={14} color={c.color} />
            <DORABadge level={c.level} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--text)' }}>{c.value}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>{c.label}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: c.good ? '#00C853' : '#FF1744', fontFamily: 'var(--font-mono)' }}>{c.delta}</span>
            <span style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.7 }}>{c.note}</span>
          </div>
        </div>
      ))}
    </div>
  );
};