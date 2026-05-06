import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DashboardScreen  } from './features/dashboard';
import { DashboardWizardScreen } from './features/dashboardWizard/DashboardWizardScreen';
import { MetricsScreen } from './features/metricsExplorer/MetricsScreen';
import { AIScreen } from './features/aiAssistant/AIScreen';
import { PluginScreen } from './features/marketplace/PluginScreen';
import { WizardScreen } from './features/onboarding/WizardScreen';
import { PlaceholderScreen } from './components/ui/PlaceholderScreen';
import { TweaksProvider } from './context/TweaksContext';
import { DraggableTweaksPanel } from './components/layout/DraggableTweaksPanel';
import { Icon } from './components/shared/Icon';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
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
  ai: ['AI Assistant', 'Private · On-premise inference'],
  plugins: ['Plugin Marketplace', 'Browse & install integrations'],
  wizard: ['Connect Sources', 'Onboarding wizard'],
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
  };

  return renderers[active] ? renderers[active]() : <PlaceholderScreen name={title} />;
}

const App = () => {
  const [session, setSession] = useState(() => loadSession());
  const [firstRunMode, setFirstRunMode] = useLocalStorage(
    'metraly.first-run-mode',
    FIRST_RUN_MODE.undecided,
  );
  const [active, setActive] = useState(getInitialScreen(firstRunMode));
  const [firstRunSelection, setFirstRunSelection] = useState(
    FIRST_RUN_MODE.demo,
  );
  const [email, setEmail] = useState('admin@metraly.local');
  const [password, setPassword] = useState('admin123');
  const [signInError, setSignInError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [title, subtitle] = titles[active] || ['Metraly', ''];

  useEffect(() => {
    const syncSession = () => setSession(loadSession());
    window.addEventListener('metraly-auth-changed', syncSession);
    return () => window.removeEventListener('metraly-auth-changed', syncSession);
  }, []);

  const handleSignIn = async (event) => {
    event.preventDefault();
    setSignInError('');
    setSigningIn(true);
    try {
      await login(email, password);
      setSession(loadSession());
      setActive(getInitialScreen(firstRunMode));
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : 'Sign in failed');
    } finally {
      setSigningIn(false);
    }
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
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 760,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            padding: '24px',
            border: '1px solid var(--border)',
            borderRadius: 16,
            background: 'var(--glass)',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-head)',
                fontWeight: 800,
                fontSize: 22,
                lineHeight: 1.2,
                letterSpacing: '-0.3px',
                marginBottom: 8,
                color: 'var(--text)',
              }}
            >
              Choose what to show first.
            </div>
            <div
              style={{
                fontSize: 14,
                color: 'var(--muted2)',
                maxWidth: 640,
                lineHeight: 1.6,
              }}
            >
              Demo mode uses synthetic Sandbox Inc. data. Skipping demo takes you
              straight to source setup.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FIRST_RUN_CHOICES.map((choice) => {
              const isSelected = firstRunSelection === choice.id;
              const isDemo = choice.id === FIRST_RUN_MODE.demo;
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => setFirstRunSelection(choice.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: isSelected ? `1px solid ${choice.accent}40` : '1px solid var(--border)',
                    background: isSelected ? `${choice.accent}0a` : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: 'var(--text)',
                    transition: 'border-color 0.15s ease, background 0.15s ease',
                    appearance: 'none',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--border2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: `${choice.accent}18`,
                      border: `1px solid ${choice.accent}22`,
                    }}
                  >
                    <Icon name={choice.icon} size={13} color={choice.accent} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-head)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        marginBottom: 2,
                        lineHeight: 1.2,
                        color: 'var(--text)',
                      }}
                    >
                      {choice.title}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                      {choice.description}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 8px',
                          borderRadius: 999,
                          border: `1px solid ${choice.accent}24`,
                          background: `${choice.accent}12`,
                          color: choice.accent,
                          fontSize: 10.5,
                          fontFamily: 'var(--font-mono)',
                          lineHeight: 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Icon
                          name={isDemo ? 'alertCircle' : 'clock'}
                          size={10}
                          color={choice.accent}
                        />
                        {isDemo ? 'Synthetic data' : 'Setup ~5 min'}
                      </div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 8px',
                          borderRadius: 999,
                          border: '1px solid var(--border)',
                          background: 'rgba(255,255,255,0.02)',
                          color: 'var(--muted2)',
                          fontSize: 10.5,
                          fontFamily: 'var(--font-mono)',
                          lineHeight: 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isDemo ? 'Overview first' : 'Connect sources'}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: isSelected ? 'none' : '1.5px solid var(--border)',
                      background: isSelected ? choice.accent : 'transparent',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isSelected ? `0 0 0 1px ${choice.accent}18` : 'none',
                    }}
                  >
                    {isSelected && (
                      <Icon name="check" size={10} color="#0B0F19" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            You can switch later from the overview or setup flow.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleFirstRunContinue}
            style={{
              padding: '10px 18px',
              borderRadius: 9,
              cursor: 'pointer',
              border: 'none',
              background: 'var(--grad)',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 0 16px rgba(0,229,255,0.2)',
            }}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );

  const renderLoginScreen = () => (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
      }}
    >
      <form
        onSubmit={handleSignIn}
        style={{
          width: '100%',
          maxWidth: 460,
          padding: 24,
          border: '1px solid var(--border)',
          borderRadius: 16,
          background: 'var(--glass)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(0,229,255,0.12)',
              border: '1px solid rgba(0,229,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="lock" size={16} color="var(--cyan)" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
              Sign in to Metraly
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.5 }}>
              Use the seeded local admin account to unlock dashboards and preview data.
            </div>
          </div>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            style={{
              height: 40,
              padding: '0 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.02)',
              color: 'var(--text)',
              outline: 'none',
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            type="password"
            style={{
              height: 40,
              padding: '0 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.02)',
              color: 'var(--text)',
              outline: 'none',
            }}
          />
        </label>

        {signInError && (
          <div style={{ fontSize: 12.5, color: 'var(--red)' }}>{signInError}</div>
        )}

        <button
          type="submit"
          disabled={signingIn}
          style={{
            alignSelf: 'flex-end',
            padding: '10px 16px',
            borderRadius: 9,
            cursor: signingIn ? 'wait' : 'pointer',
            border: 'none',
            background: 'var(--grad)',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 0 16px rgba(0,229,255,0.2)',
            opacity: signingIn ? 0.8 : 1,
          }}
        >
          {signingIn ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );

  if (!session) {
    return renderLoginScreen();
  }

  if (active === 'first-run') {
    return <>{renderFirstRunChoice()}</>;
  }

  return (
    <TweaksProvider>
      <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
        <Sidebar active={active} onNav={setActive} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Topbar title={title} subtitle={subtitle} />
          {renderActiveScreen(active, setActive, firstRunMode, title, handleShowDemo)}
        </div>
        <DraggableTweaksPanel />
      </div>
    </TweaksProvider>
  );
};
export default App;
