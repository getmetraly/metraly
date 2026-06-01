import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { widgetRegistry } from './widgetRegistry';
import type { WidgetConfig } from '../../types/widgets';
import type { HeatmapWidgetData } from '../../types/widgets';
import { makeHeatmapWidgetData } from '../../utils/seeds';

const HeatmapWidget = widgetRegistry['heatmap'];

const heatmapConfig: WidgetConfig = {
  type: 'heatmap',
  rowGroupBy: 'team',
};

describe('HeatmapWidget', () => {
  it('shows LoadingWidget when data is undefined', () => {
    render(<HeatmapWidget config={heatmapConfig} data={undefined} />);
    // LoadingWidget renders a MetralyStateBlock with aria-busy="true" and a skeleton (role="status")
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows EmptyWidget when data has no cells', () => {
    const empty: HeatmapWidgetData = { xLabels: [], yLabels: [], cells: [] };
    render(<HeatmapWidget config={heatmapConfig} data={empty} />);
    expect(screen.getByText(/no heatmap data/i)).toBeInTheDocument();
  });

  it('renders from data prop without randomization', () => {
    const data: HeatmapWidgetData = {
      title: 'Test Heatmap',
      xLabels: ['W1', 'W2'],
      yLabels: ['Frontend', 'Backend'],
      cells: [
        { x: 'W1', y: 'Frontend', value: 3, status: 'warning' },
        { x: 'W2', y: 'Frontend', value: 5, status: 'ok' },
        { x: 'W1', y: 'Backend', value: 0, status: 'error' },
        { x: 'W2', y: 'Backend', value: 4, status: 'ok' },
      ],
    };
    const { container: c1 } = render(<HeatmapWidget config={heatmapConfig} data={data} />);
    const { container: c2 } = render(<HeatmapWidget config={heatmapConfig} data={data} />);
    // Same input → same cell values; IDs differ between renders (auto-increment) but data does not
    const cells1 = c1.querySelectorAll('[data-value]');
    const cells2 = c2.querySelectorAll('[data-value]');
    expect(cells1.length).toBe(cells2.length);
    Array.from(cells1).forEach((cell, i) => {
      expect(cell.getAttribute('data-value')).toBe(cells2[i].getAttribute('data-value'));
      expect(cell.getAttribute('data-status')).toBe(cells2[i].getAttribute('data-status'));
    });
  });

  it('does not call Math.random during render', () => {
    const spy = vi.spyOn(Math, 'random');
    const data = makeHeatmapWidgetData();
    render(<HeatmapWidget config={heatmapConfig} data={data} />);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('makeHeatmapWidgetData', () => {
  it('returns deterministic data on repeated calls', () => {
    const a = makeHeatmapWidgetData();
    const b = makeHeatmapWidgetData();
    expect(a.cells.map((c) => c.value)).toEqual(b.cells.map((c) => c.value));
  });

  it('produces cells with status derived from value', () => {
    const { cells } = makeHeatmapWidgetData();
    for (const cell of cells) {
      if (cell.value >= 4) expect(cell.status).toBe('ok');
      else if (cell.value >= 2) expect(cell.status).toBe('warning');
      else if (cell.value >= 1) expect(cell.status).toBe('neutral');
      else expect(cell.status).toBe('error');
    }
  });

  it('produces correct xLabels and yLabels counts by default', () => {
    const data = makeHeatmapWidgetData();
    expect(data.xLabels).toHaveLength(16);
    expect(data.yLabels).toHaveLength(5);
    expect(data.cells).toHaveLength(16 * 5);
  });
});
