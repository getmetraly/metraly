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
  StateBadge,
} from '../../design-system';
import type { ReviewPanelItem, WizardLayoutStep, MetralySelectOption } from '../../design-system';
import {
  createSource,
  listCollectorRuns,
  listSources,
  testSource,
  triggerCollect,
  type CollectorRun,
  type ConnectionTestResult,
} from '../../api/client';

interface Source {
  id: string;
  icon: string;
  name: string;
  desc: string;
}

const SOURCES: Source[] = [
  { id: 'github', icon: 'github', name: 'GitHub', desc: 'Repos, PRs, CI workflows' },
  { id: 'jira', icon: 'jira', name: 'Jira', desc: 'Issues, sprints, backlogs' },
  { id: 'gitlab', icon: 'gitlab', name: 'GitLab', desc: 'Merge requests & pipelines' },
  { id: 'linear', icon: 'linear', name: 'Linear', desc: 'Projects, cycles & issues' },
];

const STAGES = ['sources', 'auth', 'configure', 'review'] as const;
type Stage = (typeof STAGES)[number];

const STEP_LABELS: Record<Stage, string> = {
  sources: 'Select Sources',
  auth: 'Authenticate',
  configure: 'Configure',
  review: 'Review',
};

interface SourceRuntimeState {
  secret: string;
  sourceId?: string;
  createError?: string;
  testResult?: ConnectionTestResult;
  collectRun?: CollectorRun;
  collectError?: string;
  isCreating: boolean;
  isTesting: boolean;
  isCollecting: boolean;
}

interface WizardScreenProps {
  onUseDemo?: () => void;
  onFinish?: () => void;
}

