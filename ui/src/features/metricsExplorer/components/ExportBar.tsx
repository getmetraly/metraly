import React, { useMemo, useState } from 'react';
import { Icon } from '../../../design-system';
import { buildMetricCsv, downloadMetricCsv } from '../export';

interface ExportBarProps {
  metricId: string;
  timeRange: string;
  team: string;
  repo: string;
  values: number[];
}

export const ExportBar: React.FC<ExportBarProps> = ({ metricId, timeRange, team, repo, values }) => {
  const [shown, setShown] = useState(false);
  const csv = useMemo(() => buildMetricCsv({ metricId, timeRange, team, repo, values }), [metricId, timeRange, team, repo, values]);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShown(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 7,
          background: 'var(--glass)',
          border: '1px solid var(--border)',
          color: 'var(--muted2)',
          fontFamily: 'var(--font-body)',
          fontSize: 12.5,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--m-bg-3)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--glass)'}
      >
        <Icon name="download" size={13} /> Export
      </button>
      {shown && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 4,
            zIndex: 100,
            background: 'var(--m-bg-2)',
            border: '1px solid var(--border2)',
            borderRadius: 9,
            minWidth: 140,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}
        >
          {['CSV', 'PDF Report', 'Slack Digest'].map(opt => (
            <div
              key={opt}
              onClick={() => {
                if (opt === 'CSV') {
                  downloadMetricCsv(`${metricId}-${timeRange}.csv`, csv);
                }
                setShown(false);
              }}
              style={{
                padding: '9px 14px',
                cursor: 'pointer',
                fontSize: 13,
                color: 'var(--text)',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--m-bg-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
