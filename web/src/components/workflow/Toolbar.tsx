import React from "react";
import {
  Play,
  Save,
  Settings,
  Zap,
  Download,
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Sun,
  Moon,
  CalendarClock,
  History,
  RotateCcw,
  XCircle,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { Workflow } from "../../types/workflow";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/store/themeStore";

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
}

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
}) => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <div className="flex flex-col z-50">
    {/* Debug mode banner */}
    {isDebugMode && (
      <div className="flex items-center justify-between px-6 py-1.5 bg-amber-950/60 border-b border-amber-700/50">
        <span className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
          <History size={12} />
          Debug view — canvas is read-only. Double-click a node to inspect its stored output.
        </span>
        <div className="flex items-center gap-2">
          {onRetryExecution && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetryExecution}
              disabled={isRetrying}
              isLoading={isRetrying}
              leftIcon={<RotateCcw size={13} />}
              className="text-amber-300 hover:text-amber-100 hover:bg-amber-900/40 text-xs h-6 px-2"
            >
              Retry with same data
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onExitDebugMode}
            leftIcon={<XCircle size={13} />}
            className="text-amber-400/70 hover:text-amber-200 hover:bg-amber-900/30 text-xs h-6 px-2"
          >
            Exit debug
          </Button>
        </div>
      </div>
    )}
    <div
      className="h-16 flex items-center justify-between px-6 bg-surface-dark border-b border-neutral-800"
    >
      {/* Left Side */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/workflows")}
          leftIcon={<ArrowLeft size={16} />}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          Back
        </Button>

        {onToggleLeftSidebar && (
          <>
            <div className="h-6 w-px bg-white/20" />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleLeftSidebar}
              title={`${
                leftSidebarCollapsed ? "Expand" : "Collapse"
              } Node Types`}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              {leftSidebarCollapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </Button>
          </>
        )}

        <div className="h-6 w-px bg-white/20" />

        {/* Workflow Name */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-primary-400 rounded-md">
            <Zap className="text-neutral-950" size={16} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">
              {workflow.name}
            </h1>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  workflow.isActive ? "bg-success" : "bg-neutral-400"
                )}
              />
              <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">
                {workflow.isActive ? "ACTIVE" : "DRAFT"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center - Run Button */}
      <button
        onClick={onExecute}
        disabled={workflow.nodes.length === 0 || executing}
        className="px-6 py-2 flex items-center gap-2 text-neutral-950 font-medium text-sm rounded-md transition-colors disabled:opacity-50 bg-primary-400 hover:bg-primary-500"
      >
        {executing ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Play size={18} className="fill-current" />
        )}
        {executing ? "Running..." : "Run Pipeline"}
      </button>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Status Indicators */}
        {hasUnsavedChanges ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-warning">
            <Clock size={14} /> Unsaved changes
          </span>
        ) : lastSavedAt ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-success">
            <CheckCircle2 size={14} /> Saved
          </span>
        ) : null}

        {(hasUnsavedChanges || lastSavedAt) && (
          <div className="h-6 w-px bg-white/20" />
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          disabled={saving || !hasUnsavedChanges}
          isLoading={saving}
          leftIcon={<Save size={16} />}
          className={cn(
            "text-white/70 hover:text-white hover:bg-white/10",
            hasUnsavedChanges && "text-white"
          )}
        >
          Save
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onExportJson}
          leftIcon={<Download size={16} />}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          Export
        </Button>

        {onScheduleDelivery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onScheduleDelivery}
            leftIcon={<CalendarClock size={16} />}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            Schedule
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onSettings}
          leftIcon={<Settings size={16} />}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          Settings
        </Button>

        {onToggleHistory && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleHistory}
            title={historyOpen ? "Close execution history" : "View execution history"}
            className={cn(
              "hover:bg-white/10",
              historyOpen
                ? "text-primary-400 bg-white/10"
                : "text-white/70 hover:text-white"
            )}
          >
            <History size={16} />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        {/* Import (Hidden input wrapper) */}
        <label className="cursor-pointer">
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (typeof onLoad === "function") onLoad();
              if (typeof onImport === "function") onImport(file);
              e.currentTarget.value = "";
            }}
          />
        </label>

        {onToggleRightSidebar && (
          <>
            <div className="h-6 w-px bg-white/20" />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleRightSidebar}
              title={`${
                rightSidebarCollapsed ? "Expand" : "Collapse"
              } Properties`}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              {rightSidebarCollapsed ? (
                <PanelRightOpen size={18} />
              ) : (
                <PanelRightClose size={18} />
              )}
            </Button>
          </>
        )}
      </div>
    </div>
    </div>
  );
};
