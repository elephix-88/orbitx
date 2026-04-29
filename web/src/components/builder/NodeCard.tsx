import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
 X,
 Copy,
 Loader2,
 CheckCircle,
 AlertTriangle,
 XCircle,
 Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getIcon } from '@/utils/iconMap';
import { Dot } from '@/components/shared/Dot';
import type { WorkflowNodeData } from '@/components/workflow/reactflow/WorkflowNode';

interface NodeCardProps {
 data: WorkflowNodeData;
 selected?: boolean;
}

type CategoryKey = 'source' | 'transform' | 'destination';

const categoryAccent: Record<CategoryKey, { bar: string; iconBg: string; iconText: string }> = {
 source: {
 bar: 'bg-blue-primary',
 iconBg: 'bg-blue-soft',
 iconText: 'text-blue-primary',
 },
 transform: {
 bar: 'bg-warning',
 iconBg: 'bg-warning-bg',
 iconText: 'text-warning',
 },
 destination: {
 bar: 'bg-success',
 iconBg: 'bg-success-bg',
 iconText: 'text-success',
 },
};

const NodeCard: React.FC<NodeCardProps> = ({ data, selected }) => {
 const accent = categoryAccent[data.category] ?? categoryAccent.transform;
 const inDebugMode = data.debugFailed !== undefined || data.debugSucceeded !== undefined;
 const Icon = getIcon(data.icon || 'Circle');

 const statusDot = (() => {
 if (inDebugMode) return null;
 if (data.status === 'running') return <Dot variant="blue" pulseRing />;
 if (data.status === 'error') return <Dot variant="danger" />;
 if (data.status === 'success') return <Dot variant="success" />;
 if (data.validationStatus === 'valid')
 return <CheckCircle size={14} className="text-success" />;
 if (data.validationStatus === 'warning')
 return <AlertTriangle size={14} className="text-warning" />;
 if (data.validationStatus === 'error')
 return <XCircle size={14} className="text-danger" />;
 if (data.validationStatus === 'unconfigured') return <Dot variant="muted" />;
 return null;
 })();

 return (
 <div
 className={cn(
 'group relative select-none w-[200px] rounded-[10px] bg-bg-card border border-line-1 shadow-sm transition-shadow',
 'hover:shadow-md',
 selected && 'border-blue-primary ring-[3px] ring-blue-soft',
 data.debugFailed && 'ring-[3px] ring-danger-border border-danger',
 data.debugSucceeded && !data.debugFailed && 'border-success'
 )}
 onDoubleClick={(event) => {
 event.stopPropagation();
 if (inDebugMode) data.onDebugInspect?.();
 else data.onOpenEditor?.();
 }}
 >
 <span
 className={cn('absolute left-0 top-[10px] bottom-[10px] w-[3px] rounded-r', accent.bar)}
 aria-hidden="true"
 />

 {/* Inputs */}
 {data.inputs.length > 0 ? (
 data.inputs.map((input, index) => (
 <Handle
 key={input.id}
 id={input.id}
 type="target"
 position={Position.Left}
 style={{
 top:
 data.inputs.length === 1
 ? '50%'
 : `${((index + 1) / (data.inputs.length + 1)) * 100}%`,
 }}
 className="!w-[10px] !h-[10px] !rounded-full !bg-bg-card !border-2 !border-line-2 hover:!border-blue-primary"
 />
 ))
 ) : (
 <Handle
 id="in"
 type="target"
 position={Position.Left}
 className="!w-[10px] !h-[10px] !rounded-full !bg-bg-card !border-2 !border-line-2 hover:!border-blue-primary"
 />
 )}

 {/* Running overlay */}
 {data.status === 'running' && (
 <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[10px] bg-bg-card/70 backdrop-blur-[1px]">
 <Loader2 className="w-5 h-5 animate-spin text-blue-primary" />
 </div>
 )}

 {/* Header */}
 <div className="flex items-center gap-2 px-3 py-2 border-b border-line-soft">
 <span
 className={cn(
 'shrink-0 w-7 h-7 rounded-md flex items-center justify-center',
 accent.iconBg,
 accent.iconText
 )}
 >
 <Icon size={16} />
 </span>
 <div className="flex-1 min-w-0">
 <div
 className="text-[12.5px] font-semibold text-text-1 truncate"
 title={data.display_name ? `${data.name} · ${data.display_name}` : data.name}
 >
 {data.name}
 </div>
 {data.display_name && (
 <div className="text-[10.5px] text-text-3 truncate">{data.display_name}</div>
 )}
 </div>
 <span className="shrink-0 flex items-center">{statusDot}</span>
 </div>

 {/* Body — debug row count, debug error, or category tag */}
 <div className="px-3 py-2 text-[11.5px] text-text-3 min-h-[28px] flex items-center gap-2">
 {inDebugMode && data.debugRowCount !== undefined && !data.debugFailed ? (
 <span className="font-mono text-text-2">{data.debugRowCount.toLocaleString()} rows</span>
 ) : data.debugFailed && data.debugErrorMessage ? (
 <span
 className="text-[10.5px] text-danger truncate"
 title={data.debugErrorMessage}
 >
 {data.debugErrorMessage}
 </span>
 ) : (
 <span className="capitalize">{data.category}</span>
 )}
 </div>

 {/* Outputs */}
 {data.outputs.length > 0 &&
 data.outputs.map((output, index) => {
 const isMulti = data.outputs.length > 1;
 const topPercent = isMulti
 ? ((index + 1) / (data.outputs.length + 1)) * 100
 : 50;
 const handleClass =
 output.id === 'true'
 ? '!bg-success'
 : output.id === 'false'
 ? '!bg-danger'
 : output.id === 'default'
 ? '!bg-text-4'
 : isMulti
 ? '!bg-violet'
 : '!bg-bg-card';
 const handleBorder =
 output.id === 'true' || output.id === 'false' || output.id === 'default' || isMulti
 ? '!border-transparent'
 : '!border-2 !border-line-2 hover:!border-blue-primary';
 return (
 <React.Fragment key={output.id}>
 {isMulti && (
 <div
 className="absolute pointer-events-none select-none right-full mr-2.5"
 style={{
 top: `${topPercent}%`,
 transform: 'translateY(-50%)',
 }}
 >
 <span
 className={cn(
 'text-[10px] font-semibold whitespace-nowrap px-1 py-0.5 rounded',
 output.id === 'true'
 ? 'text-success'
 : output.id === 'false'
 ? 'text-danger'
 : output.id === 'default'
 ? 'text-text-3'
 : 'text-violet'
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
 isMulti ? '!w-[9px] !h-[9px]' : '!w-[10px] !h-[10px]',
 '!rounded-full',
 handleClass,
 handleBorder,
 'hover:!scale-125 !transition-transform'
 )}
 />
 </React.Fragment>
 );
 })}

 {/* Hover action buttons */}
 <div className="absolute -top-2.5 -right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
 {data.category === 'source' && data.onPreview && (
 <button
 type="button"
 aria-label="Preview node data"
 title="Preview node data"
 onClick={(event) => {
 event.stopPropagation();
 data.onPreview?.();
 }}
 disabled={data.previewStatus === 'running'}
 className={cn(
 'w-5 h-5 flex items-center justify-center rounded-md border shadow-sm transition-colors',
 data.previewStatus === 'running' && 'bg-blue-primary text-white border-blue-primary',
 data.previewStatus === 'done' && 'bg-success text-white border-success',
 data.previewStatus === 'error' && 'bg-danger text-white border-danger',
 (!data.previewStatus || data.previewStatus === 'idle') &&
 'bg-bg-card text-blue-primary border-line-1 hover:border-blue-primary'
 )}
 >
 {data.previewStatus === 'running' ? (
 <Loader2 size={10} className="animate-spin" />
 ) : (
 <Play size={10} strokeWidth={2.5} />
 )}
 </button>
 )}
 {data.onDuplicate && (
 <button
 type="button"
 aria-label="Duplicate node"
 title="Duplicate node"
 onClick={(event) => {
 event.stopPropagation();
 data.onDuplicate?.();
 }}
 className="w-5 h-5 flex items-center justify-center rounded-md bg-bg-card border border-line-1 text-text-2 shadow-sm hover:border-line-2 hover:text-text-1 transition-colors"
 >
 <Copy size={10} strokeWidth={2.5} />
 </button>
 )}
 {data.onDelete && (
 <button
 type="button"
 aria-label="Delete node"
 title="Delete node"
 onClick={(event) => {
 event.stopPropagation();
 data.onDelete?.();
 }}
 className="w-5 h-5 flex items-center justify-center rounded-md bg-bg-card border border-danger-border text-danger shadow-sm hover:bg-danger-bg transition-colors"
 >
 <X size={10} strokeWidth={2.5} />
 </button>
 )}
 </div>
 </div>
 );
};

export default memo(NodeCard);
