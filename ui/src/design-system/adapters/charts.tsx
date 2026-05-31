import React, { createElement } from 'react';
import {
  MetralyGauge as BaseMetralyGauge,
  MetralyHeatmap as BaseMetralyHeatmap,
} from '@metraly/ui';

type MetralyGaugeProps = Record<string, unknown>;
type MetralyHeatmapProps = Record<string, unknown>;

export function MetralyGauge(props: MetralyGaugeProps) {
  return createElement(BaseMetralyGauge as unknown as React.ElementType, props);
}

export function MetralyHeatmap(props: MetralyHeatmapProps) {
  return createElement(BaseMetralyHeatmap as unknown as React.ElementType, props);
}
