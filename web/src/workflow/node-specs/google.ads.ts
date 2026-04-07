import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';
import { generateAdsDisplayName } from './utils/displayName';

const GoogleAdsEditor = lazy(() => import('@/nodes/Editors/source/GoogleAdsEditor'));

export const googleAdsSourceSpec: NodeSpec = {
  typeId: 'google.ads',
  displayName: 'Google Ads',
  category: 'SOURCE',
  icon: 'GoogleAds',
  color: '#3B82F6',
  ports: [{ id: 'out', name: 'Output', io: 'output', dataType: 'records' }],
  // Align with workflow.json structure: connection_id, ad_account_id[], fields[], time_config
  defaults: {
    accessToken: '',
    adAccountIds: [] as string[],
    fields: [] as string[],
    time_config: { time_preset: 'last_7_days', time_increment: 1 } as { time_preset: string; time_increment: number },
  },
  paramsSchema: z.object({
    accessToken: z.string().optional(),
    adAccountIds: z.array(z.string()).default([]),
    fields: z.array(z.string()).default([]),
    time_config: z
      .object({
        time_preset: z.string().default('last_7_days'),
        time_increment: z.number().default(1),
      })
      .optional(),
  }),
  ui: { editor: GoogleAdsEditor },
  adapters: {
    toBackend: (p) => ({
      node_id: 'google_ads',
      node_type: 'source',
      parameters: {
        // Prefer UI accessToken; fallback to existing backend connection_id or legacy token_id
        connection_id: (p['accessToken'] as string) || (p as any)['connection_id'] || (p as any)['token_id'] || '',
        // Map UI adAccountIds (preferred) or legacy customerIds -> backend ad_account_id[]
        ad_account_id: ((): string[] => {
          if (Array.isArray(p['adAccountIds'])) return p['adAccountIds'] as string[];
          if (Array.isArray((p as any)['ad_account_id'])) return (p as any)['ad_account_id'] as string[];
          if (Array.isArray((p as any)['customerIds'])) return (p as any)['customerIds'] as string[];
          return [];
        })(),
        // Optional fields list
        fields: Array.isArray(p['fields']) ? (p['fields'] as string[]) : [],
        // Provide time_config with sensible defaults
        ...(p['time_config']
          ? { time_config: p['time_config'] as { time_preset: string; time_increment: number } }
          : (typeof (p as any)['time_config'] === 'object' && (p as any)['time_config']
            ? { time_config: (p as any)['time_config'] as { time_preset: string; time_increment: number } }
            : { time_config: { time_preset: 'last_7_days', time_increment: 1 } })),
      }
    }),
    fromBackend: (_nodeId, _nodeType, parameters) => ({
      typeId: 'google.ads',
      params: {
        accessToken: (parameters['connection_id'] as string) || (parameters['token_id'] as string) || '',
        // Prefer modern ad_account_id, fallback to legacy customer_ids if present
        adAccountIds: Array.isArray(parameters['ad_account_id'])
          ? ((parameters['ad_account_id'] as string[]) || [])
          : (Array.isArray((parameters as any)['customer_ids']) ? ((parameters as any)['customer_ids'] as string[]) : []),
        fields: Array.isArray((parameters as any)['fields']) ? ((parameters as any)['fields'] as string[]) : [],
        time_config: (parameters as any)['time_config'] as { time_preset: string; time_increment: number } | undefined,
      }
    })
  },
  generateDisplayName: (params) => {
    const fields = params['fields'] as string[] | undefined;
    return generateAdsDisplayName('Google Ads', fields || []);
  }
};


