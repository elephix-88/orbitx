import { z } from 'zod';
import { validateCronExpression } from '@/utils/cronUtils';

const cronExpressionSchema = z.string().refine(
 (value: string) => {
 const result = validateCronExpression(value);
 return result.isValid;
 },
 { message: 'Invalid cron expression' }
);

export const workflowMetaSchema = z.object({
 _id: z.string().optional(),
 job_name: z
 .string()
 .min(1, 'Workflow name is required')
 .min(3, 'Name must be at least 3 characters')
 .max(50, 'Name must be at most 50 characters'),
 status: z.enum(['ACTIVE', 'PAUSED', 'active', 'paused', 'error', 'completed']),
 schedule_expression: cronExpressionSchema,
});

export type WorkflowMetaFormData = z.infer<typeof workflowMetaSchema>;

/**
 * Helper to validate workflow metadata
 */
export function validateWorkflowMeta(data: unknown) {
 return workflowMetaSchema.safeParse(data);
}
