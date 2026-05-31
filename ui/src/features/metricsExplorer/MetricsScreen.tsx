// src/features/metricsExplorer/MetricsScreen.jsx
import React, { useState } from 'react';
import { Icon, MetralyAreaChart, MetralySegmentedControl, MetralyButton, CardShell, MetralyInput } from '../../design-system';
import { makeTimeSeries } from '../../utils/seeds';
import { FilterPill } from './components/FilterPill';
import { TreeItem } from './components/TreeItem';
import { DORAPanel } from './components/DORAPanel';
import { BreakdownTable } from './components/BreakdownTable';
import { ExportBar } from './components/ExportBar';
import { Leaderboard } from '../../design-system';

// ---------- Static Data (unchanged from original) ----------
const WEEK_LABELS_30 = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 3, 1);
  d.setDate(d.getDate() + i);
  return i % 5 === 0 ? `${d.getMonth() + 1}/${d.getDate()}` : '';
});

const METRIC_TREE = [
  {
    id: 'dora', label: 'DORA Metrics', icon: 'zap', expanded: true,
    children: [
      { id: 'deploy-freq', label: 'Deployment Frequency', unit: 'deploys/day', color: 'var(--m-cyan-500)' },
      { id: 'lead-time', label: 'Lead Time for Changes', unit: 'hours', color: 'var(--m-purple-500)' },
      { id: 'cfr', label: 'Change Failure Rate', unit: '%', color: 'var(--m-warn)' },
      { id: 'mttr', label: 'MTTR', unit: 'minutes', color: 'var(--m-ok)' },
    ],
  },
  {
    id: 'ci', label: 'CI / CD', icon: 'activity',
    children: [
      { id: 'ci-pass', label: 'Build Success Rate', unit: '%', color: 'var(--m-ok)' },
      { id: 'ci-duration', label: 'Build Duration', unit: 'min', color: 'var(--m-cyan-500)' },
      { id: 'ci-queue', label: 'Pipeline Queue Time', unit: 'sec', color: 'var(--m-warn)' },
    ],
  },
  {
    id: 'pr', label: 'Pull Requests', icon: 'gitPR',
    children: [
      { id: 'pr-cycle', label: 'PR Cycle Time', unit: 'hours', color: 'var(--m-purple-500)' },
      { id: 'pr-review', label: 'Review Time', unit: 'hours', color: 'var(--m-cyan-500)' },
      { id: 'pr-merge', label: 'Merge Rate', unit: '%', color: 'var(--m-ok)' },
    ],
  },
  {
    id: 'teams', label: 'Teams', icon: 'users',
    children: [
      { id: 'velocity', label: 'Sprint Velocity', unit: 'pts', color: 'var(--m-cyan-500)' },
      { id: 'throughput', label: 'Throughput', unit: 'PRs/wk', color: 'var(--m-purple-500)' },
    ],
  },
];

const METRIC_DATA = {
  'deploy-freq': makeTimeSeries(30, 4.2, 1.8, 0.04, 11),
  'lead-time': makeTimeSeries(30, 38, 15, -0.3, 22),
  'cfr': makeTimeSeries(30, 4.5, 1.8, -0.08, 33),
  'mttr': makeTimeSeries(30, 44, 18, -1.2, 44),
  'ci-pass': makeTimeSeries(30, 88, 6, 0.2, 55),
  'ci-duration': makeTimeSeries(30, 4.8, 1.2, -0.04, 66),
  'ci-queue': makeTimeSeries(30, 38, 12, -0.5, 77),
  'pr-cycle': makeTimeSeries(30, 22, 8, 0.2, 88),
  'pr-review': makeTimeSeries(30, 14, 5, 0.1, 99),
  'pr-merge': makeTimeSeries(30, 84, 5, 0.1, 111),
  'velocity': makeTimeSeries(30, 72, 12, 0.4, 122),
  'throughput': makeTimeSeries(30, 8.4, 3, 0.1, 133),
};

const METRIC_COMPARE = Object.fromEntries(
  Object.entries(METRIC_DATA).map(([k, v]) => [
    k,
    makeTimeSeries(30, v[0] * 1.05, Math.abs(v[v.length - 1] - v[0]) * 0.5, 0, parseInt(k) + 200),
  ])
);

