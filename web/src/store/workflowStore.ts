import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { WorkflowNode, WorkflowConnection, NodeTypeId } from '../types/workflow';
import { WorkflowData } from '../types/backend';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function stable(value: JsonValue): JsonValue {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  const out: Record<string, JsonValue> = {};
  for (const k of Object.keys(value).sort()) out[k] = stable((value as Record<string, JsonValue>)[k]);
  return out;
}

function deepEqual(a: unknown, b: unknown): boolean {
  try { 
    return JSON.stringify(stable(a as JsonValue)) === JSON.stringify(stable(b as JsonValue)); 
  } catch { 
    return a === b; 
  }
}

type WorkflowChangeType =
  | 'addNode'
  | 'updateNode'
  | 'moveNode'
  | 'deleteNode'
  | 'addConnection'
  | 'deleteConnection'
  | 'updateWorkflow';

export interface WorkflowChange {
  id: string;
  type: WorkflowChangeType;
  timestamp: number;
  payload: Record<string, unknown>;
}

interface WorkflowState {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  workflow: Partial<WorkflowData> | null;
  originalBackendWorkflow: Partial<WorkflowData> | null;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
  changes: WorkflowChange[];

  updateNodes: (nodes: WorkflowNode[] | ((prev: WorkflowNode[]) => WorkflowNode[])) => void;
  updateConnections: (connections: WorkflowConnection[] | ((prev: WorkflowConnection[]) => WorkflowConnection[])) => void;
  replaceNodes: (nodes: WorkflowNode[]) => void;
  replaceConnections: (connections: WorkflowConnection[]) => void;
  updateWorkflow: (workflow: Partial<WorkflowData>) => void;
  setOriginalBackendWorkflow: (workflow: Partial<WorkflowData>) => void;
  markAsSaved: () => void;
  resetWorkflow: () => void;
  clearChanges: () => void;
}

function diffNodes(prev: WorkflowNode[], next: WorkflowNode[]): WorkflowChange[] {
  const changes: WorkflowChange[] = [];
  const prevMap = new Map(prev.map((n) => [n.id, n]));
  const nextMap = new Map(next.map((n) => [n.id, n]));

  // Added nodes
  for (const [id, node] of nextMap) {
    if (!prevMap.has(id)) {
      changes.push({ id: `chg_${id}_add_${Date.now()}`, type: 'addNode', timestamp: Date.now(), payload: { node } });
    }
  }
  // Deleted nodes
  for (const [id, node] of prevMap) {
    if (!nextMap.has(id)) {
      changes.push({ id: `chg_${id}_del_${Date.now()}`, type: 'deleteNode', timestamp: Date.now(), payload: { node } });
    }
  }
  // Updated/moved nodes
  for (const [id, nextNode] of nextMap) {
    const prevNode = prevMap.get(id);
    if (!prevNode) continue;
    const moved = prevNode.position.x !== nextNode.position.x || prevNode.position.y !== nextNode.position.y;
    if (moved) {
      changes.push({
        id: `chg_${id}_move_${Date.now()}`,
        type: 'moveNode',
        timestamp: Date.now(),
        payload: { from: prevNode.position, to: nextNode.position, nodeId: id }
      });
    }
    // Shallow compare other fields for update
    const keysToCheck: (keyof WorkflowNode)[] = ['name', 'type', 'data', 'inputs', 'outputs', 'status'];
    let updated = false;
    for (const key of keysToCheck) {
      if (JSON.stringify(prevNode[key]) !== JSON.stringify(nextNode[key])) { updated = true; break; }
    }
    if (updated) {
      changes.push({ id: `chg_${id}_upd_${Date.now()}`, type: 'updateNode', timestamp: Date.now(), payload: { before: prevNode, after: nextNode } });
    }
  }
  return changes;
}

function diffConnections(prev: WorkflowConnection[], next: WorkflowConnection[]): WorkflowChange[] {
  const changes: WorkflowChange[] = [];
  const prevIds = new Set(prev.map((c) => c.id));
  const nextIds = new Set(next.map((c) => c.id));

  for (const c of next) {
    if (!prevIds.has(c.id)) {
      changes.push({ id: `chg_conn_add_${c.id}_${Date.now()}`, type: 'addConnection', timestamp: Date.now(), payload: { connection: c } });
    }
  }
  for (const c of prev) {
    if (!nextIds.has(c.id)) {
      changes.push({ id: `chg_conn_del_${c.id}_${Date.now()}`, type: 'deleteConnection', timestamp: Date.now(), payload: { connection: c } });
    }
  }
  return changes;
}

