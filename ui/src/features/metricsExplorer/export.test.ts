import { describe, expect, it } from 'vitest';
import { buildMetricCsv } from './export';

describe('buildMetricCsv', () => {
  it('serializes metric data and metadata to csv', () => {
    const csv = buildMetricCsv({
      metricId: 'deploy-freq',
      timeRange: '30d',
      team: 'All teams',
      repo: 'All repos',
      values: [1.2, 2.4],
    });

    expect(csv).toContain('metricId,deploy-freq');
    expect(csv).toContain('timeRange,30d');
    expect(csv).toContain('point,value');
    expect(csv).toContain('1,1.2');
    expect(csv).toContain('2,2.4');
  });
});
