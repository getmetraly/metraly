// src/components/layout/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { Icon } from '../shared/Icon';
import { useTweaks } from '../../context/TweaksContext';

interface SidebarProps {
  active?: string;
  onNav?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ active = '', onNav }) => {
  const { tweaks } = useTweaks();
  const collapsed = tweaks.sidebarCollapsed;
  const density = tweaks.density;

  // Density padding mapping
  const densityPadding = {
    compact: { section: '4px 8px', item: '6px 8px' },
    comfortable: { section: '12px 10px', item: '8px 10px' },
    spacious: { section: '16px 12px', item: '10px 12px' },
  };
  const densityKey = density as 'compact' | 'comfortable' | 'spacious';
  const densityPad = densityPadding[densityKey] || densityPadding.comfortable;
  const pad = { section: densityPad.section, item: densityPad.item };

  // Load pinned from localStorage (same as before)
  const [pinned, setPinned] = useState(() => {
    try {
      const saved = localStorage.getItem('metraly-pinned');
      return saved ? JSON.parse(saved) : ['dash-cto', 'dash-devops'];
    } catch {
      return ['dash-cto', 'dash-devops'];
    }
  });
  useEffect(() => {
    localStorage.setItem('metraly-pinned', JSON.stringify(pinned));
  }, [pinned]);

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinned((prev: string[]) => prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id]);
  };

  const sections = [
    { label: 'Dashboards', items: [
      { id: 'dashboard', icon: 'home', label: 'Overview' },
      { id: 'dash-cto',  icon: 'trendingUp', label: 'CTO' },
      { id: 'dash-vp',   icon: 'users', label: 'VP Engineering' },
      { id: 'dash-tl',   icon: 'gitPR', label: 'Tech Lead' },
      { id: 'dash-devops',icon: 'cpu', label: 'DevOps / SRE' },
      { id: 'dash-ic',   icon: 'activity', label: 'My View' },
      { id: 'dash-wizard',icon: 'plus', label: 'New Dashboard', accent: true },
    ]},
    { label: 'Analytics', items: [
      { id: 'metrics', icon: 'bar2', label: 'Metrics Explorer' },
      { id: 'ai', icon: 'brain', label: 'AI Assistant' },
    ]},
    { label: 'Configure', items: [
      { id: 'plugins', icon: 'puzzle', label: 'Marketplace' },
      { id: 'wizard', icon: 'link', label: 'Connect Sources' },
    ]},
    { label: 'System', items: [
      { id: 'settings', icon: 'settings', label: 'Settings' },
    ]},
  ];

  const dashboardsSection = sections.find(s => s.label === 'Dashboards');
  const allDashboardItems = dashboardsSection?.items.filter(item => item.id !== 'dash-wizard') || [];

  interface SidebarItem {
  id: string;
  icon: string;
  label: string;
  accent?: boolean;
}

