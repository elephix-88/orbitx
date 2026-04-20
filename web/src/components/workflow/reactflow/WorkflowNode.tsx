import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { getIcon } from '@/utils/iconMap';
import { X, Copy, Loader2, CheckCircle, AlertTriangle, XCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ValidationStatus, ValidationIssue } from '../WorkflowValidation';

// Node data interface for React Flow workflow nodes
export interface WorkflowNodeData {
 name: string; // Actual node type name (e.g., "Facebook Ads")
 display_name?: string; // Alias/custom name (e.g., "FB - Age Data")
 icon?: string;
 color?: string;
 category: 'source' | 'transform' | 'destination';
 status?: 'pending' | 'running' | 'success' | 'error' | 'idle';
 inputs: Array<{ id: string; name: string }>;
 outputs: Array<{ id: string; name: string }>;
 validationStatus?: ValidationStatus;
 validationIssues?: ValidationIssue[];
 onOpenEditor?: () => void;
 onDelete?: () => void;
 onDuplicate?: () => void;

 // Debug mode — set when an execution is loaded for inspection
 /** Whether this node is the one that failed in the debug execution. */
 debugFailed?: boolean;
 /** Whether this node succeeded in the debug execution. */
 debugSucceeded?: boolean;
 /** Row count from stored execution output (shown as a badge). */
 debugRowCount?: number;
 /** Error message from the failed node — shown as an inline badge. */
 debugErrorMessage?: string | null;
 /** Called when user clicks the node in debug mode — opens PreviewPanel with stored rows. */
 onDebugInspect?: () => void;
 /** Preview status driven from canvas — shown as Play button state on source nodes. */
 previewStatus?: 'idle' | 'running' | 'done' | 'error';
 /** Called when user clicks the Play button on a source node. */
 onPreview?: () => void;
 [key: string]: unknown; // Index signature for React Flow compatibility
}

// Props for WorkflowNode component
interface WorkflowNodeProps {
 data: WorkflowNodeData;
 selected?: boolean;
}

// Category styling using design tokens
const categoryStyles: Record<string, {
 borderClass: string;
 textClass: string;
 bgClass: string;
}> = {
 source: {
 borderClass: 'border-l-blue-500',
 textClass: 'text-blue-primary',
 bgClass: 'bg-blue-primary',
 },
 transform: {
 borderClass: 'border-l-amber-500',
 textClass: 'text-amber-500',
 bgClass: 'bg-amber-500',
 },
 destination: {
 borderClass: 'border-l-success',
 textClass: 'text-success',
 bgClass: 'bg-success',
 },
};

