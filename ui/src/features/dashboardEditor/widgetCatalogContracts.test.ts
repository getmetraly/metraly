import { describe, expect, it } from 'vitest';
import { TEMPLATE_WIDGETS, WIDGET_LIBRARY } from './catalog';
import { DESCRIPTOR_BY_LIBRARY_ID, WIDGET_DESCRIPTORS } from './widgetDescriptors';

describe('widget catalog contracts', () => {
  it('every catalog item has a descriptor', () => {
    for (const item of WIDGET_LIBRARY) {
      expect(DESCRIPTOR_BY_LIBRARY_ID.has(item.id)).toBe(true);
    }
  });

  it('descriptor defaultConfig.type matches runtimeType', () => {
    for (const descriptor of WIDGET_DESCRIPTORS) {
      expect(descriptor.defaultConfig.type).toBe(descriptor.runtimeType);
    }
  });

  it('template widgets reference valid descriptors', () => {
    for (const templateWidgets of Object.values(TEMPLATE_WIDGETS)) {
      for (const widgetId of templateWidgets) {
        expect(DESCRIPTOR_BY_LIBRARY_ID.has(widgetId)).toBe(true);
      }
    }
  });

  it('covers runtime widgets used by demo and backend registry', () => {
    const required = ['health-gauge', 'compare-bar-chart', 'recent-activity'];
    for (const id of required) {
      expect(DESCRIPTOR_BY_LIBRARY_ID.has(id)).toBe(true);
    }
  });
});
