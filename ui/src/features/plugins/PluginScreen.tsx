import React, { useMemo, useState } from 'react';
import { CardShell, PluginCatalog, PluginReviewDrawer } from '../../design-system';
import type { Plugin, PluginPermission } from '../../design-system';
import { useLocalStorage } from '../../hooks/useLocalStorage';

type NotificationChannelId = 'slack' | 'pagerduty';

interface NotificationChannelConfig {
  enabled: boolean;
  destination: string;
  cadence: 'Daily' | 'Weekly';
}

const DEFAULT_PLUGINS: Plugin[] = [
  { id: 'github-advanced', name: 'GitHub Advanced', category: 'Sources', icon: 'github', description: 'Deep PR analytics, CODEOWNERS, security alerts and advanced workflow metrics.', rating: 4.9, installCount: '12.4k', installed: true, iconColor: 'var(--m-fg-0, var(--text))' },
  { id: 'jira-sync-pro', name: 'Jira Sync Pro', category: 'Sources', icon: 'jira', description: 'Bi-directional sync with Jira epics, sprints, velocity and burndown charts.', rating: 4.7, installCount: '8.1k', installed: false, iconColor: 'var(--m-cyan-500, var(--cyan))' },
  { id: 'ai-explainer', name: 'AI Explainer', category: 'AI', icon: 'brain', description: 'Adds natural-language summaries to any metric card with local model execution.', rating: 4.8, installCount: '5.6k', installed: true, iconColor: 'var(--m-purple, var(--purple))' },
  { id: 'slack-digest', name: 'Slack Digest', category: 'Alerts', icon: 'slack', description: 'Daily and weekly engineering digests posted directly to team channels.', rating: 4.5, installCount: '9.3k', installed: false, iconColor: 'var(--m-purple, var(--purple))' },
  { id: 'pagerduty-bridge', name: 'PagerDuty Bridge', category: 'Alerts', icon: 'pagerduty', description: 'Surface incident impact on engineering metrics and incident response KPIs.', rating: 4.6, installCount: '3.8k', installed: false, iconColor: 'var(--m-success, var(--success))' },
  { id: 'csv-exporter', name: 'CSV Exporter', category: 'Exporters', icon: 'database', description: 'Export dashboards to CSV with configurable date ranges and field mapping.', rating: 4.2, installCount: '6.7k', installed: false, iconColor: 'var(--m-warning, var(--warning))' },
  { id: 'linear-tracker', name: 'Linear Tracker', category: 'Sources', icon: 'linear', description: 'Sync Linear cycles, projects and issue velocity into engineering health views.', rating: 4.8, installCount: '4.2k', installed: false, iconColor: 'var(--m-cyan-500, var(--cyan))' },
  { id: 'grafana-bridge', name: 'Grafana Bridge', category: 'Exporters', icon: 'chart', description: 'Push Metraly metrics into Grafana through a native datasource bridge.', rating: 4.4, installCount: '2.9k', installed: false, iconColor: 'var(--m-warning, var(--warning))' },
  { id: 'ai-anomaly-guard', name: 'AI Anomaly Guard', category: 'AI', icon: 'sparkles', description: 'Anomaly detection across DORA metrics with alert routing.', rating: 4.9, installCount: '1.7k', installed: false, iconColor: 'var(--m-cyan-500, var(--cyan))', status: 'preview' },
];

const defaultNotificationChannels: Record<NotificationChannelId, NotificationChannelConfig> = {
  slack: { enabled: true, destination: '#engineering-health', cadence: 'Daily' },
  pagerduty: { enabled: false, destination: 'Primary on-call', cadence: 'Weekly' },
};

function permissionTemplate(plugin: Plugin | null): PluginPermission[] {
  if (!plugin) return [];
  if (plugin.category === 'Sources') {
    return [
      { scope: 'Read repositories', description: 'Read metadata, pull requests, and commits.', risk: 'low' },
      { scope: 'Read pipelines', description: 'Read CI/CD execution status and durations.', risk: 'medium' },
      { scope: 'Read organization', description: 'Read teams and membership graph.', risk: 'medium' },
    ];
  }
  if (plugin.category === 'Alerts') {
    return [
      { scope: 'Read incidents', description: 'Read incident timeline and severity metadata.', risk: 'medium' },
      { scope: 'Send notifications', description: 'Push digest and threshold alerts.', risk: 'medium' },
    ];
  }
  if (plugin.category === 'AI') {
    return [
      { scope: 'Read metrics', description: 'Read aggregated metrics for model prompts.', risk: 'low' },
      { scope: 'Access summaries', description: 'Write generated summaries to workspace.', risk: 'medium' },
      { scope: 'Manage prompts', description: 'Update prompt templates and execution settings.', risk: 'high' },
    ];
  }
  return [{ scope: 'Read exports', description: 'Read dashboard datasets for export pipelines.', risk: 'low' }];
}

