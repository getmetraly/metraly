import React, { useEffect, useState } from 'react';
import { Sidebar, Topbar, MetralyButton, MetralyEmptyState, CardShell, MetralyBadge } from './design-system';
import { DashboardScreen  } from './features/dashboard';
import { DashboardWizardScreen } from './features/dashboardWizard/DashboardWizardScreen';
import { MetricsScreen } from './features/metricsExplorer/MetricsScreen';
import { AIScreen } from './features/ai-workspace/AIScreen';
import { PluginScreen } from './features/plugins/PluginScreen';
import { WizardScreen } from './features/onboarding/WizardScreen';
import { LoginScreen } from './features/auth/LoginScreen';
import { TweaksProvider } from './context/TweaksContext';
import { Icon } from './design-system';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  type FirstRunMode,
  FIRST_RUN_CHOICES,
  FIRST_RUN_MODE,
  getInitialScreen,
} from './features/onboarding/firstRun';
import { loadSession, login } from './api/client';

const titles = {
  overview: ['Overview', 'Last updated 2 min ago'],
  'dash-cto': ['CTO Dashboard', 'Strategic health, DORA trends, team velocity'],
  'dash-vp': ['VP Engineering', 'Delivery health & team performance'],
  'dash-tl': ['Tech Lead', 'CI health, PR queue & sprint progress'],
  'dash-devops': ['DevOps / SRE', 'Deploy frequency, MTTR & incidents'],
  'dash-ic': ['My Dashboard', 'Personal metrics & sprint tasks'],
  'dash-wizard': ['New Dashboard', 'Build a custom dashboard'],
  metrics: ['Metrics Explorer', 'DORA, CI/CD, PR & custom metrics'],
  ai: ['AI Workspace', 'Private · On-premise inference'],
  plugins: ['Plugins', 'Browse & install integrations'],
  wizard: ['Connectors', 'Onboarding wizard'],
  settings: ['Settings', 'Platform configuration'],
};

function renderDashboardScreen(initialDashboard, setActive, firstRunMode) {
  return (
    <DashboardScreen
      initialDashboard={initialDashboard}
      onNewDashboard={() => setActive('dash-wizard')}
      onNavigate={setActive}
      demoMode={firstRunMode === FIRST_RUN_MODE.demo}
      onConfigureSources={() => setActive('wizard')}
    />
  );
}

function renderActiveScreen(active, setActive, firstRunMode, title, onUseDemo) {
  const renderers = {
    dashboard: () => renderDashboardScreen('overview', setActive, firstRunMode),
    overview: () => renderDashboardScreen('overview', setActive, firstRunMode),
    'dash-cto': () => renderDashboardScreen('cto', setActive, firstRunMode),
    'dash-vp': () => renderDashboardScreen('vp', setActive, firstRunMode),
    'dash-tl': () => renderDashboardScreen('tl', setActive, firstRunMode),
    'dash-devops': () => renderDashboardScreen('devops', setActive, firstRunMode),
    'dash-ic': () => renderDashboardScreen('ic', setActive, firstRunMode),
    'dash-wizard': () => (
      <DashboardWizardScreen onSave={() => setActive('overview')} onCancel={() => setActive('overview')} />
    ),
    metrics: () => <MetricsScreen />,
    ai: () => <AIScreen />,
    plugins: () => <PluginScreen />,
    wizard: () => (
      <WizardScreen
        onUseDemo={onUseDemo}
        onFinish={() => setActive('overview')}
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

  return renderers[active] ? renderers[active]() : <MetralyEmptyState title={title} description="This screen is not available yet." variant="default" />;
}

const App = () => {
  const [session, setSession] = useState(() => loadSession());
  const [firstRunMode, setFirstRunMode] = useLocalStorage<FirstRunMode>(
    'metraly.first-run-mode',
    FIRST_RUN_MODE.undecided,
  );
  const [active, setActive] = useState(getInitialScreen(firstRunMode));
  const [firstRunSelection, setFirstRunSelection] = useState<FirstRunMode>(
    FIRST_RUN_MODE.demo,
  );
  const [title, subtitle] = titles[active] || ['Metraly', ''];
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const handleSignIn = async (email: string, password: string) => {
    await login(email, password);
    setSession(loadSession());
    setActive(getInitialScreen(firstRunMode));
  };

  const handleShowDemo = () => {
    setFirstRunMode(FIRST_RUN_MODE.demo);
    setActive('overview');
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
        {renderActiveScreen(active, setActive, firstRunMode, title, handleShowDemo)}
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
  return <TweaksProvider>{shell}</TweaksProvider>;
};
export default App;
// hmr test Mon Jun  1 12:24:12 MSK 2026
