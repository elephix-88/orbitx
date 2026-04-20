import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
 ReactFlow,
 Background,
 Connection,
 Edge,
 MiniMap,
 Node,
 NodeChange,
 EdgeChange,
 applyNodeChanges,
 Panel,
 useReactFlow,
 ReactFlowProvider,
 BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
 Zap,
 AlignHorizontalSpaceAround,
 Maximize2,
 Plus,
 Minus,
 Undo2,
 Redo2,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowNode as WorkflowNodeType, WorkflowConnection } from '@/types/workflow';
import { getNodeSpec } from '@/workflow/registry';
import { isConnectionAllowed, getRejectionMessage } from '@/workflow/connectionRules';
import { useNotification } from '@/hooks/useNotification';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { validateWorkflow, type NodeValidationResult } from '../WorkflowValidation';
import { type WorkflowNodeData } from './WorkflowNode';
import NodeCard from '@/components/builder/NodeCard';
import CustomEdge from './CustomEdge';

// Define custom node type for React Flow
// Note: Using 'any' for node data type due to React Flow v12 strict typing constraints
type ReactFlowNodeType = Node<WorkflowNodeData>;

// Node and Edge type definitions for React Flow
const nodeTypes = {
 custom: NodeCard,
};

const edgeTypes = {
 custom: CustomEdge,
};

interface ReactFlowCanvasProps {
 nodes: WorkflowNodeType[];
 connections: WorkflowConnection[];
 onNodesChange: (
 _nodes: WorkflowNodeType[] | ((_prev: WorkflowNodeType[]) => WorkflowNodeType[])
 ) => void;
 onConnectionsChange: (
 _connections:
 | WorkflowConnection[]
 | ((_prev: WorkflowConnection[]) => WorkflowConnection[])
 ) => void;
 onNodeSelect: (_node: WorkflowNodeType | null) => void;
 isMobile?: boolean;
 onNodeOpenEditor?: (_node: WorkflowNodeType) => void;
 /** Set of node_instance_id strings that are currently pinned. */
 pinnedNodeInstanceIds?: ReadonlySet<string>;
 /** Set of node React IDs that have a cached preview result. */
 previewedNodeIds?: ReadonlySet<string>;
 onPinNode?: (_node: WorkflowNodeType) => void;
 onUnpinNode?: (_node: WorkflowNodeType) => void;
 /** Map of node React ID → preview status for source node Play buttons. */
 previewStatusMap?: ReadonlyMap<string, string>;
 /** Called when user clicks the Play button on a source node. */
 onPreviewNode?: (_node: WorkflowNodeType) => void;

 /**
 * Debug mode: map of node_instance_id (string) → overlay data.
 * Present only when an execution is loaded for inspection.
 */
 debugNodeMap?: ReadonlyMap<string, {
 failed: boolean;
 succeeded: boolean;
 rowCount: number;
 errorMessage: string | null;
 }>;
 /** Called when user double-clicks a node in debug mode. */
 onDebugInspectNode?: (_node: WorkflowNodeType) => void;
}

type DebugNodeData = {
 failed: boolean;
 succeeded: boolean;
 rowCount: number;
 errorMessage: string | null;
};

// Convert WorkflowNode to React Flow Node
const toReactFlowNode = (
 node: WorkflowNodeType,
 validation: NodeValidationResult | undefined,
 onOpenEditor: (() => void) | undefined,
 onDelete: (() => void) | undefined,
 onDuplicate: (() => void) | undefined,
 isPinned: boolean,
 hasPreview: boolean,
 onPin: (() => void) | undefined,
 onUnpin: (() => void) | undefined,
 debugData: DebugNodeData | undefined,
 onDebugInspect: (() => void) | undefined,
 previewStatus: string | undefined,
 onPreview: (() => void) | undefined
): ReactFlowNodeType => ({
 id: node.id,
 type: 'custom',
 position: node.position,
 data: {
 name: node.name,
 display_name: node.display_name,
 icon: getNodeSpec(node.definitionId)?.icon,
 color: getNodeSpec(node.definitionId)?.color,
 category: node.type,
 status: node.status === 'pending' ? 'idle' : node.status,
 inputs: node.inputs,
 outputs: node.outputs,
 validationStatus: validation?.status,
 validationIssues: validation?.issues,
 onOpenEditor,
 onDelete,
 onDuplicate,
 isPinned,
 hasPreview,
 onPin,
 onUnpin,
 debugFailed: debugData?.failed,
 debugSucceeded: debugData?.succeeded,
 debugRowCount: debugData?.rowCount,
 debugErrorMessage: debugData?.errorMessage ?? null,
 onDebugInspect,
 previewStatus: previewStatus as ('idle' | 'running' | 'done' | 'error' | undefined),
 onPreview,
 },
});

