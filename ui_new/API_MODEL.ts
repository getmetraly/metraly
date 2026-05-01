/**
 * API Model — выведена из UI-компонентов ui_new/src/
 * Файлы api/ не анализировались.
 *
 * Структура файла:
 *   1. Общие примитивы
 *   2. Метрики (DORA, CI, PR, Teams)
 *   3. ═══ UNIFIED DASHBOARD MODEL ═══
 *      3a. Фильтры
 *      3b. Widget configs (discriminated union)
 *      3c. Layout (12-col grid, drag-and-drop ready)
 *      3d. Dashboard entity
 *      3e. Локальный слой (draft + sync)
 *      3f. API эндпоинты дашбордов
 *   4. Данные конкретных дашбордов (ответы бэка)
 *   5. Onboarding, Plugins, AI, User
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. ОБЩИЕ ПРИМИТИВЫ
// ─────────────────────────────────────────────────────────────────────────────

/** Источник: StatCard props `trendDir` */
export type TrendDir = 'up' | 'down' | 'neutral';

/** Источник: DORABadge `level`, BreakdownTable данные */
export type DORALevel = 'Elite' | 'High' | 'Med' | 'Low';

/** Источник: Badge `status` */
export type ItemStatus = 'On track' | 'At risk' | 'Blocked' | 'Done' | 'Open';

/** Источник: MetricsScreen TIME_RANGES, DashboardWizardScreen timeRange */
export type TimeRange = '7d' | '14d' | '30d' | '90d';

/** Источник: MetricsScreen TEAMS, VPDashboard данные */
export type TeamName = 'Platform' | 'Backend' | 'Frontend' | 'Mobile' | 'Data' | string;

/** Источник: MetricsScreen REPOS */
export type RepoName =
  | 'monorepo'
  | 'api-gateway'
  | 'frontend-app'
  | 'mobile-app'
  | 'data-pipeline'
  | 'auth-service'
  | string;

// ─────────────────────────────────────────────────────────────────────────────
// 2. МЕТРИКИ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Идентификаторы всех метрик.
 * Источник: MetricsScreen METRIC_TREE (все children[*].id)
 */
export type MetricId =
  | 'deploy-freq'
  | 'lead-time'
  | 'cfr'
  | 'mttr'
  | 'ci-pass'
  | 'ci-duration'
  | 'ci-queue'
  | 'pr-cycle'
  | 'pr-review'
  | 'pr-merge'
  | 'velocity'
  | 'throughput'
  | 'health-score'
  | 'sprint-burndown';

/** Временной ряд одной метрики. Источник: useDeployFrequency → CTODashboard AreaChart */
export interface MetricTimeSeries {
  values: number[];
  /** ISO-даты или короткие метки для оси X. Источник: MetricsScreen WEEK_LABELS_30 */
  labels: string[];
  unit: string;
}

/** Параметры запроса метрики. Источник: useDeployFrequency(timeRange, team, repo) */
export interface MetricQueryParams {
  timeRange: TimeRange;
  team?: TeamName;
  repo?: RepoName;
}

/** Ответ /api/metrics/{id}. Источник: MetricsScreen slicedData + slicedCompare */
export interface MetricDataResponse {
  metricId: MetricId;
  label: string;
  unit: string;
  current: MetricTimeSeries;
  /** Данные предыдущего периода для Compare-режима. Источник: MetricsScreen compareMode */
  previous: MetricTimeSeries;
}

/** Разбивка метрики по команде/репо. Источник: BreakdownTable, Leaderboard */
export interface MetricBreakdownItem {
  name: string;
  team: TeamName;
  value: string;
  valueRaw: number;
  doraLevel: DORALevel;
  delta: string;
}

/** Уровень зрелости DORA. Источник: DORAPanel карточки */
export interface DORAMetricDetail {
  id: 'deploy-freq' | 'lead-time' | 'cfr' | 'mttr';
  label: string;
  currentValue: string;
  currentValueRaw: number;
  delta: string;
  level: DORALevel;
  benchmarkNote: string;
  timeSeries: MetricTimeSeries;
}

