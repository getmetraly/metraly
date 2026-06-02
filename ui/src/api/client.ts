import axios from 'axios';
import type { Dashboard, DashboardIndexEntry, DashboardWidgetInstance, DashboardFilters, WidgetLayout } from '../types/dashboard';
import type { CreateDashboardRequest, UpdateDashboardRequest } from '../types/api';
import { sanitizeDashboardIcon } from '../features/dashboardWizard/dashboardIcons';
import type { MetricDataResponse, DORAMetricDetail, DORAResponse as UiDORAResponse, MetricTimeSeries } from '../types/metrics';
import type { ActivityEvent } from '../types/user';


const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
const SESSION_KEY = 'metraly.auth-session';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

type LoginResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user?: { id: string; email: string; role: string };
};

type RefreshResponse = {
  access_token: string;
  expires_in: number;
};

type ApiDashboard = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  ownerId: string;
  isPublic: boolean;
  sourceType?: Dashboard['sourceType'];
  sourceTemplateId?: Dashboard['sourceTemplateId'] | null;
  shareToken?: string | null;
  widgets: DashboardWidgetInstance[];
  layout: ApiWidgetLayout[];
  version: number;
  forkedFromId?: string | null;
  createdAt: string;
  updatedAt: string;
};


type ApiWidgetLayout = Omit<WidgetLayout, 'i'> & {
  instanceId?: string;
  i?: string;
};

type DashboardWriteResponse = ApiDashboard;


type ApiBootstrapResponse = {
  user: { id: string; name: string; email: string };
  workspace: { id: string; name: string };
  dashboards: {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    sourceType: Dashboard['sourceType'];
    sourceTemplateId?: Dashboard['sourceTemplateId'] | null;
    widgetCount: number;
    updatedAt: string;
  }[];
  selectedDashboardId: string;
  iconOptions: { id: string; label: string; icon: string }[];
  features: {
    dashboardCreate: boolean;
    dashboardEdit: boolean;
    dashboardIconPicker: boolean;
    sourceSetup: boolean;
    sourceCollect: boolean;
  };
  sourceSummary: {
    connectedCount: number;
    hasRealSources: boolean;
    demoMode: boolean;
  };
  fetchedAt: string;
};

type ApiDashboardViewResponse = {
  dashboard: ApiDashboard;
  widgetData: Record<string, unknown>;
  widgetErrors: Record<string, string>;
  sourceContext: {
    mode: 'demo' | 'mixed' | 'live';
    hasRealSources: boolean;
    message: string;
  };
  fetchedAt: string;
  viewVersion: number;
};
const rawClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

let sessionCache: AuthSession | null = null;
let refreshPromise: Promise<AuthSession | null> | null = null;

function notifySessionChanged() {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event('metraly-auth-changed'));
}

