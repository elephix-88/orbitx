import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';

const AnomalyDetectorEditor = lazy(
  () => import('@/nodes/Editors/transform/AnomalyDetectorEditor')
);

// ---------------------------------------------------------------------------
// Zod schema — mirrors AnomalyDetectorConfig from common/common/model/anomaly.py
// ---------------------------------------------------------------------------

export const anomalyDetectorParamsSchema = z.object({
  metrics: z.array(z.string()).default([]),
  group_by: z.string().default(''),
  window_days: z.number().min(3).max(30).default(7),
  threshold_percent: z.number().min(1).max(500).default(30),
  max_alerts_per_day: z.number().min(1).max(100).default(10),
});

export type AnomalyDetectorParams = z.infer<typeof anomalyDetectorParamsSchema>;

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

export const anomalyDetectorSpec: NodeSpec = {
  typeId: 'transform.anomaly-detector',
  displayName: 'Anomaly Detector',
  category: 'TRANSFORM',
  icon: 'ShieldAlert',
  color: '#EF4444',
  ports: [
    { id: 'in', name: 'Input', io: 'input', dataType: 'records' },
    { id: 'out', name: 'Output', io: 'output', dataType: 'records' },
  ],
  defaults: {
    metrics: [],
    group_by: '',
    window_days: 7,
    threshold_percent: 30,
    max_alerts_per_day: 10,
  },
  paramsSchema: anomalyDetectorParamsSchema,
  ui: { editor: AnomalyDetectorEditor },
  adapters: {
    toBackend: (p) => ({
      node_id: 'anomaly_detector',
      node_type: 'transform',
      parameters: {
        metrics: (p['metrics'] as string[]) ?? [],
        group_by: (p['group_by'] as string) ?? '',
        window_days: (p['window_days'] as number) ?? 7,
        threshold_percent: (p['threshold_percent'] as number) ?? 30,
        max_alerts_per_day: (p['max_alerts_per_day'] as number) ?? 10,
      },
    }),
    fromBackend: (_nodeId, _nodeType, parameters) => ({
      typeId: 'transform.anomaly-detector',
      params: {
        metrics: (parameters['metrics'] as string[]) ?? [],
        group_by: (parameters['group_by'] as string) ?? '',
        window_days: (parameters['window_days'] as number) ?? 7,
        threshold_percent: (parameters['threshold_percent'] as number) ?? 30,
        max_alerts_per_day: (parameters['max_alerts_per_day'] as number) ?? 10,
      },
    }),
  },
};
