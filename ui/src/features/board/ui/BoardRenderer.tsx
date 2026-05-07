import React from 'react';
import type { Dashboard, WidgetLayout } from '../../api/types/api';
import { WidgetRegistry } from './WidgetRegistry';

interface BoardRendererProps {
  board: Dashboard;
  /**
   * Whether the board is editable.  If true, drag‑and‑drop handles will be
   * rendered.  The logic for drag‑and‑drop should be implemented in a
   * higher‑order component (not included here).
   */
  editable?: boolean;
}

/**
 * Renders a board by iterating over its layout and instantiating the
 * corresponding widget component for each widget.  This component is
 * deliberately simple and leaves layout management (grid, drag‑and‑drop) to
 * higher‑level components or CSS frameworks.
 */
export const BoardRenderer: React.FC<BoardRendererProps> = ({ board }) => {
  return (
    <div className="board-grid">
      {board.layout.map((item: WidgetLayout) => {
        const widget = board.widgets.find((w) => w.instanceId === item.widgetId);
        if (!widget) return null;
        const WidgetComponent = WidgetRegistry[widget.widgetType as any];
        if (!WidgetComponent) {
          return (
            <div key={item.widgetId} className="widget-unknown">
              Unknown widget type: {widget.widgetType}
            </div>
          );
        }
        return (
          <div
            key={item.widgetId}
            className="widget"
            style={{ gridArea: `${item.y} / ${item.x} / span ${item.h} / span ${item.w}` }}
          >
            <WidgetComponent {...(widget.config as any)} />
          </div>
        );
      })}
    </div>
  );
};