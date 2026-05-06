// src/features/onboarding/WizardScreen.jsx
import React, { useState } from 'react';
import { Icon } from '../../components/shared/Icon';

const sources = [
  { id: 'github', icon: 'github', name: 'GitHub', desc: 'Synthetic repo, PR, and CI preview', color: '#E8EDF5', cli: 'metraly demo source github --synthetic' },
  { id: 'jira', icon: 'jira', name: 'Jira', desc: 'Synthetic issues, sprints, and backlog preview', color: '#2684FF', cli: 'metraly demo source jira --synthetic' },
  { id: 'gitlab', icon: 'gitlab', name: 'GitLab', desc: 'Synthetic merge request and pipeline preview', color: '#FC6D26', cli: 'metraly demo source gitlab --synthetic' },
  { id: 'linear', icon: 'linear', name: 'Linear', desc: 'Synthetic projects, cycles, and issue preview', color: '#5E6AD2', cli: 'metraly demo source linear --synthetic' },
  { id: 'slack', icon: 'slack', name: 'Slack', desc: 'Synthetic team communication preview', color: '#4A154B', cli: 'metraly demo source slack --synthetic' },
  { id: 'pagerduty', icon: 'pagerduty', name: 'PagerDuty', desc: 'Synthetic incident and on-call preview', color: '#06AC38', cli: 'metraly demo source pagerduty --synthetic' },
];

const steps = ['Select Sources', 'Preview Connection', 'Configure', 'Review'];

const SafetyNotice = () => (
  <div style={{ marginBottom: 18, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(0,229,255,0.18)', background: 'rgba(0,229,255,0.06)', color: 'var(--muted2)', fontSize: 12.5, lineHeight: 1.5 }}>
    <strong style={{ color: 'var(--cyan)' }}>Connector setup preview.</strong> This public demo does not connect to real services. Do not enter real credentials, secrets, repository names, customer data, or personal information.
  </div>
);

const StepIndicator = ({ step }) => (
  <div style={{ width: '100%', maxWidth: 680, marginBottom: 40, display: 'flex', alignItems: 'center' }}>
    {steps.map((s, i) => (
      <React.Fragment key={i}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: i < step ? 'var(--cyan)' : i === step ? 'rgba(0,229,255,0.15)' : 'var(--glass)', border: i <= step ? '2px solid var(--cyan)' : '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: i === step ? '0 0 12px rgba(0,229,255,0.3)' : 'none', transition: 'all 0.3s ease' }}>
            {i < step ? <Icon name="check" size={14} color="#0B0F19" /> : <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: i === step ? 'var(--cyan)' : 'var(--muted)' }}>{i + 1}</span>}
          </div>
          <span style={{ fontSize: 11, color: i <= step ? 'var(--text)' : 'var(--muted)', fontWeight: i === step ? 600 : 400, whiteSpace: 'nowrap' }}>{s}</span>
        </div>
        {i < steps.length - 1 && <div style={{ flex: 1, height: 2, margin: '0 8px', marginBottom: 22, background: i < step ? 'var(--cyan)' : 'var(--border)', transition: 'background 0.4s ease' }} />}
      </React.Fragment>
    ))}
  </div>
);

