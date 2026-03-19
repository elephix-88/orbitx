/// <reference types="vitest" />
import { describe, it, expect, vi, afterEach, beforeEach, Mock } from 'vitest';
import { workflowApiService } from '@/services/workflowApiService';
import { API_CONFIG } from '@/config/env';
import { BackendWorkflow, BackendWorkflowDetailed } from '@/types/backend';

// Mock the entire fetch function
global.fetch = vi.fn();

const createFetchResponse = (data: any, ok = true, status = 200) => {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  } as Response);
};

describe('workflowApiService', () => {
  beforeEach(() => {
    // Mock fetch before each test
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should get a list of all workflows', async () => {
    const mockWorkflows: BackendWorkflow[] = [
      { job_id: 'job1', job_name: 'Workflow 1', status: 'active', created_at: '2023-01-01', updated_at: '2023-01-01', schedule_expression: '* * * * *', nodes: [] },
      { job_id: 'job2', job_name: 'Workflow 2', status: 'inactive', created_at: '2023-01-02', updated_at: '2023-01-02', schedule_expression: '* * * * *', nodes: [] },
    ];
    (fetch as Mock).mockReturnValue(createFetchResponse({ data: mockWorkflows }));

    await workflowApiService.getWorkflows();

    expect(fetch).toHaveBeenCalledWith(
      `${API_CONFIG.BASE_URL}/workflows`,
      expect.any(Object)
    );
  });

  it('should get a single workflow', async () => {
    const mockWorkflow: BackendWorkflowDetailed = {
      job_id: 'job1',
      job_name: 'Workflow 1',
      status: 'active',
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
      schedule_expression: '* * * * *',
      nodes: [{ node_id: 'node1', node_type: 'source', parameters: {} }],
    };
    (fetch as Mock).mockReturnValue(createFetchResponse({ data: mockWorkflow }));

    await workflowApiService.getWorkflow('job1');

    expect(fetch).toHaveBeenCalledWith(
      `${API_CONFIG.BASE_URL}/get_workflow_builder/job1`,
      expect.any(Object)
    );
  });

  it('should create a new workflow', async () => {
    const newWorkflow: Omit<BackendWorkflow, '_id' | 'created_at' | 'updated_at'> = {
      job_id: 'newJob',
      job_name: 'New Workflow',
      status: 'inactive',
      schedule_expression: '* * * * *',
      nodes: [],
    };
    const mockResponse: BackendWorkflow = { ...newWorkflow, _id: '123', created_at: '2023-01-03', updated_at: '2023-01-03' };
    (fetch as Mock).mockReturnValue(createFetchResponse({ data: mockResponse }));

    await workflowApiService.createWorkflow(newWorkflow);

    expect(fetch).toHaveBeenCalledWith(
      `${API_CONFIG.BASE_URL}/workflows`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(newWorkflow),
      })
    );
  });

  it('should update a workflow', async () => {
    const workflowId = '123';
    const updates: Partial<BackendWorkflow> = { status: 'active' };
    const mockResponse: BackendWorkflow = {
      _id: workflowId,
      job_id: 'job1',
      job_name: 'Workflow 1',
      status: 'active',
      created_at: '2023-01-01',
      updated_at: '2023-01-04',
      schedule_expression: '* * * * *',
      nodes: [],
    };
    (fetch as Mock).mockReturnValue(createFetchResponse({ data: mockResponse }));

    await workflowApiService.updateWorkflow(workflowId, updates);

    expect(fetch).toHaveBeenCalledWith(
      `${API_CONFIG.BASE_URL}/update_workflow`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(updates),
      })
    );
  });

  it('should delete a workflow', async () => {
    const workflowId = '123';
    (fetch as Mock).mockReturnValue(createFetchResponse({ data: { success: true } }));

    await workflowApiService.deleteWorkflow(workflowId);

    expect(fetch).toHaveBeenCalledWith(
      `${API_CONFIG.BASE_URL}/delete_workflow/${workflowId}`,
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });

  it('should execute a workflow', async () => {
    const workflowId = '123';
    (fetch as Mock).mockReturnValue(createFetchResponse({ data: { success: true } }));

    await workflowApiService.executeWorkflow(workflowId);

    expect(fetch).toHaveBeenCalledWith(
      `${API_CONFIG.BASE_URL}/workflows/execute`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ _id: workflowId }),
      })
    );
  });
});
