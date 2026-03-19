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
      className="h-16 flex items-center justify-between px-6 z-50"
      style={{ backgroundColor: '#1A2744', borderBottom: '1px solid rgba(0, 212, 255, 0.2)' }}
    >
      {/* Left Side */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/workflows")}
          leftIcon={<ArrowLeft size={16} />}
          className="hover:bg-[rgba(0,212,255,0.08)]"
          style={{ color: '#8896AD' }}
        >
          Back
        </Button>

        {onToggleLeftSidebar && (
          <>
            <div className="h-6 w-px" style={{ backgroundColor: 'rgba(0, 212, 255, 0.12)' }} />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleLeftSidebar}
              title={`${
                leftSidebarCollapsed ? "Expand" : "Collapse"
              } Node Types`}
              className="hover:bg-[rgba(0,212,255,0.08)]"
              style={{ color: '#8896AD' }}
            >
              {leftSidebarCollapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </Button>
          </>
        )}

        <div className="h-6 w-px" style={{ backgroundColor: 'rgba(0, 212, 255, 0.12)' }} />

        {/* Workflow Name */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5" style={{ border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '4px' }}>
            <Zap size={16} style={{ color: '#00D4FF' }} />
          </div>
          <div>
            <h1 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#E8ECF4' }}>
              {workflow.name}
            </h1>
            <div className="flex items-center gap-1.5">
              {/* LED-style status dot */}
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: workflow.isActive ? '#00E5A0' : '#506080',
                  boxShadow: workflow.isActive ? '0 0 6px rgba(0, 229, 160, 0.5)' : 'none',
                }}
              />
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#506080' }}>
                {workflow.isActive ? "ACTIVE" : "DRAFT"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center - Run Button (Amber - THE action) */}
      <button
        onClick={onExecute}
        disabled={workflow.nodes.length === 0 || executing}
        className="px-8 py-2 flex items-center gap-2 font-semibold uppercase tracking-wider text-sm transition-colors disabled:opacity-50"
        style={{ backgroundColor: '#FFB800', color: '#0F1729', borderRadius: '4px' }}
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
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#FFB800' }}>
            <Clock size={14} /> Unsaved changes
          </span>
        ) : lastSavedAt ? (
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#00E5A0' }}>
            <CheckCircle2 size={14} /> Saved
          </span>
        ) : null}

        {(hasUnsavedChanges || lastSavedAt) && (
          <div className="h-6 w-px" style={{ backgroundColor: 'rgba(0, 212, 255, 0.12)' }} />
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          disabled={saving || !hasUnsavedChanges}
          isLoading={saving}
          leftIcon={<Save size={16} />}
          className={cn(
            "hover:bg-[rgba(0,212,255,0.08)]",
            hasUnsavedChanges ? "" : ""
          )}
          style={{ color: hasUnsavedChanges ? '#00D4FF' : '#506080', border: hasUnsavedChanges ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent', borderRadius: '4px' }}
        >
          Save
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onExportJson}
          leftIcon={<Download size={16} />}
          className="hover:bg-[rgba(0,212,255,0.08)]"
          style={{ color: '#8896AD', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '4px' }}
        >
          Export
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onSettings}
          leftIcon={<Settings size={16} />}
          className="hover:bg-[rgba(0,212,255,0.08)]"
          style={{ color: '#8896AD' }}
        >
          Settings
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="hover:bg-[rgba(0,212,255,0.08)]"
          style={{ color: '#00D4FF' }}
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
            <div className="h-6 w-px" style={{ backgroundColor: 'rgba(0, 212, 255, 0.12)' }} />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleRightSidebar}
              title={`${
                rightSidebarCollapsed ? "Expand" : "Collapse"
              } Properties`}
              className="hover:bg-[rgba(0,212,255,0.08)]"
              style={{ color: '#8896AD' }}
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