/** GET /api/dora?timeRange=30d&team=...&repo=... */
export interface DORAResponse {
  deployFrequency: DORAMetricDetail;
  leadTime: DORAMetricDetail;
  changeFailureRate: DORAMetricDetail;
  mttr: DORAMetricDetail;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3a. ФИЛЬТРЫ ДАШБОРДА
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Фильтры уровня дашборда — дефолты для всех виджетов.
 * Виджет может переопределить любое поле через filtersOverride.
 * Источник: DashboardWizardScreen settings (timeRange, team),
 *           MetricsScreen (team, repo, timeRange)
 */
export interface DashboardFilters {
  timeRange: TimeRange;
  team: TeamName | 'All teams';
  repo: RepoName | 'All repos';
}

// ─────────────────────────────────────────────────────────────────────────────
// 3b. WIDGET CONFIGS (discriminated union по полю `type`)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Базовые поля для всех виджетов.
 * filtersOverride — частичное переопределение dashboard-level дефолтов (гибрид C).
 * Пример: виджет MTTR смотрит только на Backend, остальные — на дефолт дашборда.
 */
interface BaseWidgetConfig {
  /** Частичное переопределение фильтров дашборда для этого виджета */
  filtersOverride?: Partial<DashboardFilters>;
}

// ── Метрики-графики ──────────────────────────────────────────────────────────

/**
 * График одной метрики (AreaChart или BarChart).
 * Источник: CTODashboard AreaChart (deployFreq, leadTime),
 *           DevOpsDashboard (deployFreq, mttrTrend),
 *           ICDashboard (myBuilds), TLDashboard (ciPassRate, burndown),
 *           VPDashboard (sprintVelocity, prCycleByTeam)
 */
export interface MetricChartConfig extends BaseWidgetConfig {
  type: 'metric-chart';
  metricId: MetricId;
  chartVariant: 'area' | 'bar' | 'bar-horizontal';
  /** Показывать сравнительную линию предыдущего периода. Источник: MetricsScreen compareMode */
  showCompare: boolean;
  /** Переопределить цвет линии. Источник: TLDashboard color="#00C853" */
  colorOverride?: string;
}

/**
 * Два ряда на одном BarChart для сравнения команд/спринтов.
 * Источник: CTODashboard BarChart (velocityByTeam vs prevVelocity)
 */
export interface CompareBarChartConfig extends BaseWidgetConfig {
  type: 'compare-bar-chart';
  metricId: MetricId;
  /** По чему группировать ряды. Источник: CTODashboard labels: ['Platform','Mobile',...] */
  groupBy: 'team' | 'repo';
  /** Метка для основного ряда. Источник: CTODashboard "This sprint" */
  primaryLabel: string;
  /** Метка для сравниваемого ряда. Источник: CTODashboard "Previous sprint" */
  compareLabel: string;
}

// ── Сводные / агрегатные виджеты ────────────────────────────────────────────

/**
 * StatCard — одна метрика с трендом и опциональным спарклайном.
 * Источник: все dashboard-файлы, StatCard props
 */
export interface StatCardConfig extends BaseWidgetConfig {
  type: 'stat-card';
  metricId: MetricId;
  /** Показывать спарклайн. Источник: TweaksContext showSparklines */
  showSparkline: boolean;
  colorKey: 'cyan' | 'purple' | 'success' | 'warning' | 'error';
}

/**
 * Четыре DORA-метрики в виде кликабельных карточек.
 * Источник: MetricsScreen DORAPanel (deploy-freq, lead-time, cfr, mttr)
 */
export interface DORAOverviewConfig extends BaseWidgetConfig {
  type: 'dora-overview';
  // Нет дополнительной конфигурации — виджет всегда показывает все 4 метрики
}

/**
 * Gauge — круговой индикатор health score с breakdown.
 * Источник: CTODashboard Gauge value=0.84, grid с Velocity/Quality/Reliability/Security
 */
export interface GaugeConfig extends BaseWidgetConfig {
  type: 'health-gauge';
  /** Показывать детализацию по измерениям. Источник: CTODashboard сетка 2x2 */
  showDimensions: boolean;
}

// ── Активность / тепловые карты ─────────────────────────────────────────────

/**
 * Heatmap активности.
 * Источник: VPDashboard Heatmap (5 teams × 14 days),
 *           DevOpsDashboard Heatmap (7 weekdays × 16 days)
 */
export interface HeatmapConfig extends BaseWidgetConfig {
  type: 'heatmap';
  /** По строкам: команды или дни недели. Источник: VPDashboard rows=teamLabels, DevOps rows=dayLabels */
  rowGroupBy: 'team' | 'weekday';
  colorOverride?: string;
}

// ── Таблицы ──────────────────────────────────────────────────────────────────

/**
 * Тип табличных данных.
 * Источник: TLDashboard (pr-queue, ci-failures), DevOpsDashboard (incidents),
 *           ICDashboard (my-prs, review-queue), VPDashboard (delivery-risk)
 */
export type TableDataType =
  | 'pr-queue'         // TLDashboard "PR Review Queue"
  | 'ci-failures'      // TLDashboard "Recent Failures"
  | 'incidents'        // DevOpsDashboard "Recent Incidents"
  | 'delivery-risk'    // VPDashboard "Delivery Risk"
  | 'my-prs'           // ICDashboard "My Pull Requests"
  | 'review-queue'     // ICDashboard "My Review Queue"
  | 'blocked-tasks';   // DashboardWizard "Blocked Tasks"

/**
 * Табличный виджет.
 * Источник: DataTable component, все *Dashboard.jsx
 */
export interface DataTableConfig extends BaseWidgetConfig {
  type: 'data-table';
  tableType: TableDataType;
  /** Источник: DataTable props maxRows=5 */
  maxRows: number;
}

// ── Рейтинги и прогресс ─────────────────────────────────────────────────────

/**
 * Leaderboard — рейтинг команд/репозиториев по метрике.
 * Источник: MetricsScreen Leaderboard (deploy-freq, lead-time),
 *           DashboardWizard widget 'leaderboard'
 */
export interface LeaderboardConfig extends BaseWidgetConfig {
  type: 'leaderboard';
  metricId: MetricId;
  groupBy: 'team' | 'repo' | 'author';
  limit: number;
}

/**
 * Sprint Burndown — фактическое vs идеальное.
 * Источник: TLDashboard AreaChart с compare=idealLine, ICDashboard SprintProgress
 */
export interface SprintBurndownConfig extends BaseWidgetConfig {
  type: 'sprint-burndown';
  /** Показывать прогресс-бар + список задач под графиком. Источник: ICDashboard SprintProgress */
  showTaskList: boolean;
  /** Конкретный userId для IC-режима. Источник: ICDashboard "My Dashboard" */
  userId?: string;
}

// ── AI ───────────────────────────────────────────────────────────────────────

/**
 * AI-инсайт карточка или inline-панель.
 * Источник: DashboardScreen AIInsightCard, все *Dashboard.jsx InlineInsight
 */
export interface AIInsightConfig extends BaseWidgetConfig {
  type: 'ai-insight';
  /** Источник: AIInsightCard (card) vs InlineInsight (inline) */
  variant: 'card' | 'inline';
  /** Подсказка AI о чём генерировать инсайт. Если не задано — по контексту дашборда */
  topicHint?: string;
}

/**
 * Anomaly Detector — ML-флаги на метриках.
 * Источник: DashboardWizard WIDGET_LIBRARY 'anomaly'
 */
export interface AnomalyDetectorConfig extends BaseWidgetConfig {
  type: 'anomaly-detector';
  /** Метрики для мониторинга. Если пусто — все метрики дашборда */
  watchMetrics: MetricId[];
}

// ── Discriminated union всех конфигов ────────────────────────────────────────

export type WidgetConfig =
  | MetricChartConfig
  | CompareBarChartConfig
  | StatCardConfig
  | DORAOverviewConfig
  | GaugeConfig
  | HeatmapConfig
  | DataTableConfig
  | LeaderboardConfig
  | SprintBurndownConfig
  | AIInsightConfig
  | AnomalyDetectorConfig;

export type WidgetType = WidgetConfig['type'];

// ─────────────────────────────────────────────────────────────────────────────
// 3c. LAYOUT (12-column grid, drag-and-drop ready)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Позиция и размер виджета в 12-колоночной сетке.
 * Совместим с react-grid-layout (поле `i` = instanceId).
 *
 * Источник: DashboardWizardScreen widgetSizes ('sm'='half'=w:6, 'lg'='full'=w:12),
 *           порядок из moveWidget → теперь позиционный (x, y).
 *
 * Схема:
 *   w=3  → 1/4 строки
 *   w=6  → половина строки ('sm' из визарда)
 *   w=9  → 3/4 строки
 *   w=12 → полная строка ('lg' из визарда)
 */
export interface WidgetLayout {
  /** = DashboardWidgetInstance.instanceId */
  i: string;
  /** Колонка (0–11) */
  x: number;
  /** Строка */
  y: number;
  /** Ширина в колонках (1–12) */
  w: number;
  /** Высота в строках (1 строка ≈ 100px) */
  h: number;
  /** Минимальная ширина для drag-and-drop ресайза */
  minW?: number;
  minH?: number;
  /** Запрет перемещения (для системных виджетов) */
  static?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3d. DASHBOARD ENTITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Идентификатор системного шаблона.
 * Источник: DashboardWizardScreen TEMPLATES[*].id, RoleDashboardScreen ROLES[*].id
 */
export type SystemTemplateId = 'cto' | 'vp' | 'tl' | 'devops' | 'ic' | 'overview';

/**
 * Откуда появился дашборд.
 * Источник: DashboardWizardScreen (выбор шаблона → user-created/forked),
 *           Sidebar (роль-дашборды → system-template)
 */
export type DashboardSourceType =
  | 'system-template' // встроенный роль-дашборд (CTO, VP, TL, DevOps, IC)
  | 'user-created'    // создан с нуля в визарде (blank или на базе шаблона)
  | 'forked';         // пользователь нажал "Fork" на system-template или чужом дашборде

/**
 * Уровень видимости дашборда.
 * Источник: ответ на вопрос 5 (все варианты)
 */
export type DashboardVisibility = 'private' | 'team' | 'org';

/**
 * Инстанс виджета внутри дашборда.
 * instanceId уникален в пределах дашборда и используется как ключ в layout.
 */
export interface DashboardWidgetInstance {
  /** UUID, уникальный ключ для layout. Источник: визарда toggleWidget → uuid */
  instanceId: string;
  /** Тип виджета — дискриминант конфига. Источник: WIDGET_LIBRARY[*].id → WidgetType */
  widgetType: WidgetType;
  /** Конфиг виджета. Тип зависит от widgetType (discriminated union). */
  config: WidgetConfig;
}

/**
 * Основная сущность дашборда.
 *
 * Объединяет:
 * - системные шаблоны (CTO, VP, TL, DevOps, IC) — sourceType='system-template'
 * - дашборды, созданные в визарде — sourceType='user-created'
 * - форки системных или пользовательских — sourceType='forked'
 */
export interface Dashboard {
  id: string;
  name: string;                          // Источник: DashboardWizardScreen input "Dashboard name"
  description?: string;                  // Источник: DashboardWizardScreen input "Description"