// Convert React Flow Node back to WorkflowNode
const fromReactFlowNode = (
 rfNode: ReactFlowNodeType,
 original: WorkflowNodeType
): WorkflowNodeType => ({
 ...original,
 position: rfNode.position,
});

// Convert WorkflowConnection to React Flow Edge
// Note: If no specific handle ID is provided, use default 'out'/'in' IDs (matching node-specs)
const toReactFlowEdge = (conn: WorkflowConnection): Edge => ({
 id: conn.id,
 source: conn.sourceNodeId,
 target: conn.targetNodeId,
 sourceHandle: conn.sourceOutputId || 'out',
 targetHandle: conn.targetInputId || 'in',
 type: 'custom',
});

// Inner component that uses React Flow hooks
const ReactFlowCanvasInner: React.FC<ReactFlowCanvasProps> = ({
 nodes: workflowNodes,
 connections: workflowConnections,
 onNodesChange: onWorkflowNodesChange,
 onConnectionsChange: onWorkflowConnectionsChange,
 onNodeSelect,
 isMobile = false,
 onNodeOpenEditor,
 pinnedNodeInstanceIds,
 previewedNodeIds,
 onPinNode,
 onUnpinNode,
 debugNodeMap,
 onDebugInspectNode,
 previewStatusMap,
 onPreviewNode,
}) => {
 const reactFlowWrapper = useRef<HTMLDivElement>(null);
 const { fitView, getViewport } = useReactFlow();
 const { notify } = useNotification();
 const pendingConnectionSourceRef = useRef<string | null>(null);
 const connectionSucceededRef = useRef<boolean>(false);

 // Delete confirmation state
 const [confirmDeleteNodeId, setConfirmDeleteNodeId] = useState<string | null>(null);
 const [confirmingDelete, setConfirmingDelete] = useState(false);

 // Compute validation for all nodes
 const validationResult = useMemo(() => {
 return validateWorkflow(workflowNodes, workflowConnections);
 }, [workflowNodes, workflowConnections]);

 // Create a map of node validation results for quick lookup
 const nodeValidationMap = useMemo(() => {
 const map = new Map<string, NodeValidationResult>();
 validationResult.nodeResults.forEach((result) => {
 map.set(result.nodeId, result);
 });
 return map;
 }, [validationResult]);

 // Request delete node (opens confirmation dialog)
 const requestDeleteNode = useCallback((nodeId: string) => {
 setConfirmDeleteNodeId(nodeId);
 }, []);

 // Duplicate a node
 const handleDuplicateNode = useCallback(
 (nodeId: string) => {
 const nodeToDuplicate = workflowNodes.find((n) => n.id === nodeId);
 if (!nodeToDuplicate) return;

 // Create a deep copy of the node with a new ID and offset position
 const duplicatedNode: WorkflowNodeType = {
 ...nodeToDuplicate,
 id: `node_${uuidv4()}`,
 name: `${nodeToDuplicate.name} (copy)`,
 position: {
 x: nodeToDuplicate.position.x + 50,
 y: nodeToDuplicate.position.y + 50,
 },
 data: JSON.parse(JSON.stringify(nodeToDuplicate.data)),
 inputs: nodeToDuplicate.inputs.map((input) => ({ ...input })),
 outputs: nodeToDuplicate.outputs.map((output) => ({ ...output })),
 status: 'pending',
 };

 onWorkflowNodesChange((currentNodes) => [...currentNodes, duplicatedNode]);
 },
 [workflowNodes, onWorkflowNodesChange]
 );

 // Actually delete the node
 const handleDeleteNode = useCallback(
 (nodeId: string) => {
 onWorkflowNodesChange((curr) => curr.filter((n) => n.id !== nodeId));
 onWorkflowConnectionsChange((curr) =>
 curr.filter(
 (c) => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
 )
 );
 },
 [onWorkflowNodesChange, onWorkflowConnectionsChange]
 );

 // Convert workflow nodes to React Flow nodes
 const rfNodes = useMemo<ReactFlowNodeType[]>(() => {
 return workflowNodes.map((node) => {
 // node_instance_id is stored inside node.data by the backend transformer
 const instanceId = node.data?.node_instance_id;
 const instanceIdStr = instanceId !== undefined ? String(instanceId) : '';
 const isPinned = instanceIdStr !== '' && (pinnedNodeInstanceIds?.has(instanceIdStr) ?? false);
 const hasPreview = previewedNodeIds?.has(node.id) ?? false;

 // Debug overlay — reuse the same instanceIdStr computed above
 const debugData = instanceIdStr !== '' ? debugNodeMap?.get(instanceIdStr) : undefined;

 const previewStatus = previewStatusMap?.get(node.id);

 return toReactFlowNode(
 node,
 nodeValidationMap.get(node.id),
 onNodeOpenEditor ? () => onNodeOpenEditor(node) : undefined,
 () => requestDeleteNode(node.id),
 () => handleDuplicateNode(node.id),
 isPinned,
 hasPreview,
 onPinNode ? () => onPinNode(node) : undefined,
 onUnpinNode ? () => onUnpinNode(node) : undefined,
 debugData,
 onDebugInspectNode ? () => onDebugInspectNode(node) : undefined,
 previewStatus,
 onPreviewNode ? () => onPreviewNode(node) : undefined
 );
 });
 }, [
 workflowNodes,
 nodeValidationMap,
 onNodeOpenEditor,
 requestDeleteNode,
 handleDuplicateNode,
 pinnedNodeInstanceIds,
 previewedNodeIds,
 onPinNode,
 onUnpinNode,
 debugNodeMap,
 onDebugInspectNode,
 previewStatusMap,
 onPreviewNode,
 ]);

 // Convert workflow connections to React Flow edges
 const rfEdges = useMemo<Edge[]>(() => {
 return workflowConnections.map(toReactFlowEdge);
 }, [workflowConnections]);

 // Handle node changes from React Flow
 const handleNodesChange = useCallback(
 (changes: NodeChange<ReactFlowNodeType>[]) => {
 // Apply changes to get new nodes
 const updatedRfNodes = applyNodeChanges(changes, rfNodes);

 // Check if any position changed
 const positionChanges = changes.filter(
 (c) => c.type === 'position' && c.position
 );

 if (positionChanges.length > 0) {
 onWorkflowNodesChange((prevNodes) => {
 return prevNodes.map((node) => {
 const rfNode = updatedRfNodes.find((n) => n.id === node.id) as ReactFlowNodeType | undefined;
 if (rfNode) {
 return fromReactFlowNode(rfNode, node);
 }
 return node;
 });
 });
 }

 // Handle selection changes
 const selectionChanges = changes.filter((c) => c.type === 'select');
 if (selectionChanges.length > 0) {
 const selectedChange = selectionChanges.find(
 (c) => c.type === 'select' && c.selected
 );
 if (selectedChange && selectedChange.type === 'select') {
 const selectedNode = workflowNodes.find(
 (n) => n.id === selectedChange.id
 );
 onNodeSelect(selectedNode || null);
 }
 }
 },
 [rfNodes, onWorkflowNodesChange, workflowNodes, onNodeSelect]
 );

 // Handle edge changes from React Flow
 const handleEdgesChange = useCallback(
 (changes: EdgeChange<Edge>[]) => {
 // Handle deletions
 const removeChanges = changes.filter((c) => c.type === 'remove');
 if (removeChanges.length > 0) {
 const idsToRemove = new Set(
 removeChanges.map((c) => (c.type === 'remove' ? c.id : ''))
 );
 onWorkflowConnectionsChange((prev) =>
 prev.filter((c) => !idsToRemove.has(c.id))
 );
 }
 },
 [onWorkflowConnectionsChange]
 );

 // Handle new connections
 const handleConnect = useCallback(
 (connection: Connection) => {
 if (!connection.source || !connection.target) return;
 connectionSucceededRef.current = true;

 const newConnection: WorkflowConnection = {
 id: `conn_${Date.now()}`,
 sourceNodeId: connection.source,
 targetNodeId: connection.target,
 sourceOutputId: connection.sourceHandle || undefined,
 targetInputId: connection.targetHandle || undefined,
 };

 onWorkflowConnectionsChange((prev) => [...prev, newConnection]);
 },
 [onWorkflowConnectionsChange]
 );

 const handleIsValidConnection = useCallback(
 (connection: Edge | Connection): boolean => {
 if (!connection.source || !connection.target) return false;
 const sourceNode = workflowNodes.find((n) => n.id === connection.source);
 const targetNode = workflowNodes.find((n) => n.id === connection.target);
 if (!sourceNode || !targetNode) return false;
 return isConnectionAllowed(sourceNode, targetNode, workflowConnections).allowed;
 },
 [workflowNodes, workflowConnections]
 );

 const handleConnectStart = useCallback(
 (_event: unknown, params: { nodeId: string | null }) => {
 pendingConnectionSourceRef.current = params.nodeId;
 connectionSucceededRef.current = false;
 },
 []
 );

 const handleConnectEnd = useCallback(
 (event: MouseEvent | TouchEvent) => {
 if (connectionSucceededRef.current) {
 pendingConnectionSourceRef.current = null;
 connectionSucceededRef.current = false;
 return;
 }

 const sourceNodeId = pendingConnectionSourceRef.current;
 if (!sourceNodeId) return;

 const targetElement = (event.target as Element)?.closest('[data-id]');
 const targetNodeId = targetElement?.getAttribute('data-id');

 if (targetNodeId && targetNodeId !== sourceNodeId) {
 const sourceNode = workflowNodes.find((n) => n.id === sourceNodeId);
 const targetNode = workflowNodes.find((n) => n.id === targetNodeId);

 if (sourceNode && targetNode) {
 const message = getRejectionMessage(sourceNode, targetNode, workflowConnections);
 if (message) {
 notify.warning('Connection not allowed', message);
 }
 }
 }

 pendingConnectionSourceRef.current = null;
 connectionSucceededRef.current = false;
 },
 [workflowNodes, workflowConnections, notify]
 );

 // Handle drag and drop from sidebar
 const handleDragOver = useCallback((e: React.DragEvent) => {
 e.preventDefault();
 e.dataTransfer.dropEffect = 'move';
 }, []);

 const handleDrop = useCallback(
 (e: React.DragEvent) => {
 e.preventDefault();
 const nodeTypeData = e.dataTransfer.getData('application/json');
 if (!nodeTypeData || !reactFlowWrapper.current) return;

 const nodeType = JSON.parse(nodeTypeData);
 if (!nodeType) return;

 const bounds = reactFlowWrapper.current.getBoundingClientRect();
 const { x, y, zoom } = getViewport();

 const position = {
 x: (e.clientX - bounds.left - x) / zoom,
 y: (e.clientY - bounds.top - y) / zoom,
 };

 // Create new node
 let newNode: WorkflowNodeType;
 if (nodeType.registryTypeId) {
 const spec = getNodeSpec(nodeType.registryTypeId);
 if (spec) {
 const typeLower = spec.category.toLowerCase() as
 | 'source'
 | 'transform'
 | 'destination';
 const inputs = spec.ports
 .filter((p) => p.io === 'input')
 .map((p) => ({ id: p.id, name: p.name }));
 const outputs = spec.ports
 .filter((p) => p.io === 'output')
 .map((p) => ({ id: p.id, name: p.name }));
 newNode = {
 id: `node_${uuidv4()}`,
 type: typeLower,
 name: spec.displayName,
 definitionId: nodeType.registryTypeId,
 position: {
 x: position.x - (isMobile ? 70 : 80),
 y: position.y - (isMobile ? 30 : 26),
 },
 data: { ...(spec.defaults as Record<string, any>) },
 inputs,
 outputs,
 status: 'pending',
 };
 } else {
 newNode = {
 id: `node_${uuidv4()}`,
 type: nodeType.type,
 name: nodeType.name,
 definitionId: nodeType.registryTypeId,
 position: {
 x: position.x - (isMobile ? 70 : 80),
 y: position.y - (isMobile ? 30 : 26),
 },
 data: { ...nodeType.defaultData },
 inputs: nodeType.inputs,
 outputs: nodeType.outputs,
 status: 'pending',
 };
 }
 } else {
 newNode = {
 id: `node_${uuidv4()}`,
 type: nodeType.type,
 name: nodeType.name,
 definitionId: nodeType.type,
 position: {
 x: position.x - (isMobile ? 70 : 80),
 y: position.y - (isMobile ? 30 : 26),
 },
 data: { ...nodeType.defaultData },
 inputs: nodeType.inputs,
 outputs: nodeType.outputs,
 status: 'pending',
 };
 }

 onWorkflowNodesChange((currentNodes) => [...currentNodes, newNode]);
 },
 [getViewport, isMobile, onWorkflowNodesChange]
 );

 // Auto-arrange nodes using topological sort
 const handleAutoArrange = useCallback(() => {
 if (workflowNodes.length === 0) return;

 const nodeWidth = isMobile ? 120 : 160;
 const nodeHeight = isMobile ? 44 : 52;

 // Build adjacency list from connections
 const outgoing = new Map<string, string[]>();
 const incoming = new Map<string, string[]>();
 workflowNodes.forEach((n) => {
 outgoing.set(n.id, []);
 incoming.set(n.id, []);
 });
 workflowConnections.forEach((c) => {
 outgoing.get(c.sourceNodeId)?.push(c.targetNodeId);
 incoming.get(c.targetNodeId)?.push(c.sourceNodeId);
 });

 // Find root nodes (no incoming connections)
 const roots = workflowNodes.filter(
 (n) => (incoming.get(n.id)?.length || 0) === 0
 );

 // Assign levels using BFS
 const levels = new Map<string, number>();
 const queue = roots.map((n) => ({ id: n.id, level: 0 }));
 const visited = new Set<string>();

 while (queue.length > 0) {
 const { id, level } = queue.shift()!;
 if (visited.has(id)) continue;
 visited.add(id);
 levels.set(id, Math.max(levels.get(id) || 0, level));

 const children = outgoing.get(id) || [];
 children.forEach((childId) => {
 if (!visited.has(childId)) {
 queue.push({ id: childId, level: level + 1 });
 }
 });
 }

 // Handle disconnected nodes
 workflowNodes.forEach((n) => {
 if (!levels.has(n.id)) {
 levels.set(n.id, 0);
 }
 });

 // Group nodes by level
 const nodesByLevel = new Map<number, WorkflowNodeType[]>();
 workflowNodes.forEach((n) => {
 const level = levels.get(n.id) || 0;
 if (!nodesByLevel.has(level)) {
 nodesByLevel.set(level, []);
 }
 nodesByLevel.get(level)!.push(n);
 });

 // Layout parameters
 const horizontalGap = nodeWidth + 60;
 const verticalGap = nodeHeight + 24;
 const startX = 100;
 const startY = 100;

 // Position nodes
 const newPositions: Record<string, { x: number; y: number }> = {};
 const maxLevel = Math.max(...Array.from(levels.values()));

 for (let level = 0; level <= maxLevel; level++) {
 const nodesAtLevel = nodesByLevel.get(level) || [];
 const totalHeight =
 nodesAtLevel.length * nodeHeight +
 (nodesAtLevel.length - 1) * (verticalGap - nodeHeight);
 const startYForLevel =
 startY +
 (workflowNodes.length > 1 ? -totalHeight / 2 + 150 : 0);

 nodesAtLevel.forEach((node, index) => {
 newPositions[node.id] = {
 x: startX + level * horizontalGap,
 y: startYForLevel + index * verticalGap,
 };
 });
 }

 // Apply new positions
 onWorkflowNodesChange((curr) =>
 curr.map((n) => ({
 ...n,
 position: newPositions[n.id] || n.position,
 }))
 );

 // Fit to view after arranging
 setTimeout(() => fitView({ padding: 0.2 }), 50);
 }, [workflowNodes, workflowConnections, isMobile, onWorkflowNodesChange, fitView]);

 // Handle pane click (deselect)
 const handlePaneClick = useCallback(() => {
 onNodeSelect(null);
 }, [onNodeSelect]);

 return (
 <div
 ref={reactFlowWrapper}
 className="w-full h-full"
 onDragOver={handleDragOver}
 onDrop={handleDrop}
 >
 <ReactFlow
 nodes={rfNodes as Node[]}
 edges={rfEdges}
 onNodesChange={handleNodesChange as any}
 onEdgesChange={handleEdgesChange}
 onConnect={handleConnect}
 isValidConnection={handleIsValidConnection}
 onConnectStart={handleConnectStart}
 onConnectEnd={handleConnectEnd}
 onPaneClick={handlePaneClick}
 nodeTypes={nodeTypes as any}
 edgeTypes={edgeTypes}
 fitView
 fitViewOptions={{ padding: 0.2 }}
 minZoom={0.25}
 maxZoom={3}
 defaultEdgeOptions={{
 type: 'custom',
 animated: true,
 }}
 connectionLineStyle={{
 stroke: 'var(--text-4)',
 strokeWidth: 2,
 strokeDasharray: '6 6',
 }}
 proOptions={{ hideAttribution: true }}
 className="bg-bg-page"
 >
 <Background
 variant={BackgroundVariant.Dots}
 gap={20}
 size={1.2}
 color="#DDE4F0"
 />

 {/* Floating top-left toolbar */}
 <Panel position="top-left" className="!m-3">
 <CanvasToolbar onAutoArrange={handleAutoArrange} canAutoArrange={workflowNodes.length > 0} />
 </Panel>

 {/* Floating top-right validity chip */}
 <Panel position="top-right" className="!m-3">
 <ValidityPill
 nodes={workflowNodes.length}
 edges={Array.isArray(workflowConnections) ? workflowConnections.length : 0}
 />
 </Panel>

 {/* Bottom-right minimap */}
 {workflowNodes.length > 0 && (
 <MiniMap
 position="bottom-right"
 className="!bg-bg-card !border !border-line-1 !rounded-xl !shadow-sm"
 maskColor="rgba(15, 23, 42, 0.04)"
 nodeColor={(node) => {
 const category = (node.data as WorkflowNodeData | undefined)?.category;
 if (category === 'source') return 'var(--blue-primary)';
 if (category === 'transform') return 'var(--warning)';
 if (category === 'destination') return 'var(--success)';
 return 'var(--text-4)';
 }}
 nodeStrokeWidth={0}
 pannable
 zoomable
 />
 )}

 {/* Empty State */}
 {workflowNodes.length === 0 && (
 <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
 <div className="text-center max-w-sm">
 <div className="w-14 h-14 mx-auto mb-5 bg-bg-card border border-line-1 rounded-2xl flex items-center justify-center">
 <Zap className="w-6 h-6 text-text-3" />
 </div>
 <h3 className="text-lg font-semibold text-text-1 mb-2">
 Start your pipeline
 </h3>
 <p className="text-sm text-text-3 mb-5">
 Drag nodes from the left panel to build your data workflow
 </p>
 <div className="flex justify-center gap-6 text-xs text-text-3">
 <span className="flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-blue-primary" />
 Source
 </span>
 <span className="flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-warning" />
 Transform
 </span>
 <span className="flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-success" />
 Destination
 </span>
 </div>
 </div>
 </div>
 )}
 </ReactFlow>

 {/* Delete Confirmation Dialog */}
 <ConfirmDialog
 isOpen={!!confirmDeleteNodeId}
 title="Delete Node?"
 message={
 <div>
 <p className="mb-1 text-sm text-text-2">
 This will remove the node and any connected lines.
 </p>
 </div>
 }
 confirmText="Delete"
 cancelText="Cancel"
 confirmLoading={confirmingDelete}
 onConfirm={async () => {
 if (!confirmDeleteNodeId) return;
 try {
 setConfirmingDelete(true);
 handleDeleteNode(confirmDeleteNodeId);
 } finally {
 setConfirmingDelete(false);
 setConfirmDeleteNodeId(null);
 }
 }}
 onCancel={() => setConfirmDeleteNodeId(null)}
 />
 </div>
 );
};

