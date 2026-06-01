import { getInitialDashboardId } from './useDashboards';

describe('useDashboards cache schema', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('ignores cache entries from older schema versions', () => {
    localStorage.setItem('metraly.dashboards.v1', JSON.stringify({
      schemaVersion: 1,
      fetchedAt: new Date().toISOString(),
      dashboards: [{ id: 'old-id', name: 'Old Demo' }],
    }));
    expect(getInitialDashboardId()).toBeNull();
  });

  it('reads cache entries from current schema version', () => {
    localStorage.setItem('metraly.dashboards.v1', JSON.stringify({
      schemaVersion: 3,
      fetchedAt: new Date().toISOString(),
      bootstrap: { selectedDashboardId: 'sandbox-all-widgets', dashboards: [{ id: 'sandbox-all-widgets', name: 'Demo' }] },
    }));
    expect(getInitialDashboardId()).toBe('sandbox-all-widgets');
  });
});
