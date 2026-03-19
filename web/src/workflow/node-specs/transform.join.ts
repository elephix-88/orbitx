import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';

const JoinEditor = lazy(() => import('@/nodes/Editors/transform/JoinEditor'));

// Key pair for multi-key joins: { left: 'date', right: 'report_date' }
const joinKeyPairSchema = z.object({
  left: z.string(),
  right: z.string(),
});

// Source with support for both single-key (legacy) and multi-key joins
const joinSourceSchema = z.object({
  node_id: z.number(),
  key: z.string().optional(), // Legacy single-key
  keys: z.array(joinKeyPairSchema).optional(), // Multi-key support
  join_type: z.enum(['inner', 'left', 'right', 'outer']).default('inner'),
});

export const joinTransformSpec: NodeSpec = {
  typeId: 'transform.join',
  displayName: 'Join Tables',
  category: 'TRANSFORM',
  icon: 'Merge',
  color: '#10B981', // Green for join
  ports: [
    { id: 'in', name: 'Input', io: 'input', dataType: 'records', multiple: true },
    { id: 'out', name: 'Output', io: 'output', dataType: 'records' },
  ],
  defaults: {
    base_node_id: 0,
    base_key: '', // Legacy single-key
    base_keys: [], // Multi-key support
    sources: [],
    suffixes: ['_x', '_y'],
  },
  paramsSchema: z.object({
    base_node_id: z.number(),
    base_key: z.string().optional(), // Legacy single-key
    base_keys: z.array(z.string()).optional(), // Multi-key support
    sources: z.array(joinSourceSchema).default([]),
    suffixes: z.tuple([z.string(), z.string()]).default(['_x', '_y']),
  }),
  ui: { editor: JoinEditor },
  adapters: {
    toBackend: (p) => {
      const params = p as any;
      return {
        node_id: 'join',
        node_type: 'transform',
        parameters: {
          base_node_id: params.base_node_id || 0,
          // Support both legacy and multi-key
          ...(params.base_keys?.length ? { base_keys: params.base_keys } : { base_key: params.base_key || '' }),
          sources: params.sources || [],
          suffixes: params.suffixes || ['_x', '_y'],
        },
      };
    },
    fromBackend: (_nodeId, _nodeType, parameters) => {
      const params = parameters as any;
      return {
        typeId: 'transform.join',
        params: {
          base_node_id: params.base_node_id || 0,
          base_key: params.base_key || '',
          base_keys: params.base_keys || [],
          sources: params.sources || [],
          suffixes: params.suffixes || ['_x', '_y'],
        },
      };
    },
  },
};
