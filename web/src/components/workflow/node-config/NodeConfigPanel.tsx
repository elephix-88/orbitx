import React, { useState, useCallback } from 'react';
import {
 X,
 Play,
 AlertTriangle,
 CheckCircle2,
 Loader2,
 ChevronDown,
 Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowNode } from '@/types/workflow';
import { getNodeSpecByDisplayName, getNodeSpec } from '@/workflow/registry';
import { getNodeIcon } from '@/components/icons/BrandIcons';
import { Button } from '@/components/shared/Button';

function generateNodeDisplayName(
 node: WorkflowNode,
 data: Record<string, unknown>
): string | undefined {
 const spec =
 getNodeSpecByDisplayName(node.name) ||
 (node.definitionId ? getNodeSpec(node.definitionId) : undefined);
 if (spec?.generateDisplayName) return spec.generateDisplayName(data);
 return undefined;
}

interface NodeConfigPanelProps {
 node: WorkflowNode;
 onUpdate: (node: WorkflowNode) => void;
 onClose: () => void;
 onExecuteNode?: () => void;
 isExecuting?: boolean;
 executionStatus?: 'idle' | 'running' | 'success' | 'error';
 onPreview?: (nodeId: string) => void;
}

const categoryTileClass: Record<string, string> = {
 source: 'bg-blue-soft text-blue-primary',
 transform: 'bg-warning-bg text-warning',
 destination: 'bg-success-bg text-success',
};

