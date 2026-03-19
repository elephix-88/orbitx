// Utility functions to transform backend data to frontend format
import Dagre from '@dagrejs/dagre';
import { BackendWorkflow, BackendWorkflowDetailed, BackendWorkflowNode, WorkflowExecution } from '../types/backend';
import { WorkflowNode, WorkflowConnection, WorkflowStatus } from '../types/workflow';
import { getNodeSpec } from '@/workflow/registry';

export interface FrontendWorkflow {
  id: string;
  job_id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: WorkflowStatus;
  environment_tag: string;
  schedule_expression: string;
  runs: number;
  category: string;
  lastRun: string;
  nextRun: string;
  project_id: string;
  application_name: string;
  execution_mode: 'sequential' | 'parallel';
}

/**
 * Transform backend workflow to frontend workflow format
 */
export function transformBackendWorkflow(
  backendWorkflow: BackendWorkflow, 
  executions?: WorkflowExecution[]
): FrontendWorkflow {
  // Count total runs from executions
  const runs = executions?.length || 0;
  
  // Find last execution
  const lastExecution = executions?.sort((a, b) => 
    new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  )[0];
  
  // Calculate next run based on schedule expression
  const nextRun = calculateNextRun(backendWorkflow.schedule_expression);
  
  // Determine category based on job name/id
  const category = determineWorkflowCategory(backendWorkflow.job_name, backendWorkflow.job_id);

  // Generate timestamps for display
  const now = new Date().toISOString();

  // Use Mongo _id as the primary identifier for routing
  const publicId = (backendWorkflow as any)?._id?.$oid
    || (backendWorkflow as any)?._id;

  return {
    id: publicId,
    job_id: backendWorkflow.job_id,
    name: backendWorkflow.job_name,
    // avoid hardcoded description; rely purely on backend fields when available
    description: (backendWorkflow as any).description || '',
    createdAt: backendWorkflow.created_at || now, // No creation date from backend, use current time
    updatedAt: backendWorkflow.updated_at || now, // No update date from backend, use current time
    // Prefer backend status if present; fallback to environment heuristic
    status: ((backendWorkflow as any).status as WorkflowStatus) || WorkflowStatus.ACTIVE,
    environment_tag: backendWorkflow.environment_tag || '',
    schedule_expression: backendWorkflow.schedule_expression,
    runs,
    category,
    lastRun: lastExecution ? formatDateTime(lastExecution.started_at) : 'Never',
    nextRun,
    project_id: backendWorkflow.project_id || '',
    application_name: backendWorkflow.application_name || '',
    execution_mode: backendWorkflow.execution_mode === 'parallel' ? 'parallel' : 'sequential',
  };
}

/**
 * Transform multiple backend workflows
 */
export function transformBackendWorkflows(
  backendWorkflows: BackendWorkflow[],
  executionsMap?: Record<string, WorkflowExecution[]>
): FrontendWorkflow[] {
  return backendWorkflows.map(workflow => 
    transformBackendWorkflow(workflow, executionsMap?.[workflow.job_id])
  );
}

/**
 * Determine workflow category based on job name and id
 */
function determineWorkflowCategory(jobName: string | undefined, jobId: string | undefined): string {
  const name = (jobName || '').toLowerCase();
  const id = (jobId || '').toLowerCase();
  
  // Check for specific data sources in name or id
  const hasFacebook = name.includes('facebook') || id.includes('facebook');
  const hasGoogle = name.includes('google') || name.includes('adwords') || id.includes('google');
  const hasInstagram = name.includes('instagram') || id.includes('instagram');
  const hasTwitter = name.includes('twitter') || id.includes('twitter');
  const hasLinkedin = name.includes('linkedin') || id.includes('linkedin');
  
  // Check for data types
  const hasCampaigns = name.includes('campaign') || id.includes('campaign');
  const hasAds = name.includes('ads') || id.includes('ads');
  const hasAgeGender = name.includes('age') && name.includes('gender');
  const hasRegion = name.includes('region') || name.includes('geo');
  const hasTest = name.includes('test') || id.includes('test');
  
  // Generate specific categories
  if (hasFacebook) {
    if (hasAgeGender) return 'Facebook Ads Demographics';
    if (hasRegion) return 'Facebook Ads Geographic';
    if (hasCampaigns) return 'Facebook Campaigns';
    if (hasAds) return 'Facebook Ads';
    return 'Facebook Marketing';
  }
  
  if (hasGoogle) {
    if (hasCampaigns) return 'Google Campaigns';
    if (hasAds) return 'Google Ads';
    return 'Google Marketing';
  }
  
  if (hasInstagram) return 'Instagram Marketing';
  if (hasTwitter) return 'Twitter Marketing';
  if (hasLinkedin) return 'LinkedIn Marketing';
  
  // General categories
  if (hasCampaigns) return 'Campaign Management';
  if (hasAds) return 'Advertising';
  if (hasTest) return 'Testing & QA';
  
  return 'Data Pipeline';
}

