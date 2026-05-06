export interface MetricExportContext {
  metricId: string;
  timeRange: string;
  team: string;
  repo: string;
  values: number[];
}

export function buildMetricCsv(context: MetricExportContext): string {
  const header = [
    `metricId,${escapeCsv(context.metricId)}`,
    `timeRange,${escapeCsv(context.timeRange)}`,
    `team,${escapeCsv(context.team)}`,
    `repo,${escapeCsv(context.repo)}`,
    '',
    'point,value',
  ];

  const rows = context.values.map((value, index) => `${index + 1},${formatNumber(value)}`);
  return [...header, ...rows].join('\n');
}

export function downloadMetricCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string): string {
  const normalized = String(value ?? '');
  if (/[,"\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }
  return normalized;
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : '';
}
