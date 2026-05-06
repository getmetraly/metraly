import {
  generateDeployFreq,
  generateLeadTime,
  generateCFR,
  generateMTTR,
} from '../mocks/generators';

// Synthetic demo-only data providers.
// No backend/API client is used in the public preview bundle.

export const fetchDeployFrequency = async (
  timeRange = '30d',
  team = 'All teams',
  repo = 'All repos',
) => {
  return generateDeployFreq(timeRange, team, repo);
};

export const fetchLeadTime = async (timeRange = '30d') => {
  return generateLeadTime(timeRange);
};

export const fetchChangeFailureRate = async (timeRange = '30d') => {
  return generateCFR(timeRange);
};

export const fetchMTTR = async (timeRange = '30d') => {
  return generateMTTR(timeRange);
};