const SourceSelectionStep = ({ selected, setSelected }) => (
  <div className="wizard-step" style={{ width: '100%', maxWidth: 680, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
    <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>Choose synthetic demo sources</div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>Select mock sources for this synthetic preview. No real data source is contacted.</div>
    </div>
    <div style={{ padding: '24px 28px' }}>
      <SafetyNotice />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {sources.map(src => {
          const sel = selected.includes(src.id);
          return (
            <button key={src.id} onClick={() => setSelected(prev => sel ? prev.filter(x => x !== src.id) : [...prev, src.id])} style={{ padding: '16px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', border: sel ? '2px solid var(--cyan)' : '1px solid var(--border)', background: sel ? 'rgba(0,229,255,0.06)' : 'transparent', transition: 'all 0.15s ease', boxShadow: sel ? '0 0 0 1px rgba(0,229,255,0.2)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${src.color}15`, border: `1px solid ${src.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={src.icon} size={16} color={src.color} />
                </div>
                {sel && <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={12} color="#0B0F19" /></div>}
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

const PreviewConnectionStep = ({ selected, connected, setConnected }) => {
  const selectedSources = sources.filter(s => selected.includes(s.id));
  const firstSource = selectedSources[0] || sources[0];
  const allConnected = selectedSources.every(s => connected[s.id]);

  return (
    <div className="wizard-step" style={{ width: '100%', maxWidth: 680, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>Preview connection</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>No real authorization is performed. This step only simulates a connector flow.</div>
      </div>
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SafetyNotice />
        {selectedSources.map(src => (
          <div key={src.id} style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${src.color}15`, border: `1px solid ${src.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={src.icon} size={20} color={src.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>{src.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{src.desc}</div>
            </div>
            <button onClick={() => setConnected(prev => ({ ...prev, [src.id]: true }))} disabled={connected[src.id]} style={{ padding: '6px 16px', borderRadius: 8, cursor: connected[src.id] ? 'default' : 'pointer', background: connected[src.id] ? 'rgba(0,200,83,0.1)' : 'var(--text)', border: 'none', color: connected[src.id] ? 'var(--success)' : 'var(--bg)', fontSize: 13, fontWeight: 600 }}>
              {connected[src.id] ? 'Simulated ✓' : 'Preview connection →'}
            </button>
          </div>
        ))}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--muted)', background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: 10, marginTop: 8, border: '1px solid var(--border)' }}>
          <div>$ {firstSource.cli}</div>
          <div style={{ color: 'var(--success)' }}>✓ Simulated connector preview. No external authorization request is sent.</div>
        </div>
      </div>
      <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: allConnected ? 'var(--success)' : 'var(--muted)' }}>{allConnected ? 'Ready to continue' : 'Preview each selected source to continue'}</span>
      </div>
    </div>
  );
};

const ConfigureStep = () => {
  const [syncInterval, setSyncInterval] = useState('Synthetic refresh');
  const [repos, setRepos] = useState('Demo repos only');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [backfill, setBackfill] = useState('Demo 90 days');

  return (
    <div className="wizard-step" style={{ width: '100%', maxWidth: 680, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>Configure synthetic demo settings</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>These controls change the preview UI only. They do not configure real sync jobs.</div>
      </div>
      <div style={{ padding: '24px 28px' }}>
        <SafetyNotice />
        {[
          { label: 'Refresh mode', value: syncInterval, setter: setSyncInterval, options: ['Synthetic refresh', 'Manual preview', 'Static snapshot'] },
          { label: 'Repositories', value: repos, setter: setRepos, options: ['Demo repos only', 'Sample monorepo', 'Sample service set'] },
          { label: 'Include archived demo repos', value: includeArchived, setter: setIncludeArchived, type: 'toggle' },
          { label: 'Historical demo window', value: backfill, setter: setBackfill, options: ['Demo 30 days', 'Demo 90 days', 'Demo 1 year'] },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontSize: 13.5, color: 'var(--text)' }}>{row.label}</span>
            {row.type === 'toggle' ? (
              <button onClick={() => row.setter(!row.value)} style={{ width: 38, height: 21, borderRadius: 12, background: row.value ? 'var(--cyan)' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 2, left: row.value ? 20 : 2, width: 17, height: 17, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
              </button>
            ) : (
              <select value={row.value} onChange={e => row.setter(e.target.value)} style={{ background: 'var(--glass2)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px', color: 'var(--cyan)', fontSize: 13, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                {row.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ReviewStep = ({ selected }) => {
  const selectedSources = sources.filter(s => selected.includes(s.id));
  return (
    <div className="wizard-step" style={{ width: '100%', maxWidth: 680, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>Review synthetic setup</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Synthetic setup is ready. Demo metrics are already preloaded.</div>
      </div>
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(0,200,83,0.12)', border: '1px solid rgba(0,200,83,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={28} color="var(--success)" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Synthetic preview ready</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 420 }}>No real repositories are indexed in this demo. Synthetic metrics and sample activity are preloaded.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 340 }}>
          {selectedSources.map(src => (
            <div key={src.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(0,200,83,0.06)', border: '1px solid rgba(0,200,83,0.15)', borderRadius: 10 }}>
              <Icon name={src.icon} size={15} color={src.color} />
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{src.name}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
                <span style={{ fontSize: 11, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>Simulated</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const WizardScreen = () => {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(['github']);
  const [connected, setConnected] = useState({});

  const renderStepContent = () => {
    switch (step) {
      case 0: return <SourceSelectionStep selected={selected} setSelected={setSelected} />;
      case 1: return <PreviewConnectionStep selected={selected} connected={connected} setConnected={setConnected} />;
      case 2: return <ConfigureStep />;
      case 3: return <ReviewStep selected={selected} />;
      default: return null;
    }
  };

  const canGoNext = () => {
    if (step === 0) return selected.length > 0;
    if (step === 1) return sources.filter(s => selected.includes(s.id)).every(s => connected[s.id]);
    return true;
  };

  const handleNext = () => {
    if (step < steps.length - 1 && canGoNext()) setStep(s => s + 1);
    else if (step === steps.length - 1) window.location.href = '#/';
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <StepIndicator step={step} />
      <div className="wizard-step" key={step} style={{ width: '100%', maxWidth: 680 }}>
        {renderStepContent()}
      </div>
      <div style={{ marginTop: 24, display: 'flex', gap: 16, width: '100%', maxWidth: 680, justifyContent: 'space-between' }}>
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{ padding: '10px 24px', borderRadius: 9, background: 'transparent', border: '1px solid var(--border)', color: step === 0 ? 'var(--muted)' : 'var(--text)', cursor: step === 0 ? 'default' : 'pointer', fontSize: 13.5, fontWeight: 500, transition: 'all 0.15s' }}>
          Back
        </button>
        <button onClick={handleNext} disabled={!canGoNext()} style={{ padding: '10px 28px', borderRadius: 9, background: canGoNext() ? 'var(--grad)' : 'rgba(255,255,255,0.1)', border: 'none', color: canGoNext() ? '#fff' : 'var(--muted)', fontWeight: 600, fontSize: 13.5, cursor: canGoNext() ? 'pointer' : 'default', boxShadow: canGoNext() ? '0 0 16px rgba(0,229,255,0.2)' : 'none' }}>
          {step === steps.length - 1 ? 'Go to Dashboard' : 'Continue →'}
        </button>
      </div>
    </div>
  );
};
