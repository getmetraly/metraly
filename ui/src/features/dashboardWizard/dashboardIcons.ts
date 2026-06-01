export const DASHBOARD_ICON_OPTIONS = [
  'dashboard',
  'sparkles',
  'bar2',
  'trendingUp',
  'activity',
  'rocket',
  'star',
  'zap',
  'cpu',
] as const;

export type DashboardIconOption = (typeof DASHBOARD_ICON_OPTIONS)[number];

export const DEFAULT_DASHBOARD_ICON: DashboardIconOption = 'sparkles';

export function isDashboardIcon(value: string | undefined | null): value is DashboardIconOption {
  return typeof value === 'string' && (DASHBOARD_ICON_OPTIONS as readonly string[]).includes(value);
}

export function sanitizeDashboardIcon(value: string | undefined | null): DashboardIconOption {
  return isDashboardIcon(value) ? value : DEFAULT_DASHBOARD_ICON;
}
