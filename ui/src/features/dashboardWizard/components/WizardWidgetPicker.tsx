// src/features/dashboardWizard/components/WizardWidgetPicker.tsx
import React from 'react';
import { WIDGET_LIBRARY, WizardWidget } from '../store/wizardStore';
import { WidgetPickerCard, WidgetPickerList, MetralySegmentedControl } from '../../../design-system';

interface WizardWidgetPickerProps {
  selectedWidgets: WizardWidget[];
  onToggleWidget: (widgetId: string) => void;
  onToggleSize: (instanceId: string) => void;
  onMoveWidget: (fromIndex: number, toIndex: number) => void;
  widgetSizes: Record<string, string>;
}

const CATS = ['All', 'DORA', 'CI/CD', 'PR', 'Sprint', 'Team', 'AI'];

export const WizardWidgetPicker: React.FC<WizardWidgetPickerProps> = ({
  selectedWidgets,
  onToggleWidget,
}) => {
  const [widgetCat, setWidgetCat] = React.useState<string>('All');

  const filteredWidgets = widgetCat === 'All'
    ? WIDGET_LIBRARY
    : WIDGET_LIBRARY.filter(w => w.cat === widgetCat);

  return (
    <div>
      <div style={{ fontFamily: 'var(--m-font-display)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Customize widgets</div>
      <div style={{ fontSize: 13, color: 'var(--m-fg-2)', marginBottom: 14 }}>Add or remove widgets. Selected: {selectedWidgets.length}</div>

      <div style={{ marginBottom: 14 }}>
        <MetralySegmentedControl
          options={CATS.map(c => ({ value: c, label: c }))}
          value={widgetCat}
          onChange={setWidgetCat}
          size="sm"
          ariaLabel="Widget category"
        />
      </div>

      <WidgetPickerList ariaLabel="Widget catalog" style={{ flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {filteredWidgets.map(w => {
          const sel = selectedWidgets.some(x => x.id === w.id);
          return (
            <WidgetPickerCard
              key={w.id}
              title={w.label}
              description={w.desc}
              selected={sel}
              iconLabel={w.icon}
              onSelect={() => onToggleWidget(w.id)}
            />
          );
        })}
      </WidgetPickerList>
    </div>
  );
};
