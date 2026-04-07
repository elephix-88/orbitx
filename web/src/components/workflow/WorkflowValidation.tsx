import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { WorkflowNode, WorkflowConnection } from '@/types/workflow';
import { getNodeSpec } from '@/workflow/registry';
import { isConnectionAllowed } from '@/workflow/connectionRules';
import { cn } from '@/lib/utils';

// ============================================
// Validation Types
// ============================================

export type ValidationStatus = 'valid' | 'warning' | 'error' | 'unconfigured';

export interface NodeValidationResult {
  nodeId: string;
  nodeName: string;
  status: ValidationStatus;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  field?: string;
  message: string;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  canExecute: boolean;
  nodeResults: NodeValidationResult[];
  globalIssues: ValidationIssue[];
  summary: {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
    unconfigured: number;
  };
}

// ============================================
// Validation Logic
// ============================================

/**
 * Check if a node has the minimum required configuration
 */
function validateNodeConfiguration(node: WorkflowNode): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const spec = getNodeSpec(node.definitionId);

  if (!spec) {
    // Unknown node type - still allow it but warn
    issues.push({
      type: 'warning',
      message: 'Unknown node type - configuration may be incomplete',
    });
    return issues;
  }

  // Validate based on node type
  switch (node.definitionId) {
    case 'facebook.ads':
      if (!node.data.connection_id && !node.data.accessToken && !node.data.token_id) {
        issues.push({
          type: 'error',
          field: 'connection_id',
          message: 'Facebook Ads connection is required',
        });
      }
      if (!node.data.ad_account_id || (Array.isArray(node.data.ad_account_id) && node.data.ad_account_id.length === 0)) {
        issues.push({
          type: 'error',
          field: 'ad_account_id',
          message: 'At least one Ad Account must be selected',
        });
      }
      break;

    case 'google.ads': {
      if (!node.data.connection_id && !node.data.accessToken) {
        issues.push({
          type: 'error',
          field: 'connection_id',
          message: 'Google Ads connection is required',
        });
      }
      // Check all possible field names: ad_account_id (backend), adAccountIds (UI), customer_ids (legacy)
      const hasGoogleAdsAccounts =
        (Array.isArray(node.data.ad_account_id) && node.data.ad_account_id.length > 0) ||
        (Array.isArray(node.data.adAccountIds) && node.data.adAccountIds.length > 0) ||
        (Array.isArray(node.data.customer_ids) && node.data.customer_ids.length > 0) ||
        !!node.data.customer_id;
      if (!hasGoogleAdsAccounts) {
        issues.push({
          type: 'error',
          field: 'adAccountIds',
          message: 'At least one Ad Account must be selected',
        });
      }
      break;
    }

    case 'dest.bigquery':
      if (!node.data.connection_id && !node.data.project_id) {
        issues.push({
          type: 'error',
          field: 'connection_id',
          message: 'BigQuery connection is required',
        });
      }
      if (!node.data.dataset) {
        issues.push({
          type: 'error',
          field: 'dataset',
          message: 'Dataset is required',
        });
      }
      if (!node.data.table && !node.data.destination_table) {
        issues.push({
          type: 'error',
          field: 'table',
          message: 'Table name is required',
        });
      }
      break;

    case 'dest.mysql':
      if (!node.data.connection_id && !node.data.host) {
        issues.push({
          type: 'error',
          field: 'connection_id',
          message: 'MySQL connection is required',
        });
      }
      if (!node.data.table) {
        issues.push({
          type: 'error',
          field: 'table',
          message: 'Table name is required',
        });
      }
      break;

    case 'dest.googlesheets':
      if (!node.data.connection_id) {
        issues.push({
          type: 'error',
          field: 'connection_id',
          message: 'Google Sheets connection is required',
        });
      }
      if (!node.data.spreadsheet_id) {
        issues.push({
          type: 'error',
          field: 'spreadsheet_id',
          message: 'Spreadsheet is required',
        });
      }
      break;

    case 'transform.sql':
      if (!node.data.sql_query) {
        issues.push({
          type: 'warning',
          field: 'sql_query',
          message: 'No SQL query defined - will pass through data unchanged',
        });
      }
      break;

    case 'transform.rename':
    case 'transform.join':
      // These transforms are optional configurations
      break;
  }

  return issues;
}

