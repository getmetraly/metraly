import type { WidgetType, WidgetConfig } from '../../types/widgets';
import React from 'react';
import { Icon } from '../shared/Icon';
import { StatCard } from '../ui/StatCard';
import { Leaderboard } from '../ui/Leaderboard';
import { DataTable } from '../ui/DataTable';
import { DORABadge } from '../ui/DORABadge';
import type { StatCardConfig, LeaderboardConfig, DataTableConfig, MetricChartConfig } from '../../types/widgets';
import { AreaChart } from '../charts/AreaChart';
import { BarChart } from '../charts/BarChart';

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

const colorMap: Record<string, string> = {
  cyan: 'cyan',
  purple: 'purple',
  success: 'success',
  warning: 'warning',
  error: 'error',
};

const widgetStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
};

const StatCardWidget = ({ config, data }: { config: WidgetConfig; data?: any }) => {
  const cfg = config as StatCardConfig;
  if (!data) return <div style={{...widgetStyle, padding: 20}}>Loading...</div>;

  const icon = iconMap[cfg.metricId] || 'activity';
  const color = colorMap[cfg.colorKey] || 'cyan';

  // Parse delta to get trend direction
  const trendDir = data.delta?.startsWith('+') ? 'up' : data.delta?.startsWith('-') ? 'down' : 'neutral';

  return (
    <div style={widgetStyle}>
    <StatCard
      icon={icon}
      label={cfg.metricId || 'Metric'}
      value={data.value || '0'}
      trend={data.delta}
      trendDir={trendDir}
      color={color}
      spark={data.sparkline?.values}
      delay={0}
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

  const colorMap: Record<string, string> = {
    'lead-time': 'var(--cyan)',
    'velocity': 'var(--green)',
    'cfr': 'var(--orange)',
    'deploy-freq': 'var(--purple)',
    'mttr': 'var(--yellow)',
  };

  const displayLabel = labelMap[cfg.metricId] || data.label || cfg.metricId;
  const chartColor = cfg.colorOverride || colorMap[cfg.metricId] || 'var(--cyan)';
  const currentValue = currentValues[currentValues.length - 1] || 0;
  const displayValue = currentValue >= 1000 ? `${(currentValue/1000).toFixed(1)}k` : currentValue.toFixed(1);

  const isBar = chartVariant === 'bar' || chartVariant === 'bar-horizontal';

  return (
    <div style={{...widgetStyle, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8}}>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{displayLabel}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
        {displayValue}
        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>{data.unit}</span>
      </div>
      {isBar ? (
        <div style={{ flex: 1, minHeight: 80 }}>
          <BarChart
            labels={labels}
            values={currentValues}
            compare={compareValues}
            color={chartColor}
            compareColor="var(--purple)"
            height={90}
            horizontal={chartVariant === 'bar-horizontal'}
          />
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 60 }}>
          <AreaChart
            data={currentValues}
            compare={compareValues}
            labels={labels}
            color={chartColor}
            compareColor="var(--purple)"
            height={70}
            showGrid={false}
            showAxis={false}
          />
        </div>
      )}
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
    <div style={{...widgetStyle, height, padding: 16, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 12}}>
      <Leaderboard items={items} color="#00E5FF" unit={unit} title={title} />
    </div>
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
      <div style={{...widgetStyle, padding: 16, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'auto'}}>
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
      </div>
    );
  }

  // Fallback to simple table
  const columns = ['Title', 'Status'];
  const rows = (data.rows?.slice(0, cfg.maxRows || 5) || []).map((r: any) => [
    r.title || `Item ${r.id}`,
    r.status || 'Unknown',
  ]);

  return (
    <div style={{...widgetStyle, padding: 16, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'auto'}}>
      <DataTable
        title={titleMap[cfg.tableType] || cfg.tableType}
        columns={columns}
        rows={rows}
        maxRows={cfg.maxRows}
      />
    </div>
  );
};

const DORAOverviewWidget = ({ data }: { config: WidgetConfig; data?: any }) => {
  if (!data) return <div style={widgetStyle}><div style={{padding: 20}}>Loading...</div></div>;

  return (
    <div style={{...widgetStyle, display: 'flex', gap: 8, flexWrap: 'wrap', padding: 16}}>
      {data.deployFrequency && (
        <DORABadge label="Deploy" value={data.deployFrequency.currentValue} level={data.deployFrequency.level} />
      )}
      {data.leadTime && (
        <DORABadge label="Lead Time" value={data.leadTime.currentValue} level={data.leadTime.level} />
      )}
      {data.changeFailureRate && (
        <DORABadge label="CFR" value={data.changeFailureRate.currentValue} level={data.changeFailureRate.level} />
      )}
      {data.mttr && (
        <DORABadge label="MTTR" value={data.mttr.currentValue} level={data.mttr.level} />
      )}
    </div>
  );
};

