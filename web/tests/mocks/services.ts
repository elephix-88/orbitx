import { vi } from 'vitest';
import {
  createMockWorkflow,
  createMockUser,
  createMockOAuthConnection,
  createMockApiResponse,
  createMockApiError,
  createMockExecution,
} from '../utils/mock-factories';

// =============================================================================
// Workflow API Service Mock
// =============================================================================

export const mockWorkflowApiService = {
  // Workflow CRUD
  getWorkflows: vi.fn().mockResolvedValue([createMockWorkflow()]),
  getWorkflow: vi.fn().mockImplementation((id: string) =>
    Promise.resolve(createMockWorkflow({ id }))
  ),
  createWorkflow: vi.fn().mockImplementation((data) =>
    Promise.resolve(createMockWorkflow(data))
  ),
  updateWorkflow: vi.fn().mockImplementation((id: string, data) =>
    Promise.resolve(createMockWorkflow({ id, ...data }))
  ),
  deleteWorkflow: vi.fn().mockResolvedValue({ success: true }),

  // Workflow Builder specific
  createWorkflowBuilder: vi.fn().mockImplementation((data) =>
    Promise.resolve(createMockWorkflow(data))
  ),
  updateWorkflowBuilder: vi.fn().mockImplementation((id: string, data) =>
    Promise.resolve(createMockWorkflow({ id, ...data }))
  ),

  // Execution
  executeWorkflow: vi.fn().mockResolvedValue({ executionId: 'exec-123' }),
  getExecutionHistory: vi.fn().mockResolvedValue([createMockExecution()]),
  getExecutionStatus: vi.fn().mockResolvedValue({
    status: 'completed',
    progress: 100,
  }),
};

// =============================================================================
// Auth Service Mock
// =============================================================================

export const mockAuthService = {
  googleAuth: vi.fn().mockResolvedValue(createMockUser()),
  logout: vi.fn().mockResolvedValue(undefined),
  getStoredUser: vi.fn().mockReturnValue(createMockUser()),
  isAuthenticated: vi.fn().mockReturnValue(true),
  getAuthHeader: vi.fn().mockReturnValue({ Authorization: 'Bearer mock-token' }),
  getCurrentUser: vi.fn().mockReturnValue(createMockUser()),
  refreshToken: vi.fn().mockResolvedValue({ token: 'new-mock-token' }),
};

// =============================================================================
// Connection Service Mock
// =============================================================================

export const mockConnectionService = {
  getConnections: vi.fn().mockResolvedValue([
    createMockOAuthConnection({ type: 'google', name: 'Google Ads' }),
    createMockOAuthConnection({ type: 'facebook', name: 'Facebook Ads' }),
  ]),
  getConnection: vi.fn().mockImplementation((id: string) =>
    Promise.resolve(createMockOAuthConnection({ id }))
  ),
  createConnection: vi.fn().mockImplementation((data) =>
    Promise.resolve(createMockOAuthConnection(data))
  ),
  deleteConnection: vi.fn().mockResolvedValue({ success: true }),
  testConnection: vi.fn().mockResolvedValue({ status: 'active' }),
};

// =============================================================================
// Google Services Mock
// =============================================================================

export const mockGoogleAdsService = {
  getCustomers: vi.fn().mockResolvedValue([
    { id: '123-456-7890', name: 'Test Account 1' },
    { id: '098-765-4321', name: 'Test Account 2' },
  ]),
  getFields: vi.fn().mockResolvedValue([
    { name: 'campaign.name', displayName: 'Campaign Name', category: 'campaign' },
    { name: 'metrics.impressions', displayName: 'Impressions', category: 'metrics' },
    { name: 'metrics.clicks', displayName: 'Clicks', category: 'metrics' },
  ]),
  validateQuery: vi.fn().mockResolvedValue({ valid: true }),
};

export const mockGoogleSheetsService = {
  getSpreadsheets: vi.fn().mockResolvedValue([
    { id: 'spreadsheet-1', name: 'Sheet 1' },
    { id: 'spreadsheet-2', name: 'Sheet 2' },
  ]),
  getWorksheets: vi.fn().mockResolvedValue([
    { id: 'worksheet-1', name: 'Sheet1' },
    { id: 'worksheet-2', name: 'Sheet2' },
  ]),
};

