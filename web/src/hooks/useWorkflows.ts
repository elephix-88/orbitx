// Custom hook for managing workflows data
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { workflowApiService } from '../services/workflowApiService';
import { transformBackendWorkflows, FrontendWorkflow } from '../utils/workflowTransformers';
import { WorkflowStatus } from '../types/workflow';
import { useNotification } from './useNotification';
import { getErrorMessage } from '../utils/errorUtils';

interface UseWorkflowsResult {
 workflows: FrontendWorkflow[];
 loading: boolean;
 refreshing: boolean;
 error: string | null;

 refreshWorkflows: () => Promise<void>;
 deleteWorkflow: (workflowId: string) => Promise<void>;
 duplicateWorkflow: (workflowId: string) => Promise<void>;
 executeWorkflow: (workflowId: string) => Promise<void>;
 setStatus: (workflowId: string, status: WorkflowStatus) => Promise<void>;
 updatingStatusId: string | null;
 executingWorkflowId: string | null;
 duplicatingWorkflowId: string | null;
}

export function useWorkflows(): UseWorkflowsResult {
 const [workflows, setWorkflows] = useState<FrontendWorkflow[]>([]);
 const [loading, setLoading] = useState(true);
 const [refreshing, setRefreshing] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
 const [executingWorkflowId, setExecutingWorkflowId] = useState<string | null>(null);
 const [duplicatingWorkflowId, setDuplicatingWorkflowId] = useState<string | null>(null);

 const { notify, clearNotifications } = useNotification();

 // Track if we've fetched at least once to prevent re-fetching
 const hasFetchedRef = useRef(false);

 const fetchWorkflows = useCallback(async () => {
 if (hasFetchedRef.current) return;
 hasFetchedRef.current = true;

 try {
 setError(null);
 setLoading(true);
 const workflowsResponse = await workflowApiService.getWorkflows();
 const transformedWorkflows = transformBackendWorkflows(workflowsResponse.data);
 setWorkflows(transformedWorkflows);
 } catch (err) {
 const errorMessage = getErrorMessage(err, 'Failed to fetch workflows');
 setError(errorMessage);
 notify.error('Error loading workflows', errorMessage);
 setWorkflows([]);
 } finally {
 setLoading(false);
 }
 }, [notify]);

 const refreshWorkflows = useCallback(async () => {
 setError(null);
 setRefreshing(true);
 try {
 const workflowsResponse = await workflowApiService.getWorkflows();
 const transformedWorkflows = transformBackendWorkflows(workflowsResponse.data);
 setWorkflows(transformedWorkflows);
 } catch (err) {
 const errorMessage = getErrorMessage(err, 'Failed to fetch workflows');
 setError(errorMessage);
 notify.error('Error loading workflows', errorMessage);
 } finally {
 setRefreshing(false);
 }
 }, [notify]);

 const deleteWorkflow = useCallback(async (workflowId: string) => {
 try {
 await workflowApiService.deleteWorkflow(workflowId);
 setWorkflows(prev => prev.filter(w => w.id !== workflowId));
 notify.success('Workflow deleted', 'Workflow has been successfully deleted');
 } catch (err) {
 const errorMessage = getErrorMessage(err, 'Failed to delete workflow');
 notify.error('Delete failed', errorMessage);
 throw err;
 }
 }, [notify]);

 const duplicateWorkflow = useCallback(async (workflowId: string) => {
 try {
 setDuplicatingWorkflowId(workflowId);
 await workflowApiService.duplicateWorkflow(workflowId);
 await refreshWorkflows();
 notify.success('Workflow duplicated', 'Workflow has been successfully duplicated');
 } catch (err) {
 const errorMessage = getErrorMessage(err, 'Failed to duplicate workflow');
 notify.error('Duplicate failed', errorMessage);
 throw err;
 } finally {
 setDuplicatingWorkflowId(null);
 }
 }, [refreshWorkflows, notify]);

 const executeWorkflow = useCallback(async (workflowId: string) => {
 try {
 setExecutingWorkflowId(workflowId);
 notify.info('Executing...', 'Workflow is running', 0);
 const res = await workflowApiService.executeWorkflow(workflowId);
 const ok = !!res?.data?.success;

 clearNotifications();
 if (ok) {
 notify.success('Workflow success', 'Workflow executed successfully');
 } else {
 notify.error('Workflow failed', 'Workflow execution failed');
 return;
 }

 setWorkflows(prev => prev.map(workflow =>
 workflow.id === workflowId
 ? {
 ...workflow,
 runs: workflow.runs + 1,
 lastRun: new Date().toISOString().slice(0, 16).replace('T', ' ')
 }
 : workflow
 ));
 } catch (err) {
 const errorMessage = getErrorMessage(err, 'Failed to execute workflow');
 notify.error('Execution failed', errorMessage);
 throw err;
 } finally {
 setExecutingWorkflowId(null);
 }
 }, [notify, clearNotifications]);

 const setStatus = useCallback(async (workflowId: string, status: WorkflowStatus) => {
 try {
 setUpdatingStatusId(workflowId);
 await workflowApiService.setWorkflowStatus(workflowId, status);
 setWorkflows(prev => prev.map(w => w.id === workflowId ? { ...w, status } : w));
 notify.success(
 status === WorkflowStatus.PAUSED ? 'Workflow paused' : 'Workflow resumed',
 `Workflow has been ${status === WorkflowStatus.PAUSED ? 'paused' : 'resumed'} successfully`
 );
 } catch (err) {
 const errorMessage = getErrorMessage(err, 'Failed to update status');
 notify.error('Update failed', errorMessage);
 throw err;
 } finally {
 setUpdatingStatusId(null);
 }
 }, [notify]);

 // Fetch workflows on mount
 useEffect(() => {
 fetchWorkflows();
 }, [fetchWorkflows]);

 return {
 workflows,
 loading,
 refreshing,
 error,
 refreshWorkflows,
 deleteWorkflow,
 duplicateWorkflow,
 executeWorkflow,
 setStatus,
 updatingStatusId,
 executingWorkflowId,
 duplicatingWorkflowId,
 };
}

// Hook for workflow categories - recalculates when workflows change
export function useWorkflowCategories(workflows: FrontendWorkflow[]): string[] {
 return useMemo(() => {
 return ['All', ...new Set(workflows.map(w => w.category))];
 }, [workflows]);
}