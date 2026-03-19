import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';

const MySQLEditor = lazy(() => import('@/nodes/Editors/destination/MySQLEditor'));

export const mysqlDestSpec: NodeSpec = {
  typeId: 'dest.mysql',
  displayName: 'MySQL',
  category: 'DESTINATION',
  icon: 'MySQL',
  color: '#00758F',
  ports: [{ id: 'in', name: 'Input', io: 'input', dataType: 'records' }],
  defaults: { host: '', port: '', database: '', username: '', password: '', table: '' },
  paramsSchema: z.object({ host: z.string().default(''), database: z.string().default('') }),
  ui: { editor: MySQLEditor },
  adapters: {
    toBackend: (p) => ({ node_id: 'mysql', node_type: 'destinations', parameters: p }),
    fromBackend: (_nodeId, _nodeType, parameters) => ({ typeId: 'dest.mysql', params: parameters })
  }
};