const GaugeWidget = ({ data }: { config: WidgetConfig; data?: any }) => {
  if (!data) return <div style={widgetStyle}><div style={{padding: 20}}>Loading...</div></div>;

  return (
    <div style={{...widgetStyle, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, fontWeight: 700, color: data.score > 70 ? 'var(--success)' : data.score > 40 ? 'var(--warning)' : 'var(--error)' }}>
          {data.score?.toFixed(0) || 0}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Health Score</div>
      </div>
    </div>
  );
};

import { Heatmap } from '../charts/Heatmap';

const HeatmapWidget = ({ config, data }: { config: WidgetConfig; data?: any }) => {
  if (!data) return <div style={widgetStyle}><div style={{padding: 20}}>Loading...</div></div>;

  const cfg = config as HeatmapConfig;
  const rows = cfg.rowGroupBy === 'team' ? 3 : 7;
  const cols = 16;
  const teams = ['Platform', 'Backend', 'Frontend'];
  
  // Generate fake heatmap data
  const heatData = Array.from({ length: rows }, () => 
    Array.from({ length: cols }, () => Math.floor(Math.random() * 6))
  );

  return (
    <div style={{...widgetStyle, padding: 10, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 12, boxSizing: 'border-box', display: 'flex', flexDirection: 'row', overflow: 'hidden'}}>
      <Heatmap 
        data={heatData}
        rows={rows}
        cols={cols}
        color="var(--cyan)"
        labelRows={cfg.rowGroupBy === 'team' ? teams : undefined}
        labelCols={[]}
        title="Team Activity"
        cellSize={16}
        gap={3}
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
    <div style={{...widgetStyle, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 12, padding: 16}}>
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
    </div>
  );
};

const AIInsightWidget = ({ config, data }: { config: WidgetConfig; data?: any }) => {
  const [seen, setSeen] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);

  if (!data) return <div style={widgetStyle}><div style={{padding: 20}}>Loading...</div></div>;

  const cfg = config as any;

  const containerStyle = {
    ...(cfg.containerStyle || {}),
    transition: 'all 0.22s ease',
    boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.35)' : 'none',
    cursor: 'pointer',
    width: '100%', height: '100%', boxSizing: 'border-box' as const,
  };

  if (seen) {
    (containerStyle as React.CSSProperties).background = hovered ? 'var(--glass2)' : 'var(--glass)';
  } else if (cfg.unseenStyle) {
    Object.assign(containerStyle, cfg.unseenStyle);
  }

  return (
    <div
      className="fade-up-1"
      style={containerStyle}
      onMouseEnter={() => { setHovered(true); if (!seen) setSeen(true); }}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(180,76,255,0.15))', border: '1px solid rgba(180,76,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="sparkles" size={13} color="var(--purple)"/></div>
          <div style={{
            position: 'absolute', top: -2, right: -2,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--cyan)',
            border: '1.5px solid var(--bg)',
            animation: 'pulse-dot 2s ease infinite',
          }}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-head)', color: 'var(--text)' }}>{data.title || 'AI Insight'}</span>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(180,76,255,0.15)', color: 'var(--purple)', border: '1px solid rgba(180,76,255,0.25)', borderRadius: 4, padding: '1px 6px' }}>AI</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.55, margin: 0 }}>{data.body || data.text || 'No insight available'}</p>
          {cfg.variant !== 'inline' && data.action && (
            <button type="button" style={{ marginTop: 12, padding: '6px 14px', borderRadius: 8, background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.25)', color: 'var(--cyan)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {data.action} <Icon name="arrowRight" size={12} color="var(--cyan)"/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const AnomalyDetectorWidget = ({ data }: { config: WidgetConfig; data?: any }) => {
  if (!data) return <div style={widgetStyle}><div style={{padding: 20}}>Loading...</div></div>;

  return (
    <div style={{...widgetStyle, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 12, padding: 16}}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Anomaly Detector</div>
      {data.anomalies?.length > 0 ? (
        <div style={{ color: 'var(--error)', fontSize: 12 }}>
          {data.anomalies.length} anomalies detected
        </div>
      ) : (
        <div style={{ color: 'var(--success)', fontSize: 12 }}>No anomalies</div>
      )}
    </div>
  );
};

const CompareBarChartWidget = ({ data }: { config: WidgetConfig; data?: any }) => {
  if (!data) return <div style={widgetStyle}><div style={{padding: 20}}>Loading...</div></div>;

  return (
    <div style={{...widgetStyle, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 12, padding: 16}}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Compare</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
        {data.primary?.values?.[data.primary.values.length - 1]?.toFixed(1) || '0'}%
      </div>
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
    <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', overflow: 'auto' }}>
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
    </div>
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
};
