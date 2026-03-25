import { useState, useEffect, useCallback } from 'react';
import { WorkflowNode } from '../types/workflow';
import { workflowApiService } from '../services/workflowApiService';
import { useNotification } from './useNotification';

interface UseWorkflowExecutionProps {
  workflowId: string | undefined;
  nodes: WorkflowNode[];
  setNodes: (nodes: WorkflowNode[] | ((prev: WorkflowNode[]) => WorkflowNode[])) => void;
}

interface UseWorkflowExecutionReturn {
  executing: boolean;
  triggering: boolean;
  handleExecute: () => Promise<void>;
}

/**
 * Hook to manage workflow execution state and actions
 */
export const useWorkflowExecution = ({
  workflowId,
  nodes,
  setNodes,
}: UseWorkflowExecutionProps): UseWorkflowExecutionReturn => {
  const [executing, setExecuting] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const { notify } = useNotification();

  const handleExecute = useCallback(async () => {
    try {
      if (!workflowId) {
        notify.error(
          'Execute failed',
          'Workflow has no job_id. Please save first.'
        );
        return;
      }

      // Show blocking modal during API call and until first status update
      setTriggering(true);

      // Reset all node statuses to 'pending' before execution
      setNodes((prevNodes) =>
        prevNodes.map((node) => ({
          ...node,
          status: 'pending' as const,
        }))
      );

      // Execute workflow - wait for trigger API to complete
      await workflowApiService.executeWorkflow(workflowId);

      // Start tracking execution status (modal will close when first node status changes)
      setExecuting(true);
    } catch (err) {
      console.error('Failed to execute workflow:', err);
      notify.error(
        'Execute failed',
        err instanceof Error ? err.message : 'Unknown error'
      );
      setTriggering(false);
      setExecuting(false);
    }
  }, [workflowId, setNodes, notify]);

  // Close triggering modal when first node starts running
  useEffect(() => {
    if (!triggering) return;

    const hasStartedNode = nodes.some(
      (node) => node.status === 'running' || node.status === 'success' || node.status === 'error'
    );

    if (hasStartedNode) {
      setTriggering(false);
    }
  }, [nodes, triggering]);

  // Timeout for triggering - fail if no response within 1 minute
  useEffect(() => {
    if (!triggering) return;

    const timeoutId = setTimeout(() => {
      setTriggering(false);
      setExecuting(false);
      notify.error(
        "Triggered failed",
        "Workflow did not start within 1 minute. Please try again."
      );
    }, 60000);

    return () => clearTimeout(timeoutId);
  }, [triggering, notify]);

  // Monitor node status changes and stop spinning when all destinations complete
  useEffect(() => {
    if (!executing) return;

    const destinationNodes = nodes.filter((node) => node.type === 'destination');

    // If no destination nodes, stop executing immediately
    if (destinationNodes.length === 0) {
      setExecuting(false);
      return;
    }

    // Check if all destination nodes have completed (success or error)
    const allDestinationsComplete = destinationNodes.every(
      (node) => node.status === 'success' || node.status === 'error'
    );

    if (allDestinationsComplete) {
      setExecuting(false);
    }
  }, [nodes, executing]);

  return {
    executing,
    triggering,
    handleExecute,
  };
};
