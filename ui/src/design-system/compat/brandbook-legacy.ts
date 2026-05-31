import React, { createElement, type ReactElement, type ReactNode } from "react";
import {
  DashboardGrid,
  DashboardWidget,
  MetralyButton,
  MetralyEmptyState,
  MetralyInput,
  MetralyMetricCard,
  MetralyTable,
  StateBadge,
  StatusBadge,
  TrendBadge,
  type DashboardGridProps,
  type DashboardWidgetProps,
  type MetralyMetricCardVariant,
  type MetralyTableProps,
  type StateBadgeProps,
  type StateBadgeState,
  type StatusBadgeProps,
  type StatusBadgeStatus,
  type TrendBadgeDirection,
  type TrendBadgeSentiment,
} from "@metraly/ui";
import { widgetRegistry } from "../../components/dashboard/widgetRegistry";
import type { Dashboard, DashboardWidgetInstance } from "../../types/dashboard";
import type { MetricTimeSeries } from "../../types/metrics";
import { Icon } from "../../components/shared/Icon";
/**
 * brandbook-legacy.ts — compatibility layer during the brandbook cutover
 *
 * Callers import from `design-system`, not from local component paths. That
 * lets the app swap one surface at a time to `@metraly/ui` while keeping
 * feature imports stable.
 *
 * Migration map
 * ─────────────────────────────────────────────────────────────────
 * Local                           → brandbook canonical
 * ─────────────────────────────────────────────────────────────────
 * Badge                           → StatusBadge / StateBadge adapter  ✓ live
 * DataTable                       → MetralyTable                      ✓ live
 * StatCard                        → MetralyMetricCard
 * Sidebar                         → MetralySidebar + MetralySidebarSection + MetralySidebarItem
 * Topbar                          → MetralyTopbar
 * PlaceholderScreen               → StateBlock  (via MetralyEmptyState)  ✓ live
 * DORABadge                       → StateBadge  (DORA level adapter)  ✓ live
 * Widget                          → DashboardWidget
 * DashboardRenderer               → DashboardGrid  (static layout)
 * DraggableDashboardRenderer      → DashboardGrid  (drag-enabled layout)
 *
 * Wizard (not yet used in app — will be wired in a later onboarding migration):
 * –                               → WizardLayout
 * –                               → StepRail
 * –                               → ReviewPanel
 * –                               → StickyWizardFooter
 *
 * ⚑ No brandbook equivalent yet (P2-4 work):
 * AIInsightCard, InlineInsight, Leaderboard
 * ─────────────────────────────────────────────────────────────────
 */

interface PlaceholderScreenCompatProps {
  name: string;
}

type LegacyStatus = "On track" | "At risk" | "Blocked" | "Done" | "Open";
type StatusBadgeCompatProps = Omit<StatusBadgeProps, "status"> & { status: string };
type DORABadgeCompatProps = Omit<StateBadgeProps, "state" | "label" | "ariaLabel"> & {
  level: string;
  label?: string;
  value?: string;
  ariaLabel?: string;
};

interface DataTableCompatProps {
  columns: string[];
  rows: ReactNode[][];
  title?: string;
  maxRows?: number;
}

type CompatTableRow = Record<string, ReactNode>;

const LEGACY_STATUS_STATE_MAP: Record<LegacyStatus, StateBadgeState> = {
  "On track": "success",
  "At risk": "warning",
  Blocked: "error",
  Done: "ok",
  Open: "info",
};

const CANONICAL_STATUS_SET: Record<StatusBadgeStatus, true> = {
  Live: true,
  Preview: true,
  Designed: true,
  Planned: true,
  "In progress": true,
  Gated: true,
  "Policy defined": true,
  "Benchmark pending": true,
  "Coming soon": true,
  Error: true,
  Delayed: true,
  "No data": true,
};

const DORA_LEVEL_STATE_MAP: Record<string, StateBadgeState> = {
  Elite: "success",
  High: "live",
  Med: "warning",
  Low: "error",
};

const CompatMetralyTable = MetralyTable as unknown as (
  props: MetralyTableProps<CompatTableRow>,
) => ReactElement;

function asCanonicalStatus(status: string): StatusBadgeStatus | null {
  return status in CANONICAL_STATUS_SET ? (status as StatusBadgeStatus) : null;
}

function asLegacyStatusState(status: string): StateBadgeState {
  return LEGACY_STATUS_STATE_MAP[status as LegacyStatus] ?? "info";
}

function asDoraState(level: string): StateBadgeState {
  return DORA_LEVEL_STATE_MAP[level] ?? "warning";
}

// ── Status badges ──────────────────────────────────────────────────────────────
export function StatusBadgeCompat({
  status,
  label,
  ariaLabel,
  pulse = false,
  ...rest
}: StatusBadgeCompatProps) {
  const canonicalStatus = asCanonicalStatus(status);
  if (canonicalStatus) {
    return createElement(StatusBadge, {
      ...rest,
      status: canonicalStatus,
      label,
      ariaLabel,
      pulse,
    });
  }

  const resolvedLabel = label ?? status;
  return createElement(StateBadge, {
    ...rest,
    state: asLegacyStatusState(status),
    label: resolvedLabel,
    ariaLabel: ariaLabel ?? resolvedLabel,
    pulse,
  });
}

