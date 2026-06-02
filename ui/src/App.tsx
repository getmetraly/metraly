import React, { useEffect, useState } from 'react';
import { Sidebar, Topbar, MetralyButton, MetralyEmptyState, CardShell, MetralyBadge, StateBlock } from './design-system';
import { DashboardScreen  } from './features/dashboard';
import { DashboardWizardScreen } from './features/dashboardWizard/DashboardWizardScreen';
import { MetricsScreen } from './features/metricsExplorer/MetricsScreen';
import { AIScreen } from './features/ai-workspace/AIScreen';
import { PluginScreen } from './features/plugins/PluginScreen';
import { WizardScreen } from './features/onboarding/WizardScreen';
import { LoginScreen } from './features/auth/LoginScreen';
import { AppBootstrapProvider, useAppBootstrap, getInitialDashboardIdFromCache } from './hooks/AppBootstrapContext';
import { Icon } from './design-system';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  type FirstRunMode,
  FIRST_RUN_CHOICES,
  FIRST_RUN_MODE,
  getInitialScreen,
} from './features/onboarding/firstRun';
import { loadSession, login } from './api/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from './features/dashboard/runtime/query-client';

const appQueryClient = createQueryClient();

const NON_DASH_SCREENS = new Set(['metrics', 'ai', 'plugins', 'wizard', 'settings', 'first-run', 'dash-wizard', 'dashboard', 'login']);

const titles: Record<string, [string, string]> = {
  'dash-wizard': ['New Dashboard', 'Build a custom dashboard'],
  metrics: ['Metrics Explorer', 'DORA, CI/CD, PR & custom metrics'],
  ai: ['AI Workspace', 'Private · On-premise inference'],
  plugins: ['Plugins', 'Browse & install integrations'],
  wizard: ['Connectors', 'Onboarding wizard'],
  settings: ['Settings', 'Platform configuration'],
};

function renderDashboardScreen(
  initialDashboard: string,
  setActive: (id: string) => void,
  firstRunMode: FirstRunMode,
  dashboards: { id: string }[],
  onDeleted: (dashboards: { id: string }[]) => void,
) {
  return (
    <DashboardScreen
      initialDashboard={initialDashboard}
      demoMode={firstRunMode === FIRST_RUN_MODE.demo}
      onConfigureSources={() => setActive('wizard')}
      onNewDashboard={() => setActive('dash-wizard')}
      onDeleted={onDeleted}
    />
  );
}

function renderActiveScreen(
  active: string,
  setActive: (id: string) => void,
  firstRunMode: FirstRunMode,
  title: string,
  onUseDemo: () => void,
  dashboards: { id: string }[],
  refreshBootstrap: () => Promise<{ dashboards: { id: string }[] } | null>,
) {
  const renderers: Record<string, () => React.ReactNode> = {
    'dash-wizard': () => (
      <DashboardWizardScreen onSave={(saved) => { void (async () => { const refreshed = await refreshBootstrap(); setActive(saved?.id ?? refreshed?.dashboards?.[0]?.id ?? getInitialDashboardIdFromCache() ?? 'dash-wizard'); })(); }} onCancel={() => setActive(getInitialDashboardIdFromCache() ?? 'dash-wizard')} />
    ),
    metrics: () => <MetricsScreen />,
    ai: () => <AIScreen />,
    plugins: () => <PluginScreen />,
    wizard: () => (
      <WizardScreen
        onUseDemo={onUseDemo}
        onFinish={() => setActive(getInitialDashboardIdFromCache() ?? 'dash-wizard')}
      />
    ),
    settings: () => (
      <div className="metraly-settings-placeholder">
        <CardShell tone="neutral" className="metraly-settings-placeholder__card">
          <MetralyEmptyState
            title="Settings"
            description="Platform configuration is not available in this preview yet. Enterprise controls, AI providers, audit logs and workspace settings will appear here."
            variant="default"
          />
        </CardShell>
      </div>
    ),
  };

  if (renderers[active]) return renderers[active]();

  // Fallback: treat active as a dashboard ID.
  // If the backend dashboard list is still empty (loading), show a placeholder to
  // avoid a 404 flash — the useEffect in App will redirect active once the list arrives.
  const isKnownDashboard = dashboards.some(d => d.id === active);
  if (!isKnownDashboard && dashboards.length === 0) {
    return (
      <div className="metraly-dashboard-state">
        <StateBlock variant="loading" title="Loading dashboard…" description="Connecting to backend." density="compact" />
      </div>
    );
  }

  return renderDashboardScreen(active, setActive, firstRunMode, dashboards, (nextDashboards) => {
    const remaining = nextDashboards.filter(d => d.id !== active);
    if (remaining.length > 0) {
      setActive(remaining[0].id);
    } else {
      setActive('dash-wizard');
    }
  });
}

