export type MongoId = string | { $oid: string };

export type WorkflowStatusValue = 'active' | 'paused' | 'error' | 'inactive';

export type EngineNodeRuntimeType = 'source' | 'transform' | 'destinations';

export type EngineNodeId =
  | 'facebook_ads'
  | 'google_ads'
  | 's3'
  | 'sql'
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
  status: 'running' | 'completed' | 'failed' | 'pending';
  started_at: string;
  completed__at?: string;
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