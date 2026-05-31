import type { WidgetType, WidgetConfig } from '../../types/widgets';
import React from 'react';
import {
  MetralyTable,
  StateBadge,
  MetralyMetricCard,
  TrendBadge,
  Leaderboard,
  MetralyChartCard,
  MetralyAreaChart,
  MetralyBarChart,
  MetralyGauge,
  MetralyHeatmap,
  CardShell,
  AIInsightCard,
} from '../../design-system';
import type { StatCardConfig, LeaderboardConfig, DataTableConfig, MetricChartConfig, HeatmapConfig } from '../../types/widgets';
import { Icon } from '../shared/Icon';
const IS_VITEST = import.meta.env.MODE === 'test';

function TestChartFallback({ summary }: { summary: string }) {
  return (
    <div
      aria-label={summary}
      style={{
        height: 140,
        border: '1px dashed var(--line)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted)',
        fontSize: 12,
      }}
    >
      Chart preview
    </div>
  );
}
const iconMap: Record<string, string> = {
  'deploy-freq': 'rocket',
  'lead-time': 'clock',
  'cfr': 'alertCircle',
  'mttr': 'zap',
  'ci-pass': 'checkCircle',
  'ci-duration': 'timer',
  'ci-queue': 'layers',
  'pr-cycle': 'gitMerge',
  'pr-review': 'gitPullRequest',
  'pr-merge': 'gitCommit',
  'velocity': 'trendingUp',
  'throughput': 'activity',
  'health-score': 'heart',
  'sprint-burndown': 'target',
};

const labelMap: Record<string, string> = {
  'deploy-freq': 'Deploy Frequency',
  'lead-time': 'Lead Time',
  'cfr': 'Change Failure Rate',
  'mttr': 'MTTR',
  'ci-pass': 'CI Pass Rate',
  'ci-pass-rate': 'CI Pass Rate',
  'ci-duration': 'CI Duration',
  'ci-queue': 'CI Queue Time',
  'pr-cycle': 'PR Cycle Time',
  'pr-review': 'PR Review Time',
  'pr-merge': 'PR Merge Time',
  'velocity': 'Velocity',
  'throughput': 'Throughput',
  'health-score': 'Health Score',
  'sprint-burndown': 'Sprint Burndown',
};

function resolveLabel(metricId: string): string {
  if (labelMap[metricId]) return labelMap[metricId];
  return metricId
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

const colorMap: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
  cyan: 'primary',
  purple: 'secondary',
  success: 'success',
  warning: 'warning',
  error: 'error',
};

const widgetStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
};

const DORA_LEVEL_STATE_MAP: Record<string, "success" | "live" | "warning" | "error" | "info"> = {
  Elite: 'success',
  High: 'live',
  Med: 'warning',
  Low: 'error',
};

const StatCardWidget = ({ config, data }: { config: WidgetConfig; data?: any }) => {
  const cfg = config as StatCardConfig;
  if (!data) return <div style={{...widgetStyle, padding: 20}}>Loading...</div>;

  const icon = iconMap[cfg.metricId] || 'activity';
  const color = colorMap[cfg.colorKey] || 'primary';

  // Parse delta to get trend direction
  const trendDir = data.delta?.startsWith('+') ? 'up' : data.delta?.startsWith('-') ? 'down' : 'flat';
  const trendSentiment = trendDir === 'up' ? 'positive' : trendDir === 'down' ? 'negative' : 'neutral';
  return (
    <div style={widgetStyle}>
    <MetralyMetricCard
      icon={<Icon name={icon} size={15} color="currentColor" />}
      title={resolveLabel(cfg.metricId || '')}
      value={data.value || '0'}
      description={undefined}
      variant={color}
      footer={
        data.delta ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendBadge direction={trendDir} sentiment={trendSentiment} value={data.delta} size="sm" />
          </div>
        ) : undefined
      }
    />
    </div>
  );
};

