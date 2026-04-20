import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';

const ErrorTriggerEditor = lazy(() => import('@/nodes/Editors/source/ErrorTriggerEditor'));

export const errorTriggerSourceSpec: NodeSpec = {
 typeId: 'source.error-trigger',
 displayName: 'Error Trigger',
 category: 'SOURCE',
 icon: 'AlertTriangle',
 color: '#EF4444',
 ports: [{ id: 'out', name: 'Output', io: 'output', dataType: 'records' }],
 defaults: {
 // No user-configurable fields.
 // The error payload is injected at runtime by the Prefect failure hook.
 },
 paramsSchema: z.object({}),
 ui: { editor: ErrorTriggerEditor },
 adapters: {
 toBackend: (_p) => ({
 node_id: 'error_trigger',
 node_type: 'source',
 parameters: {},
 }),
 fromBackend: (_nodeId, _nodeType, _parameters) => ({
 typeId: 'source.error-trigger',
 params: {},
 }),
 },
};
