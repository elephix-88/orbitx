// =============================================================================
// createNodeSpec - Factory for Creating Node Specifications
// =============================================================================
// Simplifies the creation of node specs with consistent patterns and
// automatic adapter generation for backend/frontend field mapping.

import { z } from 'zod';
import type { NodeSpec, Port } from './types';

// =============================================================================
// Types
// =============================================================================

export interface SourceNodeConfig<TSchema extends z.ZodTypeAny> {
  /** Unique type identifier (e.g., 'google.ads', 'facebook.ads') */
  typeId: string;
  /** Display name shown in UI */
  displayName: string;
  /** Icon name from lucide-react */
  icon: string;
  /** Brand color (hex) */
  color: string;
  /** Backend node_id for API calls */
  backendNodeId: string;
  /** Zod schema for parameters */
  paramsSchema: TSchema;
  /** Default values for the form */
  defaults: z.infer<TSchema>;
  /** Editor component */
  editor: React.ComponentType<{
    data: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
    onClose: () => void;
  }>;
  /** Field mappings between frontend and backend */
  fieldMappings: FieldMapping[];
  /** Custom output ports (defaults to single 'Output' port) */
  outputPorts?: Port[];
}

export interface DestinationNodeConfig<TSchema extends z.ZodTypeAny> {
  typeId: string;
  displayName: string;
  icon: string;
  color: string;
  backendNodeId: string;
  paramsSchema: TSchema;
  defaults: z.infer<TSchema>;
  editor: React.ComponentType<{
    data: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
    onClose: () => void;
  }>;
  fieldMappings: FieldMapping[];
  /** Custom input ports (defaults to single 'Input' port) */
  inputPorts?: Port[];
}

export interface TransformNodeConfig<TSchema extends z.ZodTypeAny> {
  typeId: string;
  displayName: string;
  icon: string;
  color: string;
  backendNodeId: string;
  paramsSchema: TSchema;
  defaults: z.infer<TSchema>;
  editor: React.ComponentType<{
    data: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
    onClose: () => void;
  }>;
  fieldMappings: FieldMapping[];
  inputPorts?: Port[];
  outputPorts?: Port[];
}

export interface FieldMapping {
  /** Frontend field name (camelCase) */
  frontend: string;
  /** Backend field name (snake_case) */
  backend: string;
  /** Legacy field names to support for backward compatibility */
  legacyBackend?: string[];
  /** Legacy frontend names */
  legacyFrontend?: string[];
  /** Transform function for frontend -> backend */
  toBackend?: (value: unknown) => unknown;
  /** Transform function for backend -> frontend */
  fromBackend?: (value: unknown) => unknown;
  /** Default value if not present */
  defaultValue?: unknown;
}

// =============================================================================
// Default Ports
// =============================================================================

const DEFAULT_SOURCE_PORTS: Port[] = [
  { id: 'out', name: 'Output', io: 'output', dataType: 'records' },
];

const DEFAULT_DESTINATION_PORTS: Port[] = [
  { id: 'in', name: 'Input', io: 'input', dataType: 'records', required: true },
];

const DEFAULT_TRANSFORM_INPUT_PORTS: Port[] = [
  { id: 'in', name: 'Input', io: 'input', dataType: 'records', required: true },
];

const DEFAULT_TRANSFORM_OUTPUT_PORTS: Port[] = [
  { id: 'out', name: 'Output', io: 'output', dataType: 'records' },
];

// =============================================================================
// Adapter Generators
// =============================================================================

function createToBackendAdapter(
  backendNodeId: string,
  nodeType: 'source' | 'transform' | 'destinations',
  fieldMappings: FieldMapping[]
) {
  return (params: Record<string, unknown>) => {
    const parameters: Record<string, unknown> = {};

    for (const mapping of fieldMappings) {
      // Get value from frontend field or legacy frontend names
      let value = params[mapping.frontend];

      if (value === undefined && mapping.legacyFrontend) {
        for (const legacyName of mapping.legacyFrontend) {
          if (params[legacyName] !== undefined) {
            value = params[legacyName];
            break;
          }
        }
      }

      // Check backend field names in params (for pass-through scenarios)
      if (value === undefined) {
        value = params[mapping.backend];
        if (value === undefined && mapping.legacyBackend) {
          for (const legacyName of mapping.legacyBackend) {
            if (params[legacyName] !== undefined) {
              value = params[legacyName];
              break;
            }
          }
        }
      }

      // Apply default if still undefined
      if (value === undefined && mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      }

      // Apply transform if provided
      if (mapping.toBackend && value !== undefined) {
        value = mapping.toBackend(value);
      }

      // Set in parameters
      if (value !== undefined) {
        parameters[mapping.backend] = value;
      }
    }

    return {
      node_id: backendNodeId,
      node_type: nodeType,
      parameters,
    };
  };
}

