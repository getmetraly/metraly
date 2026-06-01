import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const csv = useMemo(
    () => buildMetricCsv({ metricId, timeRange, team, repo, values }),
    [metricId, timeRange, team, repo, values],
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape, move focus back to trigger
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleCsv = () => {
    downloadMetricCsv(`${metricId}-${timeRange}.csv`, csv);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 7,
          background: 'var(--m-bg-1)',
          border: '1px solid var(--m-line)',
          color: 'var(--m-fg-1)',
          fontFamily: 'var(--m-font-ui)',
          fontSize: 12.5,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--m-bg-3)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--m-bg-1)'; }}
      >
        <Icon name="download" size={13} /> Export
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Export options"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            zIndex: 100,
            background: 'var(--m-bg-2)',
            border: '1px solid var(--m-line-strong)',
            borderRadius: 9,
            minWidth: 160,
            boxShadow: 'var(--m-shadow-3)',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleCsv}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '9px 14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--m-fg-0)',
              fontFamily: 'var(--m-font-ui)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--m-bg-3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            CSV
          </button>
          <button
            type="button"
            role="menuitem"
            aria-disabled="true"
            disabled
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '9px 14px',
              background: 'none',
              border: 'none',
              cursor: 'default',
              fontSize: 13,
              color: 'var(--m-fg-3)',
              fontFamily: 'var(--m-font-ui)',
              opacity: 0.5,
            }}
          >
            PDF Report (coming soon)
          </button>
          <button
            type="button"
            role="menuitem"
            aria-disabled="true"
            disabled
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '9px 14px',
              background: 'none',
              border: 'none',
              cursor: 'default',
              fontSize: 13,
              color: 'var(--m-fg-3)',
              fontFamily: 'var(--m-font-ui)',
              opacity: 0.5,
            }}
          >
            Slack Digest (coming soon)
          </button>
        </div>
      )}
    </div>
  );
};