const WorkflowNode = ({ data, selected }: WorkflowNodeProps) => {
 const styles = categoryStyles[data.category] || categoryStyles.transform;

 const renderIcon = (iconName: string) => {
 const Icon = getIcon(iconName);
 return <Icon size={36} />;
 };

 // Validation indicator
 const renderValidationIndicator = () => {
 if (!data.validationStatus || data.status === 'running') return null;

 const iconSize = 16;
 const tooltip = data.validationIssues?.length
 ? data.validationIssues.map(i => i.message).join('\n')
 : data.validationStatus === 'valid'
 ? 'Configured correctly'
 : data.validationStatus === 'unconfigured'
 ? 'Double-click to configure'
 : '';

 switch (data.validationStatus) {
 case 'valid':
 return (
 <div title={tooltip} className="flex-shrink-0">
 <CheckCircle size={iconSize} className="text-success" />
 </div>
 );
 case 'warning':
 return (
 <div title={tooltip} className="flex-shrink-0">
 <AlertTriangle size={iconSize} className="text-warning" />
 </div>
 );
 case 'error':
 return (
 <div title={tooltip} className="flex-shrink-0">
 <XCircle size={iconSize} className="text-error" />
 </div>
 );
 case 'unconfigured':
 return (
 <div title={tooltip} className="flex-shrink-0">
 <div className="w-2 h-2 rounded-full bg-neutral-400 " />
 </div>
 );
 default:
 return null;
 }
 };

 const isInDebugMode = data.debugFailed !== undefined || data.debugSucceeded !== undefined;

 return (
 <div
 className={cn(
 'select-none group',
 'flex flex-col',
 'transition-all duration-300 ease-out',
 'w-[144px]',
 isInDebugMode ? 'rounded-xl' : 'h-[47px]',
 'bg-bg-card border border-line-1 rounded-xl',
 'border-l-4',
 styles.borderClass,
 selected && 'border-blue-primary shadow-sm scale-[1.02]',
 // Red ring for the failed node in debug mode
 data.debugFailed && 'ring-2 ring-red-500',
 // Subtle green border for succeeded nodes in debug mode
 data.debugSucceeded && !data.debugFailed && 'border-success-border',
 )}
 onDoubleClick={(e) => {
 e.stopPropagation();
 if (isInDebugMode) {
 data.onDebugInspect?.();
 } else {
 data.onOpenEditor?.();
 }
 }}
 >
 {/* Input Handle - always render for target connections */}
 {data.inputs.length > 0 ? (
 data.inputs.map((input, index) => (
 <Handle
 key={input.id}
 id={input.id}
 type="target"
 position={Position.Left}
 style={{
 top: data.inputs.length === 1 ? '50%' : `${((index + 1) / (data.inputs.length + 1)) * 100}%`,
 }}
 className={cn(
 '!w-3 !h-3 !rounded-full',
 '!bg-neutral-400 !border-2 !border-line-1',
 'hover:!bg-text-3 hover:!scale-125',
 '!transition-all !duration-200'
 )}
 />
 ))
 ) : (
 <Handle
 id="in"
 type="target"
 position={Position.Left}
 className={cn(
 '!w-3 !h-3 !rounded-full',
 '!bg-neutral-400 !border-2 !border-line-1',
 'hover:!bg-text-3 hover:!scale-125',
 '!transition-all !duration-200'
 )}
 />
 )}

 {/* Full-workflow running state overlay */}
 {data.status === 'running' && (
 <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg-card/60 rounded-xl">
 <div className="relative">
 <Loader2 className={cn('w-5 h-5 animate-spin', styles.textClass)} />
 </div>
 </div>
 )}

 {/* Node Content */}
 <div
 className={cn(
 'flex items-center gap-2 w-full h-[47px] px-2.5 flex-shrink-0',
 data.status === 'running' && 'opacity-40 pointer-events-none'
 )}
 >
 {/* Icon Container */}
 <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-md">
 {renderIcon(data.icon || 'Circle')}
 </div>

 {/* Text Content */}
 <div className="flex-1 min-w-0">
 {/* Actual node type name (always shown) */}
 <h4
 className="font-medium truncate leading-tight text-xs text-text-1"
 title={data.display_name ? `${data.name} - ${data.display_name}` : data.name}
 >
 {data.name}
 </h4>
 {/* Alias (shown if set) */}
 {data.display_name ? (
 <p
 className="text-[10px] truncate leading-tight text-text-2"
 title={data.display_name}
 >
 {data.display_name}
 </p>
 ) : null}
 </div>

 {/* Debug row count badge */}
 {isInDebugMode && data.debugRowCount !== undefined && !data.debugFailed && (
 <span className="flex-shrink-0 text-[9px] font-medium px-1 py-0.5 rounded-md bg-success-bg text-success border border-success/30">
 {data.debugRowCount}r
 </span>
 )}

 {/* Status Indicator - circle in top-right area (hidden in debug mode) */}
 {!isInDebugMode && (
 data.status && data.status !== 'idle' && data.status !== 'running' && data.status !== 'pending' ? (
 <div className="flex-shrink-0">
 <div
 className={cn(
 'w-2 h-2 rounded-full',
 data.status === 'error' ? 'bg-error' : data.status === 'success' ? 'bg-success' : 'bg-border'
 )}
 />
 </div>
 ) : (
 renderValidationIndicator()
 )
 )}
 </div>

 {/* Debug error banner — only shown on the failed node */}
 {data.debugFailed && data.debugErrorMessage && (
 <div className="px-2 pb-1.5 w-full">
 <p
 className="text-[9px] leading-tight text-red-300 bg-red-900/30 border border-red-500/30 rounded-md px-1.5 py-1 truncate"
 title={data.debugErrorMessage}
 >
 {data.debugErrorMessage}
 </p>
 </div>
 )}

 {/* Output handles — one per output port */}
 {data.outputs.length > 0 &&
 data.outputs.map((output, index) => {
 const isMulti = data.outputs.length > 1;
 // For IF true/false and Switch cases, use semantic colors on the handle dot
 const handleColorClass =
 output.id === 'true'
 ? '!bg-success'
 : output.id === 'false'
 ? '!bg-error'
 : output.id === 'default'
 ? '!bg-neutral-400'
 : isMulti
 ? '!bg-violet-400'
 : styles.bgClass;

 const topPercent = isMulti
 ? ((index + 1) / (data.outputs.length + 1)) * 100
 : 50;

 return (
 <React.Fragment key={output.id}>
 {/* Label for named output ports */}
 {isMulti && (
 <div
 className="absolute pointer-events-none select-none"
 style={{
 right: '100%',
 top: `${topPercent}%`,
 transform: 'translateY(-50%)',
 marginRight: '10px',
 }}
 >
 <span
 className={cn(
 'text-[9px] font-semibold px-1 py-0.5 rounded whitespace-nowrap',
 output.id === 'true'
 ? 'text-success'
 : output.id === 'false'
 ? 'text-error'
 : output.id === 'default'
 ? 'text-neutral-400'
 : 'text-violet-400'
 )}
 >
 {output.name}
 </span>
 </div>
 )}
 <Handle
 id={output.id}
 type="source"
 position={Position.Right}
 style={{ top: `${topPercent}%` }}
 className={cn(
 isMulti ? '!w-2.5 !h-2.5' : '!w-3 !h-3',
 '!rounded-full',
 handleColorClass,
 '!border-2 !border-line-1',
 'hover:!scale-125',
 '!transition-all !duration-200'
 )}
 />
 </React.Fragment>
 );
 })}

 {/* Node Action Buttons */}
 <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
 {/* Play / Preview Button — source nodes only */}
 {data.category === 'source' && data.onPreview && (
 <button
 className={cn(
 'w-5 h-5 flex items-center justify-center transition-all duration-200 rounded-md',
 data.previewStatus === 'running' && 'bg-emerald-600 text-white',
 data.previewStatus === 'done' && 'bg-emerald-600 text-white',
 data.previewStatus === 'error' && 'bg-error text-white',
 (!data.previewStatus || data.previewStatus === 'idle') && 'bg-bg-muted text-success',
 )}
 onClick={(e) => {
 e.stopPropagation();
 data.onPreview?.();
 }}
 disabled={data.previewStatus === 'running'}
 title="Preview node data"
 >
 {data.previewStatus === 'running' ? (
 <Loader2 size={10} strokeWidth={2.5} className="animate-spin" />
 ) : (
 <Play size={10} strokeWidth={2.5} />
 )}
 </button>
 )}
 {/* Duplicate Button */}
 {data.onDuplicate && (
 <button
 className="w-5 h-5 flex items-center justify-center transition-all duration-200 bg-bg-muted text-text-1 rounded-md"
 onClick={(e) => {
 e.stopPropagation();
 data.onDuplicate?.();
 }}
 title="Duplicate node"
 >
 <Copy size={10} strokeWidth={2.5} />
 </button>
 )}
 {/* Delete Button */}
 {data.onDelete && (
 <button
 className="w-5 h-5 flex items-center justify-center transition-all duration-200 bg-error text-white rounded-md"
 onClick={(e) => {
 e.stopPropagation();
 data.onDelete?.();
 }}
 title="Delete node"
 >
 <X size={10} strokeWidth={2.5} />
 </button>
 )}
 </div>
 </div>
 );
};

export default memo(WorkflowNode);
