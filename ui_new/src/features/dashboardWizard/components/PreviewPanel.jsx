// src/features/dashboardWizard/components/PreviewPanel.jsx
import React from 'react';
import { Icon } from '../../../components/shared/Icon';
import { Heatmap, Sparkline } from '../../../components/charts';
import { Leaderboard } from '../../../components/ui/Leaderboard';
import { makeTimeSeries, makeHeatData } from '../../../utils/seeds';

const sparkA = makeTimeSeries(12, 4, 1.2, 0.05, 1);
const sparkB = makeTimeSeries(12, 88, 5, 0.2, 2);
const sparkC = makeTimeSeries(12, 22, 6, -0.3, 3);
const heatData = makeHeatData(3, 16, 0.4, 33);

export const PreviewPanel = ({ template, widgets, widgetSizes = {}, name }) => {
  const hasWidget = (id) => widgets.includes(id);
  const widgetCount = widgets.length;

  return (
    <div style={{ flex: 1, background: 'rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '12px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(11,15,25,0.6)',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)' }} />
        <span style={{ fontSize: 12.5, fontFamily: 'var(--font-head)', fontWeight: 600, color: 'var(--text)' }}>
          {name || 'Synthetic Dashboard'} — Preview
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
          {widgetCount} preview widget{widgetCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {widgetCount === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.5 }}>
            <Icon name="layers" size={32} color="var(--muted)" />
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Add synthetic widgets to see a preview</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {hasWidget('dora-overview') && (
              <div style={{ gridColumn: widgetSizes['dora-overview'] !== 'sm' ? 'span 2' : 'span 1', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Synthetic DORA Overview</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[['4.2/day','Deploy Freq','#00E5FF'],['38h','Lead Time','#B44CFF'],['3.2%','CFR','#FF9100'],['18 min','MTTR','#00C853']].map(([v,l,c],i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '8px 0' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>{v}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{l}</div>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, margin: '6px auto 0' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {widgets.filter(id => ['deploy-freq','ci-pass-rate','lead-time','mttr-trend','velocity','burndown'].includes(id)).map(id => {
              const cfgs = {
                'deploy-freq':  { icon:'zap',       color:'#00E5FF', label:'Synthetic Deploy Frequency', val:'4.2', unit:'/day', spark: sparkA },
                'ci-pass-rate': { icon:'activity',  color:'#00C853', label:'Synthetic CI Pass Rate',     val:'92',  unit:'%',   spark: sparkB },
                'lead-time':    { icon:'clock',     color:'#B44CFF', label:'Synthetic Lead Time',        val:'22',  unit:'hrs', spark: sparkC },
                'mttr-trend':   { icon:'activity',  color:'#FF9100', label:'Synthetic MTTR',             val:'18',  unit:'min', spark: makeTimeSeries(12,28,8,-0.8,55) },
                'velocity':     { icon:'trendingUp',color:'#00E5FF', label:'Synthetic Sprint Velocity',  val:'76',  unit:'pts', spark: makeTimeSeries(12,70,8,0.4,77) },
                'burndown':     { icon:'chart',     color:'#B44CFF', label:'Synthetic Remaining Work',   val:'8',   unit:'pts', spark: makeTimeSeries(12,50,5,-4,88) },
              };
              const cfg = cfgs[id];
              if (!cfg) return null;
              const isLg = widgetSizes[id] === 'lg';
              return (
                <div key={id} style={{ gridColumn: isLg ? 'span 2' : 'span 1', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <Icon name={cfg.icon} size={13} color={cfg.color} />
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{cfg.label}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--text)' }}>
                    {cfg.val}<span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>{cfg.unit}</span>
                  </div>
                  <Sparkline data={cfg.spark} color={cfg.color} height={24} />
                </div>
              );
            })}

            {hasWidget('team-heatmap') && (
              <div style={{ gridColumn: widgetSizes['team-heatmap'] !== 'sm' ? 'span 2' : 'span 1', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Synthetic Team Activity Heatmap</div>
                <Heatmap data={heatData} rows={3} cols={16} labelRows={['Platform sample','Backend sample','Mobile sample']} color="var(--cyan)" cellSize={14} gap={3} />
              </div>
            )}

            {hasWidget('leaderboard') && (
              <div style={{ gridColumn: widgetSizes['leaderboard'] !== 'sm' ? 'span 2' : 'span 1', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                <Leaderboard
                  title="Synthetic Contributors"
                  items={[
                    { name: 'Demo User A', value: 42 },
                    { name: 'Demo User B', value: 37 },
                    { name: 'Demo User C', value: 29 },
                    { name: 'Demo User D', value: 24 },
                  ]}
                  unit="pts"
                  color="var(--cyan)"
                />
              </div>
            )}

            {hasWidget('pr-queue') && (
              <div style={{ gridColumn: widgetSizes['pr-queue'] !== 'sm' ? 'span 2' : 'span 1', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Synthetic PR Review Queue</div>
                {[ ['sample/checkout-flow','demo.user.a','3h'], ['sample/rate-limit','demo.user.b','8h'], ['sample/api-layer','demo.user.c','19h'] ].map(([pr,a,age],i) => (
                  <div key={i} style={{ display:'flex', gap:10, fontSize:11.5, padding:'5px 0', borderBottom:'1px solid var(--border)', color:'var(--muted2)' }}>
                    <span style={{ flex:1, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pr}</span>
                    <span style={{ fontFamily:'var(--font-mono)' }}>{a}</span>
                    <span style={{ fontFamily:'var(--font-mono)', color: parseInt(age)>12?'#FF9100':'var(--muted)' }}>{age}</span>
                  </div>
                ))}
              </div>
            )}

            {hasWidget('failing-builds') && (
              <div style={{ gridColumn: widgetSizes['failing-builds'] !== 'sm' ? 'span 2' : 'span 1', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Synthetic Build Failures</div>
                {[ ['sample-integration-tests','demo-api','2h'], ['sample-container-build','demo-monorepo','5h'], ['sample-e2e-suite','demo-frontend','9h'] ].map(([wf,repo,ago],i) => (
                  <div key={i} style={{ display:'flex', gap:10, fontSize:11.5, padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'#FF1744', flexShrink:0, marginTop:4 }}/>
                    <span style={{ flex:1, color:'var(--text)' }}>{wf}</span>
                    <span style={{ color:'var(--muted)', fontFamily:'var(--font-mono)' }}>{repo}</span>
                    <span style={{ color:'var(--muted)', opacity:0.6 }}>{ago}</span>
                  </div>
                ))}
              </div>
            )}

            {hasWidget('ai-summary') && (
              <div style={{ gridColumn: widgetSizes['ai-summary'] !== 'sm' ? 'span 2' : 'span 1', background: 'rgba(180,76,255,0.06)', border: '1px solid rgba(180,76,255,0.2)', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10 }}>
                <Icon name="sparkles" size={14} color="var(--purple)" />
                <div style={{ fontSize: 12, color: 'var(--muted2)', lineHeight: 1.5 }}>
                  Scripted AI summary preview based on synthetic widget selections. No live AI inference is performed.
                </div>
              </div>
            )}

            {hasWidget('anomaly') && (
              <div style={{ gridColumn: widgetSizes['anomaly'] !== 'sm' ? 'span 2' : 'span 1', background: 'rgba(255,145,0,0.06)', border: '1px solid rgba(255,145,0,0.2)', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10 }}>
                <Icon name="brain" size={14} color="#FF9100" />
                <div style={{ fontSize: 12, color: 'var(--muted2)', lineHeight: 1.5 }}>
                  Synthetic anomaly preview using scripted metric-change examples. Not live ML detection.
                </div>
              </div>
            )}

            {hasWidget('blocked-tasks') && (
              <div style={{ gridColumn: widgetSizes['blocked-tasks'] !== 'sm' ? 'span 2' : 'span 1', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Synthetic Blocked Tasks</div>
                {[ ['Sample auth migration','Backend sample','High'], ['Sample mobile release','Mobile sample','Critical'], ['Sample data pipeline','Data sample','Med'] ].map(([t,team,pri],i) => (
                  <div key={i} style={{ display:'flex', gap:8, fontSize:11.5, padding:'5px 0', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background: pri==='Critical'?'#FF1744': pri==='High'?'#FF9100':'#6B7A9A', flexShrink:0 }}/>
                    <span style={{ flex:1, color:'var(--text)' }}>{t}</span>
                    <span style={{ color:'var(--muted)', fontSize:10.5 }}>{team}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};