// ── Data display ───────────────────────────────────────────────────────────────
export function DataTableCompat({
  columns,
  rows,
  title,
  maxRows = 5,
}: DataTableCompatProps) {
  const compatColumns = columns.map((header, index) => ({
    key: `col${index}`,
    header,
    align: index === 0 ? "left" : "right",
  })) as MetralyTableProps<CompatTableRow>["columns"];
  const compatRows = rows.slice(0, maxRows).map((row) =>
    Object.fromEntries(row.map((cell, index) => [`col${index}`, cell])) as CompatTableRow,
  );

  return createElement(
    "div",
    { style: { width: "100%" } },
    title
      ? createElement(
          "div",
          {
            style: { fontSize: 12, fontWeight: 600, marginBottom: 10, color: "var(--text)" },
          },
          title,
        )
      : null,
    createElement(CompatMetralyTable, {
      columns: compatColumns,
      data: compatRows,
      dense: true,
      ariaLabel: title ?? "Data table",
      rowKey: (_, index) => String(index),
    }),
  );
}

// ── Metric / stat card ─────────────────────────────────────────────────────────
// ── Metric / stat card ─────────────────────────────────────────────────────────
// Phase 3 complete: StatCard → MetralyMetricCard via prop mapping
type LegacyColorKey = "cyan" | "purple" | "success" | "warning" | "error";
type LegacyTrendDir = "up" | "down" | "neutral";

interface StatCardCompatProps {
  icon: string;
  label: string;
  value: ReactNode;
  sub?: string;
  trend?: string;
  trendDir?: LegacyTrendDir;
  color?: LegacyColorKey | string;
  spark?: number[];
  delay?: number;
}

const STAT_VARIANT_MAP: Record<LegacyColorKey, MetralyMetricCardVariant> = {
  cyan: "primary",
  purple: "secondary",
  success: "success",
  warning: "warning",
  error: "error",
};

const TREND_DIRECTION: Record<LegacyTrendDir, TrendBadgeDirection> = {
  up: "up",
  down: "down",
  neutral: "flat",
};

const TREND_SENTIMENT: Record<LegacyTrendDir, TrendBadgeSentiment> = {
  up: "positive",
  down: "negative",
  neutral: "neutral",
};

export function StatCardCompat({
  icon,
  label,
  value,
  sub,
  trend,
  trendDir = "neutral",
  color,
  spark,
}: StatCardCompatProps) {
  const variant: MetralyMetricCardVariant =
    STAT_VARIANT_MAP[color as LegacyColorKey] ?? "primary";

  const footerNode =
    trend || spark ? (
      createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8 } },
        trend
          ? createElement(TrendBadge, {
              direction: TREND_DIRECTION[trendDir],
              sentiment: TREND_SENTIMENT[trendDir],
              value: trend,
              size: "sm",
            })
          : null,
      )
    ) : undefined;

  return createElement(MetralyMetricCard, {
    title: label,
    value,
    description: sub,
    icon: createElement(Icon, { name: icon, size: 15, color: "currentColor" }),
    variant,
    footer: footerNode,
  });
}

// ── Shell: sidebar + topbar ────────────────────────────────────────────────────
// Phase 4 complete: SidebarCompat → MetralySidebar adapter
export { SidebarCompat } from "./SidebarCompat";
// Phase 4 complete: TopbarCompat → MetralyTopbar adapter
export { TopbarCompat } from "./TopbarCompat";

// ── Empty / placeholder state ──────────────────────────────────────────────────
export function PlaceholderScreenCompat({ name }: PlaceholderScreenCompatProps) {
  return createElement(MetralyEmptyState, {
    title: name,
    description: "This surface has not been migrated yet.",
    icon: createElement(Icon, {
      name: "sparkles",
      size: 18,
      color: "currentColor",
      style: { display: "block" },
    }),
    style: {
      flex: 1,
      minHeight: "100%",
      alignSelf: "stretch",
      borderStyle: "solid",
      background: "var(--glass)",
    },
  });
}

// ── DORA indicator ─────────────────────────────────────────────────────────────
export function DORABadgeCompat({
  level,
  label,
  value,
  ariaLabel,
  pulse = false,
  showIndicator = false,
  size = "sm",
  ...rest
}: DORABadgeCompatProps) {
  const resolvedLabel = [label, value ?? level].filter(Boolean).join(" ");
  return createElement(StateBadge, {
    ...rest,
    state: asDoraState(level),
    label: resolvedLabel,
    ariaLabel: ariaLabel ?? resolvedLabel,
    showIndicator,
    size,
    pulse,
  });
}