const MetricChartWidget = ({ config, data }: { config: WidgetConfig; data?: any }) => {
  const cfg = config as MetricChartConfig;
  if (!data) return <div style={widgetStyle}><div style={{padding: 20}}>Loading...</div></div>;

  const chartVariant = cfg.chartVariant || 'area';
  const showCompare = cfg.showCompare ?? false;
  const currentValues = data.current?.values || [];
  const compareValues = showCompare && data.previous?.values ? data.previous.values : null;
  const labels = data.labels || [];

  const labelMap: Record<string, string> = {
    'lead-time': 'Lead Time',
    'velocity': 'Velocity',
    'cfr': 'Change Failure Rate',
    'deploy-freq': 'Deploy Frequency',
    'mttr': 'MTTR',
  };


  const displayLabel = labelMap[cfg.metricId] || data.label || cfg.metricId;
  const isBar = chartVariant === 'bar' || chartVariant === 'bar-horizontal';
  const currentValue = currentValues[currentValues.length - 1] || 0;
  const displayValue = currentValue >= 1000 ? `${(currentValue/1000).toFixed(1)}k` : currentValue.toFixed(1);

  const points = labels.map((label: string, index: number) => ({
    label,
    current: Number(currentValues[index] ?? 0),
    compare: Number(compareValues?.[index] ?? 0),
  }));
  const summary = `${displayLabel}: ${displayValue}${data.unit ?? ''}`;

  return (
    <div style={widgetStyle}>
      <MetralyChartCard
        title={displayLabel}
        summary={summary}
        description={data.unit ? `Unit: ${data.unit}` : undefined}
      >
        {IS_VITEST ? (
          <TestChartFallback summary={summary} />
        ) : isBar ? (
          <MetralyBarChart
            data={points}
            xKey="label"
            series={[
              { dataKey: 'current', name: 'Current', tone: 'cyan' },
              ...(compareValues ? [{ dataKey: 'compare', name: 'Previous', tone: 'purple' as const }] : []),
            ]}
            ariaLabel={`${displayLabel} bar chart`}
            summary={summary}
            height={140}
          />
        ) : (
          <MetralyAreaChart
            data={points}
            xKey="label"
            series={[
              { dataKey: 'current', name: 'Current', tone: 'cyan' },
              ...(compareValues ? [{ dataKey: 'compare', name: 'Previous', tone: 'purple' as const }] : []),
            ]}
            ariaLabel={`${displayLabel} area chart`}
            summary={summary}
            height={140}
          />
        )}
      </MetralyChartCard>
    </div>
  );
};

const LeaderboardWidget = ({ config, data }: { config: WidgetConfig; data?: any }) => {
  const cfg = config as LeaderboardConfig;
  if (!data || !Array.isArray(data)) return <div style={widgetStyle}><div style={{padding: 20}}>Loading...</div></div>;

  const labelMap: Record<string, string> = {
    'deploy-freq': 'Deploy Frequency',
    'lead-time': 'Lead Time',
    'cfr': 'Change Failure Rate',
    'mttr': 'MTTR',
    'ci-pass': 'CI Pass Rate',
    'ci-duration': 'CI Duration',
    'pr-cycle': 'PR Cycle Time',
    'pr-review': 'PR Review Time',
    'pr-merge': 'PR Merge Time',
    'velocity': 'Velocity',
    'throughput': 'Throughput',
    'health-score': 'Health Score',
    'sprint-burndown': 'Sprint Burndown',
  };

  const unitMap: Record<string, string> = {
    'deploy-freq': '/week',
    'lead-time': 'h',
    'cfr': '%',
    'mttr': 'min',
    'ci-pass': '%',
    'ci-duration': 'min',
    'pr-cycle': 'h',
    'pr-review': 'h',
    'pr-merge': 'min',
    'velocity': 'pts',
    'throughput': ' items',
    'health-score': '%',
    'sprint-burndown': ' pts',
  };

  const items = data.map((item: any, i: number) => ({
    name: item.team || item.name || `Item ${i}`,
    value: Number(item.valueRaw || item.value || 0),
  }));

  const title = labelMap[cfg.metricId] || cfg.metricId;
  const unit = unitMap[cfg.metricId] || '';
  const height = 60 + items.length * 30; // Dynamic height: title + items

  return (
    <CardShell style={{...widgetStyle, height}} density="compact">
      <Leaderboard items={items} color="#00E5FF" unit={unit} title={title} />
    </CardShell>
  );
};

