import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';
import { generateAdsDisplayName } from './utils/displayName';

const TikTokAdsEditor = lazy(() => import('@/nodes/Editors/source/TikTokAdsEditor'));

export const tiktokAdsSpec: NodeSpec = {
  typeId: 'tiktok.ads',
  displayName: 'TikTok Ads',
  category: 'SOURCE',
  icon: 'TikTok',
  color: '#3B82F6',
  ports: [{ id: 'out', name: 'Output', io: 'output', dataType: 'records' }],
  defaults: { connection_id: '', ad_account_id: [], fields: [], time_config: { time_preset: 'last_7_days', time_increment: 1 } },
  paramsSchema: z.object({
    connection_id: z.string().optional(),
    ad_account_id: z.array(z.string()).default([]),
    fields: z.array(z.string()).default([]),
    time_config: z.object({
      time_preset: z.string().default('last_7_days'),
      time_increment: z.number().default(1)
    }).optional()
  }),
  ui: { editor: TikTokAdsEditor },
  adapters: {
    toBackend: (p) => ({
      node_id: 'tiktok_ads',
      node_type: 'source',
      parameters: {
        ad_account_id: Array.isArray(p['ad_account_id']) ? p['ad_account_id'] : [],
        connection_id: p['connection_id'] || '',
        fields: Array.isArray(p['fields']) ? p['fields'] : [],
        time_config: (p as any).time_config || { time_preset: 'last_7_days', time_increment: 1 }
      }
    }),
    fromBackend: (_nodeId, _nodeType, parameters) => ({
      typeId: 'tiktok.ads',
      params: {
        ad_account_id: Array.isArray(parameters['ad_account_id']) ? parameters['ad_account_id'] : [],
        connection_id: (parameters['connection_id'] as string) || '',
        fields: Array.isArray(parameters['fields']) ? parameters['fields'] : [],
        time_config: (parameters as any).time_config || { time_preset: 'last_7_days', time_increment: 1 }
      }
    })
  },
  generateDisplayName: (params) => {
    const fields = params['fields'] as string[] | undefined;
    return generateAdsDisplayName('TikTok Ads', fields || []);
  }
};
