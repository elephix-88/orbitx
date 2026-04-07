export type MongoId = string | { $oid: string };

export type WorkflowStatusValue = 'active' | 'paused' | 'error' | 'inactive';

export type EngineNodeRuntimeType = 'source' | 'transform' | 'destinations';

export type EngineNodeId =
  | 'facebook_ads'
  | 'google_ads'
  | 'tiktok_ads'
  | 's3'
  | 'error_trigger'
  | 'sql'
  | 'rename'
  | 'join'
  | 'column_editor'
  | 'unify'
  | 'if'
  | 'switch'
  | 'mysql'
  | 'bigquery'
  | 'google_sheet';

export interface WorkflowNodeData {
  uid?: string;
  node_instance_id?: number;
  node_id: EngineNodeId | string;
  node_type: EngineNodeRuntimeType | string;
  parameters: Record<string, unknown>;
  /** Display name for the node (e.g., "Facebook Ads - Age") */
  display_name?: string;
}

export interface WorkflowConnectionData {
  from_node: number;
  to_node: number;
  /** Output port on the source node (e.g. "true", "false", "case_1", "default"). */
  from_port?: string;
  /** Input port on the target node (always "in" for current node types). */
  to_port?: string;
}

export interface BackendConnection extends WorkflowConnectionData {
  // This can be extended with more properties if needed
}

export interface WorkflowData {
  _id?: MongoId;
  workflow_id?: string;
  job_id: string;
  job_name: string;
  application_name?: string;
  name?: string;
  description?: string;
  status: WorkflowStatusValue | string;
  created_at: string;
  updated_at: string;
  schedule_expression: string;
  environment_tag?: string;
  execution_mode?: 'sequential' | 'parallel' | string;
  user_id?: string;
  project_id?: string;
  nodes: WorkflowNodeData[];
  connections?: WorkflowConnectionData[] | Record<string, string[]>;
  /** ID of the workflow to trigger when this workflow fails. null = no error workflow. */
  error_workflow_id?: string | null;
}

export interface BackendWorkflow extends WorkflowData {
  // This can be extended with more properties if needed
}

export interface BackendWorkflowDetailed extends WorkflowData {
  // This can be extended with more properties if needed
}

export interface BackendWorkflowNode extends WorkflowNodeData {
  // This can be extended with more properties if needed
}

export interface WorkflowExecution {
  _id: { $oid: string };
  workflow_id: string;
  execution_id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  started_at: string;
  completed_at?: string;
  duration?: number;
  error_message?: string;
}

// Execution History Types
export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
export type NodeOutputType = 'extractor' | 'transformer' | 'loader';

export interface DataSummary {
  row_count: number;
  column_count: number;
  columns: string[];
  sample_data?: Record<string, unknown>[];
}

export interface ExtractorOutput {
  source_type: string;
  records_extracted: number;
  columns_extracted: number;
  connection_id?: string;
  account_id?: string;
  date_range?: { start: string; end: string };
  fields: string[];
  primary_keys: string[];
  report_level?: string;
}

export interface TransformerOutput {
  transform_type: string;
  records_input: number;
  records_output: number;
  records_filtered: number;
  records_added: number;
  query?: string;
  columns_before: number;
  columns_after: number;
}

export interface LoaderOutput {
  destination_type: string;
  destination_table: string;
  operation: string;
  records_inserted: number;
  records_updated: number;
  records_deleted: number;
  records_unchanged: number;
  records_total: number;
  connection_id?: string;
  merge_keys?: string[];
}

export interface NodeOutput {
  title: string;
  summary: string;
  output_type: NodeOutputType;
  duration_seconds: number;
  data_summary?: DataSummary;
  extractor_output?: ExtractorOutput;
  transformer_output?: TransformerOutput;
  loader_output?: LoaderOutput;
  error_type?: string;
  error_message?: string;
  error_details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ExecutionStep {
  node_instance_id: string;
  node_id: string;
  node_type: string;
  status: ExecutionStatus;
  start_time: number | null;
  end_time: number | null;
  error: string | null;
  error_trace: string | null;
  message: string | null;
  output?: NodeOutput;
}

export interface ExecutionDeliveryResult {
  channel_type: 'slack' | 'line';
  status: 'delivered' | 'failed';
  channel_label?: string; // e.g. "#marketing-alerts"
  error?: string;
}

export interface ExecutionHistory {
  _id: string;
  execution_id: string;
  workflow_id: string;
  workflow_name: string;
  status: ExecutionStatus;
  triggered_by: string;
  start_time: number;
  end_time: number | null;
  duration: number | null;
  cost_usd: number | null;
  steps: Record<string, ExecutionStep>;
  error: string | null;
  total_nodes: number;
  successful_nodes: number;
  failed_nodes: number;
  // Optional: populated when delivery channels are configured
  delivery_results?: ExecutionDeliveryResult[];
}

// Re-export execution debug types from service — stored in backend.ts to keep
// the Zustand store import chain clean (store → types/backend, not store → services).
export type { ExecutionDetail, ExecutionSummary, ExecutionStepDetail } from '../services/executionDebugService';