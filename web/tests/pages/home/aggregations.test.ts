import { describe, it, expect } from 'vitest';
import {
  computeKpis,
  bucketThroughputHourly,
  deriveNeedsAttention,
  filterHistoryByRange,
} from '@/pages/home/aggregations';
import type { ExecutionHistory } from '@/types/backend';
import type { FrontendWorkflow } from '@/utils/workflowTransformers';
import { WorkflowStatus } from '@/types/workflow';

// Fixed "now" so time-range math is deterministic: 2026-03-15T12:00:00Z
const NOW_SECONDS = 1_773_576_000;
const HOUR = 3600;
const DAY = 86400;

const makeWorkflow = (
  id: string,
  overrides: Partial<FrontendWorkflow> = {}
): FrontendWorkflow => ({
  id,
  job_id: id,
  name: `Pipeline ${id}`,
  description: '',
  createdAt: '',
  updatedAt: '',
  status: WorkflowStatus.ACTIVE,
  environment_tag: 'prod',
  schedule_expression: '0 * * * *',
  runs: 0,
  category: 'general',
  lastRun: '',
  nextRun: '',
  project_id: 'p1',
  application_name: 'orbitx',
  execution_mode: 'sequential',
  ...overrides,
});

const makeExecution = (
  overrides: Partial<ExecutionHistory> & { start_time: number }
): ExecutionHistory => ({
  _id: overrides._id ?? 'exec_1',
  execution_id: overrides.execution_id ?? 'exec_1',
  workflow_id: overrides.workflow_id ?? 'wf_1',
  workflow_name: overrides.workflow_name ?? 'Pipeline A',
  status: overrides.status ?? 'SUCCESS',
  triggered_by: overrides.triggered_by ?? 'schedule',
  start_time: overrides.start_time,
  end_time: overrides.end_time ?? overrides.start_time + 30,
  duration: overrides.duration ?? 30,
  cost_usd: overrides.cost_usd ?? null,
  steps: overrides.steps ?? {},
  error: overrides.error ?? null,
  total_nodes: overrides.total_nodes ?? 3,
  successful_nodes: overrides.successful_nodes ?? 3,
  failed_nodes: overrides.failed_nodes ?? 0,
});

const stepWithRows = (rows: number) => ({
  step_a: {
    node_instance_id: 'n1',
    node_id: 'n1',
    node_type: 'extractor',
    status: 'SUCCESS' as const,
    start_time: 0,
    end_time: 0,
    error: null,
    error_trace: null,
    message: null,
    output: {
      title: 't',
      summary: 's',
      output_type: 'extractor' as const,
      duration_seconds: 1,
      extractor_output: {
        records_extracted: rows,
      } as unknown as import('@/types/backend').ExtractorOutput,
    },
  },
});

describe('computeKpis', () => {
  it('counts ACTIVE workflows as active pipelines', () => {
    const workflows = [
      makeWorkflow('a'),
      makeWorkflow('b'),
      makeWorkflow('c', { status: WorkflowStatus.PAUSED }),
    ];
    const kpis = computeKpis(workflows, [], NOW_SECONDS);
    expect(kpis.activePipelines).toBe(2);
  });

  it('counts successful and failed runs within the last 24h only', () => {
    const history = [
      makeExecution({ start_time: NOW_SECONDS - HOUR, status: 'SUCCESS' }),
      makeExecution({ start_time: NOW_SECONDS - 2 * HOUR, status: 'SUCCESS' }),
      makeExecution({ start_time: NOW_SECONDS - 3 * HOUR, status: 'FAILED' }),
      // older than 24h — excluded
      makeExecution({ start_time: NOW_SECONDS - 2 * DAY, status: 'SUCCESS' }),
    ];
    const kpis = computeKpis([], history, NOW_SECONDS);
    expect(kpis.successfulRuns24h).toBe(2);
    expect(kpis.failedRuns24h).toBe(1);
  });

  it('sums rows synced across all executions in the last 24h', () => {
    const history = [
      makeExecution({ start_time: NOW_SECONDS - HOUR, steps: stepWithRows(1_000) }),
      makeExecution({
        start_time: NOW_SECONDS - 2 * HOUR,
        steps: stepWithRows(500),
      }),
      makeExecution({
        start_time: NOW_SECONDS - 2 * DAY,
        steps: stepWithRows(9_999),
      }),
    ];
    const kpis = computeKpis([], history, NOW_SECONDS);
    expect(kpis.rowsSynced24h).toBe(1_500);
  });

  it('sums cost_usd across executions in the last 7 days', () => {
    const history = [
      makeExecution({ start_time: NOW_SECONDS - HOUR, cost_usd: 1.25 }),
      makeExecution({ start_time: NOW_SECONDS - 3 * DAY, cost_usd: 2.5 }),
      // older than 7d
      makeExecution({ start_time: NOW_SECONDS - 10 * DAY, cost_usd: 100 }),
      // no cost
      makeExecution({ start_time: NOW_SECONDS - HOUR, cost_usd: null }),
    ];
    const kpis = computeKpis([], history, NOW_SECONDS);
    expect(kpis.spendCaptured7d).toBeCloseTo(3.75);
  });

  it('returns all zeros for empty inputs', () => {
    const kpis = computeKpis([], [], NOW_SECONDS);
    expect(kpis).toEqual({
      activePipelines: 0,
      rowsSynced24h: 0,
      successfulRuns24h: 0,
      failedRuns24h: 0,
      spendCaptured7d: 0,
    });
  });
});

