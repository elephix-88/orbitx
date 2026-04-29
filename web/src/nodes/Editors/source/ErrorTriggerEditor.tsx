import React from 'react';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import { AlertTriangle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ErrorTriggerEditorProps {
 data?: Record<string, unknown>;
 onChange?: (_data: Record<string, unknown>) => void;
 onClose: () => void;
 onValidate?: (_valid: boolean, _errors: string[]) => void;
 compact?: boolean;
}

// ---------------------------------------------------------------------------
// Payload field definitions — mirrors ErrorPayload in common/common/model/error_trigger.py
// ---------------------------------------------------------------------------

interface PayloadField {
 key: string;
 label: string;
 description: string;
}

const PAYLOAD_FIELDS: PayloadField[] = [
 {
 key: 'workflow_id',
 label: 'Workflow ID',
 description: 'The MongoDB ID of the workflow that failed.',
 },
 {
 key: 'workflow_name',
 label: 'Workflow Name',
 description: 'The human-readable name of the failed workflow.',
 },
 {
 key: 'execution_id',
 label: 'Execution ID',
 description: 'The Prefect run ID for the failed execution.',
 },
 {
 key: 'failed_node',
 label: 'Failed Node',
 description: 'The display name or node ID of the step that failed (may be null for full-graph failures).',
 },
 {
 key: 'error_message',
 label: 'Error Message',
 description: 'The exception message from the failed step.',
 },
 {
 key: 'timestamp',
 label: 'Timestamp',
 description: 'Unix epoch (float) of when the failure was recorded.',
 },
];

// ---------------------------------------------------------------------------
// ErrorTriggerEditor
// ---------------------------------------------------------------------------

const ErrorTriggerEditor: React.FC<ErrorTriggerEditorProps> = ({
 onClose,
 compact = false,
}) => {
 // This node has no user-configurable fields — always valid.
 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 onClose();
 };

 const content = (
 <div className="space-y-4">
 {/* Info banner */}
 <div className="flex items-start gap-3 rounded-xl border border-danger-border/20 bg-danger-bg px-4 py-3">
 <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
 <p className="text-xs text-text-2 leading-relaxed">
 This node outputs the error payload when the workflow is triggered by a failure in a
 linked workflow. There are no user-configurable settings — the payload is injected
 automatically at runtime.
 </p>
 </div>

 {/* Payload fields */}
 <div className="bg-bg-card/30 border border-line-1 rounded-xl p-4 space-y-3">
 <p className="text-xs font-semibold text-text-3 uppercase tracking-wider">
 Output fields (read-only)
 </p>
 <div className="space-y-2">
 {PAYLOAD_FIELDS.map((field) => (
 <div
 key={field.key}
 className="flex items-start gap-3 rounded-lg border border-line-1 bg-bg-page px-3 py-2.5"
 >
 <div className="min-w-0 flex-1">
 <p className="text-xs font-medium text-text-1 font-mono">{field.key}</p>
 <p className="text-xs text-text-3 mt-0.5">{field.description}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );

 if (compact) {
 return <div className="space-y-4">{content}</div>;
 }

 return (
 <BaseEditorWrapper
 title="Error Trigger"
 icon={<AlertTriangle className="w-7 h-7 text-red-400" />}
 onClose={onClose}
 onSubmit={handleSubmit}
 isValid={true}
 >
 {content}
 </BaseEditorWrapper>
 );
};

export default ErrorTriggerEditor;
