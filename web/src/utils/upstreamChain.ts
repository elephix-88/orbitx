import { WorkflowNode, WorkflowConnection } from '@/types/workflow';
import { getNodeSpec } from '@/workflow/registry';

export interface UpstreamNodeRequest {
  node_type: string;
  node_category: string;
  parameters: Record<string, unknown>;
}

/**
 * Walk workflow connections backwards from a given node to build the ordered
 * chain of upstream nodes. Returns them in topological order (sources first).
 */
export function getUpstreamChain(
  nodeId: string,
  nodes: WorkflowNode[],
  connections: WorkflowConnection[]
): UpstreamNodeRequest[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  // Build reverse adjacency: targetNodeId -> sourceNodeIds
  const incomingMap = new Map<string, string[]>();
  for (const connection of connections) {
    const sources = incomingMap.get(connection.targetNodeId) ?? [];
    sources.push(connection.sourceNodeId);
    incomingMap.set(connection.targetNodeId, sources);
  }

  // Walk backwards via BFS, then reverse to get topological order
  const visited = new Set<string>();
  const orderedIds: string[] = [];
  const queue = incomingMap.get(nodeId) ?? [];

  // Seed the queue with direct parents
  const toVisit = [...queue];

  while (toVisit.length > 0) {
    const currentId = toVisit.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    orderedIds.push(currentId);

    const parents = incomingMap.get(currentId) ?? [];
    for (const parentId of parents) {
      if (!visited.has(parentId)) {
        toVisit.push(parentId);
      }
    }
  }

  // Reverse so sources come first (topological order)
  orderedIds.reverse();

  const results: UpstreamNodeRequest[] = [];

  for (const id of orderedIds) {
    const node = nodeMap.get(id);
    if (!node) continue;

    const spec = getNodeSpec(node.definitionId);
    let nodeType: string = node.definitionId || node.type;
    let parameters: Record<string, unknown> = node.data || {};

    if (spec?.adapters?.toBackend) {
      const adapted = spec.adapters.toBackend(node.data || {});
      nodeType = adapted.node_id;
      parameters = adapted.parameters as Record<string, unknown>;
    }

    results.push({
      node_type: nodeType,
      node_category: node.type,
      parameters,
    });
  }

  return results;
}
