// src/features/dashboardWizard/DashboardWizardScreen.jsx
import React, { useState } from 'react';
import { Icon } from '../../components/shared/Icon';
import { PreviewPanel } from './components/PreviewPanel';

const TEMPLATES = [
  { id: 'cto',    label: 'CTO',              icon: 'trendingUp', color: '#00E5FF', desc: 'Synthetic health score, DORA overview, and team velocity trends' },
  { id: 'vp',     label: 'VP Engineering',   icon: 'users',      color: '#B44CFF', desc: 'Synthetic sprint velocity, team load, and delivery risk preview' },
  { id: 'tl',     label: 'Tech Lead',        icon: 'gitPR',      color: '#00C853', desc: 'Synthetic CI health, PR queue, and sprint burndown' },
  { id: 'devops', label: 'DevOps / SRE',     icon: 'cpu',        color: '#FF9100', desc: 'Synthetic deploy frequency, MTTR, and incident tracking' },
  { id: 'ic',     label: 'My Dashboard',     icon: 'activity',   color: '#B44CFF', desc: 'Synthetic PRs, CI runs, review queue, and sprint tasks' },
  { id: 'blank',  label: 'Blank Canvas',     icon: 'plus',       color: '#6B7A9A', desc: 'Start from scratch and add synthetic preview widgets one by one' },
];

const WIDGET_LIBRARY = [
  { cat: 'DORA',   id: 'dora-overview',   icon: 'zap',       label: 'DORA Overview',       desc: 'Synthetic overview of the 4 key metrics' },
  { cat: 'DORA',   id: 'deploy-freq',     icon: 'zap',       label: 'Deploy Frequency',    desc: 'Synthetic chart and current sample value' },
  { cat: 'DORA',   id: 'lead-time',       icon: 'clock',     label: 'Lead Time',           desc: 'Synthetic commit-to-deploy timing example' },
  { cat: 'DORA',   id: 'mttr-trend',      icon: 'activity',  label: 'MTTR Trend',          desc: 'Synthetic incident recovery timing preview' },
  { cat: 'CI/CD',  id: 'ci-pass-rate',    icon: 'activity',  label: 'CI Pass Rate',        desc: 'Synthetic build success trend' },
  { cat: 'CI/CD',  id: 'failing-builds',  icon: 'xCircle',   label: 'Failing Builds',      desc: 'Synthetic failure list preview' },
  { cat: 'PR',     id: 'pr-queue',        icon: 'gitPR',     label: 'PR Review Queue',     desc: 'Synthetic open PR review queue' },
  { cat: 'PR',     id: 'pr-cycle',        icon: 'gitPR',     label: 'PR Cycle Time',       desc: 'Synthetic time-to-merge trend' },
  { cat: 'Sprint', id: 'burndown',        icon: 'chart',     label: 'Sprint Burndown',     desc: 'Synthetic points remaining vs ideal' },
  { cat: 'Sprint', id: 'velocity',        icon: 'trendingUp',label: 'Sprint Velocity',     desc: 'Synthetic historical velocity trend' },
  { cat: 'Sprint', id: 'blocked-tasks',   icon: 'alertTri',  label: 'Blocked Tasks',       desc: 'Synthetic blocked task examples' },
  { cat: 'Team',   id: 'team-heatmap',    icon: 'layers',    label: 'Team Activity Map',   desc: 'Synthetic commit heatmap preview' },
  { cat: 'Team',   id: 'leaderboard',     icon: 'star',      label: 'Leaderboard',         desc: 'Synthetic contributor ranking preview' },
  { cat: 'AI',     id: 'ai-summary',      icon: 'sparkles',  label: 'AI Summary Preview',  desc: 'Scripted sample insight summary' },
  { cat: 'AI',     id: 'anomaly',         icon: 'brain',     label: 'Anomaly Preview',     desc: 'Synthetic metric change flag preview' },
];

const TEMPLATE_WIDGETS = {
  cto:    ['dora-overview', 'deploy-freq', 'velocity', 'ai-summary'],
  vp:     ['velocity', 'pr-cycle', 'team-heatmap', 'blocked-tasks', 'ai-summary'],
  tl:     ['ci-pass-rate', 'pr-queue', 'burndown', 'failing-builds', 'ai-summary'],
  devops: ['deploy-freq', 'mttr-trend', 'failing-builds', 'anomaly'],
  ic:     ['pr-queue', 'ci-pass-rate', 'burndown', 'blocked-tasks'],
  blank:  [],
};

const CATS = ['All', 'DORA', 'CI/CD', 'PR', 'Sprint', 'Team', 'AI'];

