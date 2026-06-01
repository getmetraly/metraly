import { buildCreateDashboardRequest } from './payload';
import type { DashboardEditorState } from './model';

function makeState(icon: string): DashboardEditorState {
  return {
    selectedTemplate: 'blank',
    widgets: [],
    layout: [],
    widgetSizes: {},
    name: 'Demo 2',
    desc: '',
    timeRange: '30d',
    team: 'All teams',
    icon,
  };
}

describe('buildCreateDashboardRequest icon', () => {
  it('keeps allowed icon names', () => {
    const req = buildCreateDashboardRequest(makeState('sparkles'));
    expect(req.icon).toBe('sparkles');
  });

  it('falls back to default icon for unknown names', () => {
    const req = buildCreateDashboardRequest(makeState('unknown-icon'));
    expect(req.icon).toBe('sparkles');
  });
});
