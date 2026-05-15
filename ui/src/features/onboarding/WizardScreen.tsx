// src/features/onboarding/WizardScreen.tsx
import React, { useState } from 'react';
import { Icon } from '../../components/shared/Icon';

interface Source {
  id: string;
  icon: string;
  name: string;
  desc: string;
  color: string;
  cli: string;
}

const sources: Source[] = [
  { id: 'github', icon: 'github', name: 'GitHub', desc: 'Repos, PRs, CI workflows', color: '#E8EDF5', cli: 'github --org my-org' },
  { id: 'jira',   icon: 'jira',   name: 'Jira',   desc: 'Issues, sprints, backlogs', color: '#2684FF', cli: 'jira --url https://your-domain.atlassian.net' },
  { id: 'gitlab', icon: 'gitlab', name: 'GitLab', desc: 'Merge requests & pipelines', color: '#FC6D26', cli: 'gitlab --host https://gitlab.com' },
  { id: 'linear', icon: 'linear', name: 'Linear', desc: 'Projects, cycles & issues', color: '#5E6AD2', cli: 'linear --api-key' },
  { id: 'slack',  icon: 'slack',  name: 'Slack',  desc: 'Team communications', color: '#4A154B', cli: 'slack --token' },
  { id: 'pagerduty', icon: 'pagerduty', name: 'PagerDuty', desc: 'Incidents & on-call', color: '#06AC38', cli: 'pagerduty --integration-key' },
];

const steps = ['Select Sources', 'Authenticate', 'Configure', 'Review'];

interface StepIndicatorProps {
  step: number;
}

