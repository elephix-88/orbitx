import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
 X,
 Eye,
 RefreshCw,
 AlertTriangle,
 Table2,
 Loader2,
 ChevronDown,
 ChevronUp,
 Columns3,
 Rows3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/store/workflowStore';
import { previewService, type PreviewResponse } from '@/services/previewService';
import { Skeleton } from '@/components/shared/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

type PreviewPanelProps = {
 nodeId: string;
 isOpen: boolean;
 onClose: () => void;
 /** Called when a preview succeeds. */
 onPreviewSuccess?: (_nodeId: string, _result: PreviewResponse) => void;
 /**
 * 'preview' — shows a full refresh button; fetches via previewService (default).
 * 'debug' — data was pushed in via debugResult; no internal fetch is done.
 */
 source?: 'preview' | 'debug';
 /**
 * When source='debug', the stored execution rows for this node.
 * Passed directly in — no network call made.
 */
 debugResult?: PreviewResponse | null;
 /**
 * Required when source='preview'.
 * Used to build the new endpoint: POST /api/workflows/{workflowId}/nodes/{nodeInstanceId}/preview
 */
 workflowId?: string | null;
};

type PreviewState =
 | { status: 'idle' }
 | { status: 'loading' }
 | { status: 'success'; data: PreviewResponse }
 | { status: 'error'; message: string };

const DATA_TYPE_STYLES: Record<string, string> = {
 string: 'bg-neutral-200/60 text-neutral-600 ',
 float: 'bg-blue-100/60 text-blue-primary ',
 float64: 'bg-blue-100/60 text-blue-primary ',
 double: 'bg-blue-100/60 text-blue-primary ',
 integer: 'bg-emerald-100/60 text-emerald-700 ',
 int: 'bg-emerald-100/60 text-emerald-700 ',
 int64: 'bg-emerald-100/60 text-emerald-700 ',
 date: 'bg-purple-100/60 text-purple-700 ',
 datetime: 'bg-purple-100/60 text-purple-700 ',
 timestamp: 'bg-purple-100/60 text-purple-700 ',
 boolean: 'bg-amber-100/60 text-amber-700 ',
 bool: 'bg-amber-100/60 text-amber-700 ',
};

function getDataTypeBadgeClass(dataType: string): string {
 const normalized = dataType.toLowerCase();
 return DATA_TYPE_STYLES[normalized] ?? 'bg-neutral-200/60 text-text-2';
}

function formatCellValue(value: unknown, dataType: string): string {
 if (value === null || value === undefined) return '--';

 const normalized = dataType.toLowerCase();

 // Numeric formatting
 if (['float', 'float64', 'double'].includes(normalized) && typeof value === 'number') {
 return value.toFixed(2);
 }
 if (['integer', 'int', 'int64'].includes(normalized) && typeof value === 'number') {
 return value.toLocaleString();
 }

 // Date formatting
 if (['date', 'datetime', 'timestamp'].includes(normalized) && typeof value === 'string') {
 const parsed = new Date(value);
 if (!isNaN(parsed.getTime())) {
 return normalized === 'date'
 ? parsed.toLocaleDateString()
 : parsed.toLocaleString();
 }
 }

 // Boolean
 if (['boolean', 'bool'].includes(normalized)) {
 return String(value);
 }

 return String(value);
}

// Loading skeleton for the table
const TableSkeleton: React.FC = () => (
 <div className="p-4 space-y-3">
 <div className="flex items-center gap-3">
 <Skeleton variant="rectangular" width={120} height={20} />
 <Skeleton variant="rectangular" width={80} height={20} />
 </div>
 <div className="space-y-2">
 {/* Header row */}
 <div className="flex gap-2">
 {Array.from({ length: 5 }).map((_, i) => (
 <Skeleton key={i} variant="rectangular" width={140} height={32} />
 ))}
 </div>
 {/* Data rows */}
 {Array.from({ length: 8 }).map((_, rowIndex) => (
 <div key={rowIndex} className="flex gap-2">
 {Array.from({ length: 5 }).map((_, colIndex) => (
 <Skeleton key={colIndex} variant="rectangular" width={140} height={28} />
 ))}
 </div>
 ))}
 </div>
 </div>
);