const DataTableWidget = ({ config, data }: { config: WidgetConfig; data?: any }) => {
  const cfg = config as DataTableConfig;
  if (!data || !data.rows || data.rows.length === 0) return <div style={widgetStyle}><div style={{padding: 20, color: 'var(--muted)'}}>No data</div></div>;

  const titleMap: Record<string, string> = {
    'pr-queue': 'PR Review Queue',
    'ci-failures': 'Failing Builds',
    'incidents': 'Incidents',
    'delivery-risk': 'Delivery Risk',
    'my-prs': 'My PRs',
    'review-queue': 'Review Queue',
    'blocked-tasks': 'Blocked Tasks',
  };

  const hasExtraFields = cfg.tableType === 'pr-queue' || cfg.tableType === 'blocked-tasks' || cfg.tableType === 'ci-failures';

  if (hasExtraFields) {
    // Render custom rows with time and extra info
    const rows = data.rows.slice(0, cfg.maxRows || 5);
    return (
      <CardShell style={{...widgetStyle, overflow: 'auto'}} density="compact">
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>{titleMap[cfg.tableType] || cfg.tableType}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {r.author && <span style={{ marginRight: 8 }}>{r.author}</span>}
                  {r.blockedBy && <span style={{ color: 'var(--warning)', marginRight: 8 }}>{r.blockedBy}</span>}
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{r.time}</span>
                </div>
              </div>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 4,
                background: r.status === 'Review' ? 'rgba(180,76,255,0.15)' : r.status === 'Failed' ? 'rgba(255,23,68,0.15)' : 'rgba(255,145,0,0.15)',
                color: r.status === 'Review' ? '#B44CFF' : r.status === 'Failed' ? '#FF1744' : '#FF9100',
              }}>{r.status}</div>
            </div>
          ))}
        </div>
      </CardShell>
    );
  }

  // Fallback to simple table
  const columns = ['Title', 'Status'];
  const rows = (data.rows?.slice(0, cfg.maxRows || 5) || []).map((r: any) => [
    r.title || `Item ${r.id}`,
    r.status || 'Unknown',
  ]);

  return (
    <CardShell style={{...widgetStyle, overflow: 'auto'}} density="compact">
      <MetralyTable<{ title: string; status: string }>
        columns={[
          { key: 'title', header: 'Title' },
          { key: 'status', header: 'Status' },
        ]}
        data={rows.map((row) => ({ title: String(row[0]), status: String(row[1]) }))}
        dense
        mobilePresentation="stacked"
        ariaLabel={titleMap[cfg.tableType] || cfg.tableType}
        maxHeight={cfg.maxRows ? `${Math.max(220, cfg.maxRows * 44)}px` : undefined}
      />
    </CardShell>
  );
};

const DORAOverviewWidget = ({ data }: { config: WidgetConfig; data?: any }) => {
  if (!data) return <div style={widgetStyle}><div style={{padding: 20}}>Loading...</div></div>;

  return (
    <div style={{...widgetStyle, display: 'flex', gap: 8, flexWrap: 'wrap', padding: 16}}>
      {data.deployFrequency && (
        <StateBadge state={DORA_LEVEL_STATE_MAP[data.deployFrequency.level] ?? 'info'} label={`Deploy ${data.deployFrequency.currentValue}`} />
      )}
      {data.leadTime && (
        <StateBadge state={DORA_LEVEL_STATE_MAP[data.leadTime.level] ?? 'info'} label={`Lead Time ${data.leadTime.currentValue}`} />
      )}
      {data.changeFailureRate && (
        <StateBadge state={DORA_LEVEL_STATE_MAP[data.changeFailureRate.level] ?? 'info'} label={`CFR ${data.changeFailureRate.currentValue}`} />
      )}
      {data.mttr && (
        <StateBadge state={DORA_LEVEL_STATE_MAP[data.mttr.level] ?? 'info'} label={`MTTR ${data.mttr.currentValue}`} />
      )}
    </div>
  );
};

