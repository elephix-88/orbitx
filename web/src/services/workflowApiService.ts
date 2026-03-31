// API service for workflow management with backend
// Uses fetchClient for auth headers and 401 handling (single source of truth)
import { API_CONFIG } from '../config/env';
import { fetchClient } from '@/lib/fetchClient';
import { authService } from './authService';
import {
  BackendWorkflow,
  BackendWorkflowDetailed,
  WorkflowExecution,
  WorkflowData,
  WorkflowNodeData,
  WorkflowConnectionData,
  MongoId,
} from '../types/backend';
import { extractMongoId } from '../utils/mongoUtils';
import { WorkflowStatus } from '../types/workflow';

interface ApiResponse<T> {
  data: T;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
}

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  timeout?: number;
}

interface ConnectionResponse {
  _id: MongoId;
  params?: { connection_id?: string };
  service_name?: string;
  connection_name?: string;
}

interface NewWorkflowPayload {
  job_id: string;
  workflow_id: string;
  job_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  schedule_expression: string;
  user_id: string;
  nodes: Array<{
    node_instance_id?: number;
    node_id?: string;
    node_type?: string;
    parameters: Record<string, unknown>;
    display_name?: string;
  }>;
  connections: WorkflowConnectionData[];
}

class WorkflowApiService {
  private defaultRetryOptions: RetryOptions;

  constructor() {
    this.defaultRetryOptions = {
      maxRetries: API_CONFIG.RETRY_ATTEMPTS,
      baseDelay: API_CONFIG.RETRY_DELAY,
      maxDelay: API_CONFIG.MAX_RETRY_DELAY,
      timeout: API_CONFIG.TIMEOUT,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5);
    return Math.min(delayWithJitter, maxDelay);
  }

  /**
   * Make HTTP request with retry logic and timeout
   * Auth headers and 401 handling are managed by fetchClient
   */
  private async makeRequestWithRetry<T>(
    endpoint: string, 
    options: globalThis.RequestInit = {},
    retryOptions: RetryOptions = {}
  ): Promise<ApiResponse<T>> {
    const opts = { ...this.defaultRetryOptions, ...retryOptions };
    let lastError: Error = new Error('Request failed');

    for (let attempt = 0; attempt <= opts.maxRetries!; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), opts.timeout!);
        
        // Use fetchClient - handles auth headers and 401 redirects
        const response = await fetchClient(endpoint, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
          },
          ...options,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorDetails = '';
          try {
            const errorBody = await response.text();
            errorDetails = errorBody ? ` - ${errorBody}` : '';
          } catch {
            // Ignore error parsing error body
          }

