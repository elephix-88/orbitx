import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';

const SqlTransformEditor = lazy(() => import('@/nodes/Editors/transform/SqlTransformEditor'));

export const sqlTransformSpec: NodeSpec = {
  typeId: 'transform.sql',
  displayName: 'SQL Transform',
  category: 'TRANSFORM',
  icon: 'Database',
  color: '#F59E0B',
  ports: [
    { id: 'in', name: 'Input', io: 'input', dataType: 'records' },
    { id: 'out', name: 'Output', io: 'output', dataType: 'records' }
  ],
  defaults: { query: '', table_name: '' },
  paramsSchema: z.object({ query: z.string().default(''), table_name: z.string().default('') }),
  ui: { editor: SqlTransformEditor },
  adapters: {
    toBackend: (p) => ({
      node_id: 'sql',
      node_type: 'transform',
      parameters: {
        table_name: p['table_name'] || p['tableName'] || '',
        sql_query: p['sql_query'] || p['query'] || '',
      }
    }),
    fromBackend: (_nodeId, _nodeType, parameters) => ({
      typeId: 'transform.sql',
      params: {
        query: parameters['sql_query'] || parameters['query'] || '',
        table_name: parameters['table_name'] || '',
      }
    })
  }
};