export const PluginScreen = () => {
  const [plugins, setPlugins] = useState<Plugin[]>(DEFAULT_PLUGINS);
  const [reviewPluginId, setReviewPluginId] = useState<string | null>(null);
  const [channels, setChannels] = useLocalStorage<Record<NotificationChannelId, NotificationChannelConfig>>(
    'metraly.notification-channels',
    defaultNotificationChannels,
  );

  const activeChannels = useMemo(
    () => (Object.entries(channels) as [NotificationChannelId, NotificationChannelConfig][]).filter(([, channel]) => channel.enabled),
    [channels],
  );

  const reviewPlugin = useMemo(() => plugins.find((plugin) => plugin.id === reviewPluginId) ?? null, [plugins, reviewPluginId]);
  const reviewPermissions = useMemo(() => permissionTemplate(reviewPlugin), [reviewPlugin]);

  function handleInstall(id: string) {
    setPlugins((prev) => prev.map((plugin) => (plugin.id === id ? { ...plugin, installed: true } : plugin)));
    setReviewPluginId(null);
  }

  function handleManage(id: string) {
    setReviewPluginId(id);
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px', display: 'grid', gap: 16 }}>
      <CardShell
        title="Notification channels"
        subtitle="Configure Slack digests and PagerDuty routing for plugin alerts."
        trailing={<span style={{ fontSize: 'var(--m-fs-10, 10px)', color: 'var(--m-fg-3, var(--muted2))' }}>{activeChannels.length} active</span>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {(Object.entries(channels) as [NotificationChannelId, NotificationChannelConfig][]).map(([id, channel]) => (
            <div key={id} style={{ border: '1px solid var(--m-line, var(--border))', borderRadius: 10, background: 'var(--m-bg-1, var(--glass))', padding: '10px 12px', display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 'var(--m-fs-12, 12px)', fontWeight: 600, color: 'var(--m-fg-0, var(--text))' }}>
                  {id === 'slack' ? 'Slack' : 'PagerDuty'}
                </div>
                <input
                  type="checkbox"
                  checked={channel.enabled}
                  onChange={() => setChannels((prev) => ({ ...prev, [id]: { ...prev[id], enabled: !prev[id].enabled } }))}
                />
              </div>
              <input
                value={channel.destination}
                onChange={(event) => setChannels((prev) => ({ ...prev, [id]: { ...prev[id], destination: event.target.value } }))}
                style={{ border: '1px solid var(--m-line, var(--border))', borderRadius: 8, padding: '6px 8px', background: 'var(--m-bg-2, var(--glass2))', color: 'var(--m-fg-0, var(--text))' }}
              />
              <select
                value={channel.cadence}
                onChange={(event) => setChannels((prev) => ({ ...prev, [id]: { ...prev[id], cadence: event.target.value as NotificationChannelConfig['cadence'] } }))}
                style={{ border: '1px solid var(--m-line, var(--border))', borderRadius: 8, padding: '6px 8px', background: 'var(--m-bg-2, var(--glass2))', color: 'var(--m-fg-0, var(--text))' }}
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>
          ))}
        </div>
      </CardShell>

      <PluginCatalog
        plugins={plugins}
        categories={['Sources', 'Exporters', 'AI', 'Alerts']}
        onInstall={handleInstall}
        onManage={handleManage}
        onReview={setReviewPluginId}
      />

      <PluginReviewDrawer
        open={reviewPlugin !== null}
        plugin={reviewPlugin}
        permissions={reviewPermissions}
        onInstall={() => {
          if (reviewPlugin) handleInstall(reviewPlugin.id);
        }}
        onClose={() => setReviewPluginId(null)}
      />
    </div>
  );
};
