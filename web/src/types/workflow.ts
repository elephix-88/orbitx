// src/types/workflow.ts

// Workflow Status
// eslint-disable-next-line no-unused-vars
export enum WorkflowStatus {
  // eslint-disable-next-line no-unused-vars
  ACTIVE = 'ACTIVE',
  // eslint-disable-next-line no-unused-vars
  PAUSED = 'PAUSED',
}

// Workflow Execution Status — must match backend common.model.execution.Status
// eslint-disable-next-line no-unused-vars
export enum ExecutionStatus {
  // eslint-disable-next-line no-unused-vars
  PENDING = 'PENDING',
  // eslint-disable-next-line no-unused-vars
  RUNNING = 'RUNNING',
  // eslint-disable-next-line no-unused-vars
  SUCCESS = 'SUCCESS',
  // eslint-disable-next-line no-unused-vars
  FAILED = 'FAILED',
}

// Schedule Types
// eslint-disable-next-line no-unused-vars
export enum ScheduleType {
  // eslint-disable-next-line no-unused-vars
  CRON = 'CRON',
  // eslint-disable-next-line no-unused-vars
  FIXED_RATE = 'FIXED_RATE',
  // eslint-disable-next-line no-unused-vars
  ONE_TIME = 'ONE_TIME',
}

export interface Schedule {
  type: ScheduleType;
  expression: string; // CRON expression or ISO date
  timezone: string;
  startDate?: string;
  endDate?: string;
}

export interface WorkflowNode {
  id: string;
  type: 'source' | 'transform' | 'destination';
  name: string;
  /** Custom alias for the node (e.g., "Facebook Ads - Age, Gender") */
  display_name?: string;
  definitionId: NodeTypeId;
  componentType?: string; // Frontend component type for rendering
  position: {
    x: number;
    y: number;
  };
  data: Record<string, any>;
  inputs: NodePort[];
  outputs: NodePort[];
  status: 'pending' | 'running' | 'success' | 'error';
  executionTime?: number;
  // Optional node settings
  description?: string;
  continueOnFail?: boolean;
  retryOnFail?: boolean;
}

export interface NodePort {
  id: string;
  name: string;
  type?: string;
  required?: boolean;
  connected?: boolean;
}

export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceOutputId?: string;
  targetInputId?: string;
  // Legacy compatibility
  source?: string;
  target?: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  status: WorkflowStatus;
  schedule: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Workflow Node Types
// eslint-disable-next-line no-unused-vars
export enum NodeCategory {
  // eslint-disable-next-line no-unused-vars
  SOURCE = 'SOURCE',
  // eslint-disable-next-line no-unused-vars
  TRANSFORM = 'TRANSFORM',
  // eslint-disable-next-line no-unused-vars
  DESTINATION = 'DESTINATION',
}

export type NodeTypeId =
  | 'facebook.ads'
  | 'google.ads'
  | 'tiktok.ads'
  | 'source.error-trigger'
  | 'transform.sql'
  | 'transform.rename'
  | 'transform.join'
  | 'transform.column-editor'
  | 'transform.unify'
  | 'logic.if'
  | 'logic.switch'
  | 'dest.bigquery'
  | 'dest.googlesheets'
  | 'dest.mysql';

export type NodeKind = 'source' | 'transform' | 'destination';



export type NodeStatus = 'pending' | 'running' | 'success' | 'error';

