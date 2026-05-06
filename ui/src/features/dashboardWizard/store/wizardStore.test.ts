import { describe, it, expect, beforeEach } from 'vitest';
import { useWizardStore } from './wizardStore';

describe('wizardStore', () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
  });

  it('should have initial state', () => {
    const state = useWizardStore.getState();
    expect(state.step).toBe(0);
    expect(state.selectedTemplate).toBeNull();
    expect(state.widgets).toHaveLength(0);
    expect(state.layout).toHaveLength(0);
  });

  it('addWidget adds a new widget and updates layout', () => {
    useWizardStore.getState().addWidget('deploy-freq');
    const state = useWizardStore.getState();
    expect(state.widgets).toHaveLength(1);
    expect(state.widgets[0].id).toBe('deploy-freq');
    expect(state.layout).toHaveLength(1);
    expect(state.layout[0].w).toBe(6);
    expect(state.layout[0].h).toBe(2);
  });

  it('removeWidget removes widget and its layout', () => {
    useWizardStore.getState().addWidget('deploy-freq');
    const instanceId = useWizardStore.getState().widgets[0].instanceId;
    useWizardStore.getState().removeWidget(instanceId);
    const state = useWizardStore.getState();
    expect(state.widgets).toHaveLength(0);
    expect(state.layout).toHaveLength(0);
  });

  it('updateLayout updates the layout array', () => {
    useWizardStore.getState().addWidget('deploy-freq');
    const newLayout = [{ i: useWizardStore.getState().widgets[0].instanceId, x: 6, y: 0, w: 12, h: 2 }];
    useWizardStore.getState().updateLayout(newLayout);
    expect(useWizardStore.getState().layout[0].x).toBe(6);
    expect(useWizardStore.getState().layout[0].w).toBe(12);
  });

  it('toggleWidgetSize toggles between 6 and 12 width', () => {
    useWizardStore.getState().addWidget('deploy-freq');
    const instanceId = useWizardStore.getState().widgets[0].instanceId;
    useWizardStore.getState().toggleWidgetSize(instanceId);
    expect(useWizardStore.getState().layout[0].w).toBe(12);
    useWizardStore.getState().toggleWidgetSize(instanceId);
    expect(useWizardStore.getState().layout[0].w).toBe(6);
  });

  it('setTemplate adds template widgets', () => {
    useWizardStore.getState().setTemplate('cto');
    const state = useWizardStore.getState();
    expect(state.selectedTemplate).toBe('cto');
    expect(state.widgets.length).toBeGreaterThan(0);
    expect(state.name).toContain('CTO');
  });
});
