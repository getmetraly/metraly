// src/features/dashboardWizard/components/WidgetPalette.tsx
import React from 'react';
import { Icon } from '../../../components/shared/Icon';
import { WIDGET_LIBRARY } from '../store/wizardStore';
import { useWizardStore } from '../store/wizardStore';

const CATS = ['All', 'DORA', 'CI/CD', 'PR', 'Sprint', 'Team', 'AI'];

export const WidgetPalette: React.FC = () => {
  const { widgets, addWidget, removeWidget } = useWizardStore();
  const [widgetCat, setWidgetCat] = React.useState('All');

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    e.dataTransfer.setData('widgetId', widgetId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const catColors: Record<string, string> = { DORA: '#00E5FF', 'CI/CD': '#00C853', PR: '#B44CFF', Sprint: '#FF9100', Team: '#00E5FF', AI: '#B44CFF' };

  const filteredWidgets = widgetCat === 'All' ? WIDGET_LIBRARY : WIDGET_LIBRARY.filter(w => w.cat === widgetCat);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Category filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setWidgetCat(c)} style={{
            padding: '4px 11px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            border: widgetCat === c ? '1px solid rgba(0,229,255,0.4)' : '1px solid var(--border)',
            background: widgetCat === c ? 'rgba(0,229,255,0.1)' : 'transparent',
            color: widgetCat === c ? 'var(--cyan)' : 'var(--muted2)',
          }}>{c}</button>
        ))}
      </div>

      {/* Widget list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filteredWidgets.map(w => {
          const c = catColors[w.cat] || '#00E5FF';
          const sel = widgets.some(widget => widget.id === w.id);
          return (
            <div
              key={w.id}
              draggable
              onDragStart={(e) => handleDragStart(e, w.id)}
              onClick={() => {
                const isSelected = widgets.some(widget => widget.id === w.id);
                if (isSelected) {
                  const widgetToRemove = widgets.find(widget => widget.id === w.id);
                  if (widgetToRemove) removeWidget(widgetToRemove.instanceId);
                } else {
                  addWidget(w.id);
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9,
                cursor: 'pointer', border: sel ? `1px solid ${c}40` : '1px solid var(--border)',
                background: sel ? `${c}0a` : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 7, background: `${c}18`, border: `1px solid ${c}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={w.icon} size={13} color={c} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{w.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{w.desc}</div>
              </div>
              {sel && <Icon name="check" size={16} color={c} />}
              <Icon name="grip-vertical" size={12} color="var(--muted)" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
