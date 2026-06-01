import { describe, expect, it } from 'vitest';
import { WIDGET_DESCRIPTORS } from '../../features/dashboardEditor/widgetDescriptors';
import { sampleWidgetData } from './previewData';

describe('preview data contracts', () => {
  it('stat-card includes value and currentValue', () => {
    const data = sampleWidgetData('stat-card') as Record<string, unknown>;
    expect(data.value).toBeTruthy();
    expect(data.currentValue).toBeTruthy();
  });

  it('metric-chart includes labels and current values', () => {
    const data = sampleWidgetData('metric-chart') as Record<string, any>;
    expect(data.labels.length).toBeGreaterThan(0);
    expect(data.current.values.length).toBeGreaterThan(0);
  });

  it('compare-bar-chart includes labels primary and secondary', () => {
    const data = sampleWidgetData('compare-bar-chart') as Record<string, any>;
    expect(data.labels.length).toBeGreaterThan(0);
    expect(data.primary.values.length).toBeGreaterThan(0);
    expect(data.secondary.values.length).toBeGreaterThan(0);
  });

  it('recent-activity includes actor title description', () => {
    const data = sampleWidgetData('recent-activity') as Record<string, any>;
    expect(data.activities[0].actor).toBeTruthy();
    expect(data.activities[0].title).toBeTruthy();
    expect(data.activities[0].description).toBeTruthy();
  });
  it('has preview sample for every descriptor runtime type', () => {
    for (const descriptor of WIDGET_DESCRIPTORS) {
      const data = sampleWidgetData(descriptor.runtimeType);
      expect(data).not.toBeUndefined();
      if (descriptor.runtimeType !== 'section-header') {
        expect(JSON.stringify(data)).not.toBe('{}');
      }
    }
  });
});