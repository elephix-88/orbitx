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

interface WorkflowState {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  workflow: Partial<WorkflowData> | null;
  originalBackendWorkflow: Partial<WorkflowData> | null;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;

  updateNodes: (nodes: WorkflowNode[] | ((prev: WorkflowNode[]) => WorkflowNode[])) => void;
  updateConnections: (connections: WorkflowConnection[] | ((prev: WorkflowConnection[]) => WorkflowConnection[])) => void;
  replaceNodes: (nodes: WorkflowNode[]) => void;
  replaceConnections: (connections: WorkflowConnection[]) => void;
  updateWorkflow: (workflow: Partial<WorkflowData>) => void;
  setOriginalBackendWorkflow: (workflow: Partial<WorkflowData>) => void;
  markAsSaved: () => void;
  resetWorkflow: () => void;
}

interface PersistedState {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  workflow: Partial<WorkflowData> | null;
  originalBackendWorkflow: Partial<WorkflowData> | null;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
}

// Migration: Fix nodes with incorrect definitionId
// Maps displayName -> correct definitionId for nodes that were created before registry was set up
const NODE_DEFINITION_FIXES: Record<string, NodeTypeId> = {
  'Rename Columns': 'transform.rename',
  'Join Tables': 'transform.join',
  'SQL Transform': 'transform.sql',
  'Column Editor': 'transform.column-editor',
  'Unify Schema': 'transform.unify',
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

function hasNodeDataChanged(prev: WorkflowNode[], next: WorkflowNode[]): boolean {
  if (prev.length !== next.length) return true;
  const prevMap = new Map(prev.map((n) => [n.id, n]));
  for (const node of next) {
    const prevNode = prevMap.get(node.id);
    if (!prevNode) return true;
    const keysToCheck: (keyof WorkflowNode)[] = ['name', 'type', 'data', 'inputs', 'outputs', 'status'];
    for (const key of keysToCheck) {
      if (JSON.stringify(prevNode[key]) !== JSON.stringify(node[key])) return true;
    }
  }
  return false;
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

      updateNodes: (nodes) => set((state) => {
        const nextNodes = typeof nodes === 'function' ? nodes(state.nodes) : nodes;
        if (nextNodes === state.nodes) return state;
        return {
          nodes: nextNodes,
          hasUnsavedChanges: hasNodeDataChanged(state.nodes, nextNodes) ? true : state.hasUnsavedChanges,
        };
      }),
      updateConnections: (connections) => set((state) => {
        const nextConnections = typeof connections === 'function' ? connections(state.connections) : connections;
        if (nextConnections === state.connections) return state;
        const changed = nextConnections.length !== state.connections.length ||
          nextConnections.some((c) => !state.connections.find((p) => p.id === c.id));
        return {
          connections: nextConnections,
          hasUnsavedChanges: changed ? true : state.hasUnsavedChanges,
        };
      }),
      replaceNodes: (nodes) => set({ nodes, hasUnsavedChanges: false }),
      replaceConnections: (connections) => set({ connections, hasUnsavedChanges: false }),
      updateWorkflow: (workflow) => set((state) => ({
        workflow,
        hasUnsavedChanges: !deepEqual(state.workflow, workflow) ? true : state.hasUnsavedChanges,
      })),
      setOriginalBackendWorkflow: (workflow) => set({ originalBackendWorkflow: workflow }),
      markAsSaved: () => set({ hasUnsavedChanges: false, lastSavedAt: new Date() }),
      resetWorkflow: () => set({
        nodes: [],
        connections: [],
        workflow: null,
        originalBackendWorkflow: null,
        hasUnsavedChanges: false,
        lastSavedAt: null,
      }),
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
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.nodes.length > 0) {
          const migratedNodes = migrateNodes(state.nodes);
          const hasChanges = migratedNodes.some((node, i) => node !== state.nodes[i]);
          if (hasChanges) {
            useWorkflowStore.setState({ nodes: migratedNodes });
          }
        }
      },
    }
  )
);
