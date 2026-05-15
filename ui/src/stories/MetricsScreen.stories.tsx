import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';

// ---------------------------------------------------------------------------
// Static fixture data
// ---------------------------------------------------------------------------

const METRIC_TREE = [
  {
    id: 'dora', label: 'DORA Metrics', expanded: true,
    children: [
      { id: 'deploy-freq', label: 'Deployment Frequency', unit: 'deploys/day' },
      { id: 'lead-time', label: 'Lead Time for Changes', unit: 'hours' },
      { id: 'cfr', label: 'Change Failure Rate', unit: '%' },
      { id: 'mttr', label: 'MTTR', unit: 'minutes' },
    ],
  },
  {
    id: 'ci', label: 'CI / CD', expanded: false,
    children: [
      { id: 'ci-pass', label: 'Build Success Rate', unit: '%' },
      { id: 'ci-duration', label: 'Build Duration', unit: 'min' },
    ],
  },
  {
    id: 'pr', label: 'Pull Requests', expanded: false,
    children: [
      { id: 'pr-cycle', label: 'PR Cycle Time', unit: 'hours' },
      { id: 'pr-review', label: 'Review Time', unit: 'hours' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TreeSection({
  section,
  selectedId,
  onSelect,
}: {
  section: typeof METRIC_TREE[number];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(section.expanded);

  return (
    <div>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'rgba(226,230,240,0.4)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span>{expanded ? '▾' : '▸'}</span>
        {section.label}
      </div>
      {expanded &&
        section.children.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item.id)}
            style={{
              padding: '6px 12px 6px 24px',
              fontSize: 12,
              cursor: 'pointer',
              color: item.id === selectedId ? '#00E5FF' : 'rgba(226,230,240,0.65)',
              background: item.id === selectedId ? 'rgba(0,229,255,0.06)' : 'transparent',
              borderLeft: item.id === selectedId ? '2px solid #00E5FF' : '2px solid transparent',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{item.label}</span>
            <span style={{ fontSize: 9, color: 'rgba(226,230,240,0.3)', fontFamily: 'monospace' }}>{item.unit}</span>
          </div>
        ))}
    </div>
  );
}

function SparklinePlaceholder({ color = '#00E5FF' }: { color?: string }) {
  return (
    <svg width="100%" height="80" viewBox="0 0 300 80" preserveAspectRatio="none" aria-hidden>
      <polyline
        points="0,60 30,45 60,50 90,30 120,35 150,20 180,25 210,15 240,20 270,10 300,12"
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity="0.7"
      />
      <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.15" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient>
      <polygon
        points="0,60 30,45 60,50 90,30 120,35 150,20 180,25 210,15 240,20 270,10 300,12 300,80 0,80"
        fill="url(#fill)"
      />
    </svg>
  );
}

function MetricsExplorerLayout({ selectedMetric = 'deploy-freq' }: { selectedMetric?: string }) {
  const [selected, setSelected] = React.useState(selectedMetric);
  const metric = METRIC_TREE.flatMap((s) => s.children).find((m) => m.id === selected);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: '#0B0F19',
        color: '#E2E6F0',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Left tree */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          paddingTop: 12,
        }}
      >
        {METRIC_TREE.map((section) => (
          <TreeSection key={section.id} section={section} selectedId={selected} onSelect={setSelected} />
        ))}
      </div>

      {/* Main chart area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header
          style={{
            height: 51,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            gap: 12,
            background: 'rgba(11,15,25,0.9)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700 }}>{metric?.label ?? 'Metrics Explorer'}</span>
          <div style={{ flex: 1 }} />
          {['7d', '14d', '30d', '90d'].map((r) => (
            <span
              key={r}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                background: r === '30d' ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.04)',
                color: r === '30d' ? '#00E5FF' : 'rgba(226,230,240,0.5)',
                cursor: 'pointer',
                border: r === '30d' ? '1px solid rgba(0,229,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {r}
            </span>
          ))}
        </header>

        {/* Chart */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div
            style={{
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12,
              padding: '20px 24px',
              background: 'rgba(255,255,255,0.02)',
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 10, color: 'rgba(226,230,240,0.4)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 12 }}>
              {metric?.label ?? 'Metric'} · {metric?.unit}
            </div>
            <SparklinePlaceholder color="#00E5FF" />
          </div>

          {/* DORA summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {[{ label: 'p50', value: '22h' }, { label: 'p95', value: '48h' }, { label: 'Change', value: '-8%', positive: true }, { label: 'Samples', value: '1,241' }].map(
              (stat) => (
                <div
                  key={stat.label}
                  style={{
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ fontSize: 9, color: 'rgba(226,230,240,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#E2E6F0' }}>{stat.value}</div>
                </div>
              ),
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Screens/MetricsScreen',
  parameters: { layout: 'fullscreen' },
};

export default meta;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Default: DORA metrics selected, deployment frequency active. */
export const Default: StoryObj = {
  render: () => <MetricsExplorerLayout selectedMetric="deploy-freq" />,
};

/** Lead time selected: different metric highlighted in tree. */
export const LeadTimeSelected: StoryObj = {
  render: () => <MetricsExplorerLayout selectedMetric="lead-time" />,
};
