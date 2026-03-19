import { z } from 'zod';
import { VALIDATION_RULES } from '@/config/env';
import { validateCronExpression } from '@/utils/cronUtils';

/**
 * Validates a cron expression (5 fields: minute hour day month weekday)
 * Uses comprehensive field-level validation
 */
const cronExpressionSchema = z.string().refine(
  (value: string) => {
    const result = validateCronExpression(value);
    return result.isValid;
  },
  {
    message: 'Invalid cron expression',
  }
);

/**
 * Schema for workflow metadata form
 */
export const workflowMetaSchema = z.object({
  _id: z.string().optional(),
  job_name: z
    .string()
    .min(1, 'Workflow name is required')
    .min(
      VALIDATION_RULES.MIN_NAME_LENGTH,
      `Name must be at least ${VALIDATION_RULES.MIN_NAME_LENGTH} characters`
    )
    .max(
      VALIDATION_RULES.MAX_NAME_LENGTH,
      `Name must be at most ${VALIDATION_RULES.MAX_NAME_LENGTH} characters`
    ),
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
