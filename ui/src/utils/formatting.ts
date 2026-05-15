export const formatYAxis = (v: number): string | number =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v);

export const formatMetricValue = (val: number, unit: string): string | number => {
  if (unit === '%') return `${Math.round(val)}%`;
  if (unit === 'pts') return Math.round(val);
  return val.toFixed(1);
};
