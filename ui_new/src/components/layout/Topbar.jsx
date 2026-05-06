import React from 'react';
import { Icon } from '../shared/Icon';
import { useTweaks } from '../../context/TweaksContext';

export const Topbar = ({ title, subtitle }) => {
  const { tweaks } = useTweaks();
  const density = tweaks.density;
  const height = { compact: 48, comfortable: 56, spacious: 64 }[density];
  const paddingX  = { compact: 16, comfortable: 24, spacious: 32 }[density];

  return (
    <header style={{
      height,
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: `0 ${paddingX}px`,
      gap: 16,
      flexShrink: 0,
      background: 'var(--glass)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{subtitle}</div>}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', background: 'var(--glass)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '6px 12px', gap: 8, width: 220,
      }}>
        <Icon name="search" size={13} color="var(--muted)"/>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Quick search…</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: 4 }}>⌘K</span>
      </div>
      <button style={{
        background: 'none', border: '1px solid var(--border)', borderRadius: 8,
        padding: '6px 8px', cursor: 'pointer', color: 'var(--muted2)', position: 'relative',
      }}>
        <Icon name="bell" size={15}/>
        <div style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, background: 'var(--cyan)', borderRadius: '50%', border: '1.5px solid var(--bg)' }} />
      </button>
    </header>
  );
};