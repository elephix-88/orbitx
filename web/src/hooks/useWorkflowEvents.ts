import { useEffect, useRef, useCallback } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { NodeStatus } from '../types/workflow';

interface WorkflowEvent {
  type: 'status' | 'log';
  workflow_id: string;
  node_instance_id?: string;
  status?: NodeStatus;
  message?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Debounce updates to prevent rapid state changes from multiple SSE messages
const createDebouncedUpdater = (delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingUpdates: Map<string, NodeStatus> = new Map();

  return (nodeInstanceId: string, status: NodeStatus) => {
    pendingUpdates.set(nodeInstanceId, status);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      const updates = new Map(pendingUpdates);
      pendingUpdates.clear();
      timeoutId = null;

      if (updates.size === 0) return;

      useWorkflowStore.getState().updateNodes((nodes) =>
        nodes.map((node) => {
          const nodeInstanceIdStr = String(node.data?.node_instance_id);
          const newStatus = updates.get(nodeInstanceIdStr);
          if (newStatus && node.status !== newStatus) {
            return { ...node, status: newStatus };
          }
          return node;
        })
      );
    }, delay);
  };
};

/**
 * Hook for real-time workflow status updates via SSE.
 *
 * This is a secondary mechanism for real-time updates. The primary source
 * of truth for node statuses is the ExecutionLogPanel which polls execution_history.
 *
 * SSE provides faster updates when Pub/Sub is working, but the polling
 * mechanism in ExecutionLogPanel ensures statuses are always eventually consistent.
 */
export const useWorkflowEvents = (workflowId: string | null) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const debouncedUpdateRef = useRef(createDebouncedUpdater(100));

  const closeConnection = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!workflowId) {
      closeConnection();
      return;
    }

    // Close existing connection before opening new one
    closeConnection();

    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/stream/${workflowId}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const data: WorkflowEvent = JSON.parse(event.data);

        if (data.status && data.node_instance_id) {
          // Normalize status
          let status = data.status.toLowerCase() as NodeStatus;
          if (status === ('failed' as NodeStatus)) status = 'error';

          // Use debounced updater to batch rapid updates
          debouncedUpdateRef.current(String(data.node_instance_id), status);
        }
      } catch {
        // Silently ignore parse errors - SSE can have malformed messages
      }
    };

    eventSource.onerror = () => {
      // Close on error - ExecutionLogPanel polling will handle status updates
      closeConnection();
    };

    return closeConnection;
  }, [workflowId, closeConnection]);
};