const AppInner = () => {
  const [session, setSession] = useState(() => loadSession());
  const [firstRunMode, setFirstRunMode] = useLocalStorage<FirstRunMode>(
    'metraly.first-run-mode',
    FIRST_RUN_MODE.undecided,
  );
  const [active, setActive] = useState(() => {
    const cached = getInitialDashboardIdFromCache();
    if (cached && firstRunMode !== FIRST_RUN_MODE.undecided) return cached;
    return getInitialScreen(firstRunMode);
  });
  const { dashboards, selectedDashboardId, isLoading: dashboardsLoading, refresh: refreshBootstrap } = useAppBootstrap();
  const selectedDashboard = dashboards.find(d => d.id === active);
  const [title, subtitle] = selectedDashboard
    ? [selectedDashboard.name, selectedDashboard.description ?? '']
    : (titles[active] || ['Metraly', '']);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [firstRunSelection, setFirstRunSelection] = useState<FirstRunMode>(
    FIRST_RUN_MODE.demo,
  );

  useEffect(() => {
    const syncSession = () => setSession(loadSession());
    window.addEventListener('metraly-auth-changed', syncSession);
    return () => window.removeEventListener('metraly-auth-changed', syncSession);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('metraly-login-scroll', !session);
    return () => {
      document.documentElement.classList.remove('metraly-login-scroll');
    };
  }, [session]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileNavOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (dashboardsLoading) return;
    if (dashboards.length === 0) return;
    const isDashboardId = dashboards.some(d => d.id === active);
    if (!NON_DASH_SCREENS.has(active) && !isDashboardId) {
      setActive(selectedDashboardId ?? dashboards[0].id);
    }
  }, [dashboards]); // eslint-disable-line react-hooks/exhaustive-deps -- active intentionally excluded to prevent infinite loop

  const handleSignIn = async (email: string, password: string) => {
    await login(email, password);
    setSession(loadSession());
    // Use first backend dashboard if available, otherwise fall through to legacy default
    setActive(selectedDashboardId ?? dashboards[0]?.id ?? getInitialScreen(firstRunMode));
  };

  const handleShowDemo = () => {
    setFirstRunMode(FIRST_RUN_MODE.demo);
    // Prefer loaded dashboard > cached id > 'first-run' (redirect effect will fix it)
    setActive(selectedDashboardId ?? dashboards[0]?.id ?? getInitialDashboardIdFromCache() ?? 'first-run');
  };

  const handleSkipDemo = () => {
    setFirstRunMode(FIRST_RUN_MODE.setup);
    setActive('wizard');
  };

  const handleFirstRunContinue = () => {
    if (firstRunSelection === FIRST_RUN_MODE.demo) {
      handleShowDemo();
      return;
    }
    handleSkipDemo();
  };

  const renderFirstRunChoice = () => (
    <div className="metraly-first-run">
      <div className="metraly-first-run__inner">
        <CardShell
          title="Choose what to show first."
          subtitle="Demo mode uses synthetic Sandbox Inc. data. Skipping demo takes you straight to source setup."
          tone="neutral"
          className="metraly-first-run__card"
        >
          <div className="metraly-first-run__choices">
            {FIRST_RUN_CHOICES.map((choice) => {
              const isSelected = firstRunSelection === choice.id;
              const isDemo = choice.id === FIRST_RUN_MODE.demo;
              const tone = isDemo ? 'purple' : 'cyan';

              return (
                <CardShell
                  key={choice.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  state={isSelected ? 'selected' : 'default'}
                  tone={tone}
                  density="compact"
                  className="metraly-first-run__choice"
                  onClick={() => setFirstRunSelection(choice.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setFirstRunSelection(choice.id);
                    }
                  }}
                  leading={<Icon name={choice.icon} size={14} color="currentColor" />}
                  title={choice.title}
                  subtitle={choice.description}
                  trailing={isSelected ? <Icon name="check" size={14} color="currentColor" /> : undefined}
                >
                  <div className="metraly-first-run__badges">
                    <MetralyBadge variant={isDemo ? 'secondary' : 'primary'}>
                      <Icon name={isDemo ? 'alertCircle' : 'clock'} size={10} color="currentColor" />
                      {isDemo ? 'Synthetic data' : 'Setup guided'}
                    </MetralyBadge>
                    <MetralyBadge variant="info">
                      {isDemo ? 'Overview first' : 'Connect sources'}
                    </MetralyBadge>
                  </div>
                </CardShell>
              );
            })}
          </div>
          <p className="metraly-first-run__hint">
            You can switch later from the overview or setup flow.
          </p>
        </CardShell>

        <div className="metraly-first-run__actions">
          <MetralyButton
            type="button"
            onClick={handleFirstRunContinue}
            variant="primary"
            size="md"
            iconRight={<span aria-hidden="true">→</span>}
          >
            Continue
          </MetralyButton>
        </div>
      </div>
    </div>
  );


  if (!session) {
    return <LoginScreen onSignIn={handleSignIn} />;
  }

  if (active === 'first-run') {
    return <>{renderFirstRunChoice()}</>;
  }

  const handleMobileNavClose = () => setMobileNavOpen(false);
  const handleMobileNav = (id: string) => {
    setActive(id);
    setMobileNavOpen(false);
  };


  const shell = (
    <div className="metraly-app-shell">
      <div className="metraly-app-shell__sidebar">
        <Sidebar active={active} onNav={setActive} />
      </div>
      <div className="metraly-app-shell__topbar">
        <Topbar title={title} subtitle={subtitle} onOpenMobileNav={() => setMobileNavOpen(true)} />
      </div>
      <main className="metraly-app-shell__main metraly-app-shell__main--flush">
        {renderActiveScreen(active, setActive, firstRunMode, title, handleShowDemo, dashboards, refreshBootstrap)}
      </main>

      {mobileNavOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}
        >
          <div
            aria-hidden="true"
            onClick={handleMobileNavClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
          />
          <div
            style={{
              position: 'relative',
              width: 280,
              background: 'var(--m-bg-0)',
              height: '100%',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Sidebar active={active} onNav={handleMobileNav} />
          </div>
        </div>
      )}
    </div>
  );
  return shell;
};

const App = () => (
  <QueryClientProvider client={appQueryClient}>
    <AppBootstrapProvider>
      <AppInner />
    </AppBootstrapProvider>
  </QueryClientProvider>
);
export default App;