// ---------- Step indicator with animated lines ----------
const StepIndicator: React.FC<StepIndicatorProps> = ({ step }) => (
  <div style={{ width: '100%', maxWidth: 680, marginBottom: 40, display: 'flex', alignItems: 'center' }}>
    {steps.map((s, i) => (
      <React.Fragment key={i}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: i < step ? 'var(--cyan)' : i === step ? 'color-mix(in srgb, var(--cyan) 15%, transparent)' : 'var(--glass)',
              border: i <= step ? '2px solid var(--cyan)' : '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: i === step ? '0 0 12px color-mix(in srgb, var(--cyan) 30%, transparent)' : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            {i < step ? (
              <Icon name="check" size={14} color="#0B0F19" />
            ) : (
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: i === step ? 'var(--cyan)' : 'var(--muted)' }}>
                {i + 1}
              </span>
            )}
          </div>
          <span style={{ fontSize: 11, color: i <= step ? 'var(--text)' : 'var(--muted)', fontWeight: i === step ? 600 : 400, whiteSpace: 'nowrap' }}>
            {s}
          </span>
        </div>
        {i < steps.length - 1 && (
          <div
            style={{
              flex: 1, height: 2, margin: '0 8px', marginBottom: 22,
              background: i < step ? 'var(--cyan)' : 'var(--border)',
              transition: 'background 0.4s ease',
            }}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ---------- Step 0: Source selection ----------
interface StepProps {
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
}

const SourceSelectionStep: React.FC<StepProps> = ({ selected, setSelected }) => (
  <div className="wizard-step" style={{ width: '100%', maxWidth: 680, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
    <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>Choose your data sources</div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>Select the tools your team uses. You can add more later.</div>
    </div>
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {sources.map(src => {
          const sel = selected.includes(src.id);
          return (
            <button
              key={src.id}
              onClick={() => setSelected(prev => sel ? prev.filter(x => x !== src.id) : [...prev, src.id])}
              style={{
                padding: '16px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                border: sel ? '2px solid var(--cyan)' : '1px solid var(--border)',
                background: sel ? 'color-mix(in srgb, var(--cyan) 6%, transparent)' : 'transparent',
                transition: 'all 0.15s ease',
                boxShadow: sel ? '0 0 0 1px color-mix(in srgb, var(--cyan) 20%, transparent)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${src.color}15`, border: `1px solid ${src.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={src.icon} size={16} color={src.color} />
                </div>
                {sel && (
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={12} color="#0B0F19" />
                  </div>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-head)', color: 'var(--text)', marginBottom: 3 }}>{src.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{src.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

// ---------- Step 1: Authentication ----------
interface AuthStepProps {
  selected: string[];
  setSelected?: React.Dispatch<React.SetStateAction<string[]>>;
  connected: Record<string, boolean>;
  setConnected: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const AuthenticateStep: React.FC<AuthStepProps> = ({ selected, connected, setConnected }) => {
  const selectedSources = sources.filter(s => selected.includes(s.id));
  const firstSource = selectedSources[0] || sources[0];
  const allConnected = selectedSources.every(s => connected[s.id]);

  return (
    <div className="wizard-step" style={{ width: '100%', maxWidth: 680, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>Authenticate</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Grant read-only access to your selected tools.</div>
      </div>
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {selectedSources.map(src => (
          <div key={src.id} style={{ background: 'color-mix(in srgb, var(--cyan) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--cyan) 15%, transparent)', borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${src.color}15`, border: `1px solid ${src.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={src.icon} size={20} color={src.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>{src.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{src.desc}</div>
            </div>
            <button
              onClick={() => setConnected(prev => ({ ...prev, [src.id]: true }))}
              disabled={connected[src.id]}
              style={{
                padding: '6px 16px', borderRadius: 8, cursor: connected[src.id] ? 'default' : 'pointer',
                background: connected[src.id] ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'var(--text)',
                border: 'none', color: connected[src.id] ? 'var(--success)' : 'var(--bg)',
                fontSize: 13, fontWeight: 600,
              }}
            >
              {connected[src.id] ? 'Connected ✓' : 'Connect →'}
            </button>
          </div>
        ))}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--muted)', background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: 10, marginTop: 8, border: '1px solid var(--border)' }}>
          <div>$ metraly auth {firstSource.cli}</div>
          <div style={{ color: 'var(--success)' }}>✓ Waiting for OAuth callback on localhost:7842…</div>
        </div>
      </div>
      <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <button className="wizard-nav-back" disabled={!allConnected} style={{ opacity: allConnected ? 1 : 0.5 }}>Continue →</button>
      </div>
    </div>
  );
};

// ---------- Step 2: Configure ----------
const ConfigureStep = () => {
  const [syncInterval, setSyncInterval] = useState('Every 5 minutes');
  const [repos, setRepos] = useState('All repos in org');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [backfill, setBackfill] = useState('90 days');

  return (
    <div className="wizard-step" style={{ width: '100%', maxWidth: 680, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>Configure sync settings</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Set refresh intervals and which repos to include.</div>
      </div>
      <div style={{ padding: '24px 28px' }}>
        {([
            { label: 'Sync interval', value: syncInterval, setter: setSyncInterval as (v: string | boolean) => void, options: ['Every 5 minutes', 'Every 15 minutes', 'Every hour'], type: 'select' as const },
            { label: 'Repositories', value: repos, setter: setRepos as (v: string | boolean) => void, options: ['All repos in org', 'Selected repos only'], type: 'select' as const },
            { label: 'Include archived repos', value: includeArchived, setter: setIncludeArchived as (v: string | boolean) => void, type: 'toggle' as const, options: [] as string[] },
            { label: 'Historical backfill', value: backfill, setter: setBackfill as (v: string | boolean) => void, options: ['30 days', '90 days', '1 year'], type: 'select' as const },
          ]).map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontSize: 13.5, color: 'var(--text)' }}>{row.label}</span>
            {row.type === 'toggle' ? (
              <button
                onClick={() => row.setter(Boolean(row.value))}
                style={{
                  width: 38, height: 21, borderRadius: 12, background: row.value ? 'var(--cyan)' : 'rgba(255,255,255,0.15)',
                  border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                }}
              >
                <div style={{ position: 'absolute', top: 2, left: row.value ? 20 : 2, width: 17, height: 17, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
              </button>
            ) : (
              <select
                value={String(row.value)}
                onChange={e => row.setter(e.target.value)}
                style={{
                  background: 'var(--glass2)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px',
                  color: 'var(--cyan)', fontSize: 13, fontFamily: 'var(--font-mono)', cursor: 'pointer',
                }}
              >
                {row.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- Step 3: Review ----------
const ReviewStep: React.FC<{ selected: string[] }> = ({ selected }) => {
  const selectedSources = sources.filter(s => selected.includes(s.id));
  return (
    <div className="wizard-step" style={{ width: '100%', maxWidth: 680, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>Review & activate</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Everything looks good. Metraly will begin indexing shortly.</div>
      </div>
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'color-mix(in srgb, var(--success) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={28} color="var(--success)" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>You're all set</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 380 }}>Metraly will begin indexing your repositories. First metrics appear in ~2 minutes.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 340 }}>
          {selectedSources.map(src => (
            <div key={src.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'color-mix(in srgb, var(--success) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 15%, transparent)', borderRadius: 10 }}>
              <Icon name={src.icon} size={15} color={src.color} />
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{src.name}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: 'pulse-dot 2s infinite' }} />
                <span style={{ fontSize: 11, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>Connecting</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const OnboardingChecklist: React.FC<{ step: number }> = ({ step }) => {
  const items = [
    {
      label: 'Choose demo or setup',
      done: step > 0,
      detail: 'Pick a starting mode and keep the path visible.',
    },
    {
      label: 'Select sources',
      done: step > 0,
      detail: 'Add Git, Jira, or another source to continue.',
    },
    {
      label: 'Authenticate and configure',
      done: step > 1,
      detail: 'Grant access and set sync cadence before the first import.',
    },
    {
      label: 'Switch to real data',
      done: step > 3,
      detail: 'Finish setup and move into the preview dashboard.',
    },
  ];

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 680,
        marginBottom: 16,
        padding: 16,
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--glass)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Onboarding checklist</div>
          <div style={{ fontSize: 12, color: 'var(--muted2)' }}>Keep the path from demo mode to live setup visible.</div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              border: item.done ? '1px solid color-mix(in srgb, var(--success) 18%, transparent)' : '1px solid var(--border)',
              background: item.done ? 'color-mix(in srgb, var(--success) 4%, transparent)' : 'rgba(255,255,255,0.02)',
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: item.done ? 'var(--success)' : 'transparent',
                border: item.done ? 'none' : '1px solid var(--border2)',
              }}
            >
              {item.done ? <Icon name="check" size={11} color="#0B0F19" /> : <span style={{ fontSize: 11, color: 'var(--muted)' }}>•</span>}
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted2)', lineHeight: 1.45 }}>{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- Main Wizard Screen ----------
interface WizardScreenProps {
  onUseDemo?: () => void;
  onFinish?: () => void;
}

export const WizardScreen: React.FC<WizardScreenProps> = ({
  onUseDemo,
  onFinish,
}) => {
  const [step, setStep] = useState<number>(0);
  const [selected, setSelected] = useState<string[]>(['github']);
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  const renderStepContent = () => {
    switch (step) {
      case 0: return <SourceSelectionStep selected={selected} setSelected={setSelected} />;
      case 1: return <AuthenticateStep selected={selected} connected={connected} setConnected={setConnected} />;
      case 2: return <ConfigureStep />;
      case 3: return <ReviewStep selected={selected} />;
      default: return null;
    }
  };

  const canGoNext = () => {
    if (step === 0) return selected.length > 0;
    if (step === 1) {
      const selectedSources = sources.filter(s => selected.includes(s.id));
      return selectedSources.every(s => connected[s.id]);
    }
    return true;
  };

  const handleNext = () => {
    if (step < steps.length - 1 && canGoNext()) setStep(s => s + 1);
    else if (step === steps.length - 1) {
      if (onFinish) onFinish();
      else window.location.href = '/';
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {onUseDemo && (
        <div
          style={{
            width: '100%',
            maxWidth: 680,
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 12,
            border: '1px solid color-mix(in srgb, var(--purple) 18%, transparent)',
            background: 'color-mix(in srgb, var(--purple) 6%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="sparkles" size={13} color="var(--purple)" />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                Demo mode is available
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted2)' }}>
                Switch back to Sandbox Inc. demo data at any point.
              </div>
            </div>
          </div>
          <button
            onClick={onUseDemo}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              background: 'color-mix(in srgb, var(--purple) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--purple) 22%, transparent)',
              color: 'var(--purple)',
              fontSize: 12.5,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name="sparkles" size={12} color="currentColor" />
            Show demo instead
          </button>
        </div>
      )}
      <OnboardingChecklist step={step} />
      <StepIndicator step={step} />
      <div className="wizard-step" key={step} style={{ width: '100%', maxWidth: 680 }}>
        {renderStepContent()}
      </div>
      <div style={{ marginTop: 24, display: 'flex', gap: 16, width: '100%', maxWidth: 680, justifyContent: 'space-between' }}>
        <button
          onClick={handleBack}
          disabled={step === 0}
          style={{
            padding: '10px 24px', borderRadius: 9, background: 'transparent', border: '1px solid var(--border)',
            color: step === 0 ? 'var(--muted)' : 'var(--text)', cursor: step === 0 ? 'default' : 'pointer',
            fontSize: 13.5, fontWeight: 500, transition: 'all 0.15s',
          }}
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!canGoNext()}
          style={{
            padding: '10px 28px', borderRadius: 9, background: canGoNext() ? 'var(--grad)' : 'rgba(255,255,255,0.1)',
            border: 'none', color: canGoNext() ? '#fff' : 'var(--muted)', fontWeight: 600, fontSize: 13.5,
            cursor: canGoNext() ? 'pointer' : 'default', boxShadow: canGoNext() ? '0 0 16px color-mix(in srgb, var(--cyan) 20%, transparent)' : 'none',
          }}
        >
          {step === steps.length - 1 ? 'Go to Dashboard' : 'Continue →'}
        </button>
      </div>
    </div>
  );
};
