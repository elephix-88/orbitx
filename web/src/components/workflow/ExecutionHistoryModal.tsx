import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 X,
 Clock,
 CheckCircle2,
 XCircle,
 Loader2,
 ChevronDown,
 Timer,
 Zap,
 AlertTriangle,
 Calendar,
 Play,
 RotateCcw,
 DollarSign,
} from 'lucide-react';
import { ExecutionHistory, ExecutionStep, ExecutionStatus } from '@/types/backend';
import { executionHistoryService } from '@/services/executionHistoryService';
import { cn } from '@/lib/utils';

interface ExecutionHistoryModalProps {
 isOpen: boolean;
 onClose: () => void;
 workflowId: string;
 workflowName: string;
}

const statusConfig: Record<ExecutionStatus, {
 icon: typeof CheckCircle2;
 color: string;
 bg: string;
 text: string;
 dotColor: string;
}> = {
 SUCCESS: {
 icon: CheckCircle2,
 color: 'text-success',
 bg: 'bg-success-bg',
 text: 'Success',
 dotColor: 'bg-emerald-500',
 },
 FAILED: {
 icon: XCircle,
 color: 'text-red-500',
 bg: 'bg-red-500/10',
 text: 'Failed',
 dotColor: 'bg-red-500',
 },
 RUNNING: {
 icon: Loader2,
 color: 'text-blue-primary',
 bg: 'bg-blue-primary/10',
 text: 'Running',
 dotColor: 'bg-blue-primary',
 },
 PENDING: {
 icon: Clock,
 color: 'text-amber-500',
 bg: 'bg-amber-500/10',
 text: 'Pending',
 dotColor: 'bg-amber-500',
 },
};

const formatTimestamp = (timestamp: number | null): string => {
 if (!timestamp) return '-';
 const date = new Date(timestamp * 1000);
 return date.toLocaleString('en-US', {
 month: 'short',
 day: 'numeric',
 hour: '2-digit',
 minute: '2-digit',
 });
};

