import React from 'react';
import type { Dashboard } from '../../types/dashboard';
import { widgetRegistry } from './widgetRegistry';
import type { WidgetConfig } from '../../types/widgets';
import type { MetricTimeSeries } from '../../types/metrics';

interface DashboardRendererProps {
  dashboard: Dashboard;
  widgetData?: Record<string, MetricTimeSeries>;
}

export const DashboardRenderer: React.FC<DashboardRendererProps> = ({ dashboard, widgetData = {} }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridAutoRows: 'min-content', gridAutoFlow: 'dense', gap: '16px' }}>
      {dashboard.widgets.map((widget) => {
        if (widget.widgetType === 'empty') return null;

        const scopedInstanceId = `${dashboard.id}-${widget.instanceId}`;
        const WidgetComponent = widgetRegistry[widget.widgetType];
        const layoutItem = dashboard.layout.find((l) => l.i === widget.instanceId);
        const w = layoutItem?.w || 6;
        const h = Math.max(layoutItem?.h || 2, 2);

        if (!WidgetComponent) {
          return (
            <div key={scopedInstanceId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 12 }}>
              Unknown widget: {widget.widgetType}
            </div>
          );
        }

        return (
          <div
            key={scopedInstanceId}
            style={{
              gridColumn: `span ${w}`,
              gridRow: `span ${h}`,
              overflow: 'hidden',
            }}
          >
            <WidgetComponent config={widget.config} data={widgetData[scopedInstanceId]} />
          </div>
        );
      })}
    </div>
  );
};