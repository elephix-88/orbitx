import { getNodeSpec } from './registry';
import type { WorkflowNode, WorkflowConnection } from '@/types/workflow';

const ALLOWED_TARGET_CATEGORIES: Record<string, ReadonlySet<string>> = {
 source: new Set(['transform', 'destination']),
 transform: new Set(['transform', 'destination']),
 destination: new Set(),
};

function getMaxInputs(node: WorkflowNode): number | null {
 const spec = getNodeSpec(node.definitionId);
 if (!spec) return null;
 const ports = spec.getDynamicPorts ? spec.getDynamicPorts(node.data) : spec.ports;
 const inputPort = ports.find((p) => p.io === 'input');
 if (!inputPort) return 0;
 if (inputPort.multiple) return null;
 return 1;
}

export type ConnectionRejectionReason =
 | 'self_connection'
 | 'category_incompatible'
 | 'duplicate_edge'
 | 'target_at_max_inputs'
 | 'source_has_no_output';

export interface ConnectionCheckResult {
 allowed: boolean;
 reason?: ConnectionRejectionReason;
 message?: string;
}

export function isConnectionAllowed(
 sourceNode: WorkflowNode,
 targetNode: WorkflowNode,
 existingConnections: WorkflowConnection[]
): ConnectionCheckResult {
 // Rule 1: No self-connections
 if (sourceNode.id === targetNode.id) {
 return { allowed: false, reason: 'self_connection', message: 'Cannot connect a node to itself' };
 }

 // Rule 2: Source node must have an output port
 const sourceSpec = getNodeSpec(sourceNode.definitionId);
 if (sourceSpec) {
 const sourcePorts = sourceSpec.getDynamicPorts ? sourceSpec.getDynamicPorts(sourceNode.data) : sourceSpec.ports;
 const hasOutput = sourcePorts.some((p) => p.io === 'output');
 if (!hasOutput) {
 return { allowed: false, reason: 'source_has_no_output', message: `${sourceNode.name} has no output port` };
 }
 }

 // Rule 3: Category compatibility
 const allowedTargets = ALLOWED_TARGET_CATEGORIES[sourceNode.type];
 if (allowedTargets !== undefined && !allowedTargets.has(targetNode.type)) {
 return {
 allowed: false,
 reason: 'category_incompatible',
 message: `${sourceNode.type} nodes cannot connect to ${targetNode.type} nodes`,
 };
 }

 // Rule 4: No duplicate edges
 const alreadyConnected = existingConnections.some(
 (c) => c.sourceNodeId === sourceNode.id && c.targetNodeId === targetNode.id
 );
 if (alreadyConnected) {
 return { allowed: false, reason: 'duplicate_edge', message: 'These nodes are already connected' };
 }

 // Rule 5: Target node max inputs
 const maxInputs = getMaxInputs(targetNode);
 if (maxInputs !== null) {
 const currentInputCount = existingConnections.filter((c) => c.targetNodeId === targetNode.id).length;
 if (currentInputCount >= maxInputs) {
 return {
 allowed: false,
 reason: 'target_at_max_inputs',
 message: `${targetNode.name} already has the maximum number of inputs (${maxInputs})`,
 };
 }
 }

 return { allowed: true };
}

export function getRejectionMessage(
 sourceNode: WorkflowNode,
 targetNode: WorkflowNode,
 existingConnections: WorkflowConnection[]
): string | undefined {
 const result = isConnectionAllowed(sourceNode, targetNode, existingConnections);
 return result.allowed ? undefined : result.message;
}
