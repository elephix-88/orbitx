import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';

const IfEditor = lazy(() => import('@/nodes/Editors/transform/IfEditor'));

// ---------------------------------------------------------------------------
// Zod schema — mirrors IfNodeConfig from common/common/model/conditional.py
// ---------------------------------------------------------------------------

export const conditionOperatorSchema = z.enum([
 'equals',
 'not_equals',
 'greater_than',
 'less_than',
 'contains',
 'is_empty',
 'is_not_empty',
]);

export type ConditionOperator = z.infer<typeof conditionOperatorSchema>;

export const conditionSchema = z.object({
 field: z.string().default(''),
 operator: conditionOperatorSchema.default('equals'),
 value: z.string().default(''),
});

export type Condition = z.infer<typeof conditionSchema>;

export const ifNodeParamsSchema = z.object({
 conditions: z.array(conditionSchema).default([{ field: '', operator: 'equals', value: '' }]),
 logic_mode: z.enum(['AND', 'OR']).default('AND'),
});

export type IfNodeParams = z.infer<typeof ifNodeParamsSchema>;

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

export const ifNodeSpec: NodeSpec = {
 typeId: 'logic.if',
 displayName: 'IF',
 category: 'TRANSFORM',
 icon: 'GitBranch',
 color: '#F59E0B',
 ports: [
 { id: 'in', name: 'Input', io: 'input', dataType: 'records' },
 { id: 'true', name: 'True', io: 'output', dataType: 'records' },
 { id: 'false', name: 'False', io: 'output', dataType: 'records' },
 ],
 defaults: {
 conditions: [{ field: '', operator: 'equals', value: '' }],
 logic_mode: 'AND',
 },
 paramsSchema: ifNodeParamsSchema,
 ui: { editor: IfEditor },
 adapters: {
 toBackend: (p) => ({
 node_id: 'if',
 node_type: 'transform',
 parameters: {
 conditions: (p['conditions'] as Condition[] | undefined) ?? [],
 logic: (p['logic_mode'] as string | undefined) ?? 'AND',
 },
 }),
 fromBackend: (_nodeId, _nodeType, parameters) => ({
 typeId: 'logic.if',
 params: {
 conditions: (parameters['conditions'] as Condition[] | undefined) ?? [
 { field: '', operator: 'equals', value: '' },
 ],
 logic_mode: (parameters['logic'] as string | undefined) ?? 'AND',
 },
 }),
 },
};
