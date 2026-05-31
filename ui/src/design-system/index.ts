/**
 * App-facing UI boundary.
 *
 * Feature modules MUST import reusable UI only from this barrel.
 */

// Temporary compatibility adapters still required by legacy feature code.
export {
  StatusBadgeCompat,
  DataTableCompat,
  StatCardCompat,
  SidebarCompat,
  TopbarCompat,
  DORABadgeCompat,
  WidgetCompat,
  Leaderboard,
  AIInsightCard,
  InlineInsight,
  Icon,
  MetralyButtonCompat as MetralyButton,
  MetralyInputCompat as MetralyInput,
} from './compat/brandbook-legacy';


// Canonical framework exports.
export {
  MetralyShell,
  MetralySidebar,
  MetralySidebarSection,
  MetralySidebarItem,
  MetralyTopbar,
  MetralyIcon,
  MetralyCard,
  
  MetralyTable,
  StateBadge,
  StatusBadge,
  MetralyEmptyState,
  DashboardGrid,
  DashboardWidget,
  DashboardToolbar,
  DashboardResizeHandle,
  DashboardEmptyState,
  WidgetPickerCard,
  MetralyMetricCard,
  TrendBadge,
  MetralyChartCard,
  MetralyLineChart,
  MetralyAreaChart,
  MetralyBarChart,
  MetralySparkline,
  MetralyGauge,
  MetralyHeatmap,
  MetralyFilterBar,
  MetralyTabs,
  MetralySegmentedControl,
  WizardLayout,
  ReviewPanel,
  StickyWizardFooter,
  TokenInput,
  PermissionExplainer,
  BackfillRangePicker,
  ConnectionTestPanel,
  SyncProgressPanel,
  CardShell,
  AIWorkspaceLayout,
  AnswerCard,
  EvidencePanel,
  TraceDrawer,
  PermissionBadge,
  SigningBanner,
  PluginCatalog,
  PluginReviewDrawer,
} from '@metraly/ui';

export type {
  ReviewPanelItem,
  WizardLayoutStep,
  ChatMessage,
  EvidenceCitation,
  Plugin,
  PluginPermission,
} from '@metraly/ui';
