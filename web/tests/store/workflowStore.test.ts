import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useWorkflowStore } from '@/store/workflowStore';
import { WorkflowNode, WorkflowConnection } from '@/types/workflow';

// =============================================================================
// Test Helpers
// =============================================================================

function resetStore() {
  act(() => {
    useWorkflowStore.getState().resetWorkflow();
  });
}

function createTestNode(overrides: Partial<WorkflowNode> = {}): WorkflowNode {
  const id = overrides.id ?? `node-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    type: 'source',
    name: 'Test Node',
    definitionId: 'facebook.ads',
    position: { x: 0, y: 0 },
    data: { label: 'Test', params: {}, isConfigured: false },
    inputs: [],
    outputs: [{ id: 'output', name: 'Output' }],
    status: 'pending',
    ...overrides,
  };
}

function createTestConnection(
  source: string,
  target: string,
  overrides: Partial<WorkflowConnection> = {}
): WorkflowConnection {
  return {
    id: overrides.id ?? `conn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sourceNodeId: source,
    targetNodeId: target,
    source,
    target,
    sourceHandle: 'output',
    targetHandle: 'input',
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('workflowStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Initial State
  // ---------------------------------------------------------------------------

  describe('initial state', () => {
    it('should have correct initial state', () => {
      resetStore();
      const state = useWorkflowStore.getState();

      expect(state.nodes).toEqual([]);
      expect(state.connections).toEqual([]);
      expect(state.workflow).toBeNull();
      expect(state.originalBackendWorkflow).toBeNull();
      expect(state.hasUnsavedChanges).toBe(false);
      expect(state.lastSavedAt).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // updateNodes()
  // ---------------------------------------------------------------------------

  describe('updateNodes', () => {
    it('should add a new node', () => {
      const node = createTestNode({ id: 'node-1' });

      act(() => {
        useWorkflowStore.getState().updateNodes([node]);
      });

      const state = useWorkflowStore.getState();
      expect(state.nodes).toHaveLength(1);
      expect(state.nodes[0].id).toBe('node-1');
      expect(state.hasUnsavedChanges).toBe(true);
    });

    it('should add multiple nodes', () => {
      const nodes = [
        createTestNode({ id: 'node-1', position: { x: 0, y: 0 } }),
        createTestNode({ id: 'node-2', position: { x: 200, y: 0 } }),
        createTestNode({ id: 'node-3', position: { x: 400, y: 0 } }),
      ];

      act(() => {
        useWorkflowStore.getState().updateNodes(nodes);
      });

      expect(useWorkflowStore.getState().nodes).toHaveLength(3);
    });

    it('should accept updater function', () => {
      const initialNode = createTestNode({ id: 'node-1' });
      act(() => {
        useWorkflowStore.getState().updateNodes([initialNode]);
      });

      const newNode = createTestNode({ id: 'node-2' });
      act(() => {
        useWorkflowStore.getState().updateNodes((prev) => [...prev, newNode]);
      });

      expect(useWorkflowStore.getState().nodes).toHaveLength(2);
    });

    it('should set hasUnsavedChanges when node data changes', () => {
      const node = createTestNode({ id: 'node-1', name: 'Original Name' });

      act(() => {
        useWorkflowStore.getState().updateNodes([node]);
        useWorkflowStore.getState().markAsSaved();
      });

      const updatedNode = { ...node, name: 'Updated Name' };
      act(() => {
        useWorkflowStore.getState().updateNodes([updatedNode]);
      });

      expect(useWorkflowStore.getState().hasUnsavedChanges).toBe(true);
    });

    it('should not set hasUnsavedChanges for move-only changes', () => {
      const node = createTestNode({ id: 'node-1', position: { x: 0, y: 0 } });

      act(() => {
        useWorkflowStore.getState().updateNodes([node]);
        useWorkflowStore.getState().markAsSaved();
      });

      const movedNode = { ...node, position: { x: 100, y: 100 } };
      act(() => {
        useWorkflowStore.getState().updateNodes([movedNode]);
      });

      expect(useWorkflowStore.getState().hasUnsavedChanges).toBe(false);
    });

    it('should skip update when same reference is passed', () => {
      const nodes = [createTestNode({ id: 'node-1' })];

      act(() => {
        useWorkflowStore.getState().updateNodes(nodes);
        useWorkflowStore.getState().markAsSaved();
      });

      act(() => {
        useWorkflowStore.getState().updateNodes((prev) => prev);
      });

      expect(useWorkflowStore.getState().hasUnsavedChanges).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // updateConnections()
  // ---------------------------------------------------------------------------

  describe('updateConnections', () => {
    it('should add a new connection', () => {
      const connection = createTestConnection('node-1', 'node-2', { id: 'conn-1' });

      act(() => {
        useWorkflowStore.getState().updateConnections([connection]);
      });

      const state = useWorkflowStore.getState();
      expect(state.connections).toHaveLength(1);
      expect(state.connections[0].id).toBe('conn-1');
      expect(state.hasUnsavedChanges).toBe(true);
    });

    it('should accept updater function', () => {
      const conn1 = createTestConnection('node-1', 'node-2', { id: 'conn-1' });
      act(() => {
        useWorkflowStore.getState().updateConnections([conn1]);
      });

      const conn2 = createTestConnection('node-2', 'node-3', { id: 'conn-2' });
      act(() => {
        useWorkflowStore.getState().updateConnections((prev) => [...prev, conn2]);
      });

      expect(useWorkflowStore.getState().connections).toHaveLength(2);
    });

    it('should set hasUnsavedChanges when connections change', () => {
      const conn1 = createTestConnection('node-1', 'node-2', { id: 'conn-1' });
      const conn2 = createTestConnection('node-2', 'node-3', { id: 'conn-2' });

      act(() => {
        useWorkflowStore.getState().updateConnections([conn1, conn2]);
        useWorkflowStore.getState().markAsSaved();
      });

      act(() => {
        useWorkflowStore.getState().updateConnections([conn1]);
      });

      expect(useWorkflowStore.getState().hasUnsavedChanges).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // replaceNodes() / replaceConnections()
  // ---------------------------------------------------------------------------

  describe('replaceNodes', () => {
    it('should replace nodes without setting hasUnsavedChanges', () => {
      const nodes = [createTestNode({ id: 'node-1' })];

      act(() => {
        useWorkflowStore.getState().replaceNodes(nodes);
      });

      const state = useWorkflowStore.getState();
      expect(state.nodes).toHaveLength(1);
      expect(state.hasUnsavedChanges).toBe(false);
    });
  });

  describe('replaceConnections', () => {
    it('should replace connections without setting hasUnsavedChanges', () => {
      const connections = [createTestConnection('node-1', 'node-2', { id: 'conn-1' })];

      act(() => {
        useWorkflowStore.getState().replaceConnections(connections);
      });

      const state = useWorkflowStore.getState();
      expect(state.connections).toHaveLength(1);
      expect(state.hasUnsavedChanges).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // updateWorkflow()
  // ---------------------------------------------------------------------------

  describe('updateWorkflow', () => {
    it('should update workflow metadata', () => {
      const workflow = {
        job_id: 'wf-123',
        job_name: 'Test Workflow',
        status: 'active' as const,
      };

      act(() => {
        useWorkflowStore.getState().updateWorkflow(workflow);
      });

      const state = useWorkflowStore.getState();
      expect(state.workflow).toEqual(workflow);
      expect(state.hasUnsavedChanges).toBe(true);
    });

    it('should not set hasUnsavedChanges if workflow is deeply equal', () => {
      const workflow = { job_id: 'wf-123', job_name: 'Test' };

      act(() => {
        useWorkflowStore.getState().updateWorkflow(workflow);
        useWorkflowStore.getState().markAsSaved();
      });

      act(() => {
        useWorkflowStore.getState().updateWorkflow({ ...workflow });
      });

      expect(useWorkflowStore.getState().hasUnsavedChanges).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // setOriginalBackendWorkflow()
  // ---------------------------------------------------------------------------

  describe('setOriginalBackendWorkflow', () => {
    it('should store the original backend workflow', () => {
      const workflow = {
        job_id: 'wf-123',
        job_name: 'Original Workflow',
      };

      act(() => {
        useWorkflowStore.getState().setOriginalBackendWorkflow(workflow);
      });

      expect(useWorkflowStore.getState().originalBackendWorkflow).toEqual(workflow);
    });
  });

  // ---------------------------------------------------------------------------
  // markAsSaved()
  // ---------------------------------------------------------------------------

  describe('markAsSaved', () => {
    it('should clear hasUnsavedChanges flag', () => {
      act(() => {
        useWorkflowStore.getState().updateNodes([createTestNode()]);
      });

      expect(useWorkflowStore.getState().hasUnsavedChanges).toBe(true);

      act(() => {
        useWorkflowStore.getState().markAsSaved();
      });

      expect(useWorkflowStore.getState().hasUnsavedChanges).toBe(false);
    });

    it('should set lastSavedAt timestamp', () => {
      const beforeSave = new Date();

      act(() => {
        useWorkflowStore.getState().markAsSaved();
      });

      const state = useWorkflowStore.getState();
      expect(state.lastSavedAt).not.toBeNull();
      expect(state.lastSavedAt!.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
    });
  });

  // ---------------------------------------------------------------------------
  // resetWorkflow()
  // ---------------------------------------------------------------------------

  describe('resetWorkflow', () => {
    it('should reset all state to initial values', () => {
      act(() => {
        useWorkflowStore.getState().updateNodes([createTestNode()]);
        useWorkflowStore.getState().updateConnections([
          createTestConnection('node-1', 'node-2'),
        ]);
        useWorkflowStore.getState().updateWorkflow({ job_id: 'wf-123' });
        useWorkflowStore.getState().setOriginalBackendWorkflow({ job_id: 'wf-123' });
      });

      act(() => {
        useWorkflowStore.getState().resetWorkflow();
      });

      const state = useWorkflowStore.getState();
      expect(state.nodes).toEqual([]);
      expect(state.connections).toEqual([]);
      expect(state.workflow).toBeNull();
      expect(state.originalBackendWorkflow).toBeNull();
      expect(state.hasUnsavedChanges).toBe(false);
      expect(state.lastSavedAt).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Complex Scenarios
  // ---------------------------------------------------------------------------

  describe('complex scenarios', () => {
    it('should handle building a complete workflow', () => {
      const sourceNode = createTestNode({
        id: 'source-1',
        type: 'source',
        name: 'Facebook Ads',
        position: { x: 100, y: 100 },
      });

      const destNode = createTestNode({
        id: 'dest-1',
        type: 'destination',
        name: 'BigQuery',
        position: { x: 400, y: 100 },
      });

      const connection = createTestConnection('source-1', 'dest-1', { id: 'conn-1' });

      act(() => {
        useWorkflowStore.getState().updateNodes([sourceNode, destNode]);
        useWorkflowStore.getState().updateConnections([connection]);
        useWorkflowStore.getState().updateWorkflow({
          job_id: 'wf-123',
          job_name: 'Facebook to BigQuery',
        });
      });

      const state = useWorkflowStore.getState();
      expect(state.nodes).toHaveLength(2);
      expect(state.connections).toHaveLength(1);
      expect(state.workflow?.job_name).toBe('Facebook to BigQuery');
      expect(state.hasUnsavedChanges).toBe(true);

      act(() => {
        useWorkflowStore.getState().markAsSaved();
      });

      expect(useWorkflowStore.getState().hasUnsavedChanges).toBe(false);
    });
  });
});