export const mockBigQueryService = {
  getProjects: vi.fn().mockResolvedValue([
    { id: 'project-1', name: 'Project 1' },
  ]),
  getDatasets: vi.fn().mockResolvedValue([
    { id: 'dataset-1', name: 'Dataset 1' },
  ]),
  getTables: vi.fn().mockResolvedValue([
    { id: 'table-1', name: 'Table 1' },
  ]),
  getTableSchema: vi.fn().mockResolvedValue({
    fields: [
      { name: 'id', type: 'STRING' },
      { name: 'value', type: 'INTEGER' },
    ],
  }),
};

// =============================================================================
// Facebook Services Mock
// =============================================================================

export const mockFacebookAdsService = {
  getAdAccounts: vi.fn().mockResolvedValue([
    { id: 'act_123456', name: 'Test Ad Account 1' },
    { id: 'act_789012', name: 'Test Ad Account 2' },
  ]),
  getFields: vi.fn().mockResolvedValue([
    { name: 'campaign_name', displayName: 'Campaign Name', category: 'campaign' },
    { name: 'impressions', displayName: 'Impressions', category: 'insights' },
    { name: 'clicks', displayName: 'Clicks', category: 'insights' },
    { name: 'spend', displayName: 'Spend', category: 'insights' },
  ]),
  getCampaigns: vi.fn().mockResolvedValue([
    { id: 'campaign-1', name: 'Campaign 1' },
    { id: 'campaign-2', name: 'Campaign 2' },
  ]),
};

// =============================================================================
// Fetch Client Mock
// =============================================================================

export const mockFetchClient = vi.fn().mockImplementation(
  async (_url: string, _options?: RequestInit) => {
    // Default success response
    return createMockApiResponse({ success: true });
  }
);

/**
 * Configure mockFetchClient to return specific responses for URLs.
 *
 * @example
 * configureFetchMock({
 *   '/api/workflows': { data: [workflow1, workflow2] },
 *   '/api/users/me': { data: mockUser },
 * });
 */
export function configureFetchMock(
  responses: Record<string, unknown>
): void {
  mockFetchClient.mockImplementation(async (url: string) => {
    const matchingUrl = Object.keys(responses).find((pattern) =>
      url.includes(pattern)
    );

    if (matchingUrl) {
      return createMockApiResponse(responses[matchingUrl]);
    }

    return createMockApiResponse({ success: true });
  });
}

/**
 * Configure mockFetchClient to return an error for specific URLs.
 */
export function configureFetchError(
  url: string,
  message: string,
  status = 400
): void {
  mockFetchClient.mockImplementationOnce(async (requestUrl: string) => {
    if (requestUrl.includes(url)) {
      return createMockApiError(message, status);
    }
    return createMockApiResponse({ success: true });
  });
}

// =============================================================================
// Reset Functions
// =============================================================================

/**
 * Reset all service mocks to their default implementations.
 * Call this in beforeEach to ensure test isolation.
 */
export function resetAllServiceMocks(): void {
  // Reset workflow service
  mockWorkflowApiService.getWorkflows.mockResolvedValue([createMockWorkflow()]);
  mockWorkflowApiService.getWorkflow.mockImplementation((id: string) =>
    Promise.resolve(createMockWorkflow({ id }))
  );

  // Reset auth service
  mockAuthService.isAuthenticated.mockReturnValue(true);
  mockAuthService.getCurrentUser.mockReturnValue(createMockUser());

  // Reset connection service
  mockConnectionService.getConnections.mockResolvedValue([
    createMockOAuthConnection({ type: 'google' }),
    createMockOAuthConnection({ type: 'facebook' }),
  ]);

  // Clear all mock call history
  vi.clearAllMocks();
}

// =============================================================================
// Module Mock Setup
// =============================================================================

/**
 * Setup all service mocks.
 * Call this at the top of your test file or in a setup file.
 *
 * @example
 * // In your test file
 * vi.mock('@/services/workflowApiService', () => ({
 *   workflowApiService: mockWorkflowApiService,
 * }));
 */
export const serviceMockSetup = `
// Add this to your test file to mock services:

vi.mock('@/services/workflowApiService', () => ({
  workflowApiService: mockWorkflowApiService,
}));

vi.mock('@/services/authService', () => ({
  authService: mockAuthService,
}));

vi.mock('@/lib/fetchClient', () => ({
  fetchClient: mockFetchClient,
  default: mockFetchClient,
}));
`;
