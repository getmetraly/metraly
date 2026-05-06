import { getDORA } from '../client';

function valuesFrom(series) {
  return (series === null || series === void 0 ? void 0 : series.values) ?? [];
}

export async function fetchDeployFrequency(timeRange = '30d', team = 'All teams', repo = 'All repos') {
  const res = await getDORA(timeRange, team, repo);
  return valuesFrom(res.deployFrequency.timeSeries);
}

export async function fetchLeadTime(timeRange = '30d') {
  const res = await getDORA(timeRange, 'All teams', 'All repos');
  return valuesFrom(res.leadTime.timeSeries);
}

export async function fetchChangeFailureRate(timeRange = '30d') {
  const res = await getDORA(timeRange, 'All teams', 'All repos');
  return valuesFrom(res.changeFailureRate.timeSeries);
}

export async function fetchMTTR(timeRange = '30d') {
  const res = await getDORA(timeRange, 'All teams', 'All repos');
  return valuesFrom(res.mttr.timeSeries);
}
