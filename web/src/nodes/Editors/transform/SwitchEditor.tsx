import React, { useState, useEffect, useMemo } from 'react';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import { useWorkflowStore } from '@/store/workflowStore';
import { getUpstreamColumnNames } from '@/utils/upstreamColumns';
import { cn } from '@/lib/utils';
import { Plus, X, GitFork } from 'lucide-react';
import type { SwitchCase } from '@/workflow/node-specs/logic.switch';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateCaseId(cases: SwitchCase[]): string {
  const existing = new Set(cases.map((c) => c.case_id));
  let index = cases.length + 1;
  while (existing.has(`case_${index}`)) index++;
  return `case_${index}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type SwitchEditorProps = {
  nodeId?: string;
  onClose: () => void;
  data?: {
    field?: string;
    cases?: SwitchCase[];
  };
  onChange?: (data: { field: string; cases: SwitchCase[] }) => void;
  onDeleteNode?: () => void;
  onValidate?: (_valid: boolean, _errors: string[]) => void;
  compact?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SwitchEditor: React.FC<SwitchEditorProps> = ({
  nodeId,
  onClose,
  data,
  onChange,
  onDeleteNode,
  onValidate,
  compact = false,
}) => {
  const nodes = useWorkflowStore((state) => state.nodes);
  const connections = useWorkflowStore((state) => state.connections);

  const upstreamColumns = useMemo(() => {
    if (!nodeId) return [];
    return getUpstreamColumnNames(nodeId, nodes, connections);
  }, [nodeId, nodes, connections]);

  const [field, setField] = useState(data?.field ?? '');
  const [cases, setCases] = useState<SwitchCase[]>(
    () => data?.cases?.length ? data.cases : [{ case_id: 'case_1', value: '' }]
  );

  // Emit upstream on change
  useEffect(() => {
    onChange?.({ field, cases });
  }, [field, cases, onChange]);

  // Validate
  useEffect(() => {
    const valid = field.trim().length > 0 && cases.every((c) => c.value.trim().length > 0);
    const errors: string[] = [];
    if (!field.trim()) errors.push('Switch field is required.');
    if (cases.some((c) => !c.value.trim())) errors.push('All case values must be non-empty.');
    onValidate?.(valid, errors);
  }, [field, cases, onValidate]);

  const updateCase = (index: number, value: string) => {
    setCases((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], value };
      return next;
    });
  };

  const addCase = () => {
    setCases((prev) => [...prev, { case_id: generateCaseId(prev), value: '' }]);
  };

  const removeCase = (index: number) => {
    setCases((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange?.({ field, cases });
  };

  // ---------------------------------------------------------------------------
  // Field selector
  // ---------------------------------------------------------------------------
  const fieldSelector = (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-text-secondary">Switch on field</label>
      {upstreamColumns.length > 0 ? (
        <select
          value={field}
          onChange={(e) => setField(e.target.value)}
          className={cn(
            'h-8 px-2.5 text-xs rounded-lg w-full',
            'bg-neutral-900 border border-neutral-700',
            'text-text-primary focus:outline-none focus:border-primary-500',
            !field && 'text-text-tertiary'
          )}
        >
          <option value="">Select a field...</option>
          {upstreamColumns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={field}
          onChange={(e) => setField(e.target.value)}
          placeholder="field name"
          className={cn(
            'h-8 px-2.5 text-xs rounded-lg w-full',
            'bg-neutral-900 border border-neutral-700',
            'text-text-primary placeholder:text-text-tertiary',
            'focus:outline-none focus:border-primary-500'
          )}
        />
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Body
  // ---------------------------------------------------------------------------
  const body = (
    <div className="flex flex-col gap-4 p-4">
      {fieldSelector}

      {/* Cases */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-text-secondary">Cases</label>
        <div className="flex flex-col gap-2">
          {cases.map((c, index) => (
            <div
              key={c.case_id}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-800 border border-neutral-700"
            >
              {/* Case label */}
              <span className="text-[10px] font-mono text-text-tertiary flex-shrink-0 w-14 truncate">
                {c.case_id}
              </span>

              {/* Value input */}
              <input
                type="text"
                value={c.value}
                onChange={(e) => updateCase(index, e.target.value)}
                placeholder="value to match"
                className={cn(
                  'flex-1 h-7 px-2 text-xs rounded-lg',
                  'bg-neutral-900 border border-neutral-700',
                  'text-text-primary placeholder:text-text-tertiary',
                  'focus:outline-none focus:border-primary-500'
                )}
              />

              {/* Delete — always allowed since at least one case is not enforced by spec */}
              {cases.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCase(index)}
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md bg-neutral-700 text-text-tertiary hover:bg-error hover:text-white transition-colors"
                  title="Remove case"
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              )}
            </div>
          ))}

          {/* Default — always present, non-removable */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-800/50 border border-dashed border-neutral-600">
            <span className="text-[10px] font-mono text-text-tertiary flex-shrink-0 w-14">
              default
            </span>
            <span className="flex-1 text-xs text-text-tertiary italic">
              All other values (always present)
            </span>
          </div>
        </div>
      </div>

      {/* Add case button */}
      <button
        type="button"
        onClick={addCase}
        className={cn(
          'flex items-center gap-1.5 self-start text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
          'bg-neutral-800 border border-neutral-700 text-text-secondary',
          'hover:bg-neutral-700 hover:text-text-primary'
        )}
      >
        <Plus size={12} />
        Add case
      </button>
    </div>
  );

  if (compact) return body;

  return (
    <BaseEditorWrapper
      title="Switch"
      icon={<GitFork size={16} className="text-violet-400" />}
      onClose={onClose}
      onSubmit={handleSubmit}
      isValid={field.trim().length > 0 && cases.every((c) => c.value.trim().length > 0)}
      onDeleteNode={onDeleteNode}
    >
      {body}
    </BaseEditorWrapper>
  );
};

export default SwitchEditor;
