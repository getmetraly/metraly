import { getDORA } from '../client';

function valuesFrom(series: { values: unknown[] } | undefined): unknown[] {
  return series?.values ?? [];
}

export async function fetchDeployFrequency(timeRange = '30d', team = 'All teams', repo = 'All repos'): Promise<unknown[]> {
  const res = await getDORA(timeRange, team, repo);
  return valuesFrom(res.deployFrequency.timeSeries);
}

export async function fetchLeadTime(timeRange = '30d'): Promise<unknown[]> {
  const res = await getDORA(timeRange, 'All teams', 'All repos');
  return valuesFrom(res.leadTime.timeSeries);
}

export async function fetchChangeFailureRate(timeRange = '30d'): Promise<unknown[]> {
  const res = await getDORA(timeRange, 'All teams', 'All repos');
  return valuesFrom(res.changeFailureRate.timeSeries);
}

export async function fetchMTTR(timeRange = '30d'): Promise<unknown[]> {
  const res = await getDORA(timeRange, 'All teams', 'All repos');
  return valuesFrom(res.mttr.timeSeries);
}
