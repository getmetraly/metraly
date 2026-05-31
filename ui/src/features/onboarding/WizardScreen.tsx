import React, { useMemo, useState } from 'react';
import {
  ReviewPanel,
  StickyWizardFooter,
  WizardLayout,
  MetralyButton,
  MetralyInput,
  MetralySelect,
  MetralyCheckbox,
  CardShell,
  MetralyIcon,
  Icon,
} from '../../design-system';
import type { ReviewPanelItem, WizardLayoutStep, MetralySelectOption } from '../../design-system';

interface Source {
  id: string;
  icon: string;
  name: string;
  desc: string;
  cli: string;
}

const SOURCES: Source[] = [
  { id: 'github', icon: 'github', name: 'GitHub', desc: 'Repos, PRs, CI workflows', cli: 'github --org my-org' },
  { id: 'jira', icon: 'jira', name: 'Jira', desc: 'Issues, sprints, backlogs', cli: 'jira --url https://your-domain.atlassian.net' },
  { id: 'gitlab', icon: 'gitlab', name: 'GitLab', desc: 'Merge requests & pipelines', cli: 'gitlab --host https://gitlab.com' },
  { id: 'linear', icon: 'linear', name: 'Linear', desc: 'Projects, cycles & issues', cli: 'linear --api-key' },
  { id: 'slack', icon: 'slack', name: 'Slack', desc: 'Team communications', cli: 'slack --token' },
  { id: 'pagerduty', icon: 'pagerduty', name: 'PagerDuty', desc: 'Incidents & on-call', cli: 'pagerduty --integration-key' },
];

const STAGES = ['sources', 'auth', 'configure', 'review'] as const;
type Stage = (typeof STAGES)[number];

const STEP_LABELS: Record<Stage, string> = {
  sources: 'Select Sources',
  auth: 'Authenticate',
  configure: 'Configure',
  review: 'Review',
};

interface WizardScreenProps {
  onUseDemo?: () => void;
  onFinish?: () => void;
}