interface PersistedState {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  workflow: Partial<WorkflowData> | null;
  originalBackendWorkflow: Partial<WorkflowData> | null;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
  changes: WorkflowChange[];
}

// Migration: Fix nodes with incorrect definitionId
// Maps displayName -> correct definitionId for nodes that were created before registry was set up
const NODE_DEFINITION_FIXES: Record<string, NodeTypeId> = {
  'Rename Columns': 'transform.rename',
  'Join Tables': 'transform.join',
  'SQL Transform': 'transform.sql',
  'Facebook Ads': 'facebook.ads',
  'Google Ads': 'google.ads',
  'TikTok Ads': 'tiktok.ads',
  'MySQL': 'dest.mysql',
  'BigQuery': 'dest.bigquery',
  'Google Sheets': 'dest.googlesheets',
};

function migrateNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  return nodes.map(node => {
    const correctDefinitionId = NODE_DEFINITION_FIXES[node.name];
    if (correctDefinitionId && node.definitionId !== correctDefinitionId) {
      return { ...node, definitionId: correctDefinitionId };
    }
    return node;
  });
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      nodes: [],
      connections: [],
      workflow: null,
      originalBackendWorkflow: null,
      hasUnsavedChanges: false,
      lastSavedAt: null,
      changes: [],

      updateNodes: (nodes) => set((state) => {
        const nextNodes = typeof nodes === 'function' ? nodes(state.nodes) : nodes;
        // Skip update if same reference (no change)
        if (nextNodes === state.nodes) {
          return state;
        }
        const nodeChanges = diffNodes(state.nodes, nextNodes);
        const hasMeaningfulChange = nodeChanges.some((c) => c.type !== 'moveNode');
        return {
          nodes: nextNodes,
          hasUnsavedChanges: hasMeaningfulChange ? true : state.hasUnsavedChanges,
          changes: nodeChanges.length ? [...state.changes, ...nodeChanges] : state.changes,
        };
      }),
      updateConnections: (connections) => set((state) => {
        const nextConnections = typeof connections === 'function' ? connections(state.connections) : connections;
        // Skip update if same reference (no change)
        if (nextConnections === state.connections) {
          return state;
        }
        const connChanges = diffConnections(state.connections, nextConnections);
        return {
          connections: nextConnections,
          hasUnsavedChanges: connChanges.length ? true : state.hasUnsavedChanges,
          changes: connChanges.length ? [...state.changes, ...connChanges] : state.changes,
        };
      }),
      replaceNodes: (nodes) => set({ nodes, hasUnsavedChanges: false }),
      replaceConnections: (connections) => set({ connections, hasUnsavedChanges: false }),
      updateWorkflow: (workflow) => set((state) => {
        const changed = !deepEqual(state.workflow, workflow);
        return {
          workflow,
          hasUnsavedChanges: changed ? true : state.hasUnsavedChanges,
          changes: changed ? [...state.changes, { id: `chg_wf_${Date.now()}`, type: 'updateWorkflow', timestamp: Date.now(), payload: { workflow } }] : state.changes,
        };
      }),
      setOriginalBackendWorkflow: (workflow) => set({ originalBackendWorkflow: workflow }),
      markAsSaved: () => set({ hasUnsavedChanges: false, lastSavedAt: new Date(), changes: [] }),
      resetWorkflow: () => set({
        nodes: [],
        connections: [],
        workflow: null,
        originalBackendWorkflow: null,
        hasUnsavedChanges: false,
        lastSavedAt: null,
        changes: [],
      }),
      clearChanges: () => set({ changes: [] }),
    }),
    {
      name: 'workflow-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state): PersistedState => ({
        nodes: state.nodes,
        connections: state.connections,
        workflow: state.workflow,
        originalBackendWorkflow: state.originalBackendWorkflow,
        hasUnsavedChanges: state.hasUnsavedChanges,
        lastSavedAt: state.lastSavedAt,
        changes: state.changes,
      }),
      onRehydrateStorage: () => (state) => {
        // Apply node migrations after rehydrating from storage
        if (state && state.nodes.length > 0) {
          const migratedNodes = migrateNodes(state.nodes);
          // Only update if there were actual changes
          const hasChanges = migratedNodes.some((node, i) => node !== state.nodes[i]);
          if (hasChanges) {
            useWorkflowStore.setState({ nodes: migratedNodes });
          }
        }
      },
    }
  )
);
