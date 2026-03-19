import { WorkflowNode, WorkflowConnection } from '@/types/workflow';

export interface UpstreamColumn {
  name: string;
  source: string; // Node name that provides this column
}

/**
 * Find immediate parent nodes connected to a given node
 */
export function findUpstreamNodes(
  nodeId: string,
  nodes: WorkflowNode[],
  connections: WorkflowConnection[]
): WorkflowNode[] {
  const parentIds = connections
    .filter((c) => c.targetNodeId === nodeId)
    .map((c) => c.sourceNodeId);

  return nodes.filter((n) => parentIds.includes(n.id));
}

/**
 * Infer available columns from a node's configuration
 * This handles different node types and their field storage patterns
 *
 * @param node - The node to infer columns from
 * @param nodes - All nodes (needed for pass-through destinations)
 * @param connections - All connections (needed for pass-through destinations)
 */
export function inferColumnsFromNode(
  node: WorkflowNode,
  nodes?: WorkflowNode[],
  connections?: WorkflowConnection[]
): string[] {
  const data = node.data || {};

  // Facebook Ads - uses 'fields' array
  if (node.name === 'Facebook Ads') {
    const fields = data.fields as string[] | undefined;
    if (Array.isArray(fields) && fields.length > 0) {
      return fields;
    }
  }

  // Google Ads - uses 'fields' array
  if (node.name === 'Google Ads') {
    const fields = data.fields as string[] | undefined;
    if (Array.isArray(fields) && fields.length > 0) {
      return fields;
    }
  }

  // SQL Transform - we can't easily infer output columns without parsing SQL
  // Return empty - user needs to know their SQL output
  if (node.name === 'SQL Transform') {
    return [];
  }

  // Rename Columns - output is the renamed columns
  // We can infer from column_mapping values (new names)
  if (node.name === 'Rename Columns') {
    const mapping = data.column_mapping as Record<string, string> | undefined;
    if (mapping && typeof mapping === 'object') {
      // Return the NEW column names (values of the mapping)
      return Object.values(mapping);
    }
  }

  // Join Tables - we can't easily infer output columns without knowing all inputs
  // The output will be a combination of all joined tables' columns
  // Return empty - user needs to track their join output manually
  if (node.name === 'Join Tables') {
    return [];
  }

  // Any destination with pass_through - pass through columns from upstream
  // This works for BigQuery, Google Sheets, MySQL, or any future destination
  if (data.pass_through === true) {
    // Need nodes and connections to look up this node's upstream
    if (nodes && connections) {
      const upstreamNodes = findUpstreamNodes(node.id, nodes, connections);
      const columns: string[] = [];
      for (const upstream of upstreamNodes) {
        const upstreamCols = inferColumnsFromNode(upstream, nodes, connections);
        columns.push(...upstreamCols);
      }
      return columns;
    }
    return [];
  }

  // Generic fallback - try common field patterns
  if (Array.isArray(data.fields)) {
    return data.fields as string[];
  }
  if (Array.isArray(data.columns)) {
    return data.columns as string[];
  }

  return [];
}

/**
 * Get all available columns from upstream nodes
 * Returns columns with their source node name for context
 */
export function getUpstreamColumns(
  nodeId: string,
  nodes: WorkflowNode[],
  connections: WorkflowConnection[]
): UpstreamColumn[] {
  const upstreamNodes = findUpstreamNodes(nodeId, nodes, connections);
  const columns: UpstreamColumn[] = [];

  for (const node of upstreamNodes) {
    // Pass nodes and connections for pass-through destinations (like BigQuery with enable_output)
    const nodeColumns = inferColumnsFromNode(node, nodes, connections);
    for (const col of nodeColumns) {
      columns.push({
        name: col,
        source: node.name,
      });
    }
  }

  return columns;
}

/**
 * Get just the column names (without source info) from upstream nodes
 */
export function getUpstreamColumnNames(
  nodeId: string,
  nodes: WorkflowNode[],
  connections: WorkflowConnection[]
): string[] {
  return getUpstreamColumns(nodeId, nodes, connections).map((c) => c.name);
}