export const WizardScreen: React.FC<WizardScreenProps> = ({ onUseDemo, onFinish }) => {
  const [stage, setStage] = useState<Stage>('sources');
  const [selected, setSelected] = useState<string[]>(['github']);
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [syncInterval, setSyncInterval] = useState('Every 5 minutes');
  const [repos, setRepos] = useState('All repos in org');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [backfill, setBackfill] = useState('90 days');

  const stageIdx = STAGES.indexOf(stage);
  const steps: WizardLayoutStep[] = useMemo(
    () => STAGES.map((id, index) => ({ id, label: STEP_LABELS[id], status: index < stageIdx ? 'done' : index === stageIdx ? 'current' : 'next' })),
    [stageIdx],
  );

  const selectedSources = SOURCES.filter((source) => selected.includes(source.id));
  const allConnected = selectedSources.length > 0 && selectedSources.every((source) => connected[source.id]);

  const canGoNext =
    stage === 'sources'
      ? selected.length > 0
      : stage === 'auth'
        ? allConnected
        : true;

  function goBack() {
    if (stageIdx === 0) return;
    setStage(STAGES[stageIdx - 1]);
  }

  function goNext() {
    if (!canGoNext) return;
    if (stageIdx < STAGES.length - 1) {
      setStage(STAGES[stageIdx + 1]);
      return;
    }
    if (onFinish) {
      onFinish();
      return;
    }
    window.location.href = '/';
  }

  function toggleSource(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function renderStageBody() {
    if (stage === 'sources') {
      return (
        <div style={{ display: 'grid', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 'var(--m-fs-12, 12px)', color: 'var(--m-fg-2, var(--muted))' }}>
            Select the tools your team uses. You can add more later.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 12 }}>
            {SOURCES.map((source) => {
              const isSelected = selected.includes(source.id);
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => toggleSource(source.id)}
                  style={{
                    display: 'grid',
                    gap: 8,
                    textAlign: 'left',
                    borderRadius: 12,
                    padding: '16px 14px',
                    border: isSelected ? '2px solid var(--m-cyan-500, var(--cyan))' : '1px solid var(--m-line, var(--border))',
                    background: isSelected ? 'color-mix(in srgb, var(--m-cyan-500, var(--cyan)) 8%, var(--m-bg-1, var(--glass)))' : 'var(--m-bg-1, var(--glass))',
                    cursor: 'pointer',
                  }}
                >
                  <Icon name={source.icon} size={16} />
                  <span style={{ fontSize: 'var(--m-fs-12, 12px)', fontWeight: 700, color: 'var(--m-fg-0, var(--text))' }}>{source.name}</span>
                  <span style={{ fontSize: 'var(--m-fs-10, 10px)', color: 'var(--m-fg-3, var(--muted2))', lineHeight: 1.45 }}>{source.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (stage === 'auth') {
      const cliSource = selectedSources[0] ?? SOURCES[0];
      return (
        <div style={{ display: 'grid', gap: 12 }}>
          {selectedSources.map((source) => (
            <div
              key={source.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderRadius: 10,
                border: '1px solid var(--m-line, var(--border))',
                background: 'var(--m-bg-1, var(--glass))',
                padding: '14px 16px',
              }}
            >
              <Icon name={source.icon} size={16} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--m-fs-12, 12px)', fontWeight: 700, color: 'var(--m-fg-0, var(--text))' }}>{source.name}</div>
                <div style={{ fontSize: 'var(--m-fs-10, 10px)', color: 'var(--m-fg-3, var(--muted2))' }}>{source.desc}</div>
              </div>
              <MetralyButton
                type="button"
                variant={connected[source.id] ? 'neutral' : 'primary'}
                size="sm"
                disabled={!!connected[source.id]}
                onClick={() => setConnected((prev) => ({ ...prev, [source.id]: true }))}
              >
                {connected[source.id] ? 'Connected' : 'Connect'}
              </MetralyButton>
            </div>
          ))}
          <div style={{ borderRadius: 10, border: '1px solid var(--m-line, var(--border))', background: 'var(--m-bg-2, rgba(0,0,0,0.2))', padding: '10px 12px' }}>
            <div style={{ fontFamily: 'var(--m-font-mono, var(--font-mono))', fontSize: 'var(--m-fs-11, 11px)', color: 'var(--m-fg-2, var(--muted))' }}>
              $ metraly auth {cliSource.cli}
            </div>
            <div style={{ marginTop: 4, fontSize: 'var(--m-fs-10, 10px)', color: 'var(--m-success, var(--success))' }}>
              Waiting for OAuth callback on localhost:7842…
            </div>
          </div>
        </div>
      );
    }

    if (stage === 'configure') {
      return (
        <div style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 'var(--m-fs-11, 11px)', fontWeight: 600, color: 'var(--m-fg-1, var(--muted2))' }}>Sync interval</span>
            <MetralySelect
              value={syncInterval}
              options={['Every 5 minutes', 'Every 15 minutes', 'Every hour'].map((v): MetralySelectOption => ({ value: v, label: v }))}
              onChange={setSyncInterval}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 'var(--m-fs-11, 11px)', fontWeight: 600, color: 'var(--m-fg-1, var(--muted2))' }}>Repositories</span>
            <MetralyInput value={repos} onChange={e => setRepos(e.target.value)} fullWidth />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 'var(--m-fs-11, 11px)', fontWeight: 600, color: 'var(--m-fg-1, var(--muted2))' }}>Historical backfill</span>
            <MetralySelect
              value={backfill}
              options={['30 days', '90 days', '1 year'].map((v): MetralySelectOption => ({ value: v, label: v }))}
              onChange={setBackfill}
            />
          </label>

          <MetralyCheckbox
            checked={includeArchived}
            label="Include archived repositories"
            onChange={e => setIncludeArchived(e.target.checked)}
          />
        </div>
      );
    }

    const reviewItems: ReviewPanelItem[] = [
      { id: 'sources', icon: <Icon name="link" size={12} />, label: 'Sources', value: selectedSources.map((source) => source.name).join(', ') || 'None selected' },
      { id: 'sync', icon: <Icon name="timer" size={12} />, label: 'Sync interval', value: syncInterval },
      { id: 'repos', icon: <Icon name="database" size={12} />, label: 'Repositories', value: repos },
      { id: 'backfill', icon: <Icon name="clock" size={12} />, label: 'Backfill', value: backfill },
      { id: 'archived', icon: <Icon name="boxes" size={12} />, label: 'Archived repos', value: includeArchived ? 'Included' : 'Excluded' },
    ];

    return (
      <ReviewPanel
        title="Review connection setup"
        description="Metraly will start indexing after activation."
        items={reviewItems}
      />
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '28px 24px' }}>
      {onUseDemo ? (
        <div style={{ maxWidth: 760, margin: '0 auto 12px' }}>
          <CardShell
            tone="purple"
            density="compact"
            leading={<MetralyIcon name="sparkles" size="sm" />}
            title="Demo mode is available"
            subtitle="Switch back to Sandbox Inc. demo data at any point."
            actions={
              <MetralyButton variant="ghost" size="sm" onClick={onUseDemo}>
                Show demo
              </MetralyButton>
            }
          />
        </div>
      ) : null}

      <WizardLayout
        steps={steps}
        title="Connect your engineering sources"
        description="Configure the data pipeline before the first import."
        progressPlacement="top"
        contentWidth={760}
        footer={
          <StickyWizardFooter
            back={<MetralyButton type="button" variant="ghost" size="md" disabled={stageIdx === 0} onClick={goBack}>Back</MetralyButton>}
            primary={<MetralyButton type="button" variant="primary" size="md" disabled={!canGoNext} onClick={goNext}>{stage === 'review' ? 'Go to Dashboard' : 'Continue'}</MetralyButton>}
            status={<span style={{ fontSize: 'var(--m-fs-10, 10px)', color: 'var(--m-fg-3, var(--muted2))' }}>Step {stageIdx + 1} / {STAGES.length}</span>}
          />
        }
      >
        {renderStageBody()}
      </WizardLayout>
    </div>
  );
};