const GaugeWidget = ({ data }: { config: WidgetConfig; data?: any }) => {
  if (!data) return <div style={widgetStyle}><div style={{padding: 20}}>Loading...</div></div>;

  return (
    <div style={widgetStyle}>
      <MetralyGauge
        value={Number(data.score ?? 0)}
        min={0}
        max={100}
        unit="%"
        label="Health Score"
        summary="Service health score"
      />
    </div>
  );
};


const HeatmapWidget = ({ config, data }: { config: WidgetConfig; data?: any }) => {
  if (!data) return <div style={widgetStyle}><div style={{padding: 20}}>Loading...</div></div>;

  const cfg = config as HeatmapConfig;
  const rows = cfg.rowGroupBy === 'team' ? ['Platform', 'Backend', 'Frontend'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const cols = Array.from({ length: 16 }, (_, index) => `W${index + 1}`);
  const cells = rows.flatMap((row) =>
    cols.map((col) => {
      const value = Math.floor(Math.random() * 6);
      return {
        x: col,
        y: row,
        value,
        status: value >= 4 ? 'ok' as const : value >= 2 ? 'warning' as const : 'neutral' as const,
      };
    }),
  );

  return (
    <div style={widgetStyle}>
      <MetralyHeatmap
        title="Team Activity"
        xLabels={cols}
        yLabels={rows}
        cells={cells}
        compact
        density="dashboard"
      />
    </div>
  );
};

const SprintBurndownWidget = ({ data }: { config: WidgetConfig; data?: any }) => {
  if (!data) return <div style={widgetStyle}><div style={{padding: 20}}>Loading...</div></div>;

  const ideal = data.ideal?.values || [];
  const actual = data.actual?.values || [];
  const maxVal = Math.max(...ideal, ...actual, 1);

  return (
    <CardShell style={widgetStyle} density="compact">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Sprint Burndown</div>
        <div style={{ display: 'flex', gap: 12, fontSize: 10 }}>
          <span style={{ color: 'var(--border)' }}>● Ideal</span>
          <span style={{ color: 'var(--cyan)' }}>● Actual</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 70 }}>
        {ideal.map((v: number, i: number) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ width: '100%', background: 'var(--border)', height: `${(v / maxVal) * 70}px`, borderRadius: 2, position: 'relative' }}>
              {actual[i] !== undefined && (
                <div style={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  left: 0, 
                  width: '100%', 
                  background: 'var(--cyan)', 
                  height: `${(actual[i] / maxVal) * 70}px`, 
                  borderRadius: 2,
                  opacity: 0.7 
                }} />
              )}
            </div>
            <span style={{ fontSize: 9, color: 'var(--muted)' }}>{i + 1}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11 }}>
        <span style={{ color: 'var(--muted)' }}>Remaining: {actual[actual.length - 1]?.toFixed(0) || 0} pts</span>
        <span style={{ color: actual[actual.length - 1] <= ideal[ideal.length - 1] ? 'var(--success)' : 'var(--error)' }}>
          {actual[actual.length - 1] <= ideal[ideal.length - 1] ? 'On Track' : 'Behind'}
        </span>
      </div>
    </CardShell>
  );
};