const formatDuration = (seconds: number | null): string => {
 if (seconds === null || seconds === undefined) return '-';
 if (seconds < 60) return `${seconds.toFixed(1)}s`;
 if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
 return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const formatRelativeTime = (timestamp: number): string => {
 const now = Date.now() / 1000;
 const diff = now - timestamp;

 if (diff < 60) return 'Just now';
 if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
 if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
 if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
 return formatTimestamp(timestamp);
};

const formatCost = (cost: number | null): string => {
 if (cost === null || cost === undefined) return '-';
 if (cost < 0.0001) return '<$0.0001';
 if (cost < 0.01) return `$${cost.toFixed(4)}`;
 return `$${cost.toFixed(2)}`;
};

const StepItem = ({ step }: { step: ExecutionStep }) => {
 const [showError, setShowError] = useState(false);
 const config = statusConfig[step.status] || statusConfig.PENDING;
 const StatusIcon = config.icon;
 const duration = step.start_time && step.end_time ? step.end_time - step.start_time : null;

 return (
 <div className="flex items-start gap-3 py-2">
 <div className="flex flex-col items-center">
 <div className={cn(
 'w-8 h-8 rounded-lg flex items-center justify-center',
 config.bg
 )}>
 <StatusIcon className={cn(
 'w-4 h-4',
 config.color,
 step.status === 'RUNNING' && 'animate-spin'
 )} />
 </div>
 </div>
 
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <span className="font-medium text-text-1 text-sm">
 {step.node_id}
 </span>
 <span className="text-xs px-1.5 py-0.5 rounded bg-bg-card text-text-2">
 {step.node_type}
 </span>
 </div>
 {duration !== null && (
 <span className="text-xs text-text-3 flex items-center gap-1">
 <Timer className="w-3 h-3" />
 {formatDuration(duration)}
 </span>
 )}
 </div>
 
 {step.error && (
 <button
 onClick={() => setShowError(!showError)}
 className="mt-1 text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
 >
 <AlertTriangle className="w-3 h-3" />
 {showError ? 'Hide error' : 'Show error'}
 </button>
 )}
 
 <AnimatePresence>
 {showError && step.error && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden"
 >
 <div className="mt-2 p-2 rounded-lg bg-red-900/20 text-xs">
 <p className="text-red-400 font-medium">{step.error}</p>
 {step.error_trace && (
 <pre className="mt-2 p-2 bg-red-900/40 rounded text-red-300 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">
 {step.error_trace}
 </pre>
 )}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 );
};

const ExecutionRow = ({ execution }: { execution: ExecutionHistory }) => {
 const [expanded, setExpanded] = useState(false);
 const config = statusConfig[execution.status] || statusConfig.PENDING;
 const StatusIcon = config.icon;
 const steps = Object.values(execution.steps);

 return (
 <div className="border-b border-line-soft last:border-0">
 {/* Main Row */}
 <button
 onClick={() => setExpanded(!expanded)}
 className="w-full px-4 py-4 flex items-center gap-4 hover:bg-bg-card transition-colors text-left"
 >
 {/* Status indicator */}
 <div className="flex-shrink-0">
 <div className={cn(
 'w-10 h-10 rounded-xl flex items-center justify-center',
 config.bg
 )}>
 <StatusIcon className={cn(
 'w-5 h-5',
 config.color,
 execution.status === 'RUNNING' && 'animate-spin'
 )} />
 </div>
 </div>

 {/* Info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <span className={cn('text-sm font-semibold', config.color)}>
 {config.text}
 </span>
 <span className="text-text-3">·</span>
 <span className="text-sm text-text-2">
 {formatRelativeTime(execution.start_time)}
 </span>
 </div>
 <div className="flex items-center gap-4 text-xs text-text-3">
 <span className="flex items-center gap-1">
 <Timer className="w-3 h-3" />
 {formatDuration(execution.duration)}
 </span>
 <span className="flex items-center gap-1">
 <Play className="w-3 h-3" />
 {execution.triggered_by}
 </span>
 <span className="flex items-center gap-1">
 <Zap className="w-3 h-3" />
 {execution.successful_nodes}/{execution.total_nodes} nodes
 </span>
 </div>
 </div>

 {/* Expand */}
 <ChevronDown className={cn(
 'w-5 h-5 text-text-3 transition-transform',
 expanded && 'rotate-180'
 )} />
 </button>

 {/* Expanded Content */}
 <AnimatePresence>
 {expanded && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="overflow-hidden"
 >
 <div className="px-4 pb-4 pt-0">
 {/* Execution details */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 p-3 rounded-xl bg-bg-card">
 <div>
 <div className="text-xs text-text-3 mb-1">Started</div>
 <div className="text-sm font-medium text-text-2">
 {formatTimestamp(execution.start_time)}
 </div>
 </div>
 <div>
 <div className="text-xs text-text-3 mb-1">Ended</div>
 <div className="text-sm font-medium text-text-2">
 {formatTimestamp(execution.end_time)}
 </div>
 </div>
 <div>
 <div className="text-xs text-text-3 mb-1">Duration</div>
 <div className="text-sm font-medium text-text-2">
 {formatDuration(execution.duration)}
 </div>
 </div>
 <div>
 <div className="text-xs text-text-3 mb-1 flex items-center gap-1">
 <DollarSign className="w-3 h-3" />
 Cost
 </div>
 <div className="text-sm font-semibold text-warning">
 {formatCost(execution.cost_usd)}
 </div>
 </div>
 <div>
 <div className="text-xs text-text-3 mb-1">Nodes</div>
 <div className="text-sm font-medium">
 <span className="text-success">{execution.successful_nodes}</span>
 {execution.failed_nodes > 0 && (
 <span className="text-error"> / {execution.failed_nodes} failed</span>
 )}
 <span className="text-text-3"> / {execution.total_nodes}</span>
 </div>
 </div>
 </div>

 {/* Error message */}
 {execution.error && (
 <div className="mb-4 p-3 rounded-xl bg-red-900/20 border border-red-800">
 <div className="flex items-start gap-2">
 <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
 <p className="text-sm text-red-400">{execution.error}</p>
 </div>
 </div>
 )}

 {/* Steps */}
 {steps.length > 0 && (
 <div>
 <div className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-3">
 Execution Steps
 </div>
 <div className="space-y-1 pl-1">
 {steps.map((step) => (
 <StepItem key={step.node_instance_id} step={step} />
 ))}
 </div>
 </div>
 )}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
};

export const ExecutionHistoryModal = ({
 isOpen,
 onClose,
 workflowId,
 workflowName,
}: ExecutionHistoryModalProps) => {
 const [executions, setExecutions] = useState<ExecutionHistory[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const fetchData = () => {
 setLoading(true);
 setError(null);
 executionHistoryService
 .getExecutionHistory(workflowId)
 .then((data) => {
 // Sort by start_time descending (most recent first)
 const sorted = [...data].sort((a, b) => b.start_time - a.start_time);
 setExecutions(sorted);
 setLoading(false);
 })
 .catch((err) => {
 setError(err.message || 'Failed to load execution history');
 setLoading(false);
 });
 };

 useEffect(() => {
 if (isOpen && workflowId) {
 fetchData();
 }
 }, [isOpen, workflowId]);

 if (!isOpen) return null;

 // Calculate stats
 const stats = {
 total: executions.length,
 success: executions.filter(e => e.status === 'SUCCESS').length,
 failed: executions.filter(e => e.status === 'FAILED').length,
 avgDuration: executions.length > 0
 ? executions.reduce((sum, e) => sum + (e.duration || 0), 0) / executions.length
 : 0,
 totalCost: executions.reduce((sum, e) => sum + (e.cost_usd || 0), 0),
 };

 return (
 <AnimatePresence>
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
 onClick={(e) => e.target === e.currentTarget && onClose()}
 >
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 transition={{ type: 'spring', damping: 25, stiffness: 300 }}
 className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-bg-page rounded-2xl shadow-2xl overflow-hidden"
 >
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-line-1">
 <div>
 <h2 className="text-lg font-bold text-text-1">
 Execution History
 </h2>
 <p className="text-sm text-text-2">
 {workflowName}
 </p>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={fetchData}
 className="p-2 rounded-lg hover:bg-bg-card transition-colors"
 title="Refresh"
 >
 <RotateCcw className={cn('w-4 h-4 text-text-2', loading && 'animate-spin')} />
 </button>
 <button
 onClick={onClose}
 className="p-2 rounded-lg hover:bg-bg-card transition-colors"
 >
 <X className="w-5 h-5 text-text-2" />
 </button>
 </div>
 </div>

 {/* Stats Bar */}
 {!loading && !error && executions.length > 0 && (
 <div className="px-6 py-3 bg-bg-card border-b border-line-1">
 <div className="flex items-center gap-6 text-sm">
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-neutral-400" />
 <span className="text-text-2">{stats.total} runs</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-success" />
 <span className="text-text-2">{stats.success} success</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-error" />
 <span className="text-text-2">{stats.failed} failed</span>
 </div>
 <div className="flex items-center gap-2">
 <Timer className="w-3.5 h-3.5 text-text-3" />
 <span className="text-text-2">
 Avg: {formatDuration(stats.avgDuration)}
 </span>
 </div>
 <div className="flex items-center gap-2 ml-auto px-2 py-1 rounded-md bg-amber-900/20 border border-amber-800">
 <DollarSign className="w-3.5 h-3.5 text-amber-500" />
 <span className="text-amber-400 font-medium">
 Total: {formatCost(stats.totalCost)}
 </span>
 </div>
 </div>
 </div>
 )}

 {/* Content */}
 <div className="flex-1 overflow-y-auto">
 {loading ? (
 <div className="flex flex-col items-center justify-center py-16">
 <Loader2 className="w-8 h-8 text-blue-primary animate-spin mb-3" />
 <p className="text-text-2 text-sm">Loading history...</p>
 </div>
 ) : error ? (
 <div className="flex flex-col items-center justify-center py-16">
 <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mb-3">
 <XCircle className="w-6 h-6 text-red-500" />
 </div>
 <p className="text-text-1 font-medium mb-1">Failed to load</p>
 <p className="text-text-2 text-sm mb-4">{error}</p>
 <button
 onClick={fetchData}
 className="px-4 py-2 text-sm font-medium text-blue-primary hover:bg-blue-soft rounded-lg transition-colors"
 >
 Try again
 </button>
 </div>
 ) : executions.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16">
 <div className="w-12 h-12 rounded-full bg-bg-card flex items-center justify-center mb-3">
 <Calendar className="w-6 h-6 text-text-3" />
 </div>
 <p className="text-text-1 font-medium mb-1">No executions yet</p>
 <p className="text-text-2 text-sm">
 Run the workflow to see history here
 </p>
 </div>
 ) : (
 <div>
 {executions.map((execution) => (
 <ExecutionRow 
 key={execution.execution_id} 
 execution={execution}
 />
 ))}
 </div>
 )}
 </div>
 </motion.div>
 </motion.div>
 </AnimatePresence>
 );
};
