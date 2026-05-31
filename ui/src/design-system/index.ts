/**
 * App-facing UI boundary.
 *
 * Feature modules MUST import reusable UI only from this barrel.
 */

export { AppSidebar as Sidebar } from '../layout/AppSidebar';
export { AppTopbar as Topbar } from '../layout/AppTopbar';
export { Icon } from '../components/shared/Icon';
export { Leaderboard, AIInsightCard, InlineInsight } from '@metraly/ui';
export { MetralyButton, MetralyInput } from './adapters/controls';
export { MetralyGauge, MetralyHeatmap } from './adapters/charts';
export { DraggableDashboardRenderer } from '../components/dashboard/DraggableDashboardRenderer';
export { widgetRegistry } from '../components/dashboard/widgetRegistry';


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
