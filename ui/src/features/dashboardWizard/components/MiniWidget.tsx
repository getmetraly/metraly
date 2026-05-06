// src/features/dashboardWizard/components/MiniWidget.tsx
import React from 'react';
import { Icon } from '../../../components/shared/Icon';
import { WizardWidget } from '../store/wizardStore';

interface MiniWidgetProps {
  widget: WizardWidget;
  onRemove: (instanceId: string) => void;
}

export const MiniWidget: React.FC<MiniWidgetProps> = ({ widget, onRemove }) => {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
      borderRadius: 9, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 9,
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7, background: `${widget.color}18`,
        border: `1px solid ${widget.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={widget.icon} size={13} color={widget.color} />
      </div>
      <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{widget.label}</div>
      <button onClick={(e) => { e.stopPropagation(); onRemove(widget.instanceId); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
        <Icon name="x" size={13} />
      </button>
    </div>
  );
};
