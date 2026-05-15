import { createElement, type ReactElement, type ReactNode } from "react";
import {
  MetralyEmptyState,
  MetralyTable,
  StateBadge,
  StatusBadge,
  type MetralyTableProps,
  type StateBadgeProps,
  type StateBadgeState,
  type StatusBadgeProps,
  type StatusBadgeStatus,
} from "@metraly/ui";
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
// Phase 3 follow-up: replace with `export { MetralyMetricCard as StatCardCompat } from '@metraly/ui'`
export { StatCard as StatCardCompat } from "../../components/ui/StatCard";

// ── Shell: sidebar + topbar ────────────────────────────────────────────────────
// Phase 3 follow-up: replace with MetralySidebar + MetralySidebarSection + MetralySidebarItem
export { Sidebar as SidebarCompat } from "../../components/layout/Sidebar";
// Phase 3 follow-up: replace with MetralyTopbar
export { Topbar as TopbarCompat } from "../../components/layout/Topbar";

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

// ── Dashboard widget shell ─────────────────────────────────────────────────────
// Phase 3 follow-up: replace with DashboardWidget from '@metraly/ui'
export { Widget as WidgetCompat } from "../../components/ui/Widget";

// ── Dashboard grid ─────────────────────────────────────────────────────────────
// Phase 3 follow-up: replace with DashboardGrid from '@metraly/ui'
export { DashboardRenderer } from "../../components/dashboard/DashboardRenderer";
export { DraggableDashboardRenderer } from "../../components/dashboard/DraggableDashboardRenderer";

// ── AI / Insight (no brandbook equivalent — tracked in P2-4) ───────────────────
export { AIInsightCard } from "../../components/ui/AIInsightCard";
export { InlineInsight } from "../../components/ui/InlineInsight";

// ── Leaderboard (no brandbook equivalent — tracked in P2-4) ───────────────────
export { Leaderboard } from "../../components/ui/Leaderboard";