/**
 * Calculate next run time based on cron expression
 */
function calculateNextRun(scheduleExpression: string | undefined): string {
  if (!scheduleExpression) return 'No schedule';
  
  // Simple cron parsing - in real application you might want to use a cron library
  try {
    const parts = scheduleExpression.split(' ');
    if (parts.length !== 5) return 'Invalid schedule';
    
    const [minute, hour, day, month, dayOfWeek] = parts;
    
    // Daily at specific time
    if (day === '*' && month === '*' && dayOfWeek === '*') {
      return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
    
    // Weekly
    if (day === '*' && month === '*' && dayOfWeek !== '*') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Weekly on ${days[parseInt(dayOfWeek)]} at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
    
    // Monthly
    if (day !== '*' && month === '*' && dayOfWeek === '*') {
      return `Monthly on day ${day} at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
    
    return scheduleExpression;
  } catch (error) {
    return 'Invalid schedule';
  }
}

/**
 * Format datetime for display
 */
function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return formatDateTime(dateString);
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Transform backend workflow node to frontend workflow node
 */
export function transformBackendNode(
  backendNode: BackendWorkflowNode, 
  nodesArray: BackendWorkflowNode[]
): WorkflowNode {
  // Calculate position based on sequential flow (left to right)
  const position = calculateNodePosition(backendNode, nodesArray);

  // Map node type names
  const typeMapping = {
    'source': 'source' as const,
    'transform': 'transform' as const,
    'destinations': 'destination' as const
  };

  // Shared mapping: backend node_id -> registry typeId
  const backendToTypeId: Record<string, string> = {
    'facebook_ads': 'facebook.ads',
    'google_ads': 'google.ads',
    'tiktok_ads': 'tiktok.ads',
    'google_sheet': 'dest.googlesheets',
    'googlesheet': 'dest.googlesheets',
    'bigquery': 'dest.bigquery',
    'mysql': 'dest.mysql',
    'sql': 'transform.sql',
    'rename': 'transform.rename',
    'join': 'transform.join',
    'column_editor': 'transform.column-editor',
  };

  // Map backend node_id to frontend node names (must match nodeTypes array)
  const generateNodeName = (nodeId: string): string => {
    const typeId = backendToTypeId[nodeId] || nodeId;
    const spec = getNodeSpec(typeId);
    return spec?.displayName || nodeId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Map backend node_id to frontend component type
  const getNodeComponentType = (nodeId: string, nodeType: string): string => {
    // These must match the keys in src/nodes/index.ts NodeTypes
    const componentMap: Record<string, string> = {
      'facebook_ads': 'facebookAds',
      'google_ads': 'googleAds',
      'tiktok_ads': 'tiktokAds',
      'sql': 'sqlTransform',
      'rename': 'renameTransform',
      'join': 'joinTransform',
      'column_editor': 'columnEditorTransform',
      'bigquery': 'bigQueryDestination',
      'googlesheet': 'googleSheetsDestination',
      'google_sheet': 'googleSheetsDestination',
      'mysql': 'mysqlDestination',
    };
    if (componentMap[nodeId]) return componentMap[nodeId];

    // Fallback based on node type
    switch (nodeType) {
      case 'source': return 'facebookAds';
      case 'transform': return 'sqlTransform';
      case 'destinations': return 'bigQueryDestination';
      default: return 'sqlTransform';
    }
  };

  // Map backend node_id to registry typeId for definitionId
  const getDefinitionId = (nodeId: string): string => {
    return backendToTypeId[nodeId] || nodeId;
  };

  const uiData = ((): Record<string, unknown> => {
    if (backendNode.node_id === 'sql') {
      const p: any = backendNode.parameters || {};
      const q = p.sql_query ?? p.query ?? p.sql ?? p.sqlQuery ?? '';
      const t = p.table_name ?? p.tableName ?? '';
      return {
        query: q,
        sql_query: q,
        table_name: t,
        tableName: t,
        node_instance_id: backendNode.node_instance_id,
      } as Record<string, unknown>;
    }
    return {
      ...backendNode.parameters,
      node_instance_id: backendNode.node_instance_id,
    };
  })();

  // Generate the actual node type name from node_id (e.g., "Facebook Ads")
  const nodeName = generateNodeName(backendNode.node_id);

  // Calculate ports - use dynamic ports if spec supports it, otherwise use defaults
  const typeId = backendToTypeId[backendNode.node_id] || backendNode.node_id;
  const spec = getNodeSpec(typeId);
  let inputs: { id: string; name: string }[];
  let outputs: { id: string; name: string }[];

  if (spec?.getDynamicPorts) {
    // Use dynamic ports based on node parameters (e.g., BigQuery with enable_output)
    const dynamicPorts = spec.getDynamicPorts(uiData);
    inputs = dynamicPorts
      .filter((p) => p.io === 'input')
      .map((p) => ({ id: p.id, name: p.name }));
    outputs = dynamicPorts
      .filter((p) => p.io === 'output')
      .map((p) => ({ id: p.id, name: p.name }));
  } else {
    // Default ports based on node type
    inputs = backendNode.node_type !== 'source' ? [{ id: 'in', name: 'Input' }] : [];
    outputs = backendNode.node_type !== 'destinations' ? [{ id: 'out', name: 'Output' }] : [];
  }

  return {
    id: backendNode.uid || backendNode.node_id,
    definitionId: getDefinitionId(backendNode.node_id) as any,
    type: typeMapping[backendNode.node_type as keyof typeof typeMapping] || 'transform',
    name: nodeName,
    display_name: backendNode.display_name || undefined, // Alias from backend
    componentType: getNodeComponentType(backendNode.node_id, backendNode.node_type),
    position,
    data: uiData,
    inputs,
    outputs,
    status: 'pending' as const
  };
}

/**
 * Calculate optimal position for a node in the workflow canvas (fallback when no connections)
 */
function calculateNodePosition(
  node: BackendWorkflowNode,
  allNodes: BackendWorkflowNode[]
): { x: number; y: number } {
  // Configuration for layout with make.com style spacing
  const config = {
    nodeWidth: 320,         // Match BaseNode desktop width
    nodeHeight: 240,        // Match BaseNode desktop height
    horizontalSpacing: 500, // Tighter columns so connections are shorter
    verticalSpacing: 180,   // Reasonable row spacing
    startX: 120,            // Left margin
    startY: 120,            // Top margin
    typeSpacing: 40,        // Small extra spacing between types
  };

  // Group nodes by type to calculate positions
  const nodesByType = {
    source: allNodes.filter(n => n.node_type === 'source'),
    transform: allNodes.filter(n => n.node_type === 'transform'),
    destinations: allNodes.filter(n => n.node_type === 'destinations')
  };

  // Calculate column positions with consistent spacing
  const columns = {
    source: 0,
    transform: 1,
    destinations: 2
  } as const;

  // Find the index of this node within its type group
  const nodesOfSameType = nodesByType[node.node_type as keyof typeof nodesByType] || [];
  // Determine index by stable order among nodes of the same type by appearance in original array
  const indexInTypeRaw = nodesOfSameType.indexOf(node);
  const indexInType = indexInTypeRaw === -1 ? 0 : indexInTypeRaw;

  // Calculate position with enhanced spacing
  const column = (columns as Record<string, number>)[node.node_type] ?? 0;
  const baseX = config.startX + (column * config.horizontalSpacing);
  const extraSpacing = column * config.typeSpacing; // Add extra spacing between node types
  const x = baseX + extraSpacing;

  // Stack nodes of same type vertically with better spacing
  const y = config.startY + (indexInType * config.verticalSpacing);

  return { x, y };
}

/**
 * Calculate node positions based on connection topology using dagre graph layout
 * This ensures nodes are arranged left-to-right following the actual data flow
 *
 * Layout style inspired by n8n/Make.com:
 * - Horizontal flow (left to right)
 * - Clear spacing between columns (ranks)
 * - Branches stacked vertically with good separation
 */
function calculatePositionsFromConnections(
  nodes: BackendWorkflowNode[],
  rawConnections: unknown
): Map<number, { x: number; y: number }> {
  const positions = new Map<number, { x: number; y: number }>();

  // Create a new directed graph with dagre
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  // n8n-style layout configuration
  // - rankdir: LR = left-to-right flow (like n8n)
  // - ranksep: horizontal spacing between columns
  // - nodesep: vertical spacing between nodes in same column
  g.setGraph({
    rankdir: 'LR',
    ranksep: 80,     // Horizontal gap between columns (tighter spacing)
    nodesep: 60,     // Vertical gap between nodes in same column
    marginx: 50,
    marginy: 50,
    align: 'UL',
    ranker: 'network-simplex',
  });

  // Node dimensions - match the actual node card size
  const nodeWidth = 200;   // Compact width like n8n
  const nodeHeight = 80;   // Compact height like n8n

  for (const node of nodes) {
    const instanceId = (node as { node_instance_id?: number }).node_instance_id;
    if (typeof instanceId === 'number') {
      g.setNode(String(instanceId), { width: nodeWidth, height: nodeHeight });
    }
  }

  // Add edges from connections
  if (Array.isArray(rawConnections)) {
    for (const conn of rawConnections as Array<Record<string, unknown>>) {
      const from = (conn?.from_node ?? conn?.from ?? conn?.source) as number | undefined;
      const to = (conn?.to_node ?? conn?.to ?? conn?.target) as number | undefined;
      if (typeof from === 'number' && typeof to === 'number') {
        // Only add edge if both nodes exist in the graph
        if (g.hasNode(String(from)) && g.hasNode(String(to))) {
          g.setEdge(String(from), String(to));
        }
      }
    }
  }

  // Run the dagre layout algorithm
  Dagre.layout(g);

  // Extract positions from the laid-out graph
  // Dagre returns center positions, adjust to top-left corner for React Flow
  for (const nodeId of g.nodes()) {
    const nodeData = g.node(nodeId);
    if (nodeData) {
      positions.set(Number(nodeId), {
        x: nodeData.x - nodeWidth / 2,
        y: nodeData.y - nodeHeight / 2,
      });
    }
  }

  return positions;
}

/**
 * Generate connections between nodes based on their sequence
 */
function generateNodeConnections(nodes: WorkflowNode[]): WorkflowConnection[] {
  const connections: WorkflowConnection[] = [];
  
  for (let i = 0; i < nodes.length - 1; i++) {
    const sourceNode = nodes[i];
    const targetNode = nodes[i + 1];
    
    // Only create connection if source has output and target has input
    if (sourceNode.outputs.length > 0 && targetNode.inputs.length > 0) {
      const connection: WorkflowConnection = {
        id: `${sourceNode.id}-to-${targetNode.id}`,
        sourceNodeId: sourceNode.id,
        targetNodeId: targetNode.id,
        sourceOutputId: sourceNode.outputs[0].id,
        targetInputId: targetNode.inputs[0].id
      };
      
      connections.push(connection);
    }
  }
  
  return connections;
}

/**
 * Transform backend workflow detailed to frontend format with nodes and connections
 */
export function transformBackendWorkflowDetailed(
  backendWorkflow: BackendWorkflowDetailed
): {
  workflow: FrontendWorkflow;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
} {
  // Transform basic workflow info
  // Pass backendWorkflow directly; assuming it has all BackendWorkflow properties
  const workflow = transformBackendWorkflow(backendWorkflow as BackendWorkflow);

  const baseNodes = backendWorkflow.nodes || [];
  const rawConnections: any = (backendWorkflow as any).connections;

  // First pass: identify which node_instance_ids have outgoing connections
  // This helps us infer pass_through for destination nodes
  const nodesWithOutgoingConnections = new Set<number>();
  if (Array.isArray(rawConnections)) {
    for (const conn of rawConnections) {
      const fromInst = (conn?.from_node ?? conn?.from ?? conn?.source) as number | undefined;
      if (typeof fromInst === 'number') {
        nodesWithOutgoingConnections.add(fromInst);
      }
    }
  }

  // Calculate positions based on connection topology (left-to-right flow)
  const positionsFromConnections = calculatePositionsFromConnections(baseNodes, rawConnections);

  // Transform nodes with proper positioning and assign stable UI ids (uid if present, else generated)
  // Also infer pass_through for destination nodes that have outgoing connections
  const idCounters: Record<string, number> = {};

  const nodes = baseNodes.map((bn) => {
    const base = transformBackendNode(bn, baseNodes);
    const count = (idCounters[bn.node_id] || 0) + 1;
    idCounters[bn.node_id] = count;
    const uiId = (bn as any).uid || `${bn.node_id}_${count}`;

    // Check if this destination node has outgoing connections - if so, infer pass_through
    const nodeInstanceId = (bn as any).node_instance_id;
    const hasOutgoingConnection = typeof nodeInstanceId === 'number' && nodesWithOutgoingConnections.has(nodeInstanceId);

    // Use connection-based position if available, otherwise use default position
    const connectionBasedPosition = typeof nodeInstanceId === 'number'
      ? positionsFromConnections.get(nodeInstanceId)
      : undefined;
    const position = connectionBasedPosition || base.position;

    // If it's a destination node with outgoing connections but no output port, add one
    if (hasOutgoingConnection && bn.node_type === 'destinations' && base.outputs.length === 0) {
      // Infer pass_through: add output port and update data
      return {
        ...base,
        id: uiId,
        position,
        outputs: [{ id: 'out', name: 'Output' }],
        data: { ...base.data, pass_through: true },
      };
    }

    return { ...base, id: uiId, position };
  });

  // Generate connections
  let connections: WorkflowConnection[] = [];
  {
    // Build helper maps for multiple connection shapes
    const instanceIdToUiNode = new Map<number, WorkflowNode>();
    const firstUiNodeByBackendNodeId = new Map<string, WorkflowNode>();
    baseNodes.forEach((bn, idx) => {
      const maybeInstanceId = (bn as any).node_instance_id;
      if (typeof maybeInstanceId === 'number') {
        instanceIdToUiNode.set(maybeInstanceId, nodes[idx]);
      }
      if (!firstUiNodeByBackendNodeId.has(bn.node_id)) {
        firstUiNodeByBackendNodeId.set(bn.node_id, nodes[idx]);
      }
    });

    if (Array.isArray(rawConnections)) {
      // Shape: [{ from_node: number, to_node: number }, ...]
      for (const conn of rawConnections) {
        const fromInst = (conn?.from_node ?? conn?.from ?? conn?.source) as number | undefined;
        const toInst = (conn?.to_node ?? conn?.to ?? conn?.target) as number | undefined;
        const fromUi = typeof fromInst === 'number' ? instanceIdToUiNode.get(fromInst) : undefined;
        const toUi = typeof toInst === 'number' ? instanceIdToUiNode.get(toInst) : undefined;
        if (!fromUi || !toUi) continue;
        // Use actual node ports (already calculated with dynamic ports) instead of spec lookup
        const fromOutput = fromUi.outputs[0]?.id || 'out';
        const toInput = toUi.inputs[0]?.id || 'in';
        connections.push({
          id: `${fromUi.id}-to-${toUi.id}`,
          sourceNodeId: fromUi.id,
          sourceOutputId: fromOutput,
          targetNodeId: toUi.id,
          targetInputId: toInput,
        });
      }
    } else if (rawConnections && typeof rawConnections === 'object' && Object.keys(rawConnections).length) {
      // Shape: { [backend_node_id: string]: string[] }
      for (const [fromNodeId, toListAny] of Object.entries(rawConnections as Record<string, unknown>)) {
        const toList = Array.isArray(toListAny) ? (toListAny as string[]) : [];
        if (!toList.length) continue;
        const fromUi = firstUiNodeByBackendNodeId.get(fromNodeId);
        if (!fromUi) continue;
        // Use actual node ports (already calculated with dynamic ports) instead of spec lookup
        const fromOutput = fromUi.outputs[0]?.id || 'out';
        for (const toNodeId of toList) {
          const toUi = firstUiNodeByBackendNodeId.get(toNodeId);
          if (!toUi) continue;
          const toInput = toUi.inputs[0]?.id || 'in';
          connections.push({
            id: `${fromUi.id}-to-${toUi.id}`,
            sourceNodeId: fromUi.id,
            sourceOutputId: fromOutput,
            targetNodeId: toUi.id,
            targetInputId: toInput,
          });
        }
      }
    } else {
      // Fallback: sequential connections
      connections = generateNodeConnections(nodes);
    }
  }

  // Deduplicate connections by id and avoid self-loops
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const uniq = new Map<string, WorkflowConnection>();
  for (const c of connections) {
    if (c.sourceNodeId === c.targetNodeId) continue;
    // Validate that source node has the output port
    const sourceNode = nodeById.get(c.sourceNodeId);
    if (sourceNode) {
      const hasOutputPort = sourceNode.outputs.some(o => o.id === c.sourceOutputId);
      if (!hasOutputPort) {
        // Skip this connection - source node doesn't have the output port
        console.warn(`Skipping connection ${c.id}: source node ${c.sourceNodeId} doesn't have output port ${c.sourceOutputId}`);
        continue;
      }
    }
    if (!uniq.has(c.id)) uniq.set(c.id, c);
  }
  connections = Array.from(uniq.values());

  return {
    workflow,
    nodes,
    connections
  };
}