type MetralyButtonCompatProps = React.ComponentPropsWithoutRef<"button"> & {
  variant?: string;
  size?: string;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

export function MetralyButtonCompat(props: MetralyButtonCompatProps) {
  return createElement(MetralyButton as unknown as React.ElementType, props);
}

type MetralyInputCompatProps = React.ComponentPropsWithoutRef<"input"> & {
  search?: boolean;
  label?: ReactNode;
  description?: ReactNode;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  error?: string;
  fullWidth?: boolean;
  wrapperClassName?: string;
};

export function MetralyInputCompat(props: MetralyInputCompatProps) {
  return createElement(MetralyInput as unknown as React.ElementType, props);
}

// ── Dashboard widget shell ─────────────────────────────────────────────────────
// Phase 3 complete: Widget → DashboardWidget via compat adapter
type WidgetCompatProps = Pick<
  DashboardWidgetProps,
  | 'id'
  | 'title'
  | 'subtitle'
  | 'state'
  | 'stateLabel'
  | 'selected'
  | 'dragging'
  | 'resizing'
  | 'resizable'
  | 'loading'
  | 'fullWidth'
  | 'children'
  | 'footer'
  | 'stateTitle'
  | 'stateDescription'
  | 'stateAction'
  | 'className'
  | 'onSelect'
  | 'onRemove'
  | 'onDragStart'
>;

export function WidgetCompat(props: WidgetCompatProps) {
  return createElement(DashboardWidget, props);
}

// ── Dashboard grid ─────────────────────────────────────────────────────────────
// Phase 3 complete: DashboardRenderer → DashboardGrid compat adapter
export { DashboardGrid };
export type { DashboardGridProps };

// createElement can't infer DashboardGrid's generic, so we anchor the concrete widget type.
type DashboardGridWidget = DashboardWidgetInstance & { id: string };
const ConcreteDashboardGrid = DashboardGrid as React.ComponentType<
  DashboardGridProps<DashboardGridWidget>
>;

interface DashboardRendererCompatProps {
  dashboard: Dashboard;
  widgetData?: Record<string, MetricTimeSeries>;
}

export function DashboardRendererCompat({
  dashboard,
  widgetData = {},
}: DashboardRendererCompatProps) {
  const activeWidgets: DashboardGridWidget[] = dashboard.widgets
    .filter((w) => w.widgetType !== "empty")
    .map((w) => ({ ...w, id: w.instanceId }));
  return createElement(ConcreteDashboardGrid, {
    widgets: activeWidgets,
    layout: dashboard.layout,
    renderWidget: (widget: DashboardGridWidget) => {
      const WidgetComponent = widgetRegistry[widget.widgetType];
      if (!WidgetComponent) {
        return createElement(
          "div",
          { style: { display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)", fontSize: 12 } },
          `Unknown widget: ${widget.widgetType}`,
        );
      }
      const scopedId = `${dashboard.id}-${widget.instanceId}`;
      return createElement(
        WidgetComponent as React.ComponentType<{ config: unknown; data: MetricTimeSeries | undefined }>,
        { config: widget.config, data: widgetData[scopedId] },
      );
    },
  });
}

// ── Draggable dashboard (no brandbook equivalent yet — tracked for Phase 4) ───
export { DraggableDashboardRenderer } from "../../components/dashboard/DraggableDashboardRenderer";

// ── AI / Insight (no brandbook equivalent — tracked in P2-4) ───────────────────
export { AIInsightCard } from "../../components/ui/AIInsightCard";
export { InlineInsight } from "../../components/ui/InlineInsight";

// ── Leaderboard (no brandbook equivalent — tracked in P2-4) ───────────────────
export { Leaderboard } from "../../components/ui/Leaderboard";

// ── AI Workspace (Phase 9 complete) ──────────────────────────────────────────
export type { EvidenceCitation, AnswerCardProps } from "@metraly/ui";
export { AnswerCard } from "@metraly/ui";
export type { EvidencePanelProps } from "@metraly/ui";
export { EvidencePanel } from "@metraly/ui";
export type { TraceStep, TraceStepStatus, TraceDrawerProps } from "@metraly/ui";
export { TraceDrawer } from "@metraly/ui";
export type { ChatMessage, AIWorkspaceLayoutProps } from "@metraly/ui";
export { AIWorkspaceLayout } from "@metraly/ui";
// ── Plugins (Phase 9 complete) ───────────────────────────────────────────────
export type { PermissionLevel, PermissionBadgeProps } from "@metraly/ui";
export { PermissionBadge } from "@metraly/ui";
export type { SigningStatus, SigningBannerProps } from "@metraly/ui";
export { SigningBanner } from "@metraly/ui";
export type { Plugin, PluginCatalogProps } from "@metraly/ui";
export { PluginCatalog } from "@metraly/ui";
export type { PluginPermission, PluginReviewDrawerProps } from "@metraly/ui";
export { PluginReviewDrawer } from "@metraly/ui";
// ── Wizard + shared primitives (Phase 5 wiring) ───────────────────────────────
export type { WizardLayoutProps, WizardLayoutStep } from "@metraly/ui";
export { WizardLayout } from "@metraly/ui";
export type { ReviewPanelItem, ReviewPanelProps } from "@metraly/ui";
export { ReviewPanel } from "@metraly/ui";
export type { StickyWizardFooterProps } from "@metraly/ui";
export { StickyWizardFooter } from "@metraly/ui";
export { MetralyIcon, CardShell } from "@metraly/ui";
export type { MetralyIconName } from "@metraly/ui";