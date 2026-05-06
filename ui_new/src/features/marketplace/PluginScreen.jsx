import React, { useState } from 'react';
import { Icon } from '../../components/shared/Icon';

const plugins = [
  { name: 'GitHub Source Preview',  cat: 'Sources',   icon: 'github',   desc: 'Mock listing for repo, PR, CI workflow, CODEOWNERS, and security signal previews.', color: '#E8EDF5' },
  { name: 'Jira Source Preview',    cat: 'Sources',   icon: 'jira',     desc: 'Mock listing for issue, sprint, backlog, velocity, and burndown previews.', color: '#2684FF' },
  { name: 'AI Summary Preview',     cat: 'AI',        icon: 'brain',    desc: 'Scripted sample summaries for metric cards. Not live AI inference.', color: '#B44CFF' },
  { name: 'Slack Digest Preview',   cat: 'Alerts',    icon: 'slack',    desc: 'Mock listing for daily and weekly digest concepts. No Slack message is sent.', color: '#4A154B' },
  { name: 'PagerDuty Preview',      cat: 'Alerts',    icon: 'pagerduty',desc: 'Mock listing for incident-impact preview widgets. No PagerDuty integration is active.', color: '#06AC38' },
  { name: 'CSV Export Preview',     cat: 'Exporters', icon: 'database', desc: 'Mock listing for dashboard export concepts. Export flow is not implemented in this demo.', color: '#FF9100' },
  { name: 'Linear Source Preview',  cat: 'Sources',   icon: 'linear',   desc: 'Mock listing for cycles, projects, issue velocity, and delivery preview data.', color: '#5E6AD2' },
  { name: 'Grafana Bridge Preview', cat: 'Exporters', icon: 'chart',    desc: 'Mock listing for Grafana datasource concepts. No external datasource is configured.', color: '#FF6B35' },
  { name: 'Anomaly Preview',        cat: 'AI',        icon: 'sparkles', desc: 'Synthetic metric-change flag preview. Not live ML anomaly detection.', color: '#00E5FF' },
];

const filters = ['All', 'Sources', 'Exporters', 'AI', 'Alerts'];

export const PluginScreen = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const filteredPlugins = plugins.filter(p => {
    const matchesFilter = filter === 'All' || p.cat === filter;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.desc.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
      <div style={{ marginBottom: 18, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(0,229,255,0.18)', background: 'rgba(0,229,255,0.06)', color: 'var(--muted2)', fontSize: 12.5, lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--cyan)' }}>Plugin preview only.</strong> Listings are mock demo content. Review, signing, revocation, installation, and external integration flows are not implemented in this demo.
      </div>

      <div className="fade-up" style={{ display: 'flex', gap: 12, marginBottom: 22, alignItems: 'center' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--glass)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '8px 14px',
        }}>
          <Icon name="search" size={14} color="var(--muted)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search mock plugin listings…"
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text)',
              fontSize: 13.5,
              fontFamily: 'var(--font-body)',
              width: '100%',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                cursor: 'pointer',
                border: filter === f ? '1px solid rgba(0,229,255,0.4)' : '1px solid var(--border)',
                background: filter === f ? 'rgba(0,229,255,0.1)' : 'var(--glass)',
                color: filter === f ? 'var(--cyan)' : 'var(--muted2)',
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                transition: 'all 0.15s',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
       {filteredPlugins.map((p, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <div
              key={p.name}
              className={`fade-up-${Math.min(i + 1, 6)}`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                background: isHovered ? 'var(--glass2)' : 'var(--glass)',
                border: isHovered ? '1px solid var(--border2)' : '1px solid var(--border)',
                borderRadius: 14,
                padding: '18px 18px 16px',
                transition: 'all 0.2s ease',
                transform: isHovered ? 'translateY(-2px)' : 'none',
                boxShadow: isHovered ? '0 8px 32px rgba(0,0,0,0.35)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: `${p.color}15`,
                  border: `1px solid ${p.color}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon name={p.icon} size={18} color={p.color} />
                </div>
                <div style={{
                  fontSize: 10.5,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--cyan)',
                  background: 'rgba(0,229,255,0.1)',
                  border: '1px solid rgba(0,229,255,0.2)',
                  borderRadius: 5,
                  padding: '2px 7px',
                }}>
                  Preview
                </div>
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-head)',
                  fontWeight: 600,
                  fontSize: 14,
                  color: 'var(--text)',
                  marginBottom: 5,
                }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {p.desc}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  Mock listing
                </div>
                <button
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s',
                    background: 'rgba(0,229,255,0.1)',
                    border: '1px solid rgba(0,229,255,0.25)',
                    color: 'var(--cyan)',
                  }}
                >
                  View mock details
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
