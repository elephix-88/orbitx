import { z } from 'zod';
import * as Sentry from '@sentry/react';

/**
 * Lightweight runtime guards for API responses.
 *
 * Intentionally permissive: unknown fields pass through, required fields are
 * enforced only where the frontend actually reads them. The goal is to *detect*
 * backend-contract drift (report to Sentry) without breaking the UI when the
 * backend adds fields.
 */

const mongoIdSchema = z.union([
	z.string(),
	z.object({ $oid: z.string() }),
]);

const workflowNodeSchema = z
	.object({
		node_id: z.string(),
		node_type: z.string(),
		parameters: z.record(z.string(), z.unknown()).default({}),
		node_instance_id: z.number().optional(),
		display_name: z.string().nullish(),
	})
	.passthrough();

const workflowConnectionSchema = z
	.object({
		from_node: z.number(),
		to_node: z.number(),
		from_port: z.string().nullish(),
		to_port: z.string().nullish(),
	})
	.passthrough();

export const workflowDataSchema = z
	.object({
		_id: mongoIdSchema.optional(),
		user_id: z.string(),
		job_name: z.string(),
		status: z.string(),
		created_at: z.string(),
		updated_at: z.string(),
		schedule_expression: z.string(),
		nodes: z.array(workflowNodeSchema),
		connections: z.array(workflowConnectionSchema),
	})
	.passthrough();

export const workflowSummarySchema = z
	.object({
		_id: mongoIdSchema.optional(),
		user_id: z.string(),
		job_name: z.string(),
		schedule_expression: z.string(),
		status: z.string(),
		created_at: z.string(),
		updated_at: z.string(),
	})
	.passthrough();

export const workflowListSchema = z.array(workflowSummarySchema);

const executionStepSchema = z
	.object({
		node_instance_id: z.string(),
		node_id: z.string(),
		node_type: z.string(),
		status: z.enum(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED']),
		start_time: z.number().nullable(),
		end_time: z.number().nullable(),
		error: z.string().nullable(),
	})
	.passthrough();

export const executionHistorySchema = z
	.object({
		_id: z.string(),
		execution_id: z.string(),
		workflow_id: z.string(),
		workflow_name: z.string(),
		status: z.enum(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED']),
		triggered_by: z.string(),
		start_time: z.number(),
		end_time: z.number().nullable(),
		duration: z.number().nullable(),
		steps: z.record(z.string(), executionStepSchema),
	})
	.passthrough();

export const connectionOptionSchema = z
	.object({
		_id: mongoIdSchema.optional(),
		service_name: z.string().optional(),
		connection_name: z.string().optional(),
	})
	.passthrough();

export const connectionListSchema = z.array(connectionOptionSchema);

/**
 * Runs a schema over `data` and logs any drift to Sentry. Always returns `data`
 * unchanged so callers don't have to adopt try/catch. Use this at API
 * boundaries where a backend contract change should be visible but not fatal.
 */
export function logIfDrifted<T>(
	schema: z.ZodType<T>,
	data: unknown,
	label: string,
): unknown {
	const result = schema.safeParse(data);
	if (!result.success) {
		const issues = result.error.issues.slice(0, 5).map((i) => ({
			path: i.path.join('.'),
			message: i.message,
		}));
		Sentry.captureMessage(`Backend contract drift: ${label}`, {
			level: 'warning',
			extra: { issues },
		});
		if (import.meta.env.DEV) {
			console.warn(`[schema drift] ${label}`, issues);
		}
	}
	return data;
}
