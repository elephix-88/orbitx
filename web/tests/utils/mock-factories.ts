import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// Types (aligned with src/types/workflow.ts patterns)
// =============================================================================

export interface MockWorkflowNode {
  id: string;
  type: 'source' | 'transform' | 'destination';
  definitionId: string;
  position: { x: number; y: number };
  data: {
    label: string;
    params: Record<string, unknown>;
    isConfigured: boolean;
  };
}

export interface MockWorkflowConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface MockWorkflow {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'draft';
  nodes: MockWorkflowNode[];
  connections: MockWorkflowConnection[];
  schedule?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: string;
  is_active: boolean;
}

export interface MockConnection {
  id: string;
  name: string;
  type: 'google' | 'facebook' | 'mysql' | 'bigquery';
  status: 'active' | 'inactive' | 'expired';
  createdAt: string;
}

// =============================================================================
// Node Factories
// =============================================================================

/**
 * Create a mock workflow node with sensible defaults.
 *
 * @example
 * const node = createMockNode({ type: 'source', definitionId: 'facebook.ads' });
 */
export function createMockNode(
  overrides: Partial<MockWorkflowNode> = {}
): MockWorkflowNode {
  const id = overrides.id ?? uuidv4();
  const type = overrides.type ?? 'source';

  return {
    id,
    type,
    definitionId: overrides.definitionId ?? getDefaultDefinitionId(type),
    position: overrides.position ?? { x: 0, y: 0 },
    data: {
      label: overrides.data?.label ?? `${type} Node`,
      params: overrides.data?.params ?? {},
      isConfigured: overrides.data?.isConfigured ?? false,
      ...overrides.data,
    },
  };
}

function getDefaultDefinitionId(type: 'source' | 'transform' | 'destination'): string {
  const defaults: Record<string, string> = {
    source: 'facebook.ads',
    transform: 'transform.sql',
    destination: 'dest.bigquery',
  };
  return defaults[type];
}

/**
 * Create a Facebook Ads source node.
 */
export function createFacebookAdsNode(
  overrides: Partial<MockWorkflowNode> = {}
): MockWorkflowNode {
  return createMockNode({
    type: 'source',
    definitionId: 'facebook.ads',
    data: {
      label: 'Facebook Ads',
      params: {
        connectionId: '',
        adAccountIds: [],
        fields: [],
        timeConfig: { timePreset: 'last_7_days' },
      },
      isConfigured: false,
      ...overrides.data,
    },
    ...overrides,
  });
}

/**
 * Create a Google Ads source node.
 */
export function createGoogleAdsNode(
  overrides: Partial<MockWorkflowNode> = {}
): MockWorkflowNode {
  return createMockNode({
    type: 'source',
    definitionId: 'google.ads',
    data: {
      label: 'Google Ads',
      params: {
        connectionId: '',
        adAccountIds: [],
        fields: [],
        timeConfig: { timePreset: 'last_7_days' },
      },
      isConfigured: false,
      ...overrides.data,
    },
    ...overrides,
  });
}

/**
 * Create a SQL Transform node.
 */
export function createSqlTransformNode(
  overrides: Partial<MockWorkflowNode> = {}
): MockWorkflowNode {
  return createMockNode({
    type: 'transform',
    definitionId: 'transform.sql',
    data: {
      label: 'SQL Transform',
      params: {
        tableName: 'input_data',
        sqlQuery: 'SELECT * FROM input_data',
      },
      isConfigured: false,
      ...overrides.data,
    },
    ...overrides,
  });
}

/**
 * Create a BigQuery destination node.
 */
export function createBigQueryNode(
  overrides: Partial<MockWorkflowNode> = {}
): MockWorkflowNode {
  return createMockNode({
    type: 'destination',
    definitionId: 'dest.bigquery',
    data: {
      label: 'BigQuery',
      params: {
        connectionId: '',
        projectId: '',
        datasetId: '',
        tableId: '',
        writeDisposition: 'WRITE_APPEND',
      },
      isConfigured: false,
      ...overrides.data,
    },
    ...overrides,
  });
}

/**
 * Create a Google Sheets destination node.
 */
export function createGoogleSheetsNode(
  overrides: Partial<MockWorkflowNode> = {}
): MockWorkflowNode {
  return createMockNode({
    type: 'destination',
    definitionId: 'dest.googlesheets',
    data: {
      label: 'Google Sheets',
      params: {
        connectionId: '',
        spreadsheetId: '',
        worksheetName: '',
        range: 'A1',
      },
      isConfigured: false,
      ...overrides.data,
    },
    ...overrides,
  });
}

// =============================================================================
// Connection Factories
// =============================================================================

