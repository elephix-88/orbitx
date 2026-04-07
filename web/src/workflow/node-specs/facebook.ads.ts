import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';
import { generateAdsDisplayName } from './utils/displayName';

const FacebookAdsEditor = lazy(() => import('@/nodes/Editors/source/FacebookAdsEditor'));

export const facebookAdsSpec: NodeSpec = {
  typeId: 'facebook.ads',
  displayName: 'Facebook Ads',
  category: 'SOURCE',
  icon: 'Facebook',
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
  ui: { editor: FacebookAdsEditor },
  adapters: {
    toBackend: (p) => ({
      node_id: 'facebook_ads',
      node_type: 'source',
      parameters: {
        // Use backend field names directly, with fallbacks for legacy UI fields
        ad_account_id: Array.isArray(p['ad_account_id']) ? p['ad_account_id'] : 
                      (Array.isArray(p['adAccountId']) ? p['adAccountId'] : []),
        connection_id: p['connection_id'] || p['accessToken'] || p['token_id'] || '',
        fields: Array.isArray(p['fields']) ? p['fields'] : 
               (Array.isArray(p['selectedFields']) ? p['selectedFields'] : []),
        time_config: p['time_config'] || { time_preset: 'last_7_days', time_increment: 1 }
      }
    }),
    fromBackend: (_nodeId, _nodeType, parameters) => ({
      typeId: 'facebook.ads',
      params: {
        // Map backend fields directly to frontend state
        ad_account_id: Array.isArray(parameters['ad_account_id']) ? parameters['ad_account_id'] : [],
        connection_id: (parameters['connection_id'] as string) || (parameters['token_id'] as string) || '',
        fields: Array.isArray(parameters['fields']) ? parameters['fields'] : [],
        time_config: parameters['time_config'] || { time_preset: 'last_7_days', time_increment: 1 }
      }
    })
  },
  generateDisplayName: (params) => {
    const fields = params['fields'] as string[] | undefined;
    return generateAdsDisplayName('Facebook Ads', fields || []);
  }
};