/**
 * Check if a node has proper connections
 */
function validateNodeConnections(
  node: WorkflowNode,
  connections: WorkflowConnection[],
  _allNodes: WorkflowNode[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const hasIncoming = connections.some(c => c.targetNodeId === node.id);
  const hasOutgoing = connections.some(c => c.sourceNodeId === node.id);

  // Source nodes should have outgoing connections
  if (node.type === 'source' && !hasOutgoing) {
    issues.push({
      type: 'warning',
      message: 'Source node is not connected to any destination',
    });
  }

  // Destination nodes should have incoming connections
  if (node.type === 'destination' && !hasIncoming) {
    issues.push({
      type: 'error',
      message: 'Destination node has no data source connected',
    });
  }

  // Transform nodes should have both incoming and outgoing
  if (node.type === 'transform') {
    if (!hasIncoming) {
      issues.push({
        type: 'warning',
        message: 'Transform node has no input connected',
      });
    }
    if (!hasOutgoing) {
      issues.push({
        type: 'warning',
        message: 'Transform node is not connected to any destination',
      });
    }
  }

  return issues;
}

/**
 * Check if a node has meaningful user configuration (not just defaults/auto-selected)
 * Returns true only if user has actively configured essential fields
 */
function hasUserConfiguration(node: WorkflowNode): boolean {
  const data = node.data || {};

  // Check for essential fields that indicate user has configured the node
  // These are fields that require user action (NOT auto-selected connections)
  switch (node.definitionId) {
    case 'facebook.ads':
      // User must select ad account (connection may be auto-selected)
      return Array.isArray(data.ad_account_id) && data.ad_account_id.length > 0;

    case 'google.ads':
      // User must select customer (connection may be auto-selected)
      // Check all possible field names: ad_account_id (backend), adAccountIds (UI), customer_ids (legacy)
      return (Array.isArray(data.ad_account_id) && data.ad_account_id.length > 0) ||
             (Array.isArray(data.adAccountIds) && data.adAccountIds.length > 0) ||
             (Array.isArray(data.customer_ids) && data.customer_ids.length > 0) ||
             !!data.customer_id;

    case 'dest.bigquery':
      // User must configure dataset OR table (not just auto-selected connection)
      return !!data.dataset || !!(data.table || data.destination_table);

    case 'dest.mysql':
      // User must configure table (connection may be auto-selected)
      return !!data.table;

    case 'dest.googlesheets':
      // User must select spreadsheet (connection may be auto-selected)
      return !!data.spreadsheet_id;

    case 'transform.sql':
      // SQL transform is optional, consider configured if has query
      return !!data.sql_query;

    case 'transform.rename':
    case 'transform.join':
      // These transforms are optional, always consider configured
      return true;

    default:
      // For unknown nodes, check if any non-default value exists
      return Object.keys(data).some(key => {
        const value = data[key];
        if (value === undefined || value === null || value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        // Ignore common default/auto-selected values
        if (value === 'append' || value === 'US' || value === 'last_7_days') return false;
        // Ignore if this looks like an auto-selected connection_id
        if (key === 'connection_id') return false;
        return true;
      });
  }
}

/**
 * Check incoming connections against isConnectionAllowed rules.
 * Reports errors for any connection that violates the rules defined in connectionRules.ts.
 */
function findIllegalIncomingConnections(
  node: WorkflowNode,
  connections: WorkflowConnection[],
  allNodes: WorkflowNode[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const incomingConnections = connections.filter((c) => c.targetNodeId === node.id);

  for (const connection of incomingConnections) {
    const sourceNode = allNodes.find((n) => n.id === connection.sourceNodeId);
    if (!sourceNode) continue;

    const check = isConnectionAllowed(sourceNode, node, connections);
    if (!check.allowed && check.message) {
      issues.push({ type: 'error', message: check.message });
    }
  }

  return issues;
}

/**
 * Determine the overall status of a node based on its issues
 */
function determineNodeStatus(issues: ValidationIssue[], node: WorkflowNode): ValidationStatus {
  const hasErrors = issues.some(i => i.type === 'error');
  const hasWarnings = issues.some(i => i.type === 'warning');

  // Check if user has actually configured the node
  const hasConfig = hasUserConfiguration(node);

  // If node has no configuration yet, show as unconfigured (gray dot)
  // Only show error (red X) if user has started configuring but has errors
  if (!hasConfig) return 'unconfigured';
  if (hasErrors) return 'error';
  if (hasWarnings) return 'warning';
  return 'valid';
}

/**
 * Validate entire workflow
 */
export function validateWorkflow(
  nodes: WorkflowNode[],
  connections: WorkflowConnection[]
): WorkflowValidationResult {
  const nodeResults: NodeValidationResult[] = [];
  const globalIssues: ValidationIssue[] = [];

  // Check if workflow has any nodes
  if (nodes.length === 0) {
    globalIssues.push({
      type: 'error',
      message: 'Workflow has no nodes',
    });
    return {
      isValid: false,
      canExecute: false,
      nodeResults: [],
      globalIssues,
      summary: { total: 0, valid: 0, warnings: 0, errors: 0, unconfigured: 0 },
    };
  }

  // Check if workflow has at least one source and one destination
  const hasSources = nodes.some(n => n.type === 'source');
  const hasDestinations = nodes.some(n => n.type === 'destination');

  if (!hasSources) {
    globalIssues.push({
      type: 'error',
      message: 'Workflow needs at least one data source',
    });
  }

  if (!hasDestinations) {
    globalIssues.push({
      type: 'error',
      message: 'Workflow needs at least one destination',
    });
  }

  // Validate each node
  for (const node of nodes) {
    const configIssues = validateNodeConfiguration(node);
    const connectionIssues = validateNodeConnections(node, connections, nodes);
    const illegalConnectionIssues = findIllegalIncomingConnections(node, connections, nodes);
    const allIssues = [...configIssues, ...connectionIssues, ...illegalConnectionIssues];
    const status = determineNodeStatus(allIssues, node);

    nodeResults.push({
      nodeId: node.id,
      nodeName: node.name,
      status,
      issues: allIssues,
    });
  }

  // Calculate summary
  const summary = {
    total: nodeResults.length,
    valid: nodeResults.filter(r => r.status === 'valid').length,
    warnings: nodeResults.filter(r => r.status === 'warning').length,
    errors: nodeResults.filter(r => r.status === 'error').length,
    unconfigured: nodeResults.filter(r => r.status === 'unconfigured').length,
  };

  const hasNodeErrors = summary.errors > 0;
  const hasGlobalErrors = globalIssues.some(i => i.type === 'error');
  const isValid = !hasNodeErrors && !hasGlobalErrors && summary.unconfigured === 0;
  const canExecute = !hasNodeErrors && !hasGlobalErrors;

  return {
    isValid,
    canExecute,
    nodeResults,
    globalIssues,
    summary,
  };
}

/**
 * Get validation result for a single node
 */
export function getNodeValidation(
  node: WorkflowNode,
  connections: WorkflowConnection[],
  allNodes: WorkflowNode[]
): NodeValidationResult {
  const configIssues = validateNodeConfiguration(node);
  const connectionIssues = validateNodeConnections(node, connections, allNodes);
  const illegalConnectionIssues = findIllegalIncomingConnections(node, connections, allNodes);
  const allIssues = [...configIssues, ...connectionIssues, ...illegalConnectionIssues];
  const status = determineNodeStatus(allIssues, node);

  return {
    nodeId: node.id,
    nodeName: node.name,
    status,
    issues: allIssues,
  };
}

// ============================================
// UI Components
// ============================================

interface ValidationBannerProps {
  validation: WorkflowValidationResult;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Banner showing workflow validation status
 */
export const ValidationBanner: React.FC<ValidationBannerProps> = ({
  validation,
  onDismiss,
  className,
}) => {
  if (validation.isValid) return null;

  const { summary, globalIssues, nodeResults } = validation;
  const hasErrors = summary.errors > 0 || globalIssues.some(i => i.type === 'error');
  const hasUnconfigured = summary.unconfigured > 0;

  const incompleteNodes = nodeResults.filter(
    r => r.status === 'error' || r.status === 'unconfigured'
  );

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        hasErrors
          ? 'bg-red-50 border-red-200 text-red-800'
          : hasUnconfigured
          ? 'bg-amber-50 border-amber-200 text-amber-800'
          : 'bg-blue-50 border-blue-200 text-blue-800',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {hasErrors ? (
          <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        ) : hasUnconfigured ? (
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        ) : (
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">
            {hasErrors
              ? 'Workflow has configuration errors'
              : hasUnconfigured
              ? 'Some nodes need configuration'
              : 'Workflow has warnings'}
          </h4>

          {/* Global issues */}
          {globalIssues.length > 0 && (
            <ul className="mt-2 text-sm space-y-1">
              {globalIssues.map((issue, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-current" />
                  {issue.message}
                </li>
              ))}
            </ul>
          )}

          {/* Node-specific issues */}
          {incompleteNodes.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium">
                Incomplete nodes ({incompleteNodes.length}):
              </p>
              <ul className="mt-1 text-sm space-y-1">
                {incompleteNodes.slice(0, 5).map(node => (
                  <li key={node.nodeId} className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-current" />
                    <span className="font-medium">{node.nodeName}</span>
                    {node.issues[0] && (
                      <span className="text-xs opacity-75">
                        - {node.issues[0].message}
                      </span>
                    )}
                  </li>
                ))}
                {incompleteNodes.length > 5 && (
                  <li className="text-xs opacity-75">
                    ... and {incompleteNodes.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded hover:bg-black/10 transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

interface NodeValidationIndicatorProps {
  status: ValidationStatus;
  issues?: ValidationIssue[];
  size?: 'sm' | 'md';
  showTooltip?: boolean;
}

/**
 * Small indicator showing node validation status
 */
export const NodeValidationIndicator: React.FC<NodeValidationIndicatorProps> = ({
  status,
  issues = [],
  size = 'sm',
  showTooltip = true,
}) => {
  const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  const tooltip = issues.length > 0
    ? issues.map(i => i.message).join('\n')
    : status === 'valid'
    ? 'Node is configured correctly'
    : status === 'unconfigured'
    ? 'Node needs configuration'
    : '';

  switch (status) {
    case 'valid':
      return (
        <div
          className={cn('flex items-center justify-center', sizeClasses)}
          title={showTooltip ? tooltip : undefined}
        >
          <CheckCircle className={cn('text-green-500', sizeClasses)} />
        </div>
      );

    case 'warning':
      return (
        <div
          className={cn('flex items-center justify-center', sizeClasses)}
          title={showTooltip ? tooltip : undefined}
        >
          <AlertTriangle className={cn('text-amber-500', sizeClasses)} />
        </div>
      );

    case 'error':
      return (
        <div
          className={cn('flex items-center justify-center', sizeClasses)}
          title={showTooltip ? tooltip : undefined}
        >
          <XCircle className={cn('text-red-500', sizeClasses)} />
        </div>
      );

    case 'unconfigured':
    default:
      return (
        <div
          className={cn('flex items-center justify-center', sizeClasses)}
          title={showTooltip ? tooltip : undefined}
        >
          <div className={cn('rounded-full bg-neutral-300', dotSize)} />
        </div>
      );
  }
};

interface ValidationSummaryProps {
  validation: WorkflowValidationResult;
  className?: string;
}

/**
 * Compact summary of validation status
 */
export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  validation,
  className,
}) => {
  const { summary, isValid } = validation;

  if (isValid) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-green-600', className)}>
        <CheckCircle className="w-4 h-4" />
        <span>All nodes configured</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3 text-sm', className)}>
      {summary.valid > 0 && (
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle className="w-3.5 h-3.5" />
          {summary.valid}
        </span>
      )}
      {summary.warnings > 0 && (
        <span className="flex items-center gap-1 text-amber-600">
          <AlertTriangle className="w-3.5 h-3.5" />
          {summary.warnings}
        </span>
      )}
      {summary.errors > 0 && (
        <span className="flex items-center gap-1 text-red-600">
          <XCircle className="w-3.5 h-3.5" />
          {summary.errors}
        </span>
      )}
      {summary.unconfigured > 0 && (
        <span className="flex items-center gap-1 text-text-secondary">
          <div className="w-2 h-2 rounded-full bg-neutral-300" />
          {summary.unconfigured}
        </span>
      )}
    </div>
  );
};