  // ── Происхождение ───────────────────────────────────────────────────────
  sourceType: DashboardSourceType;
  /** Заполнено если sourceType='system-template' или 'forked'. */
  sourceTemplateId?: SystemTemplateId;
  /** id исходного дашборда при форке. */
  forkedFromId?: string;

  // ── Видимость и шаринг ──────────────────────────────────────────────────
  visibility: DashboardVisibility;
  /** Заполнено если visibility='team'. */
  teamId?: string;
  /** Токен read-only ссылки. Источник: ответ 5 — "можно поделиться ссылкой" */
  shareToken?: string;

  // ── Контент ─────────────────────────────────────────────────────────────
  /**
   * Дефолтные фильтры для всех виджетов.
   * Виджет может переопределить через config.filtersOverride.
   * Источник: DashboardWizardScreen settings (timeRange, team)
   */
  defaultFilters: DashboardFilters;
  widgets: DashboardWidgetInstance[];
  /**
   * Позиции и размеры виджетов.
   * layout[i].i === widgets[j].instanceId
   * Источник: DashboardWizardScreen widgetSizes + moveWidget → теперь grid
   */
  layout: WidgetLayout[];

  // ── Метаданные ──────────────────────────────────────────────────────────
  createdBy: string;
  createdAt: string;   // ISO 8601
  updatedAt: string;
  /**
   * Версия для optimistic concurrency.
   * PUT /dashboards/:id отклоняется если version не совпадает.
   */
  version: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3e. ЛОКАЛЬНЫЙ СЛОЙ (draft + sync)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Черновик изменений, ещё не сохранённых на сервере.
 * Хранится в localStorage под ключом `metraly-draft-{dashboardId}`.
 * Источник: ответ 4 — "оба варианта, не хочется каждый раз с сервера"
 */
export interface DashboardDraft {
  dashboardId: string;
  /** Частичные изменения поверх серверной версии */
  changes: Partial<Pick<Dashboard, 'name' | 'description' | 'widgets' | 'defaultFilters' | 'visibility'>>;
  /**
   * Локальные изменения layout от drag-and-drop.
   * Отдельно от changes, чтобы не засорять diff виджетов.
   */
  localLayout?: WidgetLayout[];
  /** Когда черновик был создан */
  draftedAt: string;
  /** Серверная версия, поверх которой сделан черновик */
  baseVersion: number;
}

/**
 * Кешированная запись дашборда в localStorage.
 * Ключ: `metraly-dashboard-{id}`
 */
export interface DashboardCacheEntry {
  dashboard: Dashboard;
  /** Когда получили с сервера */
  fetchedAt: string;
  /** TTL-ориентир в секундах — UI решает, стоит ли рефетчить */
  staleSec: number;
  /** Черновик, если есть незакоммиченные изменения */
  draft?: DashboardDraft;
}

/**
 * Список всех дашбордов пользователя в localStorage.
 * Ключ: `metraly-dashboards-index`
 * Содержит только мета (без widgets/layout) для отрисовки sidebar.
 */
export interface DashboardIndexEntry {
  id: string;
  name: string;
  sourceType: DashboardSourceType;
  sourceTemplateId?: SystemTemplateId;
  visibility: DashboardVisibility;
  updatedAt: string;
  /** Есть ли незакоммиченный черновик */
  hasDraft: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3f. API ЭНДПОИНТЫ ДАШБОРДОВ
// ─────────────────────────────────────────────────────────────────────────────

// ── Список ──────────────────────────────────────────────────────────────────

/** GET /api/dashboards?visibility=private|team|org */
export type DashboardListResponse = DashboardIndexEntry[];

// ── Системные шаблоны ────────────────────────────────────────────────────────

/**
 * Системный шаблон (CTO, VP, TL, DevOps, IC).
 * Содержит полный дашборд + мета для карточки выбора в визарде.
 * Источник: DashboardWizardScreen TEMPLATES, RoleDashboardScreen ROLES
 */
export interface SystemTemplate {
  templateId: SystemTemplateId;
  /** Источник: DashboardWizardScreen tmpl.label */
  label: string;
  /** Источник: DashboardWizardScreen tmpl.desc */
  description: string;
  /** Предзаполненный дашборд для форка */
  dashboard: Omit<Dashboard, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'version'>;
}

/** GET /api/dashboards/templates */
export type SystemTemplatesResponse = SystemTemplate[];

// ── CRUD ────────────────────────────────────────────────────────────────────

/** GET /api/dashboards/:id → Dashboard */
export type DashboardResponse = Dashboard;

/**
 * POST /api/dashboards — создать новый дашборд.
 * Источник: DashboardWizardScreen onSave callback
 *   { name, widgets, widgetSizes, timeRange, team, description }
 */
export interface CreateDashboardRequest {
  name: string;
  description?: string;
  sourceType: 'user-created' | 'forked';
  sourceTemplateId?: SystemTemplateId;
  forkedFromId?: string;
  visibility: DashboardVisibility;
  teamId?: string;
  defaultFilters: DashboardFilters;
  widgets: DashboardWidgetInstance[];
  layout: WidgetLayout[];
}

export interface CreateDashboardResponse {
  dashboard: Dashboard;
}

/**
 * PUT /api/dashboards/:id — полное обновление.
 * version нужна для optimistic concurrency (409 если устарела).
 */
export interface UpdateDashboardRequest {
  name?: string;
  description?: string;
  visibility?: DashboardVisibility;
  teamId?: string;
  defaultFilters?: DashboardFilters;
  widgets?: DashboardWidgetInstance[];
  layout?: WidgetLayout[];
  /** Должна совпадать с текущей серверной версией */
  version: number;
}

export interface UpdateDashboardResponse {
  dashboard: Dashboard;
}

/**
 * POST /api/dashboards/:id/fork — создать свою копию.
 * Используется когда пользователь редактирует роль-дашборд.
 * Источник: ответ 2 — "пользователь может убрать/добавить виджеты и сохранить как свой"
 */
export interface ForkDashboardRequest {
  name?: string;         // если не задано — "{оригинальное имя} (copy)"
  visibility: DashboardVisibility;
}

export interface ForkDashboardResponse {
  dashboard: Dashboard;
}

/**
 * PATCH /api/dashboards/:id/layout — обновить только layout (drag-and-drop).
 * Отдельный эндпоинт, чтобы не гонять весь дашборд при каждом перетаскивании.
 */
export interface UpdateLayoutRequest {
  layout: WidgetLayout[];
  version: number;
}

/**
 * POST /api/dashboards/:id/share — управление шарингом.
 */
export interface ShareDashboardRequest {
  visibility: DashboardVisibility;
  teamId?: string;
  /** true = сгенерировать новый токен, false = отозвать */
  generateShareToken?: boolean;
}

export interface ShareDashboardResponse {
  visibility: DashboardVisibility;
  shareToken?: string;
  shareUrl?: string;
}

// ── Данные для виджетов ──────────────────────────────────────────────────────

/**
 * Запрос данных для одного виджета.
 * Фильтры = merge(dashboard.defaultFilters, widget.config.filtersOverride).
 * Источник: ответ 1 — гибрид C
 */
export interface WidgetDataRequest {
  widgetType: WidgetType;
  config: WidgetConfig;
  /** Итоговые фильтры после merge. Сервер использует их для запроса. */
  resolvedFilters: DashboardFilters;
}

/**
 * Батч-запрос данных всех виджетов дашборда за один HTTP-вызов.
 * POST /api/dashboards/:id/data
 */
export interface DashboardDataRequest {
  dashboardId: string;
  widgets: WidgetDataRequest[];
}

/** Данные одного виджета в батч-ответе */
export interface WidgetDataItem {
  instanceId: string;
  /** null если ошибка загрузки */
  data: unknown | null;
  error?: string;
}

export interface DashboardDataResponse {
  widgets: WidgetDataItem[];
  fetchedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ДАННЫЕ ДЛЯ КОНКРЕТНЫХ ДАШБОРДОВ (ответы бэка под дашборд-специфичные запросы)
// ─────────────────────────────────────────────────────────────────────────────

// Примечание: при переходе на единую модель дашборда эти эндпоинты
// можно заменить на POST /api/dashboards/:id/data. Пока оставлены как есть
// для обратной совместимости с role-дашбордами.

/** Источник: CTODashboard Gauge value=0.84, grid Velocity/Quality/Reliability/Security */
export interface HealthScore {
  score: number; // 0–1
  dimensions: {
    velocity: number;
    quality: number;
    reliability: number;
    security: number;
  };
}

/** Источник: CTODashboard velocityByTeam + prevVelocity */
export interface TeamVelocityComparison {
  teams: TeamName[];
  currentSprint: number[];
  previousSprint: number[];
}

/** GET /api/dashboards/cto?timeRange=30d */
export interface CTODashboardData {
  healthScore: HealthScore;
  deployFrequency: MetricTimeSeries;
  leadTime: MetricTimeSeries;
  teamVelocity: TeamVelocityComparison;
  insight: AIInsight;
}

/** Источник: VPDashboard "Delivery Risk" */
export interface DeliveryRiskItem {
  name: string;
  team: TeamName;
  status: ItemStatus;
}

/** Источник: VPDashboard Heatmap rows=5, cols=14 */
export interface CommitHeatmap {
  data: number[][];
  rowLabels: string[];
  colLabels: string[];
}

/** GET /api/dashboards/vp */
export interface VPDashboardData {
  sprintVelocityTrend: MetricTimeSeries;
  prCycleTimeByTeam: { teams: TeamName[]; hoursP50: number[] };
  commitHeatmap: CommitHeatmap;
  deliveryRisk: DeliveryRiskItem[];
  insight: AIInsight;
}

/** Источник: TLDashboard "PR Review Queue" */
export interface PRQueueItem {
  title: string;
  author: string;
  age: string;
  status: ItemStatus;
}

/** Источник: TLDashboard "Recent Failures" */
export interface CIFailure {
  workflow: string;
  repo: RepoName;
  failedAt: string;
}

/** GET /api/dashboards/tl */
export interface TLDashboardData {
  ciPassRateTrend: MetricTimeSeries;
  sprintBurndown: { actual: MetricTimeSeries; ideal: MetricTimeSeries; daysRemaining: number };
  prQueue: PRQueueItem[];
  recentCIFailures: CIFailure[];
  insight: AIInsight;
}

/** Источник: DevOpsDashboard "Recent Incidents" */
export interface Incident {
  id: string;
  service: string;
  severity: 'P1' | 'P2' | 'P3';
  mttr: string | null;
  status: 'Open' | 'Done';
}

/** Источник: DevOpsDashboard Heatmap rows=7, cols=16 */
export interface DeployHeatmap {
  data: number[][];
  rowLabels: string[];
}

/** GET /api/dashboards/devops */
export interface DevOpsDashboardData {
  deployFrequencyTrend: MetricTimeSeries;
  mttrTrend: MetricTimeSeries;
  deployHeatmap: DeployHeatmap;
  incidents: Incident[];
  insight: AIInsight;
}

/** Источник: ICDashboard "My Pull Requests" */
export interface MyPR {
  title: string;
  branch: string;
  age: string;
  reviewsReceived: number;
  reviewsRequired: number;
  needsRebase?: boolean;
}

/** Источник: ICDashboard CI-запуски под AreaChart */
export interface MyCIRun {
  branch: string;
  status: 'pass' | 'fail';
  duration: string;
  ago: string;
}

/** Источник: ICDashboard "My Review Queue" */
export interface ReviewQueueItem {
  prTitle: string;
  author: string;
  diff: string;
  waitingFor: string;
}

/** Источник: ICDashboard "Sprint Progress" */
export interface SprintTask {
  title: string;
  points: number;
  done: boolean;
}

/** GET /api/dashboards/ic */
export interface ICDashboardData {
  myPRs: MyPR[];
  ciPassRateTrend: MetricTimeSeries;
  recentCIRuns: MyCIRun[];
  reviewQueue: ReviewQueueItem[];
  sprint: {
    number: number;
    daysLeft: number;
    pointsCompleted: number;
    pointsTotal: number;
    tasks: SprintTask[];
  };
  insight: AIInsight;
}

/** Источник: DashboardScreen `metrics` array */
export interface OverviewMetric {
  id: string;
  label: string;
  value: string;
  trend: string;
  trendDir: TrendDir;
  colorKey: 'cyan' | 'purple' | 'success' | 'warning' | 'error';
  sparkData: number[];
}

/** GET /api/overview */
export interface OverviewDashboardData {
  metrics: OverviewMetric[];
  insights: AIInsight[];
  recentActivity: ActivityEvent[];
  lastUpdatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ONBOARDING, PLUGINS, AI, USER
// ─────────────────────────────────────────────────────────────────────────────

// ── Activity ─────────────────────────────────────────────────────────────────

/** Источник: DashboardScreen recentActivity */
export interface ActivityEvent {
  id: string;
  actor: string;
  description: string;
  relativeTime: string;
  color: string;
}

/** Источник: DashboardScreen AIInsightCard */
export interface AIInsight {
  id: string;
  title: string;
  body: string;
  action?: string;
  generatedAt: string;
}

// ── Onboarding ───────────────────────────────────────────────────────────────

/** Источник: WizardScreen sources[*].id */
export type SourceId = 'github' | 'jira' | 'gitlab' | 'linear' | 'slack' | 'pagerduty';

/** Источник: WizardScreen ConfigureStep */
export interface SourceSyncConfig {
  syncInterval: 'every_5m' | 'every_15m' | 'every_1h';
  repoScope: 'all' | 'selected';
  includeArchived: boolean;
  backfillDays: 30 | 90 | 365;
}

/** POST /api/integrations/connect */
export interface ConnectSourceRequest {
  sourceId: SourceId;
  authToken: string;
  config: SourceSyncConfig;
}

/** GET /api/integrations */
export interface IntegrationStatus {
  sourceId: SourceId;
  name: string;
  connected: boolean;
  status: 'connecting' | 'active' | 'error';
}

// ── Metrics Explorer ─────────────────────────────────────────────────────────

/** GET /api/metrics/{metricId}/breakdown */
export interface MetricBreakdownItem {
  name: string;
  team: TeamName;
  value: string;
  valueRaw: number;
  doraLevel: DORALevel;
  delta: string;
}

// ── Plugins ──────────────────────────────────────────────────────────────────

/** Источник: PluginScreen plugins[*].cat + filters */
export type PluginCategory = 'Sources' | 'Exporters' | 'AI' | 'Alerts';

/** Источник: PluginScreen plugins array */
export interface Plugin {
  id: string;
  name: string;
  category: PluginCategory;
  description: string;
  rating: number;
  installCount: string;
  installed: boolean;
  accentColor: string;
}

/** GET /api/plugins?category=...&search=... */
export type PluginsResponse = Plugin[];

/** POST /api/plugins/:id/install */
export interface InstallPluginResponse {
  pluginId: string;
  installed: boolean;
}

// ── AI Chat ───────────────────────────────────────────────────────────────────

/** Источник: AIScreen messages state */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

/** POST /api/ai/chat */
export interface AIChatRequest {
  messages: ChatMessage[];
  context?: {
    activeDashboardId?: string;
    activeMetric?: MetricId;
    resolvedFilters?: DashboardFilters;
  };
}

export interface AIChatResponse {
  reply: string;
  relatedMetrics?: MetricId[];
}

// ── User & System ─────────────────────────────────────────────────────────────

/** Источник: Sidebar footer (Jamie Dev, JD, Admin) */
export interface CurrentUser {
  id: string;
  displayName: string;
  initials: string;
  role: string;
  avatarUrl?: string;
}

/** Источник: Sidebar "All systems nominal" */
export interface SystemStatus {
  status: 'nominal' | 'degraded' | 'down';
  label: string;
}

/** GET /api/me */
export interface MeResponse {
  user: CurrentUser;
  system: SystemStatus;
  /** Источник: Sidebar localStorage 'metraly-pinned' — теперь персистируется на сервере */
  pinnedDashboardIds: string[];
  /** Индекс дашбордов пользователя для sidebar */
  dashboards: DashboardIndexEntry[];
}
