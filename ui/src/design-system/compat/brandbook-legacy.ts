/**
 * brandbook-legacy.ts — Phase 2 compatibility layer
 *
 * Each export here re-exports the current local app implementation.
 * In Phase 3, when @metraly/ui is installed as a dependency, every
 * entry marked "→ @metraly/ui" will be swapped for a brandbook import
 * without touching the callers — they all import from 'design-system'.
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
 * PlaceholderScreen               → StateBlock  (via MetralyEmptyState)
 * DORABadge                       → StateBadge  (map DORALevel → StateBadgeState)
 * Widget                          → DashboardWidget
 * DashboardRenderer               → DashboardGrid  (static layout)
 * DraggableDashboardRenderer      → DashboardGrid  (drag-enabled layout)
 *
 * Wizard (not yet used in app — will be wired in Phase 3 onboarding migration):
 * –                               → WizardLayout
 * –                               → StepRail
 * –                               → ReviewPanel
 * –                               → StickyWizardFooter
 *
 * ⚑ No brandbook equivalent yet (P2-4 work):
 * AIInsightCard, InlineInsight, Leaderboard
 * ─────────────────────────────────────────────────────────────────
 */

// ── Status badges ──────────────────────────────────────────────────────────────
// Phase 3: replace with `export { StatusBadge } from '@metraly/ui'`
export { Badge as StatusBadgeCompat } from '../../components/ui/Badge';

// ── Data display ───────────────────────────────────────────────────────────────
// Phase 3: replace with `export { MetralyTable as DataTableCompat } from '@metraly/ui'`
export { DataTable as DataTableCompat } from '../../components/ui/DataTable';

// ── Metric / stat card ─────────────────────────────────────────────────────────
// Phase 3: replace with `export { MetralyMetricCard as StatCardCompat } from '@metraly/ui'`
export { StatCard as StatCardCompat } from '../../components/ui/StatCard';

// ── Shell: sidebar + topbar ────────────────────────────────────────────────────
// Phase 3: replace with MetralySidebar + MetralySidebarSection + MetralySidebarItem
export { Sidebar as SidebarCompat } from '../../components/layout/Sidebar';
// Phase 3: replace with MetralyTopbar
export { Topbar as TopbarCompat } from '../../components/layout/Topbar';

// ── Empty / placeholder state ──────────────────────────────────────────────────
// Phase 3: replace with StateBlock / MetralyEmptyState from '@metraly/ui'
export { PlaceholderScreen as PlaceholderScreenCompat } from '../../components/ui/PlaceholderScreen';

// ── DORA indicator ─────────────────────────────────────────────────────────────
// Phase 3: replace with StateBadge — map DORALevel values to StateBadgeState tokens
export { DORABadge } from '../../components/ui/DORABadge';

// ── Dashboard widget shell ─────────────────────────────────────────────────────
// Phase 3: replace with DashboardWidget from '@metraly/ui'
export { Widget as WidgetCompat } from '../../components/ui/Widget';

// ── Dashboard grid ─────────────────────────────────────────────────────────────
// Phase 3: replace with DashboardGrid from '@metraly/ui'
export { DashboardRenderer } from '../../components/dashboard/DashboardRenderer';
export { DraggableDashboardRenderer } from '../../components/dashboard/DraggableDashboardRenderer';

// ── AI / Insight (no brandbook equivalent — tracked in P2-4) ───────────────────
export { AIInsightCard } from '../../components/ui/AIInsightCard';
export { InlineInsight } from '../../components/ui/InlineInsight';

// ── Leaderboard (no brandbook equivalent — tracked in P2-4) ───────────────────
export { Leaderboard } from '../../components/ui/Leaderboard';