const pinnedItems: SidebarItem[] = pinned
    .map((id: string) => allDashboardItems.find((it: SidebarItem) => it.id === id))
    .filter((item: SidebarItem | undefined): item is SidebarItem => item !== undefined);

  const unpinnedItems = allDashboardItems.filter(item => !pinned.includes(item.id));

  // Sidebar width changes based on collapsed state
  const sidebarWidth = collapsed ? '64px' : 'var(--sidebar-w)';

  return (
    <aside style={{
      width: sidebarWidth,
      flexShrink: 0,
      height: '100%',
      background: 'rgba(11,15,25,0.95)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      backdropFilter: 'blur(20px)',
      transition: 'width 0.2s ease',
      overflowX: 'hidden',
    }}>
      {/* Logo area – reduced padding when collapsed */}
      <div style={{ padding: collapsed ? '16px 0' : '20px 18px 16px', borderBottom: '1px solid var(--border)', textAlign: collapsed ? 'center' : 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--grad)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon name="activity" size={16} color="#fff"/>
          </div>
          {!collapsed && (
            <span style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 700,
              fontSize: 17,
              background: 'var(--grad)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Metraly</span>
          )}
        </div>
        {!collapsed && (
          <div style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(0,200,83,0.1)',
            border: '1px solid rgba(0,200,83,0.2)',
            borderRadius: 20,
            padding: '4px 10px',
            width: 'fit-content',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: 'pulse-dot 2s ease infinite' }}/>
            <span style={{ fontSize: 11, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>All systems nominal</span>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, overflow: 'auto', padding: collapsed ? '8px 4px' : '12px 10px' }}>
        {/* Pinned section – simplified when collapsed */}
        {pinnedItems.length > 0 && !collapsed && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase', padding: '0 8px', marginBottom: 4 }}>Pinned</div>
            {pinnedItems.map(item => (
              <button key={item.id} onClick={() => onNav?.(item.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: pad.item,
                borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2,
                background: active === item.id ? 'rgba(0,229,255,0.1)' : 'transparent',
                color: active === item.id ? 'var(--cyan)' : 'var(--muted2)',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: active === item.id ? 500 : 400,
                transition: 'all 0.15s', textAlign: 'left', position: 'relative',
              }}>
                {active === item.id && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 14, borderRadius: 2, background: 'var(--cyan)' }}/>}
                <span style={{ fontSize: 12 }}>📌</span>
                {!collapsed && item.label}
                {!collapsed && (
                  <button onClick={e => togglePin(item.id, e)} title="Unpin" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,229,255,0.5)', fontSize: 12, padding: '0 2px' }}>×</button>
                )}
              </button>
            ))}
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 8px 0' }}/>
          </div>
        )}

        {sections.map(sec => {
          if (sec.label === 'Dashboards') {
            const newDashboardItem = sec.items.find(i => i.id === 'dash-wizard');
            return (
              <div key={sec.label} style={{ marginBottom: 16 }}>
                {!collapsed && <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase', padding: '0 8px', marginBottom: 4 }}>{sec.label}</div>}
                {unpinnedItems.map(item => {
                  const isActive = active === item.id;
                  return (
<button key={item.id} onClick={() => onNav?.(item.id)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 9,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      padding: collapsed ? '10px 0' : pad.item,
                      borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2,
                      background: isActive ? 'rgba(0,229,255,0.1)' : 'transparent',
                      color: isActive ? 'var(--cyan)' : 'var(--muted2)',
                      fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: isActive ? 500 : 400,
                      transition: 'all 0.18s ease', textAlign: 'left', position: 'relative',
                    }}>
                      {isActive && !collapsed && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 16, borderRadius: 2, background: 'var(--cyan)' }}/>}
                      <Icon name={item.icon} size={15} color={isActive ? 'var(--cyan)' : 'currentColor'}/>
                      {!collapsed && <span style={{ marginLeft: collapsed ? 0 : 9 }}>{item.label}</span>}
                      {!collapsed && hoveredPin === item.id && (
                        <button onClick={e => togglePin(item.id, e)} title={pinned.includes(item.id) ? 'Unpin' : 'Pin to top'} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: pinned.includes(item.id) ? 'var(--cyan)' : 'var(--muted)', fontSize: 12 }}>📌</button>
                      )}
                    </button>
                  );
                })}
                {newDashboardItem && !collapsed && (
                  <button onClick={() => onNav?.(newDashboardItem.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: pad.item,
                    borderRadius: 8, border: '1px dashed rgba(0,229,255,0.2)', cursor: 'pointer', marginTop: 4,
                    background: active === newDashboardItem.id ? 'rgba(0,229,255,0.1)' : 'rgba(0,229,255,0.06)',
                    color: 'var(--cyan)', fontSize: 13.5, fontWeight: 500,
                  }}>
                    <Icon name={newDashboardItem.icon} size={15} color="var(--cyan)"/>
                    {newDashboardItem.label}
                  </button>
                )}
              </div>
            );
          }

          // Other sections
          return (
            <div key={sec.label} style={{ marginBottom: 16 }}>
              {!collapsed && <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase', padding: '0 8px', marginBottom: 4 }}>{sec.label}</div>}
              {sec.items.map(item => {
                const isActive = active === item.id;
                return (
                  <button key={item.id} onClick={() => onNav?.(item.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 9,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '10px 0' : pad.item,
                    borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2,
                    background: isActive ? 'rgba(0,229,255,0.1)' : 'transparent',
                    color: isActive ? 'var(--cyan)' : 'var(--muted2)',
                    fontSize: 13.5, fontWeight: isActive ? 500 : 400,
                    position: 'relative',
                  }}>
                    {isActive && !collapsed && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 16, borderRadius: 2, background: 'var(--cyan)' }}/>}
                    <Icon name={item.icon} size={15} color={isActive ? 'var(--cyan)' : 'currentColor'}/>
                    {!collapsed && <span style={{ marginLeft: collapsed ? 0 : 9 }}>{item.label}</span>}
                    {item.id === 'ai' && !collapsed && (
                      <div style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(180,76,255,0.15)', color: 'var(--purple)', border: '1px solid rgba(180,76,255,0.25)', borderRadius: 4, padding: '1px 5px' }}>NEW</div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User footer – hidden when collapsed for simplicity */}
      {!collapsed && (
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #00E5FF22, #B44CFF22)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--muted2)' }}>JD</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>Jamie Dev</div><div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Admin</div></div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}><Icon name="settings" size={14}/></button>
        </div>
      )}
    </aside>
  );
};