// Floating top-left canvas toolbar: fit / zoom / undo / redo / auto-arrange.
const CanvasToolbar: React.FC<{
 onAutoArrange: () => void;
 canAutoArrange: boolean;
}> = ({ onAutoArrange, canAutoArrange }) => {
 const reactFlow = useReactFlow();
 const [zoom, setZoom] = useState(1);

 React.useEffect(() => {
 const interval = window.setInterval(() => {
 setZoom(reactFlow.getZoom());
 }, 250);
 return () => window.clearInterval(interval);
 }, [reactFlow]);

 const iconButton =
 'inline-flex items-center justify-center w-7 h-7 rounded-md text-text-2 hover:bg-bg-row-hv hover:text-text-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors';

 return (
 <div className="flex items-center gap-0.5 bg-bg-card border border-line-1 rounded-lg shadow-sm px-1 py-1">
 <button
 type="button"
 onClick={() => reactFlow.fitView({ padding: 0.2, duration: 200 })}
 className={iconButton}
 title="Fit to view"
 aria-label="Fit to view"
 >
 <Maximize2 size={14} />
 </button>
 <button
 type="button"
 onClick={() => reactFlow.zoomIn({ duration: 150 })}
 className={iconButton}
 title="Zoom in"
 aria-label="Zoom in"
 >
 <Plus size={14} />
 </button>
 <button
 type="button"
 onClick={() => reactFlow.zoomOut({ duration: 150 })}
 className={iconButton}
 title="Zoom out"
 aria-label="Zoom out"
 >
 <Minus size={14} />
 </button>
 <span className="px-1.5 text-[11px] font-mono text-text-3 min-w-[34px] text-center">
 {Math.round(zoom * 100)}%
 </span>
 <span className="w-px h-4 bg-line-1" aria-hidden="true" />
 <button
 type="button"
 className={iconButton}
 disabled
 title="Undo (coming soon)"
 aria-label="Undo"
 >
 <Undo2 size={14} />
 </button>
 <button
 type="button"
 className={iconButton}
 disabled
 title="Redo (coming soon)"
 aria-label="Redo"
 >
 <Redo2 size={14} />
 </button>
 <span className="w-px h-4 bg-line-1" aria-hidden="true" />
 <button
 type="button"
 onClick={onAutoArrange}
 disabled={!canAutoArrange}
 className={iconButton}
 title="Auto arrange"
 aria-label="Auto arrange"
 >
 <AlignHorizontalSpaceAround size={14} />
 </button>
 </div>
 );
};

// Floating top-right validity pill: "● Valid | N nodes · M edges"
const ValidityPill: React.FC<{ nodes: number; edges: number }> = ({ nodes, edges }) => (
 <div className="flex items-center gap-2 bg-bg-card border border-line-1 rounded-lg shadow-sm px-2 py-1 text-[11.5px]">
 <span className="inline-flex items-center gap-1 text-text-1">
 <span className="w-2 h-2 rounded-full bg-success" aria-hidden="true" />
 Valid
 </span>
 <span className="text-text-4" aria-hidden="true">
 |
 </span>
 <span className="text-text-3">
 {nodes} {nodes === 1 ? 'node' : 'nodes'} · {edges} {edges === 1 ? 'edge' : 'edges'}
 </span>
 </div>
);

// Wrapper component with ReactFlowProvider
export const ReactFlowCanvas: React.FC<ReactFlowCanvasProps> = (props) => {
 return (
 <ReactFlowProvider>
 <ReactFlowCanvasInner {...props} />
 </ReactFlowProvider>
 );
};

export default ReactFlowCanvas;
