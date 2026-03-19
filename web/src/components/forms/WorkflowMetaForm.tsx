import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/shared/form/Input";
import { ScheduleSelector } from "@/components/shared/form/ScheduleSelector";
import { FormField } from "@/components/shared/form/FormCard";
import BaseEditorWrapper from "@components/editors/BaseEditorWrapper";
import { FileText, Clock } from "lucide-react";
import { WorkflowStatus } from "@/types/workflow";
import { workflowMetaSchema } from "@/schemas/workflow";

export type WorkflowMeta = {
  _id?: string;
  job_name: string;
  status: WorkflowStatus;
  schedule_expression: string;
};

// eslint-disable-next-line react-refresh/only-export-components
export function slugify(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
}

export interface WorkflowMetaFormProps {
  initial?: Partial<WorkflowMeta> & { baseName?: string };
  onSubmit: (_data: WorkflowMeta) => void;
  onCancel: () => void;
  /** When true, the workflow has unsaved changes (nodes/connections modified) */
  hasUnsavedChanges?: boolean;
}

export const WorkflowMetaForm: React.FC<WorkflowMetaFormProps> = ({
  initial,
  onSubmit,
  onCancel,
  hasUnsavedChanges = false,
}) => {
  const defaults = useMemo(() => {
    return {
      _id: initial?._id,
      // Use empty string for new workflows so placeholder shows
      job_name:
        initial?.job_name === "workflow" || !initial?.job_name
          ? ""
          : initial.job_name,
      status:
        (initial?.status as WorkflowMeta["status"]) || WorkflowStatus.ACTIVE,
      schedule_expression: initial?.schedule_expression || "0 0 * * *",
    } as WorkflowMeta;
  }, [initial]);

  const [form, setForm] = useState<WorkflowMeta>(defaults);
  const [touched, setTouched] = useState<
    Partial<Record<keyof WorkflowMeta, boolean>>
  >({});

  useEffect(() => {
    setForm(defaults);
    setTouched({});
  }, [defaults]);

  const errors = useMemo(() => computeErrors(form), [form]);

  const handleChange = (key: keyof WorkflowMeta, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const currentErrors = computeErrors(form);
    if (Object.keys(currentErrors).length > 0) {
      setTouched({ job_name: true, schedule_expression: true });
      return;
    }
    onSubmit(form);
  };

  // Canonical form for dirty-check comparison
  const canonicalForm = useMemo(
    () => ({
      job_name: form.job_name || "",
      schedule_expression: form.schedule_expression || "",
    }),
    [form.job_name, form.schedule_expression]
  );

  const canonicalDefaults = useMemo(
    () => ({
      job_name: defaults.job_name || "",
      schedule_expression: defaults.schedule_expression || "",
    }),
    [defaults.job_name, defaults.schedule_expression]
  );

  // For dirty check: if workflow has unsaved changes, always show as dirty
  // by making initialValues different from currentValues
  const effectiveInitialValues = hasUnsavedChanges
    ? { ...canonicalDefaults, __workflowDirty: true }
    : canonicalDefaults;
  const effectiveCurrentValues = hasUnsavedChanges
    ? { ...canonicalForm, __workflowDirty: false }
    : canonicalForm;

  return (
    <BaseEditorWrapper
      title="Workflow Settings"
      onClose={onCancel}
      onSubmit={handleSubmit}
      isValid={isValid}
      initialValues={effectiveInitialValues}
      currentValues={effectiveCurrentValues}
    >
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Workflow Name */}
        <FormField
          label="Name"
          icon={FileText}
          iconColor="text-blue-600 dark:text-blue-400"
        >
          <Input
            value={form.job_name}
            onChange={(e) => handleChange("job_name", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, job_name: true }))}
            placeholder="Enter workflow name (e.g., Daily Facebook Ads Report)"
            error={touched.job_name ? errors.job_name : undefined}
            className="text-base font-medium"
          />
        </FormField>

        {/* Schedule */}
        <FormField
          label="Schedule"
          icon={Clock}
          iconColor="text-emerald-600 dark:text-emerald-400"
        >
          <ScheduleSelector
            value={form.schedule_expression}
            onChange={(cronExpression) => {
              handleChange("schedule_expression", cronExpression);
              setTouched((t) => ({ ...t, schedule_expression: true }));
            }}
            error={
              touched.schedule_expression
                ? errors.schedule_expression
                : undefined
            }
          />
        </FormField>
      </div>
    </BaseEditorWrapper>
  );
};

/**
 * Validates workflow form data using Zod schema.
 * Returns field-level errors for display in the form.
 */
const computeErrors = (
  data: WorkflowMeta
): Partial<Record<keyof WorkflowMeta, string>> => {
  const result = workflowMetaSchema.safeParse(data);

  if (result.success) {
    return {};
  }

  const errors: Partial<Record<keyof WorkflowMeta, string>> = {};

  for (const issue of result.error.issues) {
    const path = issue.path[0] as keyof WorkflowMeta;
    if (path && !errors[path]) {
      errors[path] = issue.message;
    }
  }

  return errors;
};
