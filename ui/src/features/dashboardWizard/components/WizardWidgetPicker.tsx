// src/features/dashboardWizard/components/WizardWidgetPicker.tsx
import React from 'react';
import { WIDGET_LIBRARY, WizardWidget } from '../store/wizardStore';
import { Icon } from '../../../components/shared/Icon';

interface WizardWidgetPickerProps {
  selectedWidgets: WizardWidget[];
  onToggleWidget: (widgetId: string) => void;
  onToggleSize: (instanceId: string) => void;
  onMoveWidget: (fromIndex: number, toIndex: number) => void;
  widgetSizes: Record<string, string>;
}

const CATS = ['All', 'DORA', 'CI/CD', 'PR', 'Sprint', 'Team', 'AI'];

const getCatColor = (cat: string): string => {
  const colors: Record<string, string> = { DORA: '#00E5FF', 'CI/CD': '#00C853', PR: '#B44CFF', Sprint: '#FF9100', Team: '#00E5FF', AI: '#B44CFF' };
  return colors[cat] || '#00E5FF';
};

export const WizardWidgetPicker: React.FC<WizardWidgetPickerProps> = ({
  selectedWidgets,
  onToggleWidget,
  onToggleSize,
  onMoveWidget,
  widgetSizes,
}) => {
  const [widgetCat, setWidgetCat] = React.useState<string>('All');

  const filteredWidgets = widgetCat === 'All'
    ? WIDGET_LIBRARY
    : WIDGET_LIBRARY.filter(w => w.cat === widgetCat);

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Customize widgets</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Add or remove widgets. Selected: {selectedWidgets.length}</div>
      
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
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {filteredWidgets.map(w => {
          const sel = selectedWidgets.some(x => x.id === w.id);
          const c = getCatColor(w.cat);
          return (
            <div key={w.id} onClick={() => onToggleWidget(w.id)} style={{
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
  );
};