export const WizardScreen: React.FC<WizardScreenProps> = ({ onUseDemo, onFinish }) => {
  const [stage, setStage] = useState<Stage>('sources');
  const [selected, setSelected] = useState<string[]>(['github']);
  const [sourceState, setSourceState] = useState<Record<string, SourceRuntimeState>>({});
  const [syncInterval, setSyncInterval] = useState('Every 5 minutes');
  const [repos, setRepos] = useState('All repos in org');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [backfill, setBackfill] = useState('90 days');
  const [finishError, setFinishError] = useState('');

  const stageIdx = STAGES.indexOf(stage);
  const steps: WizardLayoutStep[] = useMemo(
    () => STAGES.map((id, index) => ({ id, label: STEP_LABELS[id], status: index < stageIdx ? 'done' : index === stageIdx ? 'current' : 'next' })),
    [stageIdx],
  );

  const selectedSources = SOURCES.filter((source) => selected.includes(source.id));
  const allConnected = selectedSources.length > 0 && selectedSources.every((source) => sourceState[source.id]?.testResult?.status === 'ok');

  const canGoNext =
    stage === 'sources'
      ? selected.length > 0
      : stage === 'auth'
        ? allConnected
        : true;

  function toggleSource(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function updateState(sourceKey: string, updater: (prev: SourceRuntimeState) => SourceRuntimeState) {
    setSourceState((prev) => {
      const current: SourceRuntimeState = prev[sourceKey] || {
        secret: '',
        isCreating: false,
        isTesting: false,
        isCollecting: false,
      };
      return { ...prev, [sourceKey]: updater(current) };
    });
  }

  async function connectSource(source: Source) {
    const state = sourceState[source.id];
    const secret = (state?.secret || '').trim();
    if (!secret) {
      updateState(source.id, (prev) => ({ ...prev, createError: 'Secret/token is required.' }));
      return;
    }

    updateState(source.id, (prev) => ({ ...prev, isCreating: true, createError: '', collectError: '' }));

    try {
      const created = await createSource({
        sourceType: source.id,
        displayName: source.name,
        secret,
        config: {
          syncInterval,
          repoScope: repos,
          includeArchived: includeArchived ? 'true' : 'false',
          backfill,
          org: 'metraly-demo',
        },
      });
      updateState(source.id, (prev) => ({ ...prev, sourceId: created.source.id, isCreating: false, isTesting: true }));
      const test = await testSource(created.source.id);
      updateState(source.id, (prev) => ({ ...prev, isTesting: false, testResult: test }));
    } catch (error) {
      updateState(source.id, (prev) => ({
        ...prev,
        isCreating: false,
        isTesting: false,
        createError: error instanceof Error ? error.message : 'Failed to connect source',
      }));
    }
  }

  async function triggerCollectForAll() {
    setFinishError('');
    for (const source of selectedSources) {
      const state = sourceState[source.id];
      if (!state?.sourceId || state?.testResult?.status !== 'ok') {
        continue;
      }
      updateState(source.id, (prev) => ({ ...prev, isCollecting: true, collectError: '' }));
      try {
        const run = await triggerCollect(state.sourceId);
        const runs = await listCollectorRuns(state.sourceId, 1);
        const latest = runs.runs?.[0] || run;
        updateState(source.id, (prev) => ({ ...prev, collectRun: latest, isCollecting: false }));
      } catch (error) {
        updateState(source.id, (prev) => ({
          ...prev,
          isCollecting: false,
          collectError: error instanceof Error ? error.message : 'Failed to trigger collection',
        }));
      }
    }
  }

  async function goNext() {
    if (!canGoNext) return;
    if (stageIdx < STAGES.length - 1) {
      setStage(STAGES[stageIdx + 1]);
      return;
    }
    try {
      await triggerCollectForAll();
      await listSources();
      onFinish?.();
    } catch (error) {
      setFinishError(error instanceof Error ? error.message : 'Failed to complete source setup');
    }
  }

  function goBack() {
    if (stageIdx === 0) return;
    setStage(STAGES[stageIdx - 1]);
  }

  function renderSourceStatus(source: Source) {
    const s = sourceState[source.id];
    if (!s) return <StateBadge state="noData" label="Not connected" />;
    if (s.isCreating || s.isTesting) return <StateBadge state="info" label="Connecting…" />;
    if (s.testResult?.status === 'ok') return <StateBadge state="ok" label="Connected" />;
    if (s.testResult) return <StateBadge state="warning" label={s.testResult.status} />;
    if (s.createError) return <StateBadge state="error" label="Failed" />;
    return <StateBadge state="noData" label="Not connected" />;
  }

  function renderStageBody() {
    if (stage === 'sources') {
      return (
        <div style={{ display: 'grid', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 'var(--m-fs-12, 12px)', color: 'var(--m-fg-2)' }}>
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
                    border: isSelected ? '2px solid var(--m-cyan-500)' : '1px solid var(--m-line)',
                    background: isSelected ? 'color-mix(in srgb, var(--m-cyan-500) 8%, var(--m-bg-1))' : 'var(--m-bg-1)',
                    cursor: 'pointer',
                  }}
                >
                  <Icon name={source.icon} size={16} />
                  <span style={{ fontSize: 'var(--m-fs-12, 12px)', fontWeight: 700, color: 'var(--m-fg-0)' }}>{source.name}</span>
                  <span style={{ fontSize: 'var(--m-fs-10, 10px)', color: 'var(--m-fg-3, var(--m-fg-1))', lineHeight: 1.45 }}>{source.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (stage === 'auth') {
      return (
        <div style={{ display: 'grid', gap: 12 }}>
          {selectedSources.map((source) => {
            const runtime = sourceState[source.id] || { secret: '', isCreating: false, isTesting: false, isCollecting: false };
            return (
              <div key={source.id} style={{ borderRadius: 10, border: '1px solid var(--m-line)', background: 'var(--m-bg-1)', padding: '14px 16px', display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon name={source.icon} size={16} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--m-fs-12, 12px)', fontWeight: 700, color: 'var(--m-fg-0)' }}>{source.name}</div>
                    <div style={{ fontSize: 'var(--m-fs-10, 10px)', color: 'var(--m-fg-3, var(--m-fg-1))' }}>{source.desc}</div>
                  </div>
                  {renderSourceStatus(source)}
                </div>
                <MetralyInput
                  type="password"
                  value={runtime.secret}
                  onChange={(e) => updateState(source.id, (prev) => ({ ...prev, secret: e.target.value }))}
                  placeholder="Paste token / API secret"
                  fullWidth
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <MetralyButton
                    type="button"
                    variant={runtime.testResult?.status === 'ok' ? 'neutral' : 'primary'}
                    size="sm"
                    disabled={runtime.isCreating || runtime.isTesting}
                    onClick={() => connectSource(source)}
                  >
                    {runtime.isCreating || runtime.isTesting ? 'Connecting…' : runtime.testResult?.status === 'ok' ? 'Re-test' : 'Connect'}
                  </MetralyButton>
                  {runtime.createError ? <span style={{ color: 'var(--m-err)', fontSize: 'var(--m-fs-10, 10px)' }}>{runtime.createError}</span> : null}
                  {runtime.testResult && runtime.testResult.status !== 'ok' ? (
                    <span style={{ color: 'var(--m-warn)', fontSize: 'var(--m-fs-10, 10px)' }}>{runtime.testResult.message}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (stage === 'configure') {
      return (
        <div style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 'var(--m-fs-11, 11px)', fontWeight: 600, color: 'var(--m-fg-1)' }}>Sync interval</span>
            <MetralySelect
              value={syncInterval}
              options={['Every 5 minutes', 'Every 15 minutes', 'Every hour'].map((v): MetralySelectOption => ({ value: v, label: v }))}
              onChange={setSyncInterval}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 'var(--m-fs-11, 11px)', fontWeight: 600, color: 'var(--m-fg-1)' }}>Repositories</span>
            <MetralyInput value={repos} onChange={e => setRepos(e.target.value)} fullWidth />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 'var(--m-fs-11, 11px)', fontWeight: 600, color: 'var(--m-fg-1)' }}>Historical backfill</span>
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
      <div style={{ display: 'grid', gap: 12 }}>
        <ReviewPanel
          title="Review connection setup"
          description="Metraly will start indexing after activation."
          items={reviewItems}
        />
        {selectedSources.map((source) => {
          const runtime = sourceState[source.id];
          return (
            <div key={source.id} style={{ borderRadius: 10, border: '1px solid var(--m-line)', background: 'var(--m-bg-1)', padding: '12px 14px', display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name={source.icon} size={14} />
                <strong style={{ fontSize: 'var(--m-fs-11, 11px)' }}>{source.name}</strong>
                {runtime?.collectRun ? <StateBadge state={runtime.collectRun.status === 'succeeded' ? 'success' : runtime.collectRun.status === 'failed' ? 'error' : 'info'} label={runtime.collectRun.status} /> : null}
              </div>
              {runtime?.collectError ? <span style={{ color: 'var(--m-err)', fontSize: 'var(--m-fs-10, 10px)' }}>{runtime.collectError}</span> : null}
              {runtime?.collectRun ? <span style={{ color: 'var(--m-fg-2)', fontSize: 'var(--m-fs-10, 10px)' }}>raw events: {runtime.collectRun.rawEventCount}</span> : null}
            </div>
          );
        })}
        {finishError ? <span style={{ color: 'var(--m-err)', fontSize: 'var(--m-fs-10, 10px)' }}>{finishError}</span> : null}
      </div>
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
            primary={<MetralyButton type="button" variant="primary" size="md" disabled={!canGoNext} onClick={goNext}>{stage === 'review' ? 'Activate & Continue' : 'Continue'}</MetralyButton>}
            status={<span style={{ fontSize: 'var(--m-fs-10, 10px)', color: 'var(--m-fg-3, var(--m-fg-1))' }}>Step {stageIdx + 1} / {STAGES.length}</span>}
          />
        }
      >
        {renderStageBody()}
      </WizardLayout>
    </div>
  );
};
