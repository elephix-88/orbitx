import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec, Port } from './types';

const SwitchEditor = lazy(() => import('@/nodes/Editors/transform/SwitchEditor'));

// ---------------------------------------------------------------------------
// Zod schema — mirrors SwitchNodeConfig from common/common/model/conditional.py
// ---------------------------------------------------------------------------

export const switchCaseSchema = z.object({
  case_id: z.string(),
  value: z.string(),
});

export type SwitchCase = z.infer<typeof switchCaseSchema>;

export const switchNodeParamsSchema = z.object({
  field: z.string().default(''),
  cases: z.array(switchCaseSchema).default([{ case_id: 'case_1', value: '' }]),
});

export type SwitchNodeParams = z.infer<typeof switchNodeParamsSchema>;

// ---------------------------------------------------------------------------
// Dynamic ports — one output per case + fixed "default" output
// ---------------------------------------------------------------------------

function buildSwitchPorts(params: Record<string, unknown>): Port[] {
  const ports: Port[] = [{ id: 'in', name: 'Input', io: 'input', dataType: 'records' }];

  const cases = (params['cases'] as SwitchCase[] | undefined) ?? [];
  for (const c of cases) {
    if (c.case_id) {
      ports.push({
        id: c.case_id,
        name: c.value || c.case_id,
        io: 'output',
        dataType: 'records',
      });
    }
  }

  // Default output is always last and always present
  ports.push({ id: 'default', name: 'Default', io: 'output', dataType: 'records' });

  return ports;
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

export const switchNodeSpec: NodeSpec = {
  typeId: 'logic.switch',
  displayName: 'Switch',
  category: 'TRANSFORM',
  icon: 'GitFork',
  color: '#8B5CF6',
  // Static ports represent the minimum (no cases configured yet)
  ports: [
    { id: 'in', name: 'Input', io: 'input', dataType: 'records' },
    { id: 'default', name: 'Default', io: 'output', dataType: 'records' },
  ],
  defaults: {
    field: '',
    cases: [{ case_id: 'case_1', value: '' }],
  },
  paramsSchema: switchNodeParamsSchema,
  getDynamicPorts: buildSwitchPorts,
  ui: { editor: SwitchEditor },
  adapters: {
    toBackend: (p) => ({
      node_id: 'switch',
      node_type: 'transform',
      parameters: {
        field: (p['field'] as string | undefined) ?? '',
        cases: (p['cases'] as SwitchCase[] | undefined) ?? [],
      },
    }),
    fromBackend: (_nodeId, _nodeType, parameters) => ({
      typeId: 'logic.switch',
      params: {
        field: (parameters['field'] as string | undefined) ?? '',
        cases: (parameters['cases'] as SwitchCase[] | undefined) ?? [
          { case_id: 'case_1', value: '' },
        ],
      },
    }),
  },
};
