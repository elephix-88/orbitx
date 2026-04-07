import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';

const UnifyEditor = lazy(() => import('@/nodes/Editors/transform/UnifyEditor'));

const platformSchema = z.enum(['facebook_ads', 'google_ads', 'tiktok_ads']);

export type UnifyPlatform = z.infer<typeof platformSchema>;

export const unifyTransformSpec: NodeSpec = {
  typeId: 'transform.unify',
  displayName: 'Unify Schema',
  category: 'TRANSFORM',
  icon: 'Layers',
  color: '#8B5CF6',
  ports: [
    { id: 'in', name: 'Input', io: 'input', dataType: 'records' },
    { id: 'out', name: 'Output', io: 'output', dataType: 'records' },
  ],
  defaults: { platform: '', include_calculated_metrics: true },
  paramsSchema: z.object({
    platform: platformSchema,
    include_calculated_metrics: z.boolean().default(true),
  }),
  ui: { editor: UnifyEditor },
  adapters: {
    toBackend: (p) => {
      const params = p as { platform?: string; include_calculated_metrics?: boolean };
      return {
        node_id: 'unify',
        node_type: 'transform',
        parameters: {
          platform: params.platform || '',
          include_calculated_metrics: params.include_calculated_metrics ?? true,
        },
      };
    },
    fromBackend: (_nodeId, _nodeType, parameters) => {
      const params = parameters as { platform?: string; include_calculated_metrics?: boolean };
      return {
        typeId: 'transform.unify',
        params: {
          platform: params.platform || '',
          include_calculated_metrics: params.include_calculated_metrics ?? true,
        },
      };
    },
  },
};
