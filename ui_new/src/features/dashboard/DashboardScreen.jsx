import React from 'react';
import { StatCard, AIInsightCard, SH } from '../../components/ui';
import { useTweaks } from '../../context/TweaksContext';

const navItems = [
  { to: '/', label: 'Overview', icon: 'home' },
  { to: '/dash-cto', label: 'CTO', icon: 'trendingUp' },
  { to: '/dash-vp', label: 'VP Eng', icon: 'users' },
  { to: '/dash-tl', label: 'Tech Lead', icon: 'gitPR' },
  { to: '/dash-devops', label: 'DevOps', icon: 'cpu' },
  { to: '/dash-ic', label: 'My View', icon: 'activity' },
];

const metrics = [
  { icon: 'gitPR', label: 'Synthetic PRs awaiting review', value: '14', trend: '+3 today', trendDir: 'down', color: 'cyan', sparkData: [4,7,5,9,6,8,11,14] },
  { icon: 'xCircle', label: 'Synthetic failed builds (24h)', value: '3', trend: '−5 vs sample avg', trendDir: 'up', color: 'error', sparkData: [12,9,11,7,5,8,4,3] },
  { icon: 'alertTri', label: 'Synthetic blocked tasks', value: '7', trend: 'No change', trendDir: 'neutral', color: 'warning', sparkData: [5,6,7,7,6,8,7,7] },
  { icon: 'clock', label: 'Synthetic median CI time', value: '4m 22s', trend: '−18s', trendDir: 'up', color: 'purple', sparkData: [8,7,9,6,7,5,5,4] },
];

const insights = [
  { title: 'Synthetic CI slowdown example', body: 'Sample workflows exceeded scripted latency thresholds in the synthetic monorepo preview. This is demo-only data.', action: 'View sample jobs' },
  { title: 'Synthetic PR review imbalance', body: 'Demo activity shows a simulated review queue imbalance for illustrative purposes only.', action: 'Open sample queue' },
  { title: 'Synthetic deployment cadence change', body: 'This synthetic preview shows a scripted deployment frequency drop compared to the demo rolling average.', action: 'View sample trend' },
];

const recentActivity = [
  { who: 'demo-bot', what: 'Synthetic CI pipeline triggered for sample feature branch', when: '2 min ago', color: 'var(--cyan)' },
  { who: 'sample.user', what: 'Synthetic PR merged in demo environment', when: '14 min ago', color: 'var(--success)' },
  { who: 'preview.team', what: 'Synthetic PR opened in sample repository', when: '31 min ago', color: 'var(--warning)' },
  { who: 'demo-ci', what: 'Synthetic staging deploy example failed', when: '1 hr ago', color: 'var(--error)' },
];

export const DashboardScreen = () => {
  const { tweaks } = useTweaks();
  const density = tweaks.density;
  const gap = { compact: 12, comfortable: 16, spacious: 24 }[density];

  const contentPadding = {
    compact: '10px 20px 16px',
    comfortable: '12px 28px 24px',
    spacious: '16px 36px 32px',
  }[density];

  const headerPadding = {
    compact: '8px 20px 0',
    comfortable: '10px 28px 0',
    spacious: '12px 36px 0',
  }[density];

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, padding: headerPadding }}>
        <SH navItems={navItems} activePath="/" showNewDashboard />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: contentPadding }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap, marginBottom: gap * 2 }}>
          {metrics.map((m, i) => (
            <StatCard key={i} icon={m.icon} label={m.label} value={m.value} trend={m.trend} trendDir={m.trendDir} color={m.color} spark={m.sparkData} delay={i} />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Synthetic Insights</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Demo snapshot</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
          {insights.map((ins, i) => <AIInsightCard key={i} title={ins.title} body={ins.body} action={ins.action} delay={i} />)}
        </div>

        <div className="fade-up-4" style={{ background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>Synthetic Recent Activity</span>
            <button style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontSize: 12, cursor: 'pointer' }}>View sample activity →</button>
          </div>
          {recentActivity.map((ev, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--muted2)', marginRight: 6 }}>{ev.who}</span>
                  {ev.what}
                </div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{ev.when}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
