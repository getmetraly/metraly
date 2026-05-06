import client, { USE_MOCK } from "../client";
import {
  generateDeployFreq,
  generateLeadTime,
  generateCFR,
  generateMTTR,
} from "../mocks/generators";
export const fetchDeployFrequency = async (
  timeRange = "30d",
  team = "All teams",
  repo = "All repos",
) => {
  if (USE_MOCK) return generateDeployFreq(timeRange, team, repo);
  const res = await client.get("/dora/deploy-frequency", {
    params: { timeRange, team, repo },
  });
  return res.data.values;
};
export const fetchLeadTime = async (timeRange) => {
  if (USE_MOCK) return generateLeadTime(timeRange);
  const res = await client.get("/dora/lead-time", { params: { timeRange } });
  return res.data.values;
};
export const fetchChangeFailureRate = async (timeRange) => {
  if (USE_MOCK) return generateCFR(timeRange);
  const res = await client.get("/dora/cfr", { params: { timeRange } });
  return res.data.values;
};
export const fetchMTTR = async (timeRange) => {
  if (USE_MOCK) return generateMTTR(timeRange);
  const res = await client.get("/dora/mttr", { params: { timeRange } });
  return res.data.values;
};
