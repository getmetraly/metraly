import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../shared/Icon';

export const SH = ({ title, right, navItems = [], activePath = '/', showNewDashboard = false }) => {
  if (navItems.length) {
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingBottom: 10, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
            {navItems.map((item) => {
              const active = activePath === item.to || (item.to === '/' && activePath === '/');
              return (
                <Link key={item.to} to={item.to} style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: active ? 'var(--cyan)' : 'var(--muted2)', fontSize: 13, fontWeight: active ? 600 : 500, paddingBottom: 10, borderBottom: active ? '2px solid var(--cyan)' : '2px solid transparent', transition: 'all 0.15s ease', whiteSpace: 'nowrap' }}>
                  <Icon name={item.icon} size={13} color={active ? 'var(--cyan)' : 'var(--muted)'} />
                  {item.label}
                </Link>
              );
            })}
          </div>
          {showNewDashboard && (
            <Link to="/dash-wizard" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 9, border: '1px solid rgba(0,229,255,0.28)', background: 'rgba(0,229,255,0.08)', color: 'var(--cyan)', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              <Icon name="plus" size={13} color="var(--cyan)" />
              New Dashboard
            </Link>
          )}
        </div>
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(0,229,255,0.18)', background: 'rgba(0,229,255,0.06)', color: 'var(--muted2)', fontSize: 12.5, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--cyan)' }}>Synthetic dashboard preview.</strong> Metrics, incidents, pull requests, repositories, deployments, contributors, and summaries shown here are scripted demo content only.
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