function createFromBackendAdapter(
  typeId: string,
  fieldMappings: FieldMapping[]
) {
  return (
    _nodeId: string,
    _nodeType: string,
    parameters: Record<string, unknown>
  ) => {
    const params: Record<string, unknown> = {};

    for (const mapping of fieldMappings) {
      // Get value from backend field or legacy backend names
      let value = parameters[mapping.backend];

      if (value === undefined && mapping.legacyBackend) {
        for (const legacyName of mapping.legacyBackend) {
          if (parameters[legacyName] !== undefined) {
            value = parameters[legacyName];
            break;
          }
        }
      }

      // Apply default if undefined
      if (value === undefined && mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      }

      // Apply transform if provided
      if (mapping.fromBackend && value !== undefined) {
        value = mapping.fromBackend(value);
      }

      // Set in params
      if (value !== undefined) {
        params[mapping.frontend] = value;
      }
    }

    return {
      typeId,
      params,
    };
  };
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createSourceNodeSpec<TSchema extends z.ZodTypeAny>(
  config: SourceNodeConfig<TSchema>
): NodeSpec {
  return {
    typeId: config.typeId,
    displayName: config.displayName,
    category: 'SOURCE',
    icon: config.icon,
    color: config.color,
    ports: config.outputPorts || DEFAULT_SOURCE_PORTS,
    defaults: config.defaults as Record<string, unknown>,
    paramsSchema: config.paramsSchema,
    ui: { editor: config.editor },
    adapters: {
      toBackend: createToBackendAdapter(
        config.backendNodeId,
        'source',
        config.fieldMappings
      ),
      fromBackend: createFromBackendAdapter(config.typeId, config.fieldMappings),
    },
  };
}

export function createDestinationNodeSpec<TSchema extends z.ZodTypeAny>(
  config: DestinationNodeConfig<TSchema>
): NodeSpec {
  return {
    typeId: config.typeId,
    displayName: config.displayName,
    category: 'DESTINATION',
    icon: config.icon,
    color: config.color,
    ports: config.inputPorts || DEFAULT_DESTINATION_PORTS,
    defaults: config.defaults as Record<string, unknown>,
    paramsSchema: config.paramsSchema,
    ui: { editor: config.editor },
    adapters: {
      toBackend: createToBackendAdapter(
        config.backendNodeId,
        'destinations',
        config.fieldMappings
      ),
      fromBackend: createFromBackendAdapter(config.typeId, config.fieldMappings),
    },
  };
}

export function createTransformNodeSpec<TSchema extends z.ZodTypeAny>(
  config: TransformNodeConfig<TSchema>
): NodeSpec {
  const ports: Port[] = [
    ...(config.inputPorts || DEFAULT_TRANSFORM_INPUT_PORTS),
    ...(config.outputPorts || DEFAULT_TRANSFORM_OUTPUT_PORTS),
  ];

  return {
    typeId: config.typeId,
    displayName: config.displayName,
    category: 'TRANSFORM',
    icon: config.icon,
    color: config.color,
    ports,
    defaults: config.defaults as Record<string, unknown>,
    paramsSchema: config.paramsSchema,
    ui: { editor: config.editor },
    adapters: {
      toBackend: createToBackendAdapter(
        config.backendNodeId,
        'transform',
        config.fieldMappings
      ),
      fromBackend: createFromBackendAdapter(config.typeId, config.fieldMappings),
    },
  };
}

// =============================================================================
// Common Field Mapping Helpers
// =============================================================================

/**
 * Creates a standard connection field mapping
 */
export function connectionFieldMapping(
  frontendName = 'connectionId',
  backendName = 'connection_id'
): FieldMapping {
  return {
    frontend: frontendName,
    backend: backendName,
    legacyFrontend: ['accessToken', 'token_id'],
    legacyBackend: ['token_id'],
    defaultValue: '',
  };
}

/**
 * Creates a standard account IDs field mapping
 */
export function accountIdsFieldMapping(
  frontendName = 'accountIds',
  backendName = 'ad_account_id'
): FieldMapping {
  return {
    frontend: frontendName,
    backend: backendName,
    legacyFrontend: ['adAccountIds', 'customerIds'],
    legacyBackend: ['customer_ids'],
    defaultValue: [],
    toBackend: (value) => (Array.isArray(value) ? value : []),
    fromBackend: (value) => (Array.isArray(value) ? value : []),
  };
}

/**
 * Creates a standard fields array mapping
 */
export function fieldsArrayMapping(
  frontendName = 'fields',
  backendName = 'fields'
): FieldMapping {
  return {
    frontend: frontendName,
    backend: backendName,
    legacyFrontend: ['selectedFields'],
    defaultValue: [],
    toBackend: (value) => (Array.isArray(value) ? value : []),
    fromBackend: (value) => (Array.isArray(value) ? value : []),
  };
}

/**
 * Creates a standard time config field mapping
 */
export function timeConfigFieldMapping(
  frontendName = 'timeConfig',
  backendName = 'time_config'
): FieldMapping {
  const defaultConfig = { time_preset: 'last_7_days', time_increment: 1 };

  return {
    frontend: frontendName,
    backend: backendName,
    defaultValue: defaultConfig,
    toBackend: (value) => {
      if (typeof value === 'object' && value !== null) {
        return value;
      }
      return defaultConfig;
    },
    fromBackend: (value) => {
      if (typeof value === 'object' && value !== null) {
        return value;
      }
      return defaultConfig;
    },
  };
}

// =============================================================================
// Export Types
// =============================================================================

export type { NodeSpec, Port } from './types';
