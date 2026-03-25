import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';

const LineAdsEditor = lazy(() => import('@/nodes/Editors/source/LineAdsEditor'));

export const lineAdsSourceSpec: NodeSpec = {
  typeId: 'source.line-ads',
  displayName: 'LINE Ads',
  category: 'SOURCE',
  icon: 'MessageCircle',
  color: '#00B900',
  ports: [{ id: 'out', name: 'Output', io: 'output', dataType: 'records' }],
  defaults: {
    connection_id: '',
    ad_account_id: [] as string[],
    fields: [] as string[],
    time_config: { time_preset: 'last_7_days' } as { time_preset: string },
  },
  paramsSchema: z.object({
    connection_id: z.string().optional(),
    ad_account_id: z.array(z.string()).default([]),
    fields: z.array(z.string()).default([]),
    time_config: z
      .object({
        time_preset: z.string().default('last_7_days'),
      })
      .optional(),
  }),
  ui: { editor: LineAdsEditor },
  adapters: {
    toBackend: (p) => ({
      node_id: 'line_ads',
      node_type: 'source',
      parameters: {
        connection_id: (p['connection_id'] as string) || '',
        ad_account_id: Array.isArray(p['ad_account_id']) ? (p['ad_account_id'] as string[]) : [],
        fields: Array.isArray(p['fields']) ? (p['fields'] as string[]) : [],
        time_config: (p['time_config'] as { time_preset: string }) ?? {
          time_preset: 'last_7_days',
        },
      },
    }),
    fromBackend: (_nodeId, _nodeType, parameters) => ({
      typeId: 'source.line-ads',
      params: {
        connection_id: (parameters['connection_id'] as string) || '',
        ad_account_id: Array.isArray(parameters['ad_account_id']) ? (parameters['ad_account_id'] as string[]) : [],
        fields: Array.isArray(parameters['fields']) ? (parameters['fields'] as string[]) : [],
        time_config: (parameters['time_config'] as { time_preset: string }) ?? {
          time_preset: 'last_7_days',
        },
      },
    }),
  },
};
