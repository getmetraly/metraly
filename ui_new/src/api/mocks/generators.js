import { makeTimeSeries } from "../../utils/seeds";
export const generateDeployFreq = (timeRange, team, repo) => {
  const length = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;
  let base = 4.2;
  if (team === "Mobile") base = 1.2;
  if (repo === "api-gateway") base = 6.2;
  return makeTimeSeries(length, base, 1.8, 0.04, 11 + (team?.length || 0));
};
export const generateLeadTime = (timeRange) => {
  const length = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;
  return makeTimeSeries(length, 38, 15, -0.3, 22);
};
export const generateCFR = (timeRange) => {
  const length = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;
  return makeTimeSeries(length, 4.5, 1.8, -0.08, 33);
};
export const generateMTTR = (timeRange) => {
  const length = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;
  return makeTimeSeries(length, 44, 18, -1.2, 44);
};
export const generateCIPassRate = (timeRange) => {
  const length = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;
  return makeTimeSeries(length, 88, 6, 0.2, 55);
};
export const generateVelocity = (timeRange) => {
  const length = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;
  return makeTimeSeries(length, 72, 12, 0.4, 122);
};
