import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';

const RenameEditor = lazy(() => import('@/nodes/Editors/transform/RenameEditor'));

export const renameTransformSpec: NodeSpec = {
 typeId: 'transform.rename',
 displayName: 'Rename Columns',
 category: 'TRANSFORM',
 icon: 'PenLine',
 color: '#F59E0B',
 ports: [
 { id: 'in', name: 'Input', io: 'input', dataType: 'records' },
 { id: 'out', name: 'Output', io: 'output', dataType: 'records' },
 ],
 defaults: { column_mapping: {} },
 paramsSchema: z.object({
 column_mapping: z.record(z.string(), z.string()).default({}),
 }),
 ui: { editor: RenameEditor },
 adapters: {
 toBackend: (p) => ({
 node_id: 'rename',
 node_type: 'transform',
 parameters: {
 column_mapping: p['column_mapping'] || {},
 },
 }),
 fromBackend: (_nodeId, _nodeType, parameters) => ({
 typeId: 'transform.rename',
 params: {
 column_mapping: parameters['column_mapping'] || {},
 },
 }),
 },
};