function readSession(): AuthSession | null {
  if (sessionCache) {
    return sessionCache;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    sessionCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession | null) {
  sessionCache = session;
  if (typeof window === 'undefined') {
    return;
  }
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
    notifySessionChanged();
    return;
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  notifySessionChanged();
}

export function loadSession(): AuthSession | null {
  return readSession();
}


export function clearSession() {
  persistSession(null);
}

async function refreshAccessToken(): Promise<AuthSession | null> {
  const current = readSession();
  if (!current?.refreshToken) {
    return null;
  }
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = rawClient
    .post<RefreshResponse>('/auth/refresh', { refresh_token: current.refreshToken })
    .then((res) => {
      const updated: AuthSession = {
        ...current,
        accessToken: res.data.access_token,
        expiresIn: res.data.expires_in,
      };
      persistSession(updated);
      return updated;
    })
    .catch((): AuthSession | null => {
      clearSession();
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

client.interceptors.request.use((config) => {
  const session = readSession();
  if (session?.accessToken) {
    config.headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const refreshed = await refreshAccessToken();
      if (refreshed?.accessToken) {
        original.headers['Authorization'] = `Bearer ${refreshed.accessToken}`;
        return client(original);
      }
    }
    return Promise.reject(error);
  },
);

export async function login(email: string, password: string): Promise<AuthSession> {
  const res = await rawClient.post<LoginResponse>('/auth/login', { email, password });
  const session: AuthSession = {
    accessToken: res.data.access_token,
    refreshToken: res.data.refresh_token,
    expiresIn: res.data.expires_in,
    user: res.data.user,
  };
  persistSession(session);
  return session;
}


function defaultFilters(): DashboardFilters {
  return {
    timeRange: '30d',
    team: 'All teams',
    repo: 'All repos',
  };
}

function resolveDashboardApiId(id: string): string {
  return id;
}

function mapLayoutFromApi(layout: ApiWidgetLayout[]): WidgetLayout[] {
  return layout.map((item) => ({
    i: item.i || item.instanceId || '',
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW,
    minH: item.minH,
    static: item.static,
  }));
}

function mapBootstrapDashboardIndex(dashboard: ApiBootstrapResponse['dashboards'][number]): DashboardIndexEntry {
  return {
    id: dashboard.id,
    name: dashboard.name,
    description: dashboard.description || undefined,
    icon: sanitizeDashboardIcon(dashboard.icon),
    sourceType: dashboard.sourceType || 'user-created',
    sourceTemplateId: dashboard.sourceTemplateId || undefined,
    visibility: 'org',
    updatedAt: dashboard.updatedAt,
    hasDraft: false,
  };
}
function mapLayoutToApi(layout: WidgetLayout[]): ApiWidgetLayout[] {
  return layout.map(({ i, ...item }) => ({
    ...item,
    instanceId: i,
  }));
}

function mapDashboard(dashboard: ApiDashboard): Dashboard {
  return {
    id: dashboard.id,
    name: dashboard.name,
    description: dashboard.description || '',
    icon: sanitizeDashboardIcon(dashboard.icon),
    sourceType: dashboard.sourceType || (dashboard.forkedFromId ? 'forked' : 'user-created'),
    sourceTemplateId: dashboard.sourceTemplateId || undefined,
    forkedFromId: dashboard.forkedFromId || undefined,
    visibility: dashboard.isPublic ? 'org' : 'private',
    defaultFilters: defaultFilters(),
    widgets: dashboard.widgets,
    layout: mapLayoutFromApi(dashboard.layout),
    createdBy: dashboard.ownerId,
    createdAt: dashboard.createdAt,
    updatedAt: dashboard.updatedAt,
    version: dashboard.version,
    shareToken: dashboard.shareToken || undefined,
  };
}


function toApiDashboardResponse(dashboard: DashboardWriteResponse): Dashboard {
  return mapDashboard(dashboard);
}

function createDashboardPayload(input: CreateDashboardRequest): {
  name: string;
  description?: string;
  icon: string;
  widgets: DashboardWidgetInstance[];
  layout: ApiWidgetLayout[];
} {
  return {
    name: input.name,
    description: input.description,
    icon: sanitizeDashboardIcon(input.icon),
    widgets: input.widgets,
    layout: mapLayoutToApi(input.layout),
  };
}

function updateDashboardPayload(input: UpdateDashboardRequest): {
  name: string;
  description?: string;
  icon: string;
  widgets?: DashboardWidgetInstance[];
  layout?: ApiWidgetLayout[];
  version: number;
} {
  return {
    name: input.name ?? '',
    description: input.description,
    icon: sanitizeDashboardIcon(input.icon),
    widgets: input.widgets,
    layout: input.layout ? mapLayoutToApi(input.layout) : undefined,
    version: input.version,
  };
}


type MetricDescriptor = {
  label: string;
  unit: string;
};

const METRIC_CATALOG: Record<string, MetricDescriptor> = {
  'deploy-freq': { label: 'Deploy Frequency', unit: '/week' },
  'lead-time': { label: 'Lead Time', unit: 'h' },
  cfr: { label: 'Change Failure Rate', unit: '%' },
  mttr: { label: 'MTTR', unit: 'min' },
  'ci-pass': { label: 'CI Pass Rate', unit: '%' },
  'ci-duration': { label: 'CI Duration', unit: 'min' },
  'ci-queue': { label: 'CI Queue Time', unit: 'min' },
  'pr-cycle': { label: 'PR Cycle Time', unit: 'h' },
  'pr-review': { label: 'PR Review Time', unit: 'h' },
  'pr-merge': { label: 'PR Merge Time', unit: 'min' },
  velocity: { label: 'Velocity', unit: 'pts' },
  throughput: { label: 'Throughput', unit: 'items' },
  'health-score': { label: 'Health Score', unit: '%' },
};

function resolveMetricDescriptor(metricId: string): MetricDescriptor {
  return METRIC_CATALOG[metricId] || {
    label: metricId
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    unit: '',
  };
}

function metricLevel(value: number): DORAMetricDetail['level'] {
  if (value >= 80) return 'Elite';
  if (value >= 50) return 'High';
  if (value >= 25) return 'Med';
  return 'Low';
}

function mapMetricSeries(points: { time: string; value: number }[], unit: string): MetricTimeSeries {
  return {
    values: points.map((p) => p.value),
    labels: points.map((p) => new Date(p.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    unit,
  };
}

export interface AppBootstrap {
  user: { id: string; name: string; email: string };
  workspace: { id: string; name: string };
  dashboards: DashboardIndexEntry[];
  selectedDashboardId: string;
  iconOptions: { id: string; label: string; icon: string }[];
  features: {
    dashboardCreate: boolean;
    dashboardEdit: boolean;
    dashboardIconPicker: boolean;
    sourceSetup: boolean;
    sourceCollect: boolean;
  };
  sourceSummary: {
    connectedCount: number;
    hasRealSources: boolean;
    demoMode: boolean;
  };
  fetchedAt: string;
}

export interface DashboardView {
  dashboard: Dashboard;
  widgetData: Record<string, unknown>;
  widgetErrors: Record<string, string>;
  sourceContext: {
    mode: 'demo' | 'mixed' | 'live';
    hasRealSources: boolean;
    message: string;
  };
  fetchedAt: string;
  viewVersion: number;
}

export async function getAppBootstrap(): Promise<AppBootstrap> {
  const res = await client.get<ApiBootstrapResponse>('/app/bootstrap');
  return {
    user: res.data.user,
    workspace: res.data.workspace,
    dashboards: res.data.dashboards.map(mapBootstrapDashboardIndex),
    selectedDashboardId: res.data.selectedDashboardId,
    iconOptions: res.data.iconOptions.map((option) => ({
      ...option,
      icon: sanitizeDashboardIcon(option.icon),
    })),
    features: res.data.features,
    sourceSummary: res.data.sourceSummary,
    fetchedAt: res.data.fetchedAt,
  };
}

export async function getDashboardView(dashboardId: string): Promise<DashboardView> {
  const res = await client.get<ApiDashboardViewResponse>(`/dashboards/${resolveDashboardApiId(dashboardId)}/view`);
  const dashboard = mapDashboard(res.data.dashboard);
  return {
    dashboard,
    widgetData: res.data.widgetData || {},
    widgetErrors: res.data.widgetErrors || {},
    sourceContext: res.data.sourceContext,
    fetchedAt: res.data.fetchedAt,
    viewVersion: res.data.viewVersion,
  };
}

export async function createDashboard(input: CreateDashboardRequest): Promise<Dashboard> {
  const res = await client.post<DashboardWriteResponse>('/dashboards', createDashboardPayload(input));
  return toApiDashboardResponse(res.data);
}

export async function updateDashboard(id: string, input: UpdateDashboardRequest): Promise<Dashboard> {
  const res = await client.put<DashboardWriteResponse>(`/dashboards/${id}`, updateDashboardPayload(input));
  return toApiDashboardResponse(res.data);
}

export async function deleteDashboard(id: string): Promise<void> {
  await client.delete(`/dashboards/${id}`);
}


export async function getInsights(): Promise<{ title: string; body: string; action?: string }[]> {
  const res = await client.get<{ title: string; body: string; action?: string }[]>('/insights');
  return res.data;
}

export async function getActivity(): Promise<ActivityEvent[]> {
  const res = await client.get<{ id: string; type: string; title: string; description: string; timestamp: string; user: { name: string; avatar: string } }[]>('/activity');
  return res.data.map((item, index) => ({
    id: item.id || `activity-${index}`,
    actor: item.user?.name || 'Metraly',
    description: item.description || item.title,
    relativeTime: 'just now',
    color: 'var(--m-cyan-500)',
  }));
}

export async function getMetricData(metricId: string, timeRange = '30d', team = 'All teams', repo = 'All repos'): Promise<MetricDataResponse> {
  const res = await client.get<{ metricId: string; timeRange: string; team: string; data: { time: string; value: number }[] }>(`/metrics/${metricId}`, {
    params: { timeRange, team, repo },
  });
  const descriptor = resolveMetricDescriptor(metricId);
  const current = mapMetricSeries(res.data.data, descriptor.unit);
  const previous = {
    ...current,
    values: current.values.map((v) => v * 0.92),
  };
  return {
    metricId: res.data.metricId as MetricDataResponse['metricId'],
    label: descriptor.label,
    unit: descriptor.unit,
    current,
    previous,
    labels: current.labels,
  };
}


export async function getDORA(timeRange = '30d', team = 'All teams', repo = 'All repos'): Promise<UiDORAResponse> {
  const [deployFrequency, leadTime, changeFailureRate, mttr] = await Promise.all([
    getDORADetail('deploy-freq', timeRange, team, repo),
    getDORADetail('lead-time', timeRange, team, repo),
    getDORADetail('cfr', timeRange, team, repo),
    getDORADetail('mttr', timeRange, team, repo),
  ]);
  return { deployFrequency, leadTime, changeFailureRate, mttr };
}

async function getDORADetail(metricId: string, timeRange: string, team: string, repo: string): Promise<DORAMetricDetail> {
  const metric = await getMetricData(metricId, timeRange, team, repo);
  const last = metric.current.values[metric.current.values.length - 1] ?? 0;
  const prev = metric.current.values[metric.current.values.length - 2] ?? last;
  return {
    id: metricId as DORAMetricDetail['id'],
    label: metric.label,
    currentValue: `${last.toFixed(1)}${metric.unit}`,
    currentValueRaw: last,
    delta: `${(last - prev) >= 0 ? '+' : ''}${(last - prev).toFixed(1)}`,
    level: metricLevel(last),
    benchmarkNote: 'Backend-backed preview data',
    timeSeries: metric.current,
  };
}

export interface SourceConnection {
  id: string;
  workspaceId: string;
  sourceType: string;
  displayName: string;
  status: string;
  config: Record<string, string>;
  credentialId: string;
  lastTestedAt?: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionTestResult {
  status: 'ok' | 'invalid_credentials' | 'permission_denied' | 'rate_limited' | 'network_error' | 'unsupported_source' | 'unknown';
  message: string;
  scopesFound?: string[];
  scopesMissing?: string[];
  testedAt: string;
  latencyMs: number;
}

export interface CollectorRun {
  id: string;
  sourceConnectionId: string;
  collectorType: string;
  status: 'started' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  startedAt: string;
  finishedAt?: string;
  cursor: string;
  rawEventCount: number;
  errorCategory?: string;
  errorMessage?: string;
  rateLimitState: 'ok' | 'throttled' | 'cooldown';
  retryAfter?: string;
}

export async function listSources(): Promise<SourceConnection[]> {
  const res = await client.get<SourceConnection[]>('/sources');
  return res.data;
}

export async function createSource(input: {
  sourceType: string;
  displayName: string;
  config?: Record<string, string>;
  secret: string;
}): Promise<{ source: SourceConnection }> {
  const res = await client.post<{ source: SourceConnection; credential: unknown }>('/sources', input);
  return { source: res.data.source };
}

export async function testSource(sourceId: string): Promise<ConnectionTestResult> {
  const res = await client.post<ConnectionTestResult>(`/sources/${sourceId}/test`);
  return res.data;
}

export async function triggerCollect(sourceId: string): Promise<CollectorRun> {
  const res = await client.post<CollectorRun>(`/sources/${sourceId}/collect`);
  return res.data;
}

export async function listCollectorRuns(sourceId: string, limit = 20): Promise<{ runs: CollectorRun[] }> {
  const res = await client.get<{ runs: CollectorRun[] }>(`/sources/${sourceId}/collector-runs`, { params: { limit } });
  return res.data;
}

export { client };
