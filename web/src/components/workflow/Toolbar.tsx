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
}

export const Toolbar: React.FC<ToolbarProps> = ({
  workflow,
  onExecute,
  onSave,
  onLoad,

  onSettings,
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
}) => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <div
      className="h-16 flex items-center justify-between px-6 z-50 bg-surface-dark border-b border-neutral-800"
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

        <Button
          variant="ghost"
          size="sm"
          onClick={onSettings}
          leftIcon={<Settings size={16} />}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          Settings
        </Button>

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
  );
};
