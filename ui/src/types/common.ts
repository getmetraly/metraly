
export type DORALevel = 'Elite' | 'High' | 'Med' | 'Low';


/** Canonical dashboard time range presets. Legacy short tokens are accepted for stored dashboard configs. */
export type TimeRange = '7d' | '14d' | '30d' | '60d' | '90d' | 'last_7d' | 'last_14d' | 'last_30d' | 'last_60d' | 'last_90d' | string;

export type TeamName =
  | 'Platform'
  | 'Backend'
  | 'Frontend'
  | 'Mobile'
  | 'Data'
  | string;

export type RepoName =
  | 'monorepo'
  | 'api-gateway'
  | 'frontend-app'
  | 'mobile-app'
  | 'data-pipeline'
  | 'auth-service'
  | string;
