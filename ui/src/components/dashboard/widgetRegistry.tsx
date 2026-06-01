import type { WidgetType, WidgetConfig, HeatmapWidgetData } from '../../types/widgets';
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
  StateBlock,
  AIInsightCard,
  ActivityFeed,
  MetralyButton,
} from '../../design-system';
import type { StatCardConfig, LeaderboardConfig, DataTableConfig, MetricChartConfig } from '../../types/widgets';
import { Icon } from '../shared/Icon';
const IS_VITEST = import.meta.env.MODE === 'test';

function TestChartFallback({ summary }: { summary: string }) {
  return (
    <div
      aria-label={summary}
      style={{
        height: 140,
        border: '1px dashed var(--m-line)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--m-fg-2)',
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

function WidgetState({
  variant,
  title,
  description,
}: {
  variant: 'loading' | 'empty' | 'error';
  title: string;
  description?: string;
}) {
  return (
    <CardShell style={widgetStyle} density="compact" state={variant === 'empty' ? 'empty' : variant}>
      <StateBlock
        variant={variant === 'empty' ? 'empty' : variant}
        title={title}
        description={description}
        density="compact"
      />
    </CardShell>
  );
}

function LoadingWidget({ title = 'Loading widget…' }: { title?: string }) {
  return <WidgetState variant="loading" title={title} />;
}

function EmptyWidget({ title = 'No data in this range', description = 'Try a wider time range or connect a source.' }: { title?: string; description?: string }) {
  return <WidgetState variant="empty" title={title} description={description} />;
}

const DORA_LEVEL_STATE_MAP: Record<string, "success" | "live" | "warning" | "error" | "info"> = {
  elite: 'success',
  high: 'live',
  med: 'warning',
  medium: 'warning',
  low: 'error',
};

const StatCardWidget = ({ config, data, renderMode = 'view' }: { config: WidgetConfig; data?: any; renderMode?: 'view' | 'edit' | 'preview' }) => {
  const cfg = config as StatCardConfig;
  if (!data) return <LoadingWidget title={`${resolveLabel(cfg.metricId || '')} loading…`} />;

  const icon = iconMap[cfg.metricId] || 'activity';
  const color = colorMap[cfg.colorKey] || 'primary';

  const trendDir = data.delta?.startsWith('+') ? 'up' : data.delta?.startsWith('-') ? 'down' : 'flat';
  const trendSentiment = trendDir === 'up' ? 'positive' : trendDir === 'down' ? 'negative' : 'neutral';

  if (renderMode === 'edit' || renderMode === 'preview') {
    return (
      <div style={{ ...widgetStyle, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
        <div style={{ fontFamily: 'var(--m-font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--m-fg-0)', lineHeight: 1 }}>
          {data?.value ?? '—'}
        </div>
        {data?.delta && (
          <TrendBadge direction={trendDir} sentiment={trendSentiment} value={data.delta} size="sm" />
        )}
      </div>
    );
  }

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

const MetricChartWidget = ({ config, data, renderMode = 'view' }: { config: WidgetConfig; data?: any; renderMode?: 'view' | 'edit' | 'preview' }) => {
  const cfg = config as MetricChartConfig;
  if (!data) return <LoadingWidget title={`${resolveLabel(cfg.metricId || '')} loading…`} />;

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

  const chartContent = IS_VITEST ? (
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
  );

  if (renderMode === 'edit' || renderMode === 'preview') {
    return <div style={widgetStyle}>{chartContent}</div>;
  }

  return (
    <div style={widgetStyle}>
      <MetralyChartCard
        title={displayLabel}
        summary={summary}
        description={data.unit ? `Unit: ${data.unit}` : undefined}
      >
        {chartContent}
      </MetralyChartCard>
    </div>
  );
};

const LeaderboardWidget = ({ config, data, renderMode = 'view' }: { config: WidgetConfig; data?: any; renderMode?: 'view' | 'edit' | 'preview' }) => {
  const cfg = config as LeaderboardConfig;
  if (!data || !Array.isArray(data)) return <LoadingWidget title={`${resolveLabel(cfg.metricId || '')} leaderboard loading…`} />;

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
  const height = 60 + items.length * 30;

  if (renderMode === 'edit' || renderMode === 'preview') {
    return (
      <div style={widgetStyle}>
        <Leaderboard items={items} color="var(--m-cyan-500)" unit={unit} title={title} />
      </div>
    );
  }

  return (
    <CardShell style={{...widgetStyle, height}} density="compact">
      <Leaderboard items={items} color="var(--m-cyan-500)" unit={unit} title={title} />
    </CardShell>
  );
};

const DataTableWidget = ({ config, data, renderMode = 'view' }: { config: WidgetConfig; data?: any; renderMode?: 'view' | 'edit' | 'preview' }) => {
  const cfg = config as DataTableConfig;
  const titleMap: Record<string, string> = {
    'pr-queue': 'PR Review Queue',
    'ci-failures': 'Failing Builds',
    'incidents': 'Incidents',
    'delivery-risk': 'Delivery Risk',
    'my-prs': 'My PRs',
    'review-queue': 'Review Queue',
    'blocked-tasks': 'Blocked Tasks',
  };
  const title = titleMap[cfg.tableType] || cfg.tableType || 'Table';

  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <EmptyWidget
        title={title}
        description="Connected source data for this table has not produced rows in the selected range."
      />
    );
  }

  const hasExtraFields = cfg.tableType === 'pr-queue' || cfg.tableType === 'blocked-tasks' || cfg.tableType === 'ci-failures';

  if (hasExtraFields) {
    const rows = data.rows.slice(0, cfg.maxRows || 5).map((r: any, i: number) => ({
      id: String(r.id ?? i),
      title: r.title || `Item ${i + 1}`,
      meta: [r.author, r.blockedBy, r.time].filter(Boolean).join(' · '),
      status: r.status || 'Unknown',
    }));
    const tableEl = (
      <MetralyTable<{ id: string; title: string; meta: string; status: React.ReactNode }>
        columns={[
          { key: 'title', header: 'Title' },
          { key: 'meta', header: 'Context' },
          { key: 'status', header: 'Status', width: '96px' },
        ]}
        data={rows.map((row) => ({
          ...row,
          status: <StateBadge state={row.status === 'Failed' ? 'error' : row.status === 'Review' ? 'purple' : 'warning'} label={row.status} size="sm" />,
        }))}
        rowKey={(row) => row.id}
        dense
        mobilePresentation="stacked"
        ariaLabel={title}
      />
    );
    if (renderMode === 'edit' || renderMode === 'preview') {
      return <div style={{...widgetStyle, overflow: 'auto'}}>{tableEl}</div>;
    }
    return (
      <CardShell
        style={{...widgetStyle, overflow: 'auto'}}
        density="compact"
        title={title}
      >
        {tableEl}
      </CardShell>
    );
  }

  const rows = (data.rows?.slice(0, cfg.maxRows || 5) || []).map((r: any) => ({
    title: r.title || `Item ${r.id}`,
    status: r.status || 'Unknown',
  }));

  const simpleTable = (
    <MetralyTable<{ title: string; status: string }>
      columns={[
        { key: 'title', header: 'Title' },
        { key: 'status', header: 'Status' },
      ]}
      data={rows}
      dense
      mobilePresentation="stacked"
      ariaLabel={title}
      maxHeight={cfg.maxRows ? `${Math.max(220, cfg.maxRows * 44)}px` : undefined}
    />
  );

  if (renderMode === 'edit' || renderMode === 'preview') {
    return <div style={{...widgetStyle, overflow: 'auto'}}>{simpleTable}</div>;
  }

  return (
    <CardShell style={{...widgetStyle, overflow: 'auto'}} density="compact" title={title}>
      {simpleTable}
    </CardShell>
  );
};

const DORAOverviewWidget = ({ data }: { config: WidgetConfig; data?: any }) => {
  if (!data) return <LoadingWidget title="DORA overview loading…" />;

  return (
    <div style={{...widgetStyle, display: 'flex', gap: 8, flexWrap: 'wrap', padding: 16}}>
      {data.deployFrequency && (
        <StateBadge state={DORA_LEVEL_STATE_MAP[String(data.deployFrequency.level).toLowerCase()] ?? 'info'} label={`Deploy ${data.deployFrequency.currentValue}`} />
      )}
      {data.leadTime && (
        <StateBadge state={DORA_LEVEL_STATE_MAP[String(data.leadTime.level).toLowerCase()] ?? 'info'} label={`Lead Time ${data.leadTime.currentValue}`} />
      )}
      {data.changeFailureRate && (
        <StateBadge state={DORA_LEVEL_STATE_MAP[String(data.changeFailureRate.level).toLowerCase()] ?? 'info'} label={`CFR ${data.changeFailureRate.currentValue}`} />
      )}
      {data.mttr && (
        <StateBadge state={DORA_LEVEL_STATE_MAP[String(data.mttr.level).toLowerCase()] ?? 'info'} label={`MTTR ${data.mttr.currentValue}`} />
      )}
    </div>
  );
};

const GaugeWidget = ({ data }: { config: WidgetConfig; data?: any }) => {
  if (!data) return <LoadingWidget title="Health score loading…" />;

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


const HeatmapWidget = ({ config: _config, data }: { config: WidgetConfig; data?: HeatmapWidgetData | null }) => {
  if (data === undefined) return <LoadingWidget title="Activity heatmap loading…" />;

  const xLabels = data?.xLabels ?? [];
  const yLabels = data?.yLabels ?? [];
  const cells = data?.cells ?? [];

  if (!cells.length || !xLabels.length || !yLabels.length) {
    return <EmptyWidget title="No heatmap data" description="Activity data will appear after source sync." />;
  }

  return (
    <div style={widgetStyle}>
      <MetralyHeatmap
        title={data?.title ?? 'Team Activity'}
        xLabels={xLabels}
        yLabels={yLabels}
        cells={cells}
        compact
        density="dashboard"
      />
    </div>
  );
};

const SprintBurndownWidget = ({ data }: { config: WidgetConfig; data?: any }) => {
  if (!data) return <LoadingWidget title="Sprint burndown loading…" />;

  const ideal = data.ideal?.values || [];
  const actual = data.actual?.values || [];

  return (
    <CardShell style={widgetStyle} density="compact" title="Sprint Burndown">
      <MetralyAreaChart
        data={ideal.map((v: number, i: number) => ({
          label: `Day ${i + 1}`,
          ideal: Number(v),
          actual: Number(actual[i] ?? 0),
        }))}
        xKey="label"
        series={[
          { dataKey: 'ideal', name: 'Ideal', tone: 'purple' },
          { dataKey: 'actual', name: 'Actual', tone: 'cyan' },
        ]}
        height={112}
        ariaLabel="Sprint burndown chart"
        summary={`Remaining ${actual[actual.length - 1]?.toFixed(0) || 0} points`}
      />
      <div className="metraly-widget-registry__footer">
        <span>Remaining: {actual[actual.length - 1]?.toFixed(0) || 0} pts</span>
        <StateBadge
          state={actual[actual.length - 1] <= ideal[ideal.length - 1] ? 'success' : 'error'}
          label={actual[actual.length - 1] <= ideal[ideal.length - 1] ? 'On Track' : 'Behind'}
          size="sm"
        />
      </div>
    </CardShell>
  );
};

const AIInsightWidget = ({ config: _config, data }: { config: WidgetConfig; data?: any }) => {
  if (!data) return <LoadingWidget title="AI insight loading…" />;
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
  if (!data) return <LoadingWidget title="Anomaly detector loading…" />;

  const anomalies = Array.isArray(data.anomalies) ? data.anomalies : [];
  const thresholds = Array.isArray(data.thresholds) ? data.thresholds : [];
  const healthy = anomalies.length === 0;
  return (
    <CardShell style={widgetStyle} density="compact" title="Anomaly Detector" tone={healthy ? 'success' : 'danger'}>
      <div style={{ display: 'grid', gap: 8 }}>
        <StateBadge state={healthy ? 'ok' : 'error'} label={data.status || (healthy ? 'healthy' : 'anomaly')} />
        <div style={{ fontSize: 12, color: 'var(--m-fg-1)' }}>{data.summary || 'Signals monitored'}</div>
        <div style={{ fontSize: 11, color: 'var(--m-fg-2)' }}>
          Signals checked: {data.signalsChecked ?? thresholds.length} · Window: {data.window || '30d'}
        </div>
        {thresholds.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--m-fg-2)', fontSize: 11, display: 'grid', gap: 4 }}>
            {thresholds.map((item: any, index: number) => (
              <li key={`${item.name || 'threshold'}-${index}`}>
                <strong style={{ color: 'var(--m-fg-1)' }}>{item.name || 'Signal'}:</strong> {item.value || 'n/a'} ({item.status || 'ok'})
              </li>
            ))}
          </ul>
        )}
      </div>
    </CardShell>
  );
};

const CompareBarChartWidget = ({ data, renderMode = 'view' }: { config: WidgetConfig; data?: any; renderMode?: 'view' | 'edit' | 'preview' }) => {
  if (!data) return <LoadingWidget title="Comparison chart loading…" />;

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

  const chartEl = IS_VITEST ? (
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
  );

  if (renderMode === 'edit' || renderMode === 'preview') {
    return <div style={widgetStyle}>{chartEl}</div>;
  }

  return (
    <div style={widgetStyle}>
      <MetralyChartCard title="Compare" summary={summary}>
        {chartEl}
      </MetralyChartCard>
    </div>
  );
};

const SectionHeaderWidget = ({ config }: { config: WidgetConfig }) => {
  const cfg = config as any;
  return (
    <div className="metraly-widget-registry__section-header">
      <span>{cfg.title || 'Section'}</span>
      <div />
      {cfg.rightText && <span>{cfg.rightText}</span>}
    </div>
  );
};

const RecentActivityWidget = ({ data }: { config: WidgetConfig; data?: any }) => {
  if (!data || !data.activities || data.activities.length === 0) {
    return <EmptyWidget title="No recent activity" description="Source events will appear here after the next sync." />;
  }
  const activities = data.activities || [];
  return (
    <CardShell style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <ActivityFeed
        mode="widget"
        frame={false}
        title="Recent Activity"
        items={activities.map((ev: any, i: number) => ({
          id: String(ev.id ?? i),
          timestamp: ev.timestamp ?? ev.relativeTime ?? 'just now',
          kind: 'info',
          title: ev.description,
          description: ev.actor,
          severity: 'info',
        }))}
      />
      <MetralyButton type="button" variant="ghost" size="sm" className="metraly-widget-registry__view-all">
        View all →
      </MetralyButton>
    </CardShell>
  );
};

export const widgetRegistry: Record<WidgetType, React.FC<{ config: WidgetConfig; data?: any; renderMode?: 'view' | 'edit' | 'preview' }>> = {
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