const categoryLabel: Record<string, string> = {
 source: 'Source',
 transform: 'Transform',
 destination: 'Destination',
};

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
 node,
 onUpdate,
 onClose,
 onExecuteNode,
 isExecuting = false,
 executionStatus = 'idle',
 onPreview,
}) => {
 const spec =
 node.definitionId
 ? getNodeSpec(node.definitionId)
 : getNodeSpecByDisplayName(node.name);

 const [validationErrors, setValidationErrors] = useState<string[]>([]);
 const [isValid, setIsValid] = useState(true);
 const [pendingData, setPendingData] = useState<Record<string, unknown>>(
 node.data || {}
 );
 const [pendingDisplayName, setPendingDisplayName] = useState(
 node.display_name || ''
 );
 const [pendingDescription, setPendingDescription] = useState(
 node.description || ''
 );
 const [pendingContinueOnFail, setPendingContinueOnFail] = useState(
 node.continueOnFail ?? false
 );
 const [pendingRetryOnFail, setPendingRetryOnFail] = useState(
 node.retryOnFail ?? false
 );
 const [advancedOpen, setAdvancedOpen] = useState(false);

 const handleDataChange = useCallback((data: Record<string, unknown>) => {
 setPendingData(data);
 }, []);

 const handleValidate = useCallback((valid: boolean, errors: string[]) => {
 setIsValid(valid);
 setValidationErrors(errors);
 }, []);

 const handleSave = useCallback(() => {
 let displayName = pendingDisplayName.trim();
 if (!displayName) {
 const generated = generateNodeDisplayName(node, pendingData);
 if (generated && generated !== node.name) displayName = generated;
 }

 let inputs = node.inputs;
 let outputs = node.outputs;
 if (spec?.getDynamicPorts) {
 const dynamicPorts = spec.getDynamicPorts(pendingData);
 inputs = dynamicPorts
 .filter((port) => port.io === 'input')
 .map((port) => ({ id: port.id, name: port.name }));
 outputs = dynamicPorts
 .filter((port) => port.io === 'output')
 .map((port) => ({ id: port.id, name: port.name }));
 }

 onUpdate({
 ...node,
 data: pendingData,
 display_name: displayName || undefined,
 description: pendingDescription,
 continueOnFail: pendingContinueOnFail,
 retryOnFail: pendingRetryOnFail,
 inputs,
 outputs,
 });
 onClose();
 }, [
 node,
 pendingData,
 pendingDisplayName,
 pendingDescription,
 pendingContinueOnFail,
 pendingRetryOnFail,
 onUpdate,
 onClose,
 spec,
 ]);

 const Editor = spec?.ui.editor as
 | React.ComponentType<{
 nodeId: string;
 data: Record<string, unknown>;
 onChange: (data: Record<string, unknown>) => void;
 onClose: () => void;
 onValidate?: (valid: boolean, errors: string[]) => void;
 compact?: boolean;
 }>
 | undefined;

 const hasPlatformIcon = spec?.typeId && getNodeIcon(spec.typeId, 18) !== null;
 const categoryClass =
 categoryTileClass[node.type ?? 'transform'] ?? categoryTileClass.transform;

 const statusIcon = (() => {
 if (executionStatus === 'running')
 return <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-primary" />;
 if (executionStatus === 'success')
 return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
 if (executionStatus === 'error')
 return <AlertTriangle className="w-3.5 h-3.5 text-danger" />;
 return null;
 })();

 return (
 <aside
 role="complementary"
 aria-label={`${node.name} configuration`}
 className={cn(
 'relative flex flex-col h-full shrink-0',
 'w-full lg:w-[420px] lg:max-w-[460px]',
 'bg-bg-card border border-line-1 rounded-xl shadow-sm',
 'overflow-hidden'
 )}
 >
 <header className="flex items-center gap-2 px-4 py-3 border-b border-line-1">
 <span
 className={cn(
 'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
 hasPlatformIcon ? 'bg-bg-muted' : categoryClass
 )}
 aria-hidden="true"
 >
 {hasPlatformIcon && spec?.typeId
 ? getNodeIcon(spec.typeId, 18)
 : null}
 </span>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <h3 className="font-display text-[14px] text-text-1 truncate">
 {node.name}
 </h3>
 {statusIcon}
 </div>
 <div className="text-[11px] text-text-3 truncate">
 {categoryLabel[node.type ?? 'transform'] ?? 'Node'}
 {spec?.typeId ? ` · ${spec.typeId}` : ''}
 </div>
 </div>
 {onPreview && (
 <Button
 variant="ghost"
 size="icon-sm"
 onClick={() => onPreview(node.id)}
 title="Preview node data"
 aria-label="Preview node data"
 >
 <Eye size={14} />
 </Button>
 )}
 {onExecuteNode && (
 <Button
 variant="ghost"
 size="icon-sm"
 onClick={onExecuteNode}
 disabled={isExecuting}
 title="Test node"
 aria-label="Test node"
 >
 {isExecuting ? (
 <Loader2 size={14} className="animate-spin" />
 ) : (
 <Play size={14} />
 )}
 </Button>
 )}
 <Button
 variant="ghost"
 size="icon-sm"
 onClick={onClose}
 title="Close"
 aria-label="Close"
 >
 <X size={14} />
 </Button>
 </header>

 <div className="flex-1 overflow-y-auto">
 <div className="p-4 space-y-4">
 <div>
 <label className="block text-[11.5px] font-medium text-text-3 mb-1">
 Node name
 </label>
 <input
 type="text"
 value={pendingDisplayName}
 onChange={(event) => setPendingDisplayName(event.target.value)}
 placeholder={node.name}
 className="w-full px-2.5 py-1.5 rounded-md border border-line-1 bg-bg-card text-[13px] text-text-1 placeholder:text-text-3 focus:outline-none focus:border-blue-border focus:ring-[3px] focus:ring-blue-soft transition-shadow"
 />
 </div>

 {spec && Editor ? (
 <Editor
 nodeId={node.id}
 data={pendingData}
 onChange={handleDataChange}
 onClose={onClose}
 onValidate={handleValidate}
 compact
 />
 ) : (
 <div className="px-1 py-6 text-center text-[12.5px] text-text-3">
 No configuration available for this node type.
 </div>
 )}

 {validationErrors.length > 0 && (
 <div className="p-3 bg-danger-bg border border-danger-border rounded-lg">
 <div className="flex items-start gap-2">
 <AlertTriangle
 size={14}
 className="text-danger shrink-0 mt-[2px]"
 aria-hidden="true"
 />
 <div className="min-w-0">
 <div className="text-[12px] font-semibold text-danger mb-1">
 Please fix the following:
 </div>
 <ul className="text-[12px] text-danger space-y-1 list-disc list-inside">
 {validationErrors.map((error, index) => (
 <li key={index}>{error}</li>
 ))}
 </ul>
 </div>
 </div>
 </div>
 )}

 <details
 open={advancedOpen}
 onToggle={(event) =>
 setAdvancedOpen((event.currentTarget as HTMLDetailsElement).open)
 }
 className="border-t border-line-soft pt-4"
 >
 <summary className="flex items-center gap-1.5 text-[12.5px] font-medium text-text-2 cursor-pointer list-none select-none">
 <ChevronDown
 size={14}
 className={cn(
 'transition-transform',
 !advancedOpen && '-rotate-90'
 )}
 aria-hidden="true"
 />
 Advanced
 </summary>
 <div className="space-y-3 mt-3">
 <div>
 <label className="block text-[11.5px] font-medium text-text-3 mb-1">
 Description
 </label>
 <textarea
 rows={2}
 value={pendingDescription}
 onChange={(event) => setPendingDescription(event.target.value)}
 placeholder="Optional note about this node"
 className="w-full px-2.5 py-1.5 rounded-md border border-line-1 bg-bg-card text-[13px] text-text-1 placeholder:text-text-3 focus:outline-none focus:border-blue-border focus:ring-[3px] focus:ring-blue-soft transition-shadow resize-none"
 />
 </div>
 <label className="flex items-start gap-2.5 p-2.5 rounded-md bg-bg-muted border border-line-1 cursor-pointer">
 <input
 type="checkbox"
 checked={pendingContinueOnFail}
 onChange={(event) =>
 setPendingContinueOnFail(event.target.checked)
 }
 className="mt-[2px] w-4 h-4 rounded border-line-2 text-blue-primary focus:ring-2 focus:ring-blue-soft"
 />
 <div>
 <div className="text-[12.5px] font-medium text-text-1">
 Continue on failure
 </div>
 <div className="text-[11.5px] text-text-3 mt-[1px]">
 Keep running subsequent nodes if this one fails.
 </div>
 </div>
 </label>
 <label className="flex items-start gap-2.5 p-2.5 rounded-md bg-bg-muted border border-line-1 cursor-pointer">
 <input
 type="checkbox"
 checked={pendingRetryOnFail}
 onChange={(event) =>
 setPendingRetryOnFail(event.target.checked)
 }
 className="mt-[2px] w-4 h-4 rounded border-line-2 text-blue-primary focus:ring-2 focus:ring-blue-soft"
 />
 <div>
 <div className="text-[12.5px] font-medium text-text-1">
 Retry on failure
 </div>
 <div className="text-[11.5px] text-text-3 mt-[1px]">
 Attempt this node up to 3 times before failing.
 </div>
 </div>
 </label>
 </div>
 </details>
 </div>
 </div>

 <footer className="flex items-center justify-end gap-2 px-4 py-3 border-t border-line-1 bg-bg-card">
 <Button variant="secondary" size="sm" onClick={onClose}>
 Cancel
 </Button>
 <Button
 variant="primary"
 size="sm"
 onClick={handleSave}
 disabled={!isValid}
 >
 Save changes
 </Button>
 </footer>
 </aside>
 );
};

export default NodeConfigPanel;
