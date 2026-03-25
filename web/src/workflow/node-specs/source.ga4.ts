import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';

const GA4Editor = lazy(() => import('@/nodes/Editors/source/GA4Editor'));

export const ga4SourceSpec: NodeSpec = {
  typeId: 'source.ga4',
  displayName: 'Google Analytics',
  category: 'SOURCE',
  icon: 'BarChart3',
  color: '#F59E0B',
  ports: [{ id: 'out', name: 'Output', io: 'output', dataType: 'records' }],
  defaults: {
    connection_id: '',
    property_id: '',
    dimensions: [] as string[],
    metrics: [] as string[],
    time_config: { time_preset: 'last_7_days', time_increment: 1 } as {
      time_preset: string;
      time_increment: number;
    },
  },
  paramsSchema: z.object({
    connection_id: z.string().optional(),
    property_id: z.string().optional(),
    dimensions: z.array(z.string()).default([]),
    metrics: z.array(z.string()).default([]),
    time_config: z
      .object({
        time_preset: z.string().default('last_7_days'),
        time_increment: z.number().default(1),
      })
      .optional(),
  }),
  ui: { editor: GA4Editor },
  adapters: {
    toBackend: (p) => ({
      node_id: 'ga4',
      node_type: 'source',
      parameters: {
        connection_id: (p['connection_id'] as string) || '',
        property_id: (p['property_id'] as string) || '',
        dimensions: Array.isArray(p['dimensions']) ? (p['dimensions'] as string[]) : [],
        metrics: Array.isArray(p['metrics']) ? (p['metrics'] as string[]) : [],
        time_config: (p['time_config'] as { time_preset: string; time_increment: number }) ?? {
          time_preset: 'last_7_days',
          time_increment: 1,
        },
      },
    }),
    fromBackend: (_nodeId, _nodeType, parameters) => ({
      typeId: 'source.ga4',
      params: {
        connection_id: (parameters['connection_id'] as string) || '',
        property_id: (parameters['property_id'] as string) || '',
        dimensions: Array.isArray(parameters['dimensions'])
          ? (parameters['dimensions'] as string[])
          : [],
        metrics: Array.isArray(parameters['metrics'])
          ? (parameters['metrics'] as string[])
          : [],
        time_config: (parameters['time_config'] as {
          time_preset: string;
          time_increment: number;
        }) ?? { time_preset: 'last_7_days', time_increment: 1 },
      },
    }),
  },
};
