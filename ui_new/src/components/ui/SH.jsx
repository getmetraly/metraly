import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../shared/Icon';

export const SH = ({ title, right, navItems = [], activePath = '/', showNewDashboard = false }) => {
  if (navItems.length) {
    return (
      <div style={{ marginBottom: 8, width: '100%' }}>
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0, overflowX: 'auto' }}>
            {navItems.map((item) => {
              const active = activePath === item.to || (item.to === '/' && activePath === '/');
              return (
                <Link key={item.to} to={item.to} style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: active ? 'var(--cyan)' : 'var(--muted2)', fontSize: 13, fontWeight: active ? 600 : 500, paddingBottom: 6, borderBottom: active ? '2px solid var(--cyan)' : '2px solid transparent', transition: 'all 0.15s ease', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <Icon name={item.icon} size={13} color={active ? 'var(--cyan)' : 'var(--muted)'} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {showNewDashboard && (
            <Link to="/dash-wizard" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(0,229,255,0.28)', background: 'rgba(0,229,255,0.08)', color: 'var(--cyan)', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <Icon name="plus" size={12} color="var(--cyan)" />
              New Dashboard
            </Link>
          )}
        </div>

        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)', lineHeight: 1.15 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cyan)', opacity: 0.9, flexShrink: 0 }} />
          <span>Synthetic preview · scripted demo metrics, activity, contributors, and summaries only</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 4 }}>
      <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      {right && <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{right}</span>}
    </div>
  );
};
