export const seededRand = (seed: number): () => number => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
};

export const makeTimeSeries = (
  n: number,
  base: number,
  variance: number,
  trend = 0,
  seed = 42,
): number[] => {
  const r = seededRand(seed);
  return Array.from({ length: n }, (_, i) =>
    Math.max(0, base + trend * i + (r() - 0.5) * variance * 2),
  );
};


export function makeHeatmapWidgetData(
  rowLabels: string[] = ['Platform', 'Backend', 'Frontend', 'Mobile', 'Data'],
  colLabels: string[] = Array.from({ length: 16 }, (_, i) => `W${i + 1}`),
  seed = 77,
): { xLabels: string[]; yLabels: string[]; cells: { x: string; y: string; value: number; status: 'ok' | 'warning' | 'neutral' | 'error' }[] } {
  const r = seededRand(seed);
  const cells = rowLabels.flatMap((row) =>
    colLabels.map((col) => {
      const raw = r();
      const value = raw < 0.3 ? 0 : raw < 0.6 ? Math.floor(r() * 2) + 1 : raw < 0.88 ? Math.floor(r() * 2) + 3 : 5;
      const status: 'ok' | 'warning' | 'neutral' | 'error' =
        value >= 4 ? 'ok' : value >= 2 ? 'warning' : value >= 1 ? 'neutral' : 'error';
      return { x: col, y: row, value, status };
    }),
  );
  return { xLabels: colLabels, yLabels: rowLabels, cells };
}