describe('bucketThroughputHourly', () => {
  it('returns 24 buckets with hour-of-day labels', () => {
    const buckets = bucketThroughputHourly([], NOW_SECONDS);
    expect(buckets).toHaveLength(24);
    expect(buckets[0].hour).toBe(0);
    expect(buckets[23].hour).toBe(23);
  });

  it('places each execution into its hour-of-day bucket', () => {
    const at12 = new Date('2026-03-15T12:30:00Z').getTime() / 1000;
    const at09 = new Date('2026-03-15T09:05:00Z').getTime() / 1000;
    const history = [
      makeExecution({ start_time: at12, status: 'SUCCESS', steps: stepWithRows(100) }),
      makeExecution({ start_time: at12, status: 'FAILED' }),
      makeExecution({ start_time: at09, status: 'SUCCESS' }),
    ];
    const buckets = bucketThroughputHourly(history, NOW_SECONDS);
    const bucket12 = buckets.find((b) => b.hour === new Date(at12 * 1000).getHours())!;
    const bucket09 = buckets.find((b) => b.hour === new Date(at09 * 1000).getHours())!;
    expect(bucket12.success).toBe(1);
    expect(bucket12.failed).toBe(1);
    expect(bucket12.rows).toBe(100);
    expect(bucket09.success).toBe(1);
  });

  it('excludes executions older than 24 hours', () => {
    const yesterday = NOW_SECONDS - 2 * DAY;
    const history = [makeExecution({ start_time: yesterday, status: 'SUCCESS' })];
    const buckets = bucketThroughputHourly(history, NOW_SECONDS);
    expect(buckets.every((b) => b.success === 0 && b.failed === 0 && b.rows === 0)).toBe(
      true
    );
  });
});

describe('deriveNeedsAttention', () => {
  it('flags workflows whose status is error or failed', () => {
    const workflows = [
      makeWorkflow('ok'),
      makeWorkflow('bad', {
        status: 'error' as unknown as WorkflowStatus,
      }),
      makeWorkflow('stopped', { status: WorkflowStatus.PAUSED }),
    ];
    const items = deriveNeedsAttention(workflows);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('bad');
    expect(items[0].severity).toBe('danger');
    expect(items[0].actionLabel).toBe('Retry');
  });

  it('returns an empty list when nothing needs attention', () => {
    const workflows = [makeWorkflow('ok'), makeWorkflow('also-ok')];
    expect(deriveNeedsAttention(workflows)).toEqual([]);
  });
});

describe('filterHistoryByRange', () => {
  it('returns executions within the Today range', () => {
    const history = [
      makeExecution({ start_time: NOW_SECONDS - HOUR }),
      makeExecution({ start_time: NOW_SECONDS - 2 * DAY }),
    ];
    const filtered = filterHistoryByRange(history, 'today', NOW_SECONDS);
    expect(filtered).toHaveLength(1);
  });

  it('returns executions within the 7d range', () => {
    const history = [
      makeExecution({ start_time: NOW_SECONDS - 3 * DAY }),
      makeExecution({ start_time: NOW_SECONDS - 6 * DAY }),
      makeExecution({ start_time: NOW_SECONDS - 10 * DAY }),
    ];
    const filtered = filterHistoryByRange(history, '7d', NOW_SECONDS);
    expect(filtered).toHaveLength(2);
  });

  it('returns executions within the 30d range', () => {
    const history = [
      makeExecution({ start_time: NOW_SECONDS - 29 * DAY }),
      makeExecution({ start_time: NOW_SECONDS - 31 * DAY }),
    ];
    const filtered = filterHistoryByRange(history, '30d', NOW_SECONDS);
    expect(filtered).toHaveLength(1);
  });

  it('returns executions within the 90d range', () => {
    const history = [
      makeExecution({ start_time: NOW_SECONDS - 60 * DAY }),
      makeExecution({ start_time: NOW_SECONDS - 120 * DAY }),
    ];
    const filtered = filterHistoryByRange(history, '90d', NOW_SECONDS);
    expect(filtered).toHaveLength(1);
  });
});