const TIME_RANGES = ['7d', '14d', '30d', '90d'];
const TEAMS = ['All teams', 'Platform', 'Backend', 'Frontend', 'Mobile', 'Data'];
const REPOS = ['All repos', 'monorepo', 'api-gateway', 'frontend-app', 'mobile-app', 'data-pipeline'];

// ---------- Main Component ----------
export const MetricsScreen = () => {
  const [selected, setSelected] = useState('deploy-freq');
  const [timeRange, setTimeRange] = useState('30d');
  const [compareMode, setCompareMode] = useState(false);
  const [team, setTeam] = useState('All teams');
  const [repo, setRepo] = useState('All repos');
  const [expandedGroups, setExpandedGroups] = useState(['dora', 'ci']);
  const [breakdownView, setBreakdownView] = useState('table'); // 'table' or 'leaderboard'

  const toggleGroup = (id: string) =>
    setExpandedGroups((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const allMetrics = METRIC_TREE.flatMap((g) => g.children || []);
  const currentMetric = allMetrics.find((m) => m.id === selected) || allMetrics[0];
  const data = METRIC_DATA[selected as keyof typeof METRIC_DATA] || [];
  const compareData = METRIC_COMPARE[selected] || [];

  // slice data based on timeRange
  let slicedData = data;
  let slicedCompare = compareData;
  if (timeRange === '7d') {
    slicedData = data.slice(-7);
    slicedCompare = compareData.slice(-7);
  } else if (timeRange === '14d') {
    slicedData = data.slice(-14);
    slicedCompare = compareData.slice(-14);
  } else if (timeRange === '90d') {
    // extend mock data to 90 points (just for demo)
    const extra = makeTimeSeries(60, data[data.length - 1], 5, 0, parseInt(selected) + 500);
    slicedData = [...data, ...extra];
    slicedCompare = [...compareData, ...extra.map((v) => v * 0.95)];
  }
  const chartData = slicedData.map((value, index) => ({
    name: WEEK_LABELS_30.slice(-slicedData.length)[index] || `${index + 1}`,
    value,
    compare: slicedCompare[index],
  }));

  const currentValue = slicedData[slicedData.length - 1];
  const prevValue = slicedData[0];
  const delta = currentValue - prevValue;
  const deltaStr = (delta >= 0 ? '+' : '') + (Math.abs(delta) < 10 ? delta.toFixed(1) : Math.round(delta));

  const isDORA = ['deploy-freq', 'lead-time', 'cfr', 'mttr'].includes(selected);

  return (
    <div className="metrics-screen" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left sidebar: Metric tree */}
      <div
        className="metrics-screen__sidebar"
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: '1px solid var(--m-line)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--m-bg-1)',
        }}
      >
        <div style={{ padding: '14px 10px 8px', borderBottom: '1px solid var(--m-line)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', color: 'var(--m-fg-2)', textTransform: 'uppercase', padding: '0 4px', marginBottom: 8 }}>
            Metrics
          </div>
          <MetralyInput search placeholder="Filter…" fullWidth style={{ fontSize: 12.5 }} />
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 4px' }}>
          {METRIC_TREE.map((group) => (
            <TreeItem
              key={group.id}
              item={group}
              selected={selected}
              onSelect={setSelected}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
            />
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderBottom: '1px solid var(--m-line)',
            flexShrink: 0,
            background: 'var(--m-bg-1)',
          }}
        >
          <MetralySegmentedControl options={TIME_RANGES.map(t => ({ value: t, label: t }))} value={timeRange} onChange={setTimeRange} size="sm" ariaLabel="Time range" />

          <FilterPill label="Team" options={TEAMS} value={team} onChange={setTeam} />
          <FilterPill label="Repo" options={REPOS} value={repo} onChange={setRepo} />

          <MetralyButton size="sm" variant={compareMode ? 'secondary' : 'ghost'} onClick={() => setCompareMode(c => !c)} iconLeft={<Icon name="layers" size={13} />}>Compare {compareMode ? 'ON' : 'OFF'}</MetralyButton>

          <div style={{ flex: 1 }} />
          <ExportBar metricId={selected} timeRange={timeRange} team={team} repo={repo} values={slicedData} />
          <MetralyButton size="sm" variant="ghost" iconLeft={<Icon name="activity" size={13} />}>Auto ▾</MetralyButton>
        </div>

        {/* Scrolling content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '18px 20px' }}>
          {isDORA && (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--m-font-display)', fontWeight: 600, fontSize: 13, color: 'var(--m-fg-0)' }}>
          DORA Metrics
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--m-line)' }} />
        <span style={{ fontSize: 11, color: 'var(--m-fg-2)', fontFamily: 'var(--m-font-mono)' }}>
          Click a metric to drill in
        </span>
      </div>
      <DORAPanel onSelect={setSelected} selected={[selected]} />
    </>
  )}

          {/* Chart card */}
          <CardShell className="fade-up" style={{ padding: '18px 20px', marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: currentMetric?.color || 'var(--m-cyan-500)',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--m-font-display)',
                      fontWeight: 600,
                      fontSize: 15,
                      color: 'var(--m-fg-0)',
                    }}
                  >
                    {currentMetric?.label}
                  </span>
                  {team !== 'All teams' && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--m-fg-2)',
                        background: 'var(--m-bg-3)',
                        padding: '2px 7px',
                        borderRadius: 4,
                      }}
                    >
                      {team}
                    </span>
                  )}
                  {repo !== 'All repos' && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--m-fg-2)',
                        background: 'var(--m-bg-3)',
                        padding: '2px 7px',
                        borderRadius: 4,
                      }}
                    >
                      {repo}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span
                    style={{
                      fontFamily: 'var(--m-font-display)',
                      fontSize: 32,
                      fontWeight: 700,
                      color: 'var(--m-fg-0)',
                    }}
                  >
                    {currentValue >= 100
                      ? Math.round(currentValue)
                      : currentValue.toFixed(1)}
                    {currentMetric?.unit?.startsWith('%') ? '%' : ''}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--m-fg-2)' }}>
                    {currentMetric?.unit?.startsWith('%') ? '' : currentMetric?.unit}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: 'var(--m-font-mono)',
                      color:
                        (delta <= 0 &&
                          [
                            'lead-time',
                            'cfr',
                            'mttr',
                            'ci-duration',
                            'ci-queue',
                            'pr-cycle',
                            'pr-review',
                          ].includes(selected)) ||
                        (delta >= 0 &&
                          ![
                            'lead-time',
                            'cfr',
                            'mttr',
                            'ci-duration',
                            'ci-queue',
                            'pr-cycle',
                            'pr-review',
                          ].includes(selected))
                          ? 'var(--m-ok)'
                          : 'var(--m-err)',
                    }}
                  >
                    {deltaStr} {currentMetric?.unit?.startsWith('%') ? 'pp' : currentMetric?.unit} vs{' '}
                    {timeRange} ago
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['Area', 'Bar', 'Table'].map((t) => (
                  <button
                    key={t}
                    style={{
                      padding: '4px 9px',
                      borderRadius: 6,
                      fontSize: 12,
                      border: '1px solid var(--m-line)',
                      background: t === 'Area' ? 'color-mix(in srgb, var(--m-cyan-500) 10%, transparent)' : 'transparent',
                      color: t === 'Area' ? 'var(--m-cyan-500)' : 'var(--m-fg-1)',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <MetralyAreaChart
              data={chartData}
              xKey="name"
              height={180}
              series={
                compareMode
                  ? [
                      { dataKey: 'value', tone: currentMetric?.color || 'var(--m-cyan-500)' },
                      { dataKey: 'compare', tone: 'var(--m-purple-500)' },
                    ]
                  : [{ dataKey: 'value', tone: currentMetric?.color || 'var(--m-cyan-500)' }]
              }
              ariaLabel={`${currentMetric?.label} trend`}
              summary={`Range ${timeRange}`}
            />
          </CardShell>

          {/* Breakdown table */}
          <CardShell className="fade-up-1" style={{ padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontFamily: 'var(--m-font-display)', fontWeight: 600, fontSize: 13, color: 'var(--m-fg-0)' }}>Breakdown</span>
                <div style={{ flex: 1, height: 1, background: 'var(--m-line)' }} />
                <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setBreakdownView('table')} style={{
                    padding: '4px 9px', borderRadius: 6, fontSize: 12,
                    border: breakdownView === 'table' ? '1px solid color-mix(in srgb, var(--m-cyan-500) 40%, transparent)' : '1px solid var(--m-line)',
                    background: breakdownView === 'table' ? 'color-mix(in srgb, var(--m-cyan-500) 10%, transparent)' : 'transparent',
                    color: breakdownView === 'table' ? 'var(--m-cyan-500)' : 'var(--m-fg-1)',
                    cursor: 'pointer'
                    }}>Table</button>
                    <button onClick={() => setBreakdownView('leaderboard')} style={{
                    padding: '4px 9px', borderRadius: 6, fontSize: 12,
                    border: breakdownView === 'leaderboard' ? '1px solid color-mix(in srgb, var(--m-cyan-500) 40%, transparent)' : '1px solid var(--m-line)',
                    background: breakdownView === 'leaderboard' ? 'color-mix(in srgb, var(--m-cyan-500) 10%, transparent)' : 'transparent',
                    color: breakdownView === 'leaderboard' ? 'var(--m-cyan-500)' : 'var(--m-fg-1)',
                    cursor: 'pointer'
                    }}>Leaderboard</button>
                </div>
                </div>

                {breakdownView === 'table' ? (
                <BreakdownTable metricId={selected} />
                ) : (
                <Leaderboard
                    title=""
                    items={(() => {
                    // transform breakdown data into leaderboard format
                    const rows = {
                        'deploy-freq': [
                        ['api-gateway', 'Platform', '6.2/day'],
                        ['frontend-app', 'Frontend', '3.8/day'],
                        ['mobile-app', 'Mobile', '1.2/day'],
                        ['data-pipeline', 'Data', '0.4/day'],
                        ['auth-service', 'Backend', '5.1/day'],
                        ],
                        'lead-time': [
                        ['Platform', '—', '28h'],
                        ['Backend', '—', '22h'],
                        ['Frontend', '—', '52h'],
                        ['Mobile', '—', '61h'],
                        ['Data', '—', '44h'],
                        ],
                    };
                    const data = rows[selected as keyof typeof rows] || rows['deploy-freq'];
                    return data.map((r: string[]) => ({ name: r[0], value: parseFloat(r[2]) }));
                    })()}
                    unit={currentMetric?.unit === 'deploys/day' ? '/day' : currentMetric?.unit}
                    color={currentMetric?.color || 'var(--m-cyan-500)'}
                />
                )}
          </CardShell>

          {/* Custom formula */}
          <CardShell className="fade-up-2" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span
                style={{
                  fontFamily: 'var(--m-font-display)',
                  fontWeight: 600,
                  fontSize: 13,
                  color: 'var(--m-fg-0)',
                }}
              >
                Custom Formula
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--m-line)' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div
                style={{
                  flex: 1,
                  fontFamily: 'var(--m-font-mono)',
                  fontSize: 12.5,
                  color: 'var(--m-cyan-500)',
                  background: 'color-mix(in srgb, var(--m-cyan-500) 4%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--m-cyan-500) 15%, transparent)',
                  borderRadius: 8,
                  padding: '10px 14px',
                }}
              >
                deploy_frequency * (1 - change_failure_rate / 100)
              </div>
              <button
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  background: 'color-mix(in srgb, var(--m-cyan-500) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--m-cyan-500) 20%, transparent)',
                  color: 'var(--m-cyan-500)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Run
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--m-fg-2)' }}>
              Result:{' '}
              <span style={{ color: 'var(--m-fg-0)', fontFamily: 'var(--m-font-mono)' }}>
                4.07 adjusted deploys/day
              </span>
            </div>
          </CardShell>
        </div>
      </div>
    </div>
  );
};