/**
 * Create a mock workflow connection between two nodes.
 */
export function createMockConnection(
  sourceNodeId: string,
  targetNodeId: string,
  overrides: Partial<MockWorkflowConnection> = {}
): MockWorkflowConnection {
  return {
    id: overrides.id ?? uuidv4(),
    source: sourceNodeId,
    target: targetNodeId,
    sourceHandle: overrides.sourceHandle ?? 'output',
    targetHandle: overrides.targetHandle ?? 'input',
    ...overrides,
  };
}

// =============================================================================
// Workflow Factories
// =============================================================================

/**
 * Create a complete mock workflow with nodes and connections.
 *
 * @example
 * // Simple ETL workflow
 * const workflow = createMockWorkflow({ nodeCount: 3 });
 *
 * @example
 * // Custom workflow
 * const workflow = createMockWorkflow({
 *   name: 'My Workflow',
 *   nodes: [createFacebookAdsNode(), createBigQueryNode()],
 * });
 */
export function createMockWorkflow(
  overrides: Partial<MockWorkflow> & { nodeCount?: number } = {}
): MockWorkflow {
  const { nodeCount = 3, ...rest } = overrides;

  // Generate default nodes if none provided
  let nodes = overrides.nodes;
  if (!nodes) {
    nodes = [];
    const types: Array<'source' | 'transform' | 'destination'> = [
      'source',
      'transform',
      'destination',
    ];

    for (let i = 0; i < Math.min(nodeCount, 3); i++) {
      nodes.push(
        createMockNode({
          type: types[i],
          position: { x: i * 300, y: 100 },
        })
      );
    }
  }

  // Generate connections if none provided
  let connections = overrides.connections;
  if (!connections && nodes.length > 1) {
    connections = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      connections.push(createMockConnection(nodes[i].id, nodes[i + 1].id));
    }
  }

  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    name: 'Test Workflow',
    description: 'A test workflow',
    status: 'draft',
    nodes: nodes ?? [],
    connections: connections ?? [],
    schedule: '0 0 * * *',
    createdAt: now,
    updatedAt: now,
    ...rest,
  };
}

/**
 * Create a simple source-to-destination workflow.
 */
export function createSimpleWorkflow(
  sourceType: 'facebook.ads' | 'google.ads' = 'facebook.ads',
  destType: 'dest.bigquery' | 'dest.googlesheets' | 'dest.mysql' = 'dest.bigquery'
): MockWorkflow {
  const sourceNode = createMockNode({
    type: 'source',
    definitionId: sourceType,
    position: { x: 100, y: 100 },
  });

  const destNode = createMockNode({
    type: 'destination',
    definitionId: destType,
    position: { x: 500, y: 100 },
  });

  return createMockWorkflow({
    nodes: [sourceNode, destNode],
    connections: [createMockConnection(sourceNode.id, destNode.id)],
  });
}

// =============================================================================
// User Factories
// =============================================================================

/**
 * Create a mock user.
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: uuidv4(),
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.png',
    role: 'user',
    is_active: true,
    ...overrides,
  };
}

// =============================================================================
// OAuth Connection Factories
// =============================================================================

/**
 * Create a mock OAuth connection.
 */
export function createMockOAuthConnection(
  overrides: Partial<MockConnection> = {}
): MockConnection {
  return {
    id: uuidv4(),
    name: 'Test Connection',
    type: 'google',
    status: 'active',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create multiple mock connections.
 */
export function createMockConnections(
  count: number,
  type: MockConnection['type'] = 'google'
): MockConnection[] {
  return Array.from({ length: count }, (_, i) =>
    createMockOAuthConnection({
      name: `${type} Connection ${i + 1}`,
      type,
    })
  );
}

// =============================================================================
// API Response Factories
// =============================================================================

/**
 * Create a mock API success response.
 */
export function createMockApiResponse<T>(data: T, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

/**
 * Create a mock API error response.
 */
export function createMockApiError(
  message: string,
  status = 400
) {
  return {
    ok: false,
    status,
    json: async () => ({ error: message, message }),
    text: async () => JSON.stringify({ error: message }),
  };
}

// =============================================================================
// Execution History Factories
// =============================================================================

export interface MockExecutionRecord {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  error?: string;
}

/**
 * Create a mock execution record.
 */
export function createMockExecution(
  overrides: Partial<MockExecutionRecord> = {}
): MockExecutionRecord {
  const startedAt = new Date();
  const completedAt = new Date(startedAt.getTime() + 60000); // 1 minute later

  return {
    id: uuidv4(),
    workflowId: uuidv4(),
    status: 'completed',
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    ...overrides,
  };
}
