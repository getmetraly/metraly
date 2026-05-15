import { createElement } from "react";
import { MetralyEmptyState } from "@metraly/ui";
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
 * Badge                           → StatusBadge
 * DataTable                       → MetralyTable
 * StatCard                        → MetralyMetricCard
 * Sidebar                         → MetralySidebar + MetralySidebarSection + MetralySidebarItem
 * Topbar                          → MetralyTopbar
 * PlaceholderScreen               → StateBlock  (via MetralyEmptyState)  ✓ live
 * DORABadge                       → StateBadge  (map DORALevel → StateBadgeState)
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

// ── Status badges ──────────────────────────────────────────────────────────────
// Phase 3 follow-up: replace with `export { StatusBadge } from '@metraly/ui'`
export { Badge as StatusBadgeCompat } from "../../components/ui/Badge";

// ── Data display ───────────────────────────────────────────────────────────────
// Phase 3 follow-up: replace with `export { MetralyTable as DataTableCompat } from '@metraly/ui'`
export { DataTable as DataTableCompat } from "../../components/ui/DataTable";

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
// Phase 3 follow-up: replace with StateBadge — map DORALevel values to StateBadgeState tokens
export { DORABadge } from "../../components/ui/DORABadge";

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