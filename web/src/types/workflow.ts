// src/types/workflow.ts
import { z } from 'zod';

// Base Types
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// Workflow Status
// eslint-disable-next-line no-unused-vars
export enum WorkflowStatus {
  // eslint-disable-next-line no-unused-vars
  ACTIVE = 'ACTIVE',
  // eslint-disable-next-line no-unused-vars
  PAUSED = 'PAUSED',
}

// Workflow Execution Status
// eslint-disable-next-line no-unused-vars
export enum ExecutionStatus {
  // eslint-disable-next-line no-unused-vars
  PENDING = 'PENDING',
  // eslint-disable-next-line no-unused-vars
  RUNNING = 'RUNNING',
  // eslint-disable-next-line no-unused-vars
  COMPLETED = 'COMPLETED',
  // eslint-disable-next-line no-unused-vars
  FAILED = 'FAILED',
  // eslint-disable-next-line no-unused-vars
  CANCELLED = 'CANCELLED',
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

// Resource Configuration
export interface ResourceConfig {
  memoryAllocation: number; // in MB
  cpuCores: number;
  timeoutMinutes: number;
  maxRetries: number;
}

// Version Control
export interface Version {
  id: string;
  workflowId: string;
  versionNumber: number;
  changes: string;
  createdAt: string;
  createdBy: string;
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

// Workflow Execution
export interface WorkflowExecution extends BaseEntity {
  workflowId: string;
  versionId: string;
  status: ExecutionStatus;
  startTime?: string;
  endTime?: string;
  duration?: number;
  error?: string;
  logs: string[];
  metrics: {
    resourceUsage: {
      memoryUsage: number;
      cpuUsage: number;
    };
    processedRecords: number;
    failedRecords: number;
  };
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

// Remove duplicate WorkflowNode interface - using the one defined above

// Validation Schemas
export const scheduleSchema = z.object({
  type: z.nativeEnum(ScheduleType),
  expression: z.string(),
  timezone: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const resourceConfigSchema = z.object({
  memoryAllocation: z.number().min(128),
  cpuCores: z.number().min(0.1),
  timeoutMinutes: z.number().min(1),
  maxRetries: z.number().min(0),
});

export const workflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.nativeEnum(WorkflowStatus),
  schedule: scheduleSchema,
  resources: resourceConfigSchema,
  environmentTag: z.string(),
  projectId: z.string(),
  version: z.number(),
  tags: z.array(z.string()),
});

export type NodeTypeId =
  | 'facebook.ads'
  | 'google.ads'
  | 'tiktok.ads'
  | 'source.ga4'
  | 'source.line-ads'
  | 'transform.sql'
  | 'transform.rename'
  | 'transform.join'
  | 'transform.column-editor'
  | 'transform.unify'
  | 'dest.bigquery'
  | 'dest.googlesheets'
  | 'dest.mysql';

export type NodeKind = 'source' | 'transform' | 'destination';



export type NodeStatus = 'pending' | 'running' | 'success' | 'error';

