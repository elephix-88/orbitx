import React, { useState } from 'react';
import {
 Play,
 Save,
 Settings,
 PanelLeftOpen,
 PanelLeftClose,
 PanelRightOpen,
 PanelRightClose,
 ArrowLeft,
 Loader2,
 CalendarClock,
 History,
 RotateCcw,
 XCircle,
 Pause,
 Clock,
 CheckCircle2,
 Download,
 Upload,
 Maximize2,
 Minimize2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Workflow, WorkflowStatus } from '../../types/workflow';
import { Button } from '@/components/shared/Button';
import { Chip } from '@/components/shared/Chip';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { cn } from '@/lib/utils';

interface ToolbarProps {
 workflow: Workflow;
 onExecute: () => void;
 onSave: () => void;
 onLoad: () => void;

 onSettings?: () => void;
 onScheduleDelivery?: () => void;
 onImport: (_file: File) => void;
 onExportJson?: () => void;
 leftSidebarCollapsed?: boolean;
 onToggleLeftSidebar?: () => void;
 rightSidebarCollapsed?: boolean;
 onToggleRightSidebar?: () => void;
 executing?: boolean;
 saving?: boolean;

 hasUnsavedChanges?: boolean;
 lastSavedAt?: Date | null;

 /** Called to toggle the execution history panel open/closed. */
 onToggleHistory?: () => void;
 /** Whether the history panel is currently open. */
 historyOpen?: boolean;

 // Debug mode controls — only visible when an execution is loaded on the canvas
 isDebugMode?: boolean;
 isRetrying?: boolean;
 onRetryExecution?: () => void;
 onExitDebugMode?: () => void;
 /** Whether the builder is in full-screen mode */
 expanded?: boolean;
 onToggleExpanded?: () => void;
 /** Show the ← back button (true in full-screen; false when embedded — breadcrumb handles it) */
 showBackButton?: boolean;
}

type BuilderView = 'edit' | 'preview' | 'runs' | 'settings';

const viewOptions: { value: BuilderView; label: string }[] = [
 { value: 'edit', label: 'Edit' },
 { value: 'preview', label: 'Preview' },
 { value: 'runs', label: 'Runs' },
 { value: 'settings', label: 'Settings' },
];

const formatSavedAt = (value: Date | string | null | undefined): string => {
 if (!value) return '';
 const date = value instanceof Date ? value : new Date(value);
 if (Number.isNaN(date.getTime())) return '';
 const diff = Date.now() - date.getTime();
 if (diff < 60_000) return 'Saved just now';
 if (diff < 3_600_000) return `Saved ${Math.floor(diff / 60_000)}m ago`;
 if (diff < 86_400_000) return `Saved ${Math.floor(diff / 3_600_000)}h ago`;
 return `Saved ${date.toLocaleDateString()}`;
};

