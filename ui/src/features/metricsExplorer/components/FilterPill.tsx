// src/features/metricsExplorer/components/FilterPill.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../../../design-system';

interface FilterPillProps {
  label?: string;
  options?: string[];
  value?: string;
  onChange?: (value: string) => void;
}

export const FilterPill: React.FC<FilterPillProps> = ({ label, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7,
        background: value !== options?.[0] ? 'rgba(0,229,255,0.1)' : 'var(--glass)',
        border: value !== options?.[0] ? '1px solid rgba(0,229,255,0.25)' : '1px solid var(--border)',
        color: value !== options?.[0] ? 'var(--cyan)' : 'var(--muted2)',
        fontSize: 12.5, cursor: 'pointer', fontFamily: 'var(--font-body)',
      }}>
        {label ? `${label}: ${value}` : value} <Icon name="chevronDown" size={11} color="currentColor" />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100,
          background: '#1a2235', border: '1px solid var(--border2)', borderRadius: 9,
          minWidth: 150, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {options?.map(opt => (
            <div key={opt} onClick={() => { onChange?.(opt); setOpen(false); }}
              style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                color: value === opt ? 'var(--cyan)' : 'var(--text)',
                background: value === opt ? 'rgba(0,229,255,0.08)' : 'transparent',
              }}>{opt}</div>
          ))}
        </div>
      )}
    </div>
  );
};
