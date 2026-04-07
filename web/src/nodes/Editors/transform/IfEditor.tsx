import React, { useState, useEffect, useMemo } from 'react';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import { useWorkflowStore } from '@/store/workflowStore';
import { getUpstreamColumnNames } from '@/utils/upstreamColumns';
import { cn } from '@/lib/utils';
import { Plus, X, GitBranch } from 'lucide-react';
import type { Condition, ConditionOperator } from '@/workflow/node-specs/logic.if';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
  { value: 'contains', label: 'contains' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const NO_VALUE_OPERATORS: ConditionOperator[] = ['is_empty', 'is_not_empty'];

function makeEmptyCondition(): Condition {
  return { field: '', operator: 'equals', value: '' };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type IfEditorProps = {
  nodeId?: string;
  onClose: () => void;
  data?: {
    conditions?: Condition[];
    logic_mode?: 'AND' | 'OR';
  };
  onChange?: (data: { conditions: Condition[]; logic_mode: 'AND' | 'OR' }) => void;
  onDeleteNode?: () => void;
  onValidate?: (_valid: boolean, _errors: string[]) => void;
  compact?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const IfEditor: React.FC<IfEditorProps> = ({
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

  const [conditions, setConditions] = useState<Condition[]>(
    () => data?.conditions?.length ? data.conditions : [makeEmptyCondition()]
  );
  const [logicMode, setLogicMode] = useState<'AND' | 'OR'>(data?.logic_mode ?? 'AND');

  // Emit changes upstream whenever state changes
  useEffect(() => {
    onChange?.({ conditions, logic_mode: logicMode });
  }, [conditions, logicMode, onChange]);

  // Validate: every condition must have a non-empty field
  useEffect(() => {
    const valid = conditions.every((c) => c.field.trim().length > 0);
    const errors = valid ? [] : ['All conditions must have a field name.'];
    onValidate?.(valid, errors);
  }, [conditions, onValidate]);

  const updateCondition = (index: number, patch: Partial<Condition>) => {
    setConditions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      // Clear value when switching to a no-value operator
      if (patch.operator && NO_VALUE_OPERATORS.includes(patch.operator)) {
        next[index].value = '';
      }
      return next;
    });
  };

  const addCondition = () => setConditions((prev) => [...prev, makeEmptyCondition()]);

  const removeCondition = (index: number) =>
    setConditions((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange?.({ conditions, logic_mode: logicMode });
  };

  // ---------------------------------------------------------------------------
  // Form body (shared between compact and full-screen modes)
  // ---------------------------------------------------------------------------
  const body = (
    <div className="flex flex-col gap-4 p-4">
      {/* Output preview */}
      <div className="flex gap-2 text-xs">
        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-success/10 border border-success/20 text-success font-medium">
          <span className="w-2 h-2 rounded-full bg-success" />
          True output
        </span>
        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-error/10 border border-error/20 text-error font-medium">
          <span className="w-2 h-2 rounded-full bg-error" />
          False output
        </span>
      </div>

      {/* AND / OR toggle */}
      {conditions.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">Match</span>
          <div className="flex rounded-lg overflow-hidden border border-neutral-700 text-xs">
            {(['AND', 'OR'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setLogicMode(mode)}
                className={cn(
                  'px-3 py-1 font-medium transition-colors',
                  logicMode === mode
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-800 text-text-tertiary hover:text-text-primary'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <span className="text-xs text-text-tertiary">conditions</span>
        </div>
      )}

      {/* Condition rows */}
      <div className="flex flex-col gap-2">
        {conditions.map((cond, index) => {
          const hideValue = NO_VALUE_OPERATORS.includes(cond.operator);
          return (
            <div
              key={index}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-800 border border-neutral-700"
            >
              {/* Logic badge between rows */}
              {index > 0 && (
                <span className="absolute -mt-8 text-[9px] font-bold text-text-tertiary px-1 py-0.5 rounded bg-neutral-700">
                  {logicMode}
                </span>
              )}

              {/* Field */}
              {upstreamColumns.length > 0 ? (
                <select
                  value={cond.field}
                  onChange={(e) => updateCondition(index, { field: e.target.value })}
                  className={cn(
                    'flex-1 min-w-0 h-7 px-2 text-xs rounded-lg',
                    'bg-neutral-900 border border-neutral-700',
                    'text-text-primary focus:outline-none focus:border-primary-500',
                    !cond.field && 'text-text-tertiary'
                  )}
                >
                  <option value="">Field...</option>
                  {upstreamColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={cond.field}
                  onChange={(e) => updateCondition(index, { field: e.target.value })}
                  placeholder="field name"
                  className={cn(
                    'flex-1 min-w-0 h-7 px-2 text-xs rounded-lg',
                    'bg-neutral-900 border border-neutral-700',
                    'text-text-primary placeholder:text-text-tertiary',
                    'focus:outline-none focus:border-primary-500'
                  )}
                />
              )}

              {/* Operator */}
              <select
                value={cond.operator}
                onChange={(e) =>
                  updateCondition(index, { operator: e.target.value as ConditionOperator })
                }
                className={cn(
                  'h-7 px-2 text-xs rounded-lg flex-shrink-0',
                  'bg-neutral-900 border border-neutral-700',
                  'text-text-primary focus:outline-none focus:border-primary-500'
                )}
              >
                {OPERATOR_OPTIONS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>

              {/* Value — hidden for is_empty / is_not_empty */}
              {!hideValue && (
                <input
                  type="text"
                  value={cond.value}
                  onChange={(e) => updateCondition(index, { value: e.target.value })}
                  placeholder="value"
                  className={cn(
                    'w-24 h-7 px-2 text-xs rounded-lg flex-shrink-0',
                    'bg-neutral-900 border border-neutral-700',
                    'text-text-primary placeholder:text-text-tertiary',
                    'focus:outline-none focus:border-primary-500'
                  )}
                />
              )}

              {/* Remove button — only shown when more than one condition */}
              {conditions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCondition(index)}
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md bg-neutral-700 text-text-tertiary hover:bg-error hover:text-white transition-colors"
                  title="Remove condition"
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add condition */}
      <button
        type="button"
        onClick={addCondition}
        className={cn(
          'flex items-center gap-1.5 self-start text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
          'bg-neutral-800 border border-neutral-700 text-text-secondary',
          'hover:bg-neutral-700 hover:text-text-primary'
        )}
      >
        <Plus size={12} />
        Add condition
      </button>
    </div>
  );

  if (compact) return body;

  return (
    <BaseEditorWrapper
      title="IF Condition"
      icon={<GitBranch size={16} className="text-amber-400" />}
      onClose={onClose}
      onSubmit={handleSubmit}
      isValid={conditions.every((c) => c.field.trim().length > 0)}
      onDeleteNode={onDeleteNode}
    >
      {body}
    </BaseEditorWrapper>
  );
};

export default IfEditor;
