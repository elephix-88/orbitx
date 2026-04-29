import { useState, useEffect, useCallback } from 'react';
import { WorkflowNode } from '../types/workflow';
import { workflowApiService } from '../services/workflowApiService';
import { useNotification } from './useNotification';

interface ValidationErrorItem {
 error_type: string;
 message: string;
}

function extractValidationErrors(err: unknown): ValidationErrorItem[] | null {
 if (!(err instanceof Error)) return null;
 // The API service embeds the JSON response body in the error message after " - "
 const dashIndex = err.message.indexOf(' - ');
 if (dashIndex === -1) return null;
 try {
 const body = JSON.parse(err.message.slice(dashIndex + 3));
 const detail = body?.detail;
 if (detail?.validation_errors && Array.isArray(detail.validation_errors)) {
 return detail.validation_errors;
 }
 } catch {
 // Not JSON — ignore
 }
 return null;
}

interface UseWorkflowExecutionProps {
 workflowId: string | undefined;
 nodes: WorkflowNode[];
 setNodes: (nodes: WorkflowNode[] | ((prev: WorkflowNode[]) => WorkflowNode[])) => void;
}

interface UseWorkflowExecutionReturn {
 executing: boolean;
 triggering: boolean;
 runId: string | undefined;
 handleExecute: () => Promise<void>;
 stopExecuting: () => void;
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
 const [runId, setRunId] = useState<string | undefined>(undefined);
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
 const result = await workflowApiService.executeWorkflow(workflowId);
 setRunId(result.data.run_id);

 // Start tracking execution status (modal will close when first node status changes)
 setExecuting(true);
 } catch (err) {
 console.error('Failed to execute workflow:', err);

 const validationErrors = extractValidationErrors(err);
 if (validationErrors) {
 const messages = validationErrors.map((e) => e.message).join('\n');
 notify.error('Workflow structure is invalid', messages);
 } else {
 notify.error(
 'Execute failed',
 err instanceof Error ? err.message : 'Unknown error'
 );
 }

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

 const stopExecuting = useCallback(() => {
 setExecuting(false);
 setTriggering(false);
 }, []);

 return {
 executing,
 triggering,
 runId,
 handleExecute,
 stopExecuting,
 };
};