const AIInsightWidget = ({ config: _config, data }: { config: WidgetConfig; data?: any }) => {
  if (!data) return <div style={widgetStyle}><div style={{padding: 20}}>Loading...</div></div>;
  return (
    <AIInsightCard
      style={widgetStyle}
      title={data.title || 'AI Insight'}
      body={data.body || data.text || 'No insight available'}
      action={data.action}
      onAction={() => {}}
    />
  );
};

const AnomalyDetectorWidget = ({ data }: { config: WidgetConfig; data?: any }) => {
  if (!data) return <div style={widgetStyle}><div style={{padding: 20}}>Loading...</div></div>;

  return (
    <CardShell style={widgetStyle} density="compact">
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Anomaly Detector</div>
      {data.anomalies?.length > 0 ? (
        <div style={{ color: 'var(--error)', fontSize: 12 }}>
          {data.anomalies.length} anomalies detected
        </div>
      ) : (
        <div style={{ color: 'var(--success)', fontSize: 12 }}>No anomalies</div>
      )}
    </CardShell>
  );
};

const CompareBarChartWidget = ({ data }: { config: WidgetConfig; data?: any }) => {
  if (!data) return <div style={widgetStyle}><div style={{padding: 20}}>Loading...</div></div>;

  const labels = data.labels ?? [];
  const primary = data.primary?.values ?? [];
  const secondary = data.secondary?.values ?? [];
  const points = labels.map((label: string, index: number) => ({
    label,
    primary: Number(primary[index] ?? 0),
    secondary: Number(secondary[index] ?? 0),
  }));
  const latest = Number(primary[primary.length - 1] ?? 0);
  const summary = `Compare: ${latest.toFixed(1)}%`;

  return (
    <div style={widgetStyle}>
      <MetralyChartCard title="Compare" summary={summary}>
        {IS_VITEST ? (
          <TestChartFallback summary={summary} />
        ) : (
          <MetralyBarChart
            data={points}
            xKey="label"
            series={[
              { dataKey: 'primary', name: 'Primary', tone: 'cyan' },
              { dataKey: 'secondary', name: 'Secondary', tone: 'purple' },
            ]}
            ariaLabel="Compare bar chart"
            summary={summary}
            height={140}
          />
        )}
      </MetralyChartCard>
    </div>
  );
};

const SectionHeaderWidget = ({ config }: { config: WidgetConfig }) => {
  const cfg = config as any;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, marginTop: 4, width: '100%' }}>
      <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{cfg.title || 'Section'}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      {cfg.rightText && <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{cfg.rightText}</span>}
    </div>
  );
};

const RecentActivityWidget = ({ data }: { config: WidgetConfig; data?: any }) => {
  if (!data || !data.activities || data.activities.length === 0) {
    return <div style={{padding: 20, color: 'var(--muted)'}}>No recent activity</div>;
  }
  const activities = data.activities || [];
  return (
    <CardShell style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>Recent Activity</span>
        <button type="button" style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontSize: 12, cursor: 'pointer' }}>View all →</button>
      </div>
      {activities.map((ev: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: ev.color || 'var(--cyan)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--muted2)', marginRight: 6 }}>{ev.actor}</span>
              {ev.description}
            </div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{ev.relativeTime}</span>
        </div>
      ))}
    </CardShell>
  );
};

export const widgetRegistry: Record<WidgetType, React.FC<{ config: WidgetConfig; data?: any }>> = {
  'metric-chart': MetricChartWidget,
  'stat-card': StatCardWidget,
  'health-gauge': GaugeWidget,
  'dora-overview': DORAOverviewWidget,
  'heatmap': HeatmapWidget,
  'data-table': DataTableWidget,
  'leaderboard': LeaderboardWidget,
  'sprint-burndown': SprintBurndownWidget,
  'ai-insight': AIInsightWidget,
  'anomaly-detector': AnomalyDetectorWidget,
  'compare-bar-chart': CompareBarChartWidget,
  'section-header': SectionHeaderWidget,
  'recent-activity': RecentActivityWidget,
  'empty': () => null,
};
