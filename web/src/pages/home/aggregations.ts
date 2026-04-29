import type { ExecutionHistory, ExecutionStep } from '@/types/backend';
import { getRecordsCount } from '@/utils/executionFormatters';
import type { FrontendWorkflow } from '@/utils/workflowTransformers';

export type HomeRange = 'today' | '7d' | '30d' | '90d';

export interface HomeKpis {
 activePipelines: number;
 rowsSynced24h: number;
 successfulRuns24h: number;
 failedRuns24h: number;
 spendCaptured7d: number;
}

export interface ThroughputBucket {
 /** Hour of day, 0..23 */
 hour: number;
 /** Rows processed across all executions that started during this hour. */
 rows: number;
 /** Successful runs during this hour. */
 success: number;
 /** Failed runs during this hour. */
 failed: number;
}

export interface NeedsAttentionItem {
 id: string;
 name: string;
 reason: string;
 /** Maps to Chip variant for the status badge. */
 severity: 'danger' | 'warning';
 /** Label shown on the action Button. */
 actionLabel: 'Retry' | 'Reconnect' | 'Refresh' | 'Review';
}

const secondsPerDay = 86400;
const hoursPerDay = 24;

const getRangeStartSeconds = (range: HomeRange, now: number): number => {
 const today = now - secondsPerDay;
 switch (range) {
 case 'today':
 return today;
 case '7d':
 return now - 7 * secondsPerDay;
 case '30d':
 return now - 30 * secondsPerDay;
 case '90d':
 return now - 90 * secondsPerDay;
 }
};

const sumRowsForExecution = (execution: ExecutionHistory): number => {
 if (!execution.steps) return 0;
 let total = 0;
 for (const step of Object.values(execution.steps) as ExecutionStep[]) {
 const rows = getRecordsCount(step.output);
 if (typeof rows === 'number') total += rows;
 }
 return total;
};

/**
 * Compute the 5 KPIs shown in the Home page header.
 *
 * - `activePipelines` counts workflows whose status is ACTIVE.
 * - `rowsSynced24h`, `successfulRuns24h`, `failedRuns24h` are always 24h,
 * regardless of the selected `range` — per the mockup label "· 24h".
 * - `spendCaptured7d` sums `cost_usd` over the last 7 days (stand-in for
 * marketing spend captured; swap when the unified schema exposes it).
 */
export function computeKpis(
 workflows: FrontendWorkflow[],
 history: ExecutionHistory[],
 now: number = Date.now() / 1000
): HomeKpis {
 const cutoff24h = now - secondsPerDay;
 const cutoff7d = now - 7 * secondsPerDay;

 const activePipelines = workflows.filter((w) => w.status === 'ACTIVE').length;

 let rowsSynced24h = 0;
 let successfulRuns24h = 0;
 let failedRuns24h = 0;
 let spendCaptured7d = 0;

 for (const execution of history) {
 if (execution.start_time >= cutoff7d && typeof execution.cost_usd === 'number') {
 spendCaptured7d += execution.cost_usd;
 }
 if (execution.start_time >= cutoff24h) {
 rowsSynced24h += sumRowsForExecution(execution);
 if (execution.status === 'SUCCESS') successfulRuns24h += 1;
 else if (execution.status === 'FAILED') failedRuns24h += 1;
 }
 }

 return {
 activePipelines,
 rowsSynced24h,
 successfulRuns24h,
 failedRuns24h,
 spendCaptured7d,
 };
}

/**
 * Bucket executions into 24 hourly buckets, labeled by the hour-of-day
 * of each execution's `start_time`. Missing hours are returned with zeroes.
 */
export function bucketThroughputHourly(
 history: ExecutionHistory[],
 now: number = Date.now() / 1000
): ThroughputBucket[] {
 const cutoff24h = now - secondsPerDay;
 const buckets: ThroughputBucket[] = Array.from({ length: hoursPerDay }, (_, hour) => ({
 hour,
 rows: 0,
 success: 0,
 failed: 0,
 }));

 for (const execution of history) {
 if (execution.start_time < cutoff24h) continue;
 const date = new Date(execution.start_time * 1000);
 const hour = date.getHours();
 const bucket = buckets[hour];
 bucket.rows += sumRowsForExecution(execution);
 if (execution.status === 'SUCCESS') bucket.success += 1;
 else if (execution.status === 'FAILED') bucket.failed += 1;
 }

 return buckets;
}

/**
 * Derive the Needs-attention feed from the workflow list. For v1 this is
 * limited to failed-status workflows; when token-expiry is exposed on the
 * workflow summary (Phase B1), also include soon-to-expire connections.
 */
export function deriveNeedsAttention(
 workflows: FrontendWorkflow[]
): NeedsAttentionItem[] {
 const items: NeedsAttentionItem[] = [];

 for (const workflow of workflows) {
 const rawStatus = String(workflow.status ?? '').toLowerCase();
 if (rawStatus === 'error' || rawStatus === 'failed') {
 items.push({
 id: workflow.id,
 name: workflow.name || workflow.job_id,
 reason: 'Last run failed',
 severity: 'danger',
 actionLabel: 'Retry',
 });
 }
 }

 return items;
}

/**
 * Filter a set of executions to the selected range. Used by "Recent runs".
 */
export function filterHistoryByRange(
 history: ExecutionHistory[],
 range: HomeRange,
 now: number = Date.now() / 1000
): ExecutionHistory[] {
 const cutoff = getRangeStartSeconds(range, now);
 return history.filter((execution) => execution.start_time >= cutoff);
}
