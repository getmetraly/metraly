import React from 'react';
import { Icon } from '../../components/shared/Icon';

const demoSources = [
  { name: 'GitHub', icon: 'github', color: '#E8EDF5' },
  { name: 'Jira', icon: 'jira', color: '#2684FF' },
  { name: 'Linear', icon: 'linear', color: '#5E6AD2' },
  { name: 'Slack', icon: 'slack', color: '#4A154B' },
  { name: 'PagerDuty', icon: 'pagerduty', color: '#06AC38' },
  { name: 'GitLab', icon: 'gitlab', color: '#FC6D26' },
];

export const WizardScreen = () => {
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '32px 40px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ marginBottom: 18, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(0,229,255,0.18)', background: 'rgba(0,229,255,0.06)', color: 'var(--muted2)', fontSize: 12.5, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--cyan)' }}>Connector setup preview.</strong> This public demo uses scripted sample data only. Do not enter real credentials, secrets, repository names, or customer information.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
          {demoSources.map((src) => (
            <div key={src.name} style={{ background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 18px 16px' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: `${src.color}15`, border: `1px solid ${src.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Icon name={src.icon} size={18} color={src.color} />
              </div>

              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>
                {src.name}
              </div>

              <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 16 }}>
                Synthetic demo connector preview with scripted sample metrics and activity.
              </div>

              <button style={{ padding: '7px 14px', borderRadius: 8, cursor: 'pointer', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.25)', color: 'var(--cyan)', fontSize: 12.5, fontWeight: 600 }}>
                Preview setup
              </button>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px' }}>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>
            Synthetic onboarding flow
          </div>

          <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 760 }}>
            This preview demonstrates the planned onboarding and source configuration experience using scripted demo content only. No external systems are contacted and no customer data is processed.
          </div>
        </div>
      </div>
    </div>
  );
};