// Data table rendering
const DataTable: React.FC<{ preview: PreviewResponse }> = ({ preview }) => {
 if (!preview.data || !preview.columns || preview.row_count === 0 || preview.data.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-16 text-center">
 <div className="w-14 h-14 rounded-2xl bg-bg-card flex items-center justify-center mb-4">
 <Table2 className="w-6 h-6 text-text-3" />
 </div>
 <p className="text-sm font-medium text-text-2 mb-1">No data</p>
 <p className="text-xs text-text-3">
 This node returned 0 rows for the current configuration.
 </p>
 </div>
 );
 }

 return (
 <div className="overflow-auto max-h-[calc(100%-1px)]">
 <table className="w-full border-collapse text-sm">
 <thead className="sticky top-0 z-10">
 <tr className="bg-bg-card">
 <th className="px-3 py-2 text-left text-xs font-medium text-text-3 border-b border-line-1 w-10">
 #
 </th>
 {preview.columns.map((column) => (
 <th
 key={column.name}
 className="px-3 py-2 text-left border-b border-line-1 whitespace-nowrap"
 >
 <div className="flex items-center gap-2">
 <span className="text-xs font-semibold text-text-1">
 {column.name}
 </span>
 <span
 className={cn(
 'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
 getDataTypeBadgeClass(column.data_type)
 )}
 >
 {column.data_type}
 </span>
 </div>
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {preview.data.map((row, rowIndex) => (
 <tr
 key={rowIndex}
 className={cn(
 'border-b border-line-1/50 hover:bg-bg-card/50 transition-colors',
 rowIndex % 2 === 0 ? 'bg-transparent' : 'bg-bg-card/20'
 )}
 >
 <td className="px-3 py-1.5 text-xs text-text-3 font-mono tabular-nums">
 {rowIndex + 1}
 </td>
 {preview.columns.map((column) => (
 <td
 key={column.name}
 className="px-3 py-1.5 text-xs text-text-2 font-mono whitespace-nowrap max-w-[300px] truncate"
 title={String(row[column.name] ?? '')}
 >
 {formatCellValue(row[column.name], column.data_type)}
 </td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
};

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
 nodeId,
 isOpen,
 onClose,
 onPreviewSuccess,
 source = 'preview',
 debugResult,
 workflowId,
}) => {
 const [previewState, setPreviewState] = useState<PreviewState>({ status: 'idle' });
 const [isExpanded, setIsExpanded] = useState(true);
 const abortControllerRef = useRef<AbortController | null>(null);

 const nodes = useWorkflowStore((state) => state.nodes);

 const currentNode = nodes.find((node) => node.id === nodeId);

 const fetchPreview = useCallback(async () => {
 if (!currentNode || !workflowId) return;

 const instanceId = currentNode.data?.node_instance_id;
 if (instanceId === undefined) return;

 // Cancel any in-flight request
 abortControllerRef.current?.abort();
 abortControllerRef.current = new AbortController();

 setPreviewState({ status: 'loading' });

 try {
 const result = await previewService.previewNode(workflowId, Number(instanceId));
 setPreviewState({ status: 'success', data: result });
 onPreviewSuccess?.(nodeId, result);
 } catch (error) {
 const message =
 error instanceof Error
 ? error.message
 : typeof error === 'object' && error !== null && 'message' in error
 ? String((error as { message: unknown }).message)
 : 'Failed to load preview';
 setPreviewState({ status: 'error', message });
 }
 }, [currentNode, nodeId, workflowId]);

 // In debug mode, sync the stored execution rows into local state
 useEffect(() => {
 if (source !== 'debug') return;
 if (!debugResult) {
 setPreviewState({ status: 'idle' });
 return;
 }
 setPreviewState({ status: 'success', data: debugResult });
 }, [source, debugResult]);

 // Fetch preview when panel opens (preview mode only — not step-run or debug)
 useEffect(() => {
 if (source !== 'preview') return;
 if (isOpen && currentNode) {
 fetchPreview();
 }
 return () => {
 abortControllerRef.current?.abort();
 };
 }, [source, isOpen, fetchPreview, currentNode]);

 if (!isOpen || !currentNode) return null;

 const panelContent = (
 <AnimatePresence>
 {isOpen && (
 <motion.div
 initial={{ y: '100%', opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: '100%', opacity: 0 }}
 transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
 className={cn(
 'fixed bottom-0 left-0 right-0 z-40',
 'bg-bg-page border-t border-line-1',
 'shadow-[0_-4px_20px_rgba(0,0,0,0.3)]',
 'flex flex-col',
 isExpanded ? 'h-[45vh] min-h-[300px]' : 'h-12'
 )}
 >
 {/* Header */}
 <div className="flex items-center justify-between px-4 py-2 border-b border-line-1 bg-bg-card shrink-0">
 <div className="flex items-center gap-3">
 <div className="flex items-center gap-2">
 {source === 'debug' ? (
 <Eye className="w-4 h-4 text-amber-400" />
 ) : (
 <Eye className="w-4 h-4 text-blue-primary" />
 )}
 <span className="text-sm font-semibold text-text-1">
 {source === 'debug' ? 'Execution Output' : 'Preview'}
 </span>
 </div>

 {previewState.status === 'success' && (
 <div className="flex items-center gap-3 text-xs text-text-2">
 <span className="flex items-center gap-1">
 <Rows3 className="w-3 h-3" />
 {previewState.data?.row_count ?? 0} rows
 </span>
 <span className="flex items-center gap-1">
 <Columns3 className="w-3 h-3" />
 {previewState.data?.columns?.length ?? 0} columns
 </span>
 </div>
 )}

 {previewState.status === 'loading' && (
 <span className="flex items-center gap-1.5 text-xs text-text-3">
 <Loader2 className="w-3 h-3 animate-spin" />
 Loading preview...
 </span>
 )}

 <span className="text-xs text-text-3">
 {currentNode.name}
 {currentNode.display_name ? ` - ${currentNode.display_name}` : ''}
 </span>
 </div>

 <div className="flex items-center gap-2">
 {/* Refresh — only shown in preview mode */}
 {source === 'preview' && (
 <button
 onClick={fetchPreview}
 disabled={previewState.status === 'loading'}
 className={cn(
 'p-1.5 rounded-lg text-text-3 transition-colors',
 'hover:text-text-1 hover:bg-bg-muted',
 'disabled:opacity-40 disabled:cursor-not-allowed'
 )}
 title="Refresh preview"
 >
 <RefreshCw
 className={cn(
 'w-3.5 h-3.5',
 previewState.status === 'loading' && 'animate-spin'
 )}
 />
 </button>
 )}

 {/* Expand/Collapse */}
 <button
 onClick={() => setIsExpanded((prev) => !prev)}
 className="p-1.5 rounded-lg text-text-3 hover:text-text-1 hover:bg-bg-muted transition-colors"
 title={isExpanded ? 'Collapse' : 'Expand'}
 >
 {isExpanded ? (
 <ChevronDown className="w-3.5 h-3.5" />
 ) : (
 <ChevronUp className="w-3.5 h-3.5" />
 )}
 </button>

 {/* Close */}
 <button
 onClick={onClose}
 className="p-1.5 rounded-lg text-text-3 hover:text-text-1 hover:bg-bg-muted transition-colors"
 title="Close preview"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>

 {/* Body */}
 {isExpanded && (
 <div className="flex-1 overflow-hidden">
 {previewState.status === 'loading' && <TableSkeleton />}

 {previewState.status === 'success' && (
 <DataTable preview={previewState.data} />
 )}

 {previewState.status === 'error' && (
 <div className="flex flex-col items-center justify-center h-full text-center px-6">
 <div className="w-14 h-14 rounded-2xl bg-red-900/20 flex items-center justify-center mb-4">
 <AlertTriangle className="w-6 h-6 text-red-400" />
 </div>
 <p className="text-sm font-medium text-text-1 mb-1">
 Preview failed
 </p>
 <p className="text-xs text-text-2 mb-4 max-w-md">
 {previewState.message}
 </p>
 <button
 onClick={fetchPreview}
 className={cn(
 'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
 'bg-bg-card border border-line-1',
 'hover:bg-bg-muted text-text-1'
 )}
 >
 <RefreshCw className="w-3.5 h-3.5" />
 Retry
 </button>
 </div>
 )}

 {previewState.status === 'idle' && (
 <div className="flex flex-col items-center justify-center h-full text-center">
 <Table2 className="w-8 h-8 text-text-3 mb-3" />
 <p className="text-sm text-text-2">
 {source === 'debug'
 ? 'No output data stored for this node.'
 : 'Click refresh to load preview data.'}
 </p>
 </div>
 )}
 </div>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 );

 return createPortal(panelContent, document.body);
};

export default PreviewPanel;
