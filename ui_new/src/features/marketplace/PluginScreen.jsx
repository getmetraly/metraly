import React, { useState } from 'react';
import { Icon } from '../../components/shared/Icon';

const plugins = [
  { name: 'GitHub Advanced',  cat: 'Sources',   icon: 'github',   desc: 'Mock listing for PR analytics, CODEOWNERS, security alerts and workflow metrics.',  color: '#E8EDF5' },
  { name: 'Jira Sync Pro',    cat: 'Sources',   icon: 'jira',     desc: 'Mock listing for Jira epics, sprints, velocity and burndown charts.',       color: '#2684FF' },
  { name: 'AI Explainer',     cat: 'AI',        icon: 'brain',    desc: 'Mock listing for natural-language metric summaries. Not a live plugin.',    color: '#B44CFF' },
  { name: 'Slack Digest',     cat: 'Alerts',    icon: 'slack',    desc: 'Mock listing for daily and weekly engineering digests.',       color: '#4A154B' },
  { name: 'PagerDuty Bridge', cat: 'Alerts',    icon: 'pagerduty',desc: 'Mock listing for incident-impact views in engineering metrics.',     color: '#06AC38' },
  { name: 'CSV Exporter',     cat: 'Exporters', icon: 'database', desc: 'Mock listing for dashboard export flows.',        color: '#FF9100' },
  { name: 'Linear Tracker',   cat: 'Sources',   icon: 'linear',   desc: 'Mock listing for Linear cycles, projects and issue velocity.',  color: '#5E6AD2' },
  { name: 'Grafana Bridge',   cat: 'Exporters', icon: 'chart',    desc: 'Mock listing for exporting metrics into an existing Grafana view.',   color: '#FF6B35' },
  { name: 'AI Anomaly Guard', cat: 'AI',        icon: 'sparkles', desc: 'Mock listing for future anomaly-detection workflows. Not live ML.', color: '#00E5FF' },
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
        <strong style={{ color: 'var(--cyan)' }}>Plugin marketplace preview.</strong> Listings are mock demo content. Review, signing, revocation and install flows are not implemented in this demo.
      </div>

      {/* Search and filters bar */}
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

      {/* Plugin grid */}
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
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Mock listing</span>
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
                  View details
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};