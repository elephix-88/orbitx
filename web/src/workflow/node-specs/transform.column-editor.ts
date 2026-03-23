import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';

const ColumnEditorEditor = lazy(() => import('@/nodes/Editors/transform/ColumnEditorEditor'));

// Supported data types for casting
const dataTypeSchema = z.enum(['string', 'integer', 'float', 'boolean', 'date', 'datetime']);

// Single column conversion config
const columnConversionSchema = z.object({
  column: z.string(),
  rename: z.string().optional(),
  cast: dataTypeSchema.optional(),
  drop: z.boolean().optional(),
});

// New column config for adding columns with constant values
const newColumnSchema = z.object({
  name: z.string(),
  value: z.string(),
  data_type: dataTypeSchema.default('string'),
});

export type ColumnConversion = z.infer<typeof columnConversionSchema>;
export type NewColumn = z.infer<typeof newColumnSchema>;
export type DataType = z.infer<typeof dataTypeSchema>;

export const columnEditorTransformSpec: NodeSpec = {
  typeId: 'transform.column-editor',
  displayName: 'Column Editor',
  category: 'TRANSFORM',
  icon: 'Columns3',
  color: '#F59E0B',
  ports: [
    { id: 'in', name: 'Input', io: 'input', dataType: 'records' },
    { id: 'out', name: 'Output', io: 'output', dataType: 'records' },
  ],
  defaults: { conversions: [], new_columns: [] },
  paramsSchema: z.object({
    conversions: z.array(columnConversionSchema).default([]),
    new_columns: z.array(newColumnSchema).default([]),
  }),
  ui: { editor: ColumnEditorEditor },
  adapters: {
    toBackend: (p) => {
      const params = p as { conversions?: ColumnConversion[]; new_columns?: NewColumn[] };
      return {
        node_id: 'column_editor',
        node_type: 'transform',
        parameters: {
          conversions: params.conversions || [],
          new_columns: params.new_columns || [],
        },
      };
    },
    fromBackend: (_nodeId, _nodeType, parameters) => {
      const params = parameters as { conversions?: ColumnConversion[]; new_columns?: NewColumn[] };
      return {
        typeId: 'transform.column-editor',
        params: {
          conversions: params.conversions || [],
          new_columns: params.new_columns || [],
        },
      };
    },
  },
};
