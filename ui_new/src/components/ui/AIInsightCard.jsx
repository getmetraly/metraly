import React, { useState } from 'react';
import { Icon } from '../shared/Icon';

export const AIInsightCard = ({ title, body, action, delay = 0 }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div className={`fade-up-${delay+1}`} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} style={{ background: hovered ? 'var(--glass2)' : 'var(--glass)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border)', borderLeft: '3px solid transparent', transition: 'all 0.22s ease', transform: hovered ? 'translateY(-2px)' : 'none', boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.35)' : 'none' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(180,76,255,0.15))', border: '1px solid rgba(180,76,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="sparkles" size={13} color="var(--purple)"/></div>
          <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)', border: '1.5px solid var(--bg)' }}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-head)', color: 'var(--text)' }}>{title}</span>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(180,76,255,0.15)', color: 'var(--purple)', border: '1px solid rgba(180,76,255,0.25)', borderRadius: 4, padding: '1px 6px' }}>AI preview</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.55, margin: 0 }}>{body}</p>
          {action && <button style={{ marginTop: 12, padding: '6px 14px', borderRadius: 8, background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.25)', color: 'var(--cyan)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{action} <Icon name="arrowRight" size={12} color="var(--cyan)"/></button>}
        </div>
      </div>
    </div>
  );
};
