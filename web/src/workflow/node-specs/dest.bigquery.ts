import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec, Port } from './types';

const BigQueryEditor = lazy(() => import('@/nodes/Editors/destination/BigQueryEditor'));

// Dynamic port generation based on pass_through parameter
const getPorts = (params: Record<string, unknown>): Port[] => {
  const ports: Port[] = [{ id: 'in', name: 'Input', io: 'input', dataType: 'records' }];
  if (params['pass_through']) {
    ports.push({ id: 'out', name: 'Output', io: 'output', dataType: 'records' });
  }
  return ports;
};

export const bigQueryDestSpec: NodeSpec = {
  typeId: 'dest.bigquery',
  displayName: 'BigQuery',
  category: 'DESTINATION',
  icon: 'BigQuery',
  color: '#10B981',
  ports: [{ id: 'in', name: 'Input', io: 'input', dataType: 'records' }],
  defaults: { project_id: '', dataset: '', destination_table: '', location: 'US', insert_mode: 'append', pass_through: false },
  paramsSchema: z.object({ projectId: z.string().default(''), pass_through: z.boolean().default(false) }),
  // Dynamic ports based on pass_through
  getDynamicPorts: getPorts,
  ui: { editor: BigQueryEditor },
  adapters: {
    toBackend: (p) => ({ node_id: 'bigquery', node_type: 'destinations', parameters: {
      project_id: p['project_id'] || p['projectId'] || '',
      dataset: p['dataset'] || '',
      destination_table: p['destination_table'] || p['table'] || '',
      location: p['location'] || 'US',
      // Always send Mongo _id (frontend editors already map option id to _id)
      connection_id: p['connection_id'] || '',
      insert_mode: ((): string => {
        const im = p['insert_mode'];
        if (im) return String(im);
        const wd = p['write_disposition'] || p['writeDisposition'];
        if (wd === 'WRITE_TRUNCATE') return 'truncate';
        // Map WRITE_APPEND/WRITE_EMPTY to append by default
        if (wd === 'WRITE_APPEND' || wd === 'WRITE_EMPTY') return 'append';
        return 'append';
      })(),
      batch_size: p['batch_size'] || undefined,
      num_partitions: p['num_partitions'] || undefined,
      pass_through: p['pass_through'] || false,
    } }),
    fromBackend: (_nodeId, _nodeType, parameters) => ({ typeId: 'dest.bigquery', params: {
      project_id: parameters['project_id'] || '',
      dataset: parameters['dataset'] || '',
      destination_table: parameters['destination_table'] || '',
      location: parameters['location'] || 'US',
      connection_id: parameters['connection_id'] || '',
      insert_mode: ((): string => {
        const im = parameters['insert_mode'];
        if (im) return String(im);
        const wd = parameters['write_disposition'];
        if (wd === 'WRITE_TRUNCATE') return 'truncate';
        if (wd === 'WRITE_APPEND' || wd === 'WRITE_EMPTY') return 'append';
        return 'append';
      })(),
      batch_size: parameters['batch_size'],
      num_partitions: parameters['num_partitions'],
      pass_through: parameters['pass_through'] || false,
    } })
  }
};
