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
 <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-success-bg border border-success/20 text-success font-medium">
 <span className="w-2 h-2 rounded-full bg-success" />
 True output
 </span>
 <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-danger-bg border border-danger-border/20 text-error font-medium">
 <span className="w-2 h-2 rounded-full bg-error" />
 False output
 </span>
 </div>

 {/* AND / OR toggle */}
 {conditions.length > 1 && (
 <div className="flex items-center gap-2">
 <span className="text-xs text-text-3">Match</span>
 <div className="flex rounded-lg overflow-hidden border border-line-1 text-xs">
 {(['AND', 'OR'] as const).map((mode) => (
 <button
 key={mode}
 type="button"
 onClick={() => setLogicMode(mode)}
 className={cn(
 'px-3 py-1 font-medium transition-colors',
 logicMode === mode
 ? 'bg-blue-primary text-white'
 : 'bg-bg-card text-text-3 hover:text-text-1'
 )}
 >
 {mode}
 </button>
 ))}
 </div>
 <span className="text-xs text-text-3">conditions</span>
 </div>
 )}

 {/* Condition rows */}
 <div className="flex flex-col gap-2">
 {conditions.map((cond, index) => {
 const hideValue = NO_VALUE_OPERATORS.includes(cond.operator);
 return (
 <div
 key={index}
 className="flex items-center gap-2 p-2.5 rounded-xl bg-bg-card border border-line-1"
 >
 {/* Logic badge between rows */}
 {index > 0 && (
 <span className="absolute -mt-8 text-[9px] font-bold text-text-3 px-1 py-0.5 rounded bg-bg-muted">
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
 'bg-bg-page border border-line-1',
 'text-text-1 focus:outline-none focus:border-blue-primary',
 !cond.field && 'text-text-3'
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
 'bg-bg-page border border-line-1',
 'text-text-1 placeholder:text-text-3',
 'focus:outline-none focus:border-blue-primary'
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
 'bg-bg-page border border-line-1',
 'text-text-1 focus:outline-none focus:border-blue-primary'
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
 'bg-bg-page border border-line-1',
 'text-text-1 placeholder:text-text-3',
 'focus:outline-none focus:border-blue-primary'
 )}
 />
 )}

 {/* Remove button — only shown when more than one condition */}
 {conditions.length > 1 && (
 <button
 type="button"
 onClick={() => removeCondition(index)}
 className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md bg-bg-muted text-text-3 hover:bg-error hover:text-white transition-colors"
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
 'bg-bg-card border border-line-1 text-text-2',
 'hover:bg-bg-muted hover:text-text-1'
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