export const Toolbar: React.FC<ToolbarProps> = ({
 workflow,
 onExecute,
 onSave,
 onLoad,
 onSettings,
 onScheduleDelivery,
 onImport,
 onExportJson,
 leftSidebarCollapsed = false,
 onToggleLeftSidebar,
 rightSidebarCollapsed = false,
 onToggleRightSidebar,
 executing = false,
 saving = false,
 hasUnsavedChanges = false,
 lastSavedAt = null,
 onToggleHistory,
 historyOpen = false,
 isDebugMode = false,
 isRetrying = false,
 onRetryExecution,
 onExitDebugMode,
 expanded = false,
 onToggleExpanded,
 showBackButton = true,
}) => {
 const navigate = useNavigate();
 const [view, setView] = useState<BuilderView>('edit');

 const isActive = workflow.status === WorkflowStatus.ACTIVE;
 const healthVariant = hasUnsavedChanges ? 'warning' : isActive ? 'success' : 'soft';
 const healthLabel = hasUnsavedChanges
 ? 'Unsaved'
 : isActive
 ? 'Active'
 : 'Draft';

 return (
 <div className="flex flex-col z-40 shrink-0">
 {isDebugMode && (
 <div className="flex items-center justify-between gap-3 px-6 py-1.5 bg-warning-bg border-b border-warning-border">
 <span className="text-[12px] font-medium text-warning flex items-center gap-2">
 <History size={13} />
 Debug view — canvas is read-only. Double-click a node to inspect output.
 </span>
 <div className="flex items-center gap-1">
 {onRetryExecution && (
 <Button
 variant="ghost"
 size="sm"
 onClick={onRetryExecution}
 disabled={isRetrying}
 isLoading={isRetrying}
 leftIcon={<RotateCcw size={13} />}
 className="text-warning hover:bg-warning-bg"
 >
 Retry
 </Button>
 )}
 <Button
 variant="ghost"
 size="sm"
 onClick={onExitDebugMode}
 leftIcon={<XCircle size={13} />}
 className="text-warning hover:bg-warning-bg"
 >
 Exit debug
 </Button>
 </div>
 </div>
 )}

 <div className="flex items-center justify-between gap-4 px-6 h-[56px] bg-bg-card border-b border-line-1">
 <div className="flex items-center gap-3 min-w-0">
 {showBackButton && (
 <Button
 variant="ghost"
 size="icon-sm"
 onClick={() => navigate('/workflows')}
 title="Back to pipelines"
 aria-label="Back to pipelines"
 >
 <ArrowLeft size={16} />
 </Button>
 )}

 {onToggleLeftSidebar && (
 <Button
 variant="ghost"
 size="icon-sm"
 onClick={onToggleLeftSidebar}
 title={leftSidebarCollapsed ? 'Expand node palette' : 'Collapse node palette'}
 aria-label={leftSidebarCollapsed ? 'Expand node palette' : 'Collapse node palette'}
 >
 {leftSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
 </Button>
 )}

 <div className="h-5 w-px bg-line-1" />

 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <h1 className="text-[14px] font-semibold text-text-1 truncate max-w-[320px]">
 {workflow.name}
 </h1>
 <Chip variant={healthVariant}>{healthLabel}</Chip>
 </div>
 {(hasUnsavedChanges || lastSavedAt) && (
 <div className="flex items-center gap-1.5 text-[11px] text-text-3 mt-[1px]">
 {hasUnsavedChanges ? (
 <>
 <Clock size={11} />
 Unsaved changes
 </>
 ) : lastSavedAt ? (
 <>
 <CheckCircle2 size={11} className="text-success" />
 {formatSavedAt(lastSavedAt)}
 </>
 ) : null}
 </div>
 )}
 </div>
 </div>

 <div className="hidden md:flex items-center">
 <SegmentedControl<BuilderView>
 options={viewOptions}
 value={view}
 onChange={setView}
 size="sm"
 ariaLabel="Builder view"
 />
 </div>

 <div className="flex items-center gap-1.5">
 {onScheduleDelivery && (
 <Button
 variant="ghost"
 size="icon-sm"
 onClick={onScheduleDelivery}
 title="Schedule & delivery"
 aria-label="Schedule & delivery"
 >
 <CalendarClock size={16} />
 </Button>
 )}

 {onToggleHistory && (
 <Button
 variant="ghost"
 size="icon-sm"
 onClick={onToggleHistory}
 title={historyOpen ? 'Close execution history' : 'View execution history'}
 aria-label={historyOpen ? 'Close execution history' : 'View execution history'}
 className={cn(historyOpen && 'bg-bg-row-hv text-blue-primary')}
 >
 <History size={16} />
 </Button>
 )}

 {onExportJson && (
 <Button
 variant="ghost"
 size="icon-sm"
 onClick={onExportJson}
 title="Export as JSON"
 aria-label="Export as JSON"
 >
 <Download size={16} />
 </Button>
 )}

 <label
 className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-2 hover:text-text-1 hover:bg-bg-row-hv transition-colors cursor-pointer"
 title="Import JSON"
 aria-label="Import JSON"
 >
 <Upload size={16} />
 <input
 type="file"
 accept="application/json"
 className="hidden"
 onChange={(event) => {
 const file = event.target.files?.[0];
 if (!file) return;
 if (typeof onLoad === 'function') onLoad();
 if (typeof onImport === 'function') onImport(file);
 event.currentTarget.value = '';
 }}
 />
 </label>

 {onSettings && (
 <Button
 variant="ghost"
 size="icon-sm"
 onClick={onSettings}
 title="Workflow settings"
 aria-label="Workflow settings"
 >
 <Settings size={16} />
 </Button>
 )}

 {onToggleRightSidebar && (
 <Button
 variant="ghost"
 size="icon-sm"
 onClick={onToggleRightSidebar}
 title={rightSidebarCollapsed ? 'Expand properties' : 'Collapse properties'}
 aria-label={rightSidebarCollapsed ? 'Expand properties' : 'Collapse properties'}
 >
 {rightSidebarCollapsed ? (
 <PanelRightOpen size={16} />
 ) : (
 <PanelRightClose size={16} />
 )}
 </Button>
 )}

 {onToggleExpanded && (
 <Button
 variant="ghost"
 size="icon-sm"
 onClick={onToggleExpanded}
 title={expanded ? 'Exit full screen' : 'Full screen'}
 aria-label={expanded ? 'Exit full screen' : 'Full screen'}
 >
 {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
 </Button>
 )}

 <div className="h-5 w-px bg-line-1 mx-1" />

 {isActive ? (
 <Button variant="secondary" size="sm" leftIcon={<Pause size={14} />} disabled>
 Pause
 </Button>
 ) : null}

 <Button
 variant="secondary"
 size="sm"
 onClick={onSave}
 disabled={saving || !hasUnsavedChanges}
 isLoading={saving}
 leftIcon={<Save size={14} />}
 >
 Save draft
 </Button>

 <Button
 variant="primary"
 size="sm"
 onClick={onExecute}
 disabled={workflow.nodes.length === 0 || executing}
 isLoading={executing}
 leftIcon={executing ? undefined : <Play size={14} />}
 >
 {executing ? 'Running…' : 'Run now'}
 </Button>
 </div>
 </div>
 </div>
 );
};

// Legacy ref kept to prevent churn — re-export for anyone importing the Loader2 from here.
export { Loader2 };
