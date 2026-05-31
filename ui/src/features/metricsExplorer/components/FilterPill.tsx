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
        background: value !== options?.[0] ? 'color-mix(in srgb, var(--m-cyan-500) 10%, transparent)' : 'var(--m-bg-1)',
        border: value !== options?.[0] ? '1px solid color-mix(in srgb, var(--m-cyan-500) 25%, transparent)' : '1px solid var(--m-line)',
        color: value !== options?.[0] ? 'var(--m-cyan-500)' : 'var(--m-fg-1)',
        fontSize: 12.5, cursor: 'pointer', fontFamily: 'var(--m-font-ui)',
      }}>
        {label ? `${label}: ${value}` : value} <Icon name="chevronDown" size={11} color="currentColor" />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100,
          background: 'var(--m-bg-2)', border: '1px solid var(--m-line-strong)', borderRadius: 9,
          minWidth: 150, boxShadow: 'var(--m-shadow-3)',
        }}>
          {options?.map(opt => (
            <div key={opt} onClick={() => { onChange?.(opt); setOpen(false); }}
              style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                color: value === opt ? 'var(--m-cyan-500)' : 'var(--m-fg-0)',
                background: value === opt ? 'color-mix(in srgb, var(--m-cyan-500) 8%, transparent)' : 'transparent',
              }}>{opt}</div>
          ))}
        </div>
      )}
    </div>
  );
};