          if (response.status >= 400 && response.status < 500) {
            throw new Error(`Client error! status: ${response.status}${errorDetails}`);
          }
          throw new Error(`Server error! status: ${response.status}${errorDetails}`);
        }

        let data: T;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = (await response.text()) as unknown as T;
        }

        if (Array.isArray(data)) {
          return { data: data as T };
        }

        if (data && typeof data === 'object' && 'data' in data) {
          return data as ApiResponse<T>;
        }

        return { data: data as T };

      } catch (error) {
        lastError = error as Error;
        
        if (import.meta.env.DEV) {
          console.warn(
            `API request attempt ${attempt + 1}/${opts.maxRetries! + 1} failed for ${endpoint}:`,
            error
          );
        }

        if (attempt === opts.maxRetries) {
          break;
        }

        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            break;
          }
          if (error.message.includes('Client error')) {
            break;
          }
        }

        const delay = this.calculateDelay(attempt, opts.baseDelay!, opts.maxDelay!);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Check if a string looks like a MongoDB ObjectId
   */
  private looksLikeMongoId(s: unknown): s is string {
    return typeof s === 'string' && (/^[a-fA-F0-9]{24}$/.test(s) || /^[0-9a-fA-F-]{36}$/.test(s));
  }

  /**
   * Resolve BigQuery connection_id to Mongo _id before sending to backend.
   */
  private async resolveConnectionIds(workflowData: Partial<WorkflowData>): Promise<Partial<WorkflowData>> {
    try {
      if (!workflowData || !Array.isArray(workflowData.nodes)) return workflowData;
      
      const needsResolution = workflowData.nodes.some(
        (n) => (n?.node_id === 'bigquery' || n?.node_id === 'google_sheet') && 
               n?.parameters?.connection_id && 
               !this.looksLikeMongoId(String(n.parameters.connection_id))
      );
      if (!needsResolution) return workflowData;

      // Use fetchClient - handles auth headers automatically
      const resp = await fetchClient('/api/connections');
      const raw = await resp.json().catch(() => [] as ConnectionResponse[]);
      const arr: ConnectionResponse[] = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      const legacyToMongo = new Map<string, string>();
      for (const c of arr) {
        const legacy = c?.params?.connection_id;
        const mongo = extractMongoId(c?._id);
        if (legacy && mongo) legacyToMongo.set(String(legacy), String(mongo));
      }

      const clonedNodes: WorkflowNodeData[] = workflowData.nodes.map((n) => ({ 
        ...n, 
        parameters: { ...(n?.parameters || {}) } 
      }));
      
      for (const n of clonedNodes) {
        if (n?.node_id === 'bigquery' || n?.node_id === 'google_sheet') {
          const cid = n?.parameters?.connection_id;
          const cidStr = String(cid);
          const mapped = cid && !this.looksLikeMongoId(cidStr) ? legacyToMongo.get(cidStr) : undefined;
          n.parameters.connection_id = mapped || n.parameters.connection_id;
        }
      }
      return { ...workflowData, nodes: clonedNodes };
    } catch {
      return workflowData;
    }
  }

  /**
   * Build minimal payload for create per NewWorkflowData schema.
   */
  private buildNewWorkflowPayload(data: Partial<WorkflowData>): NewWorkflowPayload {
    const pickString = (v: unknown, fb: string = '') => (typeof v === 'string' ? v : fb);
    const nodes = Array.isArray(data?.nodes)
      ? data.nodes.map((n) => ({
          node_instance_id: n?.node_instance_id,
          node_id: n?.node_id,
          node_type: n?.node_type,
          parameters: n?.parameters || {},
          display_name: n?.display_name || undefined, // Preserve display_name
        }))
      : [];
    const connections: WorkflowConnectionData[] = Array.isArray(data?.connections)
      ? (data.connections as WorkflowConnectionData[])
      : [];

    // Get user_id from auth service
    const user = authService.getStoredUser();
    const userId = user?.id || '';

    return {
      job_id: pickString(data?.job_id),
      workflow_id: pickString(data?.workflow_id || data?.job_id),
      job_name: pickString(data?.job_name || data?.name || data?.job_id),
      status: pickString(data?.status || 'inactive'),
      created_at: pickString(data?.created_at || new Date().toISOString()),
      updated_at: pickString(data?.updated_at || new Date().toISOString()),
      schedule_expression: pickString(data?.schedule_expression || '0 0 * * *'),
      user_id: userId,
      nodes,
      connections,
    };
  }

  /**
   * Get all workflows from backend
   */
  async getWorkflows(params?: {
    page?: number;
    limit?: number;
    status?: string;
    environment_tag?: string;
    user_id?: string;
  }): Promise<ApiResponse<BackendWorkflow[]>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.environment_tag) queryParams.append('environment_tag', params.environment_tag);
    if (params?.user_id) queryParams.append('user_id', params.user_id);

    const queryString = queryParams.toString();
    const endpoint = `/api/workflows${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequestWithRetry<BackendWorkflow[]>(endpoint);
  }

  /**
   * Get a specific workflow by job_id with full details including nodes
   */
  async getWorkflow(idOrJobId: string): Promise<ApiResponse<BackendWorkflowDetailed>> {
    try {
      const result = await this.makeRequestWithRetry<BackendWorkflowDetailed | BackendWorkflowDetailed[]>(
        `/api/workflows/${encodeURIComponent(idOrJobId)}`
      );
      
      const workflowData: BackendWorkflowDetailed = Array.isArray(result.data) 
        ? result.data[0] 
        : result.data;
      
      return {
        data: workflowData,
        message: result.message,
        total: result.total,
        page: result.page,
        limit: result.limit
      };
    } catch (error) {
      console.error(`Failed to fetch workflow details for ${idOrJobId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflow: Omit<BackendWorkflow, '_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<BackendWorkflow>> {
    return this.makeRequestWithRetry<BackendWorkflow>('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(_workflowId: string, updates: Partial<BackendWorkflow>): Promise<ApiResponse<BackendWorkflow>> {
    return this.makeRequestWithRetry<BackendWorkflow>(`/api/workflows`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.makeRequestWithRetry<{ success: boolean }>(`/api/workflows/${encodeURIComponent(workflowId)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get workflow executions/runs
   * TODO: Backend endpoint not implemented yet
   */
  async getWorkflowExecutions(_workflowId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<WorkflowExecution[]>> {
    return {
      data: [],
      message: 'Workflow executions endpoint not implemented',
      total: 0,
      page: params?.page || 1,
      limit: params?.limit || 10
    };
  }

  /**
   * Start workflow execution
   */
  async executeWorkflow(identifier: string): Promise<ApiResponse<{ success: boolean; run_id?: string }>> {
    try {
      const payload = { _id: identifier };
      const raw = await this.makeRequestWithRetry<{ run_id?: string; success?: boolean } | boolean>(
        `/api/workflows/execute`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        {
          timeout: Math.max(API_CONFIG.TIMEOUT * 4, 120000),
          maxRetries: 0,
          baseDelay: API_CONFIG.RETRY_DELAY,
          maxDelay: API_CONFIG.MAX_RETRY_DELAY,
        }
      );

      const data = raw?.data;
      const isObject = data && typeof data === 'object';
      const runId = isObject ? (data as { run_id?: string }).run_id : undefined;
      // Backend now returns { run_id: "..." }; treat presence of run_id as success
      const success = isObject
        ? ('success' in data ? !!(data as { success?: boolean }).success : !!runId)
        : typeof data === 'boolean' ? data : true;

      return { data: { success, run_id: runId }, message: raw?.message };
    } catch (error) {
      console.error(`Failed to execute workflow ${identifier}:`, error);
      throw error;
    }
  }

  /**
   * Stop workflow execution
   * TODO: Backend endpoint not implemented yet
   */
  async stopWorkflowExecution(_workflowId: string, _executionId: string): Promise<ApiResponse<{ success: boolean }>> {
    return {
      data: { success: true },
      message: 'Stop workflow execution endpoint not implemented'
    };
  }

  /**
   * Update workflow with complete workflow data (matching FastAPI WorkflowData model)
   */
  async updateWorkflowBuilder(
    workflowData: Partial<WorkflowData>,
    workflowId?: string
  ): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    try {
      const resolved = await this.resolveConnectionIds(workflowData);
      // Create sanitized object without _id first, then add string _id later
      const { _id: _rawId, ...restResolved } = resolved;
      const sanitized: Partial<Omit<WorkflowData, '_id'>> & { _id?: string; user_id?: string } = { ...restResolved };
      let mongoId: string | undefined = undefined;

      // Try to extract MongoDB ID from various sources
      const resolvedId = resolved?._id;
      if (resolvedId && typeof resolvedId === 'object' && '$oid' in resolvedId) {
        mongoId = resolvedId.$oid;
      } else if (this.looksLikeMongoId(resolvedId)) {
        mongoId = String(resolvedId);
      } else if (this.looksLikeMongoId(resolved?.workflow_id)) {
        mongoId = String(resolved.workflow_id);
      } else if (this.looksLikeMongoId(resolved?.job_id)) {
        mongoId = String(resolved.job_id);
      }

      // Fallback: if we still don't have a valid ObjectId, try to fetch it from backend
      if (!mongoId) {
        try {
          const rawId = resolved?._id;
          const identifierForLookup = (rawId && typeof rawId === 'object' && '$oid' in rawId)
            ? rawId.$oid
            : rawId || resolved?.workflow_id || resolved?.job_id;
          if (identifierForLookup) {
            const fetched = await this.getWorkflow(String(identifierForLookup));
            const fetchedId = fetched?.data?._id;
            const extractedId = extractMongoId(fetchedId);
            if (this.looksLikeMongoId(extractedId)) {
              mongoId = extractedId;
            }
          }
        } catch {
          // ignore; we'll proceed without forcing id if not resolvable
        }
      }

      if (mongoId) {
        sanitized._id = mongoId;
      } else {
        // Avoid sending invalid id/_id
        delete sanitized._id;
      }

      // Add user_id from auth service
      const user = authService.getStoredUser();
      if (user?.id) {
        sanitized.user_id = user.id;
      }

      const endpoint = workflowId ? `/api/workflows/${workflowId}` : '/api/workflows';
      const result = await this.makeRequestWithRetry<{ success: boolean; message?: string }>(endpoint, {
        method: 'PUT',
        body: JSON.stringify(sanitized),
      });
      return result;
    } catch (error) {
      console.error(`Failed to update workflow builder ${workflowData.job_id}:`, error);
      throw error;
    }
  }

  /**
   * Create workflow with complete workflow data (matching FastAPI WorkflowData model)
   */
  async createWorkflowBuilder(workflowData: Partial<WorkflowData>): Promise<ApiResponse<BackendWorkflow>> {
    try {
      const resolved = await this.resolveConnectionIds(workflowData);
      const minimal = this.buildNewWorkflowPayload(resolved);
      
      const result = await this.makeRequestWithRetry<BackendWorkflow>(`/api/workflows`, {
        method: 'POST',
        body: JSON.stringify(minimal),
      });
      
      return result;
    } catch (error) {
      console.error(`Failed to create workflow ${workflowData?.job_id}:`, error);
      throw error;
    }
  }

  /**
   * Convenience: load full workflow, set status, and submit update
   */
  async setWorkflowStatus(jobId: string, status: WorkflowStatus): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    const current = await this.getWorkflow(jobId);
    const updated: Partial<WorkflowData> = { ...current.data, status };
    return this.updateWorkflowBuilder(updated);
  }

  /**
   * Duplicate an existing workflow
   * Creates a copy with new IDs and " - Copy" suffix in name
   */
  async duplicateWorkflow(sourceWorkflowId: string): Promise<ApiResponse<BackendWorkflow>> {
    try {
      // Fetch the source workflow
      const source = await this.getWorkflow(sourceWorkflowId);
      const sourceData = source.data;

      // Generate new unique IDs
      const newJobId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      // Create copy with new identifiers
      const duplicateData: Partial<WorkflowData> = {
        ...sourceData,
        _id: undefined, // Let backend generate new MongoDB _id
        job_id: newJobId,
        workflow_id: newJobId,
        job_name: `${sourceData.job_name} - Copy`,
        status: 'PAUSED', // Start as paused
        created_at: timestamp,
        updated_at: timestamp,
      };

      // Create the duplicate workflow
      return this.createWorkflowBuilder(duplicateData);
    } catch (error) {
      console.error(`Failed to duplicate workflow ${sourceWorkflowId}:`, error);
      throw error;
    }
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(): Promise<ApiResponse<{
    total_workflows: number;
    active_workflows: number;
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
  }>> {
    return this.makeRequestWithRetry<{
      total_workflows: number;
      active_workflows: number;
      total_executions: number;
      successful_executions: number;
      failed_executions: number;
    }>('/api/workflows/stats');
  }
}

export const workflowApiService = new WorkflowApiService();
