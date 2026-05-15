import React, { useMemo, useState } from 'react';
import { Icon } from '../../components/shared/Icon';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const plugins = [
  { name: 'GitHub Advanced',  cat: 'Sources',   icon: 'github',   desc: 'Deep PR analytics, CODEOWNERS, security alerts and advanced workflow metrics.',  rating: 4.9, installs: '12.4k', installed: true,  color: '#E8EDF5' },
  { name: 'Jira Sync Pro',    cat: 'Sources',   icon: 'jira',     desc: 'Bi‑directional sync with Jira epics, sprints, velocity and burndown charts.',       rating: 4.7, installs: '8.1k',  installed: false, color: '#2684FF' },
  { name: 'AI Explainer',     cat: 'AI',        icon: 'brain',    desc: 'Adds natural language summaries to any metric card. Powered by your local LLM.',    rating: 4.8, installs: '5.6k',  installed: true,  color: '#B44CFF' },
  { name: 'Slack Digest',     cat: 'Alerts',    icon: 'slack',    desc: 'Daily and weekly engineering digests posted directly to your Slack channels.',       rating: 4.5, installs: '9.3k',  installed: false, color: '#4A154B' },
  { name: 'PagerDuty Bridge', cat: 'Alerts',    icon: 'pagerduty',desc: 'Surface incident impact on engineering metrics. MTTD, MTTR in your dashboards.',     rating: 4.6, installs: '3.8k',  installed: false, color: '#06AC38' },
  { name: 'CSV Exporter',     cat: 'Exporters', icon: 'database', desc: 'Export any dashboard to CSV with configurable date ranges and field mapping.',        rating: 4.2, installs: '6.7k',  installed: false, color: '#FF9100' },
  { name: 'Linear Tracker',   cat: 'Sources',   icon: 'linear',   desc: 'Sync Linear cycles, projects and issue velocity into your engineering health view.',  rating: 4.8, installs: '4.2k',  installed: false, color: '#5E6AD2' },
  { name: 'Grafana Bridge',   cat: 'Exporters', icon: 'chart',    desc: 'Push Metraly metrics into your existing Grafana instance via a native datasource.',   rating: 4.4, installs: '2.9k',  installed: false, color: '#FF6B35' },
  { name: 'AI Anomaly Guard', cat: 'AI',        icon: 'sparkles', desc: 'ML‑powered anomaly detection across all your DORA metrics with Slack/email alerts.', rating: 4.9, installs: '1.7k',  installed: false, color: '#00E5FF' },
];

const filters = ['All', 'Sources', 'Exporters', 'AI', 'Alerts'];

type NotificationChannelId = 'slack' | 'pagerduty';

interface NotificationChannelConfig {
  enabled: boolean;
  destination: string;
  cadence: 'Daily' | 'Weekly';
}

const defaultNotificationChannels: Record<NotificationChannelId, NotificationChannelConfig> = {
  slack: {
    enabled: true,
    destination: '#engineering-health',
    cadence: 'Daily',
  },
  pagerduty: {
    enabled: false,
    destination: 'Primary on-call',
    cadence: 'Weekly',
  },
};

export const PluginScreen = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [channels, setChannels] = useLocalStorage<Record<NotificationChannelId, NotificationChannelConfig>>(
    'metraly.notification-channels',
    defaultNotificationChannels,
  );

  const activeChannels = useMemo(
    () => (Object.entries(channels) as [NotificationChannelId, NotificationChannelConfig][]).filter(([, channel]) => channel.enabled),
    [channels],
  );

  const filteredPlugins = plugins.filter(p => {
    const matchesFilter = filter === 'All' || p.cat === filter;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.desc.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
      <div
        className="fade-up"
        style={{
          marginBottom: 18,
          padding: 18,
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--glass)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Notification channels</div>
            <div style={{ fontSize: 12, color: 'var(--muted2)' }}>Configure a Slack digest or PagerDuty bridge for alerts.</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {activeChannels.length} active
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          {(Object.entries(channels) as [NotificationChannelId, NotificationChannelConfig][]).map(([id, channel]) => {
            const label = id === 'slack' ? 'Slack' : 'PagerDuty';
            const icon = id === 'slack' ? 'slack' : 'pagerduty';
            const accent = id === 'slack' ? '#4A154B' : '#06AC38';
            return (
              <div
                key={id}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: channel.enabled ? `1px solid ${accent}33` : '1px solid var(--border)',
                  background: channel.enabled ? `${accent}0a` : 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `${accent}18`, border: `1px solid ${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={icon} size={16} color={accent} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted2)' }}>Digest and incident routing</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChannels((prev) => ({ ...prev, [id]: { ...prev[id], enabled: !prev[id].enabled } }))}
                    style={{
                      width: 40,
                      height: 22,
                      borderRadius: 999,
                      border: 'none',
                      cursor: 'pointer',
                      background: channel.enabled ? 'var(--cyan)' : 'rgba(255,255,255,0.14)',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 2,
                        left: channel.enabled ? 20 : 2,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: 'white',
                        transition: 'left 0.15s ease',
                      }}
                    />
                  </button>
                </div>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Destination</span>
                  <input
                    value={channel.destination}
                    onChange={(e) => setChannels((prev) => ({ ...prev, [id]: { ...prev[id], destination: e.target.value } }))}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--glass2)',
                      color: 'var(--text)',
                      fontSize: 12.5,
                      outline: 'none',
                    }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Cadence</span>
                  <select
                    value={channel.cadence}
                    onChange={(e) => setChannels((prev) => ({ ...prev, [id]: { ...prev[id], cadence: e.target.value as NotificationChannelConfig['cadence'] } }))}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--glass2)',
                      color: 'var(--text)',
                      fontSize: 12.5,
                      outline: 'none',
                    }}
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                  </select>
                </label>
              </div>
            );
          })}
        </div>
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
            placeholder="Search plugins…"
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
                border: filter === f ? '1px solid color-mix(in srgb, var(--cyan) 40%, transparent)' : '1px solid var(--border)',
                background: filter === f ? 'color-mix(in srgb, var(--cyan) 10%, transparent)' : 'var(--glass)',
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
              {/* Card content – unchanged */}
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
                {p.installed && (
                  <div style={{
                    fontSize: 10.5,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--success)',
                    background: 'color-mix(in srgb, var(--success) 10%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--success) 20%, transparent)',
                    borderRadius: 5,
                    padding: '2px 7px',
                  }}>
                    Installed
                  </div>
                )}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="star" size={12} color="#FFD600" style={{ fill: '#FFD600' }} />
                  <span style={{ fontSize: 12, color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>{p.rating}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {p.installs}</span>
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
                    background: p.installed ? 'transparent' : 'color-mix(in srgb, var(--cyan) 10%, transparent)',
                    border: p.installed ? '1px solid var(--border)' : '1px solid color-mix(in srgb, var(--cyan) 25%, transparent)',
                    color: p.installed ? 'var(--muted)' : 'var(--cyan)',
                  }}
                >
                  {p.installed ? 'Manage' : 'Install'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