const StepDot = ({ n, label, active, done }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 60 }}>
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: done ? 'var(--cyan)' : active ? 'rgba(0,229,255,0.15)' : 'transparent',
      border: done ? '2px solid var(--cyan)' : active ? '2px solid var(--cyan)' : '2px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: active ? '0 0 12px rgba(0,229,255,0.3)' : 'none',
    }}>
      {done ? <Icon name="check" size={13} color="#0B0F19" /> : <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: active ? 'var(--cyan)' : 'var(--muted)' }}>{n}</span>}
    </div>
    <span style={{ fontSize: 10.5, color: active ? 'var(--text)' : 'var(--muted)', fontWeight: active ? 600 : 400 }}>{label}</span>
  </div>
);

export const DashboardWizardScreen = ({ onSave, onCancel }) => {
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [widgetSizes, setWidgetSizes] = useState({});
  const [widgetCat, setWidgetCat] = useState('All');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [timeRange, setTimeRange] = useState('30d');
  const [team, setTeam] = useState('All teams');

  const steps = ['Template', 'Widgets', 'Settings'];

  const chooseTemplate = (tmpl) => {
    setSelectedTemplate(tmpl);
    const ws = TEMPLATE_WIDGETS[tmpl.id] || [];
    setWidgets(ws);
    const sizes = {};
    ws.forEach(id => {
      sizes[id] = (id === 'dora-overview' || id === 'team-heatmap' || id === 'pr-queue' || id === 'failing-builds' || id === 'ai-summary') ? 'lg' : 'sm';
    });
    setWidgetSizes(sizes);
    if (!name) setName(tmpl.id === 'blank' ? 'Synthetic Dashboard' : `${tmpl.label} Preview`);
  };

  const toggleWidget = (id) => {
    setWidgets(prev => {
      if (prev.includes(id)) {
        const newSizes = { ...widgetSizes };
        delete newSizes[id];
        setWidgetSizes(newSizes);
        return prev.filter(x => x !== id);
      }
      setWidgetSizes(s => ({ ...s, [id]: 'sm' }));
      return [...prev, id];
    });
  };

  const moveWidget = (idx, dir) => {
    setWidgets(prev => {
      const arr = [...prev];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= arr.length) return arr;
      [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      return arr;
    });
  };

  const toggleSize = (id) => {
    setWidgetSizes(prev => ({ ...prev, [id]: prev[id] === 'lg' ? 'sm' : 'lg' }));
  };

  const filteredWidgets = widgetCat === 'All' ? WIDGET_LIBRARY : WIDGET_LIBRARY.filter(w => w.cat === widgetCat);
  const canContinue = [!!selectedTemplate, widgets.length > 0, name.trim().length > 0][step];

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
      <div style={{
        width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border)', overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(0,229,255,0.18)', background: 'rgba(0,229,255,0.06)', color: 'var(--muted2)', fontSize: 12, lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--cyan)' }}>Synthetic dashboard builder preview.</strong> Templates, widgets, AI summaries, anomaly indicators, and saved layouts are scripted demo content only.
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
            {steps.map((s, i) => (
              <React.Fragment key={i}>
                <StepDot n={i + 1} label={s} active={step === i} done={step > i} />
                {i < steps.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: step > i ? 'var(--cyan)' : 'var(--border)', marginTop: 13, transition: 'background 0.3s' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '18px 20px' }}>
          {step === 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Start from a synthetic template</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>Choose a sample layout for this preview, or start blank.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TEMPLATES.map(tmpl => {
                  const isSelected = selectedTemplate?.id === tmpl.id;
                  return (
                    <button key={tmpl.id} onClick={() => chooseTemplate(tmpl)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                        borderRadius: 10, cursor: 'pointer', textAlign: 'left', width: '100%',
                        border: isSelected ? `1px solid ${tmpl.color}55` : '1px solid var(--border)',
                        background: isSelected ? `${tmpl.color}0a` : 'transparent',
                        boxShadow: isSelected ? `0 0 12px ${tmpl.color}12` : 'none',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border2)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: `${tmpl.color}18`, border: `1px solid ${tmpl.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name={tmpl.icon} size={16} color={tmpl.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-head)', marginBottom: 2 }}>{tmpl.label}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>{tmpl.desc}</div>
                      </div>
                      {isSelected && <Icon name="check" size={16} color={tmpl.color} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Customize synthetic widgets</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Add or remove preview widgets. Selected: {widgets.length}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {CATS.map(c => (
                  <button key={c} onClick={() => setWidgetCat(c)} style={{
                    padding: '4px 11px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                    border: widgetCat === c ? '1px solid rgba(0,229,255,0.4)' : '1px solid var(--border)',
                    background: widgetCat === c ? 'rgba(0,229,255,0.1)' : 'transparent',
                    color: widgetCat === c ? 'var(--cyan)' : 'var(--muted2)',
                  }}>{c}</button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredWidgets.map(w => {
                  const sel = widgets.includes(w.id);
                  const catColors = { DORA: '#00E5FF', 'CI/CD': '#00C853', PR: '#B44CFF', Sprint: '#FF9100', Team: '#00E5FF', AI: '#B44CFF' };
                  const c = catColors[w.cat] || '#00E5FF';
                  return (
                    <div key={w.id} onClick={() => toggleWidget(w.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9,
                      cursor: 'pointer', border: sel ? `1px solid ${c}40` : '1px solid var(--border)',
                      background: sel ? `${c}0a` : 'transparent',
                    }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: `${c}18`, border: `1px solid ${c}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={w.icon} size={13} color={c} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{w.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{w.desc}</div>
                      </div>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        border: sel ? 'none' : '1.5px solid var(--border)',
                        background: sel ? c : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {sel && <Icon name="check" size={10} color="#0B0F19" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Preview settings</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Name the sample layout and arrange preview widgets. No dashboard is saved by this public demo.</div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Preview name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Backend Team Preview" style={{
                  width: '100%', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 9,
                  padding: '9px 12px', color: 'var(--text)', fontSize: 13.5, outline: 'none',
                }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Description</label>
                <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional demo-only note" style={{
                  width: '100%', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 9,
                  padding: '9px 12px', color: 'var(--text)', fontSize: 13.5, outline: 'none',
                }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>Default demo time range</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['7d', '14d', '30d', '90d'].map(t => (
                    <button key={t} onClick={() => setTimeRange(t)} style={{
                      padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 13,
                      border: timeRange === t ? '1px solid rgba(0,229,255,0.4)' : '1px solid var(--border)',
                      background: timeRange === t ? 'rgba(0,229,255,0.1)' : 'transparent',
                      color: timeRange === t ? 'var(--cyan)' : 'var(--muted2)',
                    }}>{t}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>Synthetic team scope</label>
                <select value={team} onChange={e => setTeam(e.target.value)} style={{
                  width: '100%', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 9,
                  padding: '9px 12px', color: 'var(--text)', fontSize: 13.5, cursor: 'pointer',
                }}>
                  {['All demo teams', 'Platform sample', 'Backend sample', 'Frontend sample', 'Mobile sample', 'Data sample'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
                  Widget layout preview — reorder and toggle width
                </label>
                {widgets.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', opacity: 0.6 }}>No widgets — go back to step 2.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {widgets.map((id, idx) => {
                      const w = WIDGET_LIBRARY.find(x => x.id === id);
                      if (!w) return null;
                      const catColors = { DORA: '#00E5FF', 'CI/CD': '#00C853', PR: '#B44CFF', Sprint: '#FF9100', Team: '#00E5FF', AI: '#B44CFF' };
                      const c = catColors[w.cat] || '#00E5FF';
                      const isLg = widgetSizes[id] === 'lg';
                      return (
                        <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <button onClick={() => moveWidget(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? 'var(--border)' : 'var(--muted)', padding: '1px 3px', fontSize: 10 }}>▲</button>
                            <button onClick={() => moveWidget(idx, 1)} disabled={idx === widgets.length - 1} style={{ background: 'none', border: 'none', cursor: idx === widgets.length - 1 ? 'default' : 'pointer', color: idx === widgets.length - 1 ? 'var(--border)' : 'var(--muted)', padding: '1px 3px', fontSize: 10 }}>▼</button>
                          </div>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: `${c}18`, border: `1px solid ${c}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name={w.icon} size={12} color={c} />
                          </div>
                          <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{w.label}</div>
                          <button onClick={() => toggleSize(id)} style={{ padding: '3px 8px', borderRadius: 5, fontSize: 11, cursor: 'pointer', border: `1px solid ${isLg ? 'rgba(0,229,255,0.3)' : 'var(--border)'}`, background: isLg ? 'rgba(0,229,255,0.08)' : 'transparent', color: isLg ? 'var(--cyan)' : 'var(--muted)' }}>{isLg ? 'Full' : 'Half'}</button>
                          <button onClick={() => setWidgets(p => p.filter(x => x !== id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                            <Icon name="x" size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
          <button onClick={() => step === 0 ? onCancel?.() : setStep(s => s - 1)} style={{ padding: '8px 18px', borderRadius: 9, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted2)', fontSize: 13 }}>{step === 0 ? 'Cancel' : 'Back'}</button>
          <button onClick={() => step === steps.length - 1 ? onSave?.({ name, widgets, widgetSizes, timeRange, team, description: desc }) : setStep(s => s + 1)} disabled={!canContinue} style={{ padding: '8px 22px', borderRadius: 9, cursor: canContinue ? 'pointer' : 'not-allowed', background: step === steps.length - 1 ? '#00C853' : 'var(--grad)', border: 'none', color: '#fff', fontSize: 13.5, fontWeight: 600, opacity: canContinue ? 1 : 0.4 }}>{step === steps.length - 1 ? 'Preview Layout' : 'Continue'}</button>
        </div>
      </div>

      <PreviewPanel template={selectedTemplate} widgets={widgets} widgetSizes={widgetSizes} name={name} />
    </div>
  );
};
