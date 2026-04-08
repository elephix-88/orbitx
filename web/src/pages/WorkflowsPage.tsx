import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { workflowApiService } from "@/services/workflowApiService";
import Layout from "../components/Layout";
import { useWorkflows } from "../hooks/useWorkflows";
import { useDeferredLoading } from "../hooks/useDeferredLoading";
import { getRelativeTime } from "../utils/workflowTransformers";
import {
  Plus,
  RefreshCw,
  Play,
  Edit,
  Trash2,
  Search,
  Zap,
  History,
  MoreHorizontal,
  X,
  FileText,
  Sparkles,
  Copy,
  GitBranch,
  ChevronDown,
} from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ExecutionHistoryModal } from "@/components/workflow/ExecutionHistoryModal";
import { TemplateSelector } from "@/components/workflow/TemplateSelector";
import { templateToWorkflow, WorkflowTemplate } from "@/data/workflowTemplates";
import { cn } from "@/lib/utils";
import { WorkflowStatus } from "../types/workflow";

const WorkflowsPage = () => {
  const navigate = useNavigate();
  const {
    workflows,
    loading,
    error,
    refreshWorkflows,
    deleteWorkflow,
    duplicateWorkflow,
    executeWorkflow,
    executingWorkflowId,
    duplicatingWorkflowId,
  } = useWorkflows();

  const showLoading = useDeferredLoading(loading, 150);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"All" | WorkflowStatus>("All");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [logsWorkflow, setLogsWorkflow] = useState<{ id: string; name: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showNewWorkflowMenu, setShowNewWorkflowMenu] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredWorkflows = useMemo(() => {
    return workflows.filter((w) => {
      const matchesText = w.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStatus = selectedStatus === "All" || w.status === selectedStatus;
      return matchesText && matchesStatus;
    });
  }, [workflows, debouncedSearch, selectedStatus]);

  const handleEditWorkflow = async (idOrJobId: string) => {
    try {
      const res = await workflowApiService.getWorkflow(idOrJobId);
      navigate(`/workflows/builder?id=${idOrJobId}`, { state: { workflow: res.data } });
    } catch {
      navigate(`/workflows/builder?id=${idOrJobId}`);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    setConfirmTargetId(id);
    setOpenMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!confirmTargetId) return;
    setIsConfirming(true);
    try {
      await deleteWorkflow(confirmTargetId);
    } catch (error) {
      console.error("Failed to delete workflow:", error);
    } finally {
      setIsConfirming(false);
      setConfirmTargetId(null);
    }
  };

  const handleExecuteWorkflow = async (id: string) => {
    try {
      await executeWorkflow(id);
    } catch (error) {
      console.error("Failed to execute workflow:", error);
    }
  };

  const handleDuplicateWorkflow = async (id: string) => {
    setOpenMenuId(null);
    try {
      await duplicateWorkflow(id);
    } catch (error) {
      console.error("Failed to duplicate workflow:", error);
    }
  };

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    const { nodes, connections } = templateToWorkflow(template);
    navigate("/workflows/builder", {
      state: {
        template: {
          name: `${template.name} - Copy`,
          description: template.description,
          nodes,
          connections,
        },
      },
    });
  };

  if (error) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div 
            className="p-8 text-center max-w-md rounded-[14px]"
            style={{ 
              backgroundColor: 'rgb(22, 22, 25)',
              border: '1px solid rgba(255, 255, 255, 0.055)',
            }}
          >
            <div 
              className="w-12 h-12 flex items-center justify-center mx-auto mb-4 rounded-lg"
              style={{ backgroundColor: '#EF4444' }}
            >
              <GitBranch size={24} className="text-white" />
            </div>
            <h2 
              className="text-[16px] font-semibold mb-2"
              style={{ color: 'rgba(255, 255, 255, 0.88)' }}
            >
              Failed to load workflows
            </h2>
            <p 
              className="text-[13px] mb-6"
              style={{ color: 'rgba(255, 255, 255, 0.50)' }}
            >
              {error}
            </p>
            <button 
              onClick={refreshWorkflows} 
              className="px-4 py-2 text-[13px] font-medium rounded-lg"
              style={{ backgroundColor: '#FACC15', color: 'rgb(13, 13, 16)' }}
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 
              className="font-display text-[18px] font-semibold"
              style={{ color: 'rgba(255, 255, 255, 0.88)' }}
            >
              Workflows
            </h1>
            <p 
              className="text-[12px] mt-1"
              style={{ color: 'rgba(255, 255, 255, 0.28)' }}
            >
              {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowNewWorkflowMenu(!showNewWorkflowMenu)}
              className="h-8 px-4 flex items-center gap-2 text-[13px] font-medium rounded-lg"
              style={{ backgroundColor: '#FACC15', color: 'rgb(13, 13, 16)' }}
            >
              <Plus size={14} />
              New Workflow
              <ChevronDown size={14} className={cn("transition-transform", showNewWorkflowMenu && "rotate-180")} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showNewWorkflowMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNewWorkflowMenu(false)}
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 mt-2 w-56 z-50 rounded-lg overflow-hidden"
                    style={{ 
                      backgroundColor: 'rgb(22, 22, 25)',
                      border: '1px solid rgba(255, 255, 255, 0.055)',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    <button
                      onClick={() => {
                        navigate("/workflows/builder");
                        setShowNewWorkflowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
                      >
                        <FileText size={14} style={{ color: 'rgba(255, 255, 255, 0.50)' }} />
                      </div>
                      <div>
                        <div 
                          className="text-[13px] font-medium"
                          style={{ color: 'rgba(255, 255, 255, 0.88)' }}
                        >
                          Blank Workflow
                        </div>
                        <div 
                          className="text-[11px]"
                          style={{ color: 'rgba(255, 255, 255, 0.28)' }}
                        >
                          Start from scratch
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setShowTemplateSelector(true);
                        setShowNewWorkflowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                      style={{ borderTop: '1px solid rgba(255, 255, 255, 0.055)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: '#FACC15' }}
                      >
                        <Sparkles size={14} style={{ color: 'rgb(13, 13, 16)' }} />
                      </div>
                      <div>
                        <div 
                          className="text-[13px] font-medium"
                          style={{ color: 'rgba(255, 255, 255, 0.88)' }}
                        >
                          From Template
                        </div>
                        <div 
                          className="text-[11px]"
                          style={{ color: 'rgba(255, 255, 255, 0.28)' }}
                        >
                          Use a pre-built workflow
                        </div>
                      </div>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search 
              size={14} 
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(255, 255, 255, 0.28)' }}
            />
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-9 text-[13px] focus:outline-none rounded-lg transition-colors"
              style={{ 
                backgroundColor: 'rgb(28, 28, 33)',
                border: '1px solid rgba(255, 255, 255, 0.055)',
                color: 'rgba(255, 255, 255, 0.88)',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(255, 255, 255, 0.28)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div 
            className="flex p-0.5 rounded-lg"
            style={{ 
              backgroundColor: 'rgb(28, 28, 33)',
              border: '1px solid rgba(255, 255, 255, 0.055)',
            }}
          >
            {([
              { key: "All", label: "All" },
              { key: WorkflowStatus.ACTIVE, label: "Active" },
              { key: WorkflowStatus.PAUSED, label: "Paused" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedStatus(tab.key as "All" | WorkflowStatus)}
                className="px-3 py-1.5 text-[12px] font-medium transition-all rounded-md"
                style={{
                  backgroundColor: selectedStatus === tab.key ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                  color: selectedStatus === tab.key ? '#FACC15' : 'rgba(255, 255, 255, 0.50)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={refreshWorkflows}
            disabled={loading}
            className="h-9 px-3 flex items-center gap-2 text-[12px] font-medium rounded-lg transition-colors"
            style={{ 
              backgroundColor: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.055)',
              color: 'rgba(255, 255, 255, 0.50)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin")} />
          </button>
        </div>

        {/* Workflow List */}
        <AnimatePresence mode="wait">
          {showLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-[14px]"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                />
              ))}
            </motion.div>
          ) : filteredWorkflows.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-16 text-center rounded-[14px]"
              style={{ 
                backgroundColor: 'rgb(22, 22, 25)',
                border: '2px dashed rgba(255, 255, 255, 0.055)',
              }}
            >
              <GitBranch 
                size={40} 
                className="mx-auto mb-4"
                style={{ color: 'rgba(255, 255, 255, 0.16)' }}
              />
              <h3 
                className="text-[16px] font-medium mb-2"
                style={{ color: 'rgba(255, 255, 255, 0.50)' }}
              >
                {searchTerm || selectedStatus !== "All" ? "No workflows found" : "No workflows yet"}
              </h3>
              <p 
                className="text-[13px] mb-6 max-w-sm mx-auto"
                style={{ color: 'rgba(255, 255, 255, 0.28)' }}
              >
                {searchTerm || selectedStatus !== "All"
                  ? "Try adjusting your filters to find what you're looking for."
                  : "Build your first data pipeline to get started."}
              </p>
              <button
                onClick={() => navigate("/workflows/builder")}
                className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg"
                style={{ backgroundColor: '#FACC15', color: 'rgb(13, 13, 16)' }}
              >
                <Plus size={14} />
                New Workflow
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {filteredWorkflows.map((workflow) => {
                const isActive = workflow.status === WorkflowStatus.ACTIVE;
                const statusColor = isActive ? '#10B981' : '#F59E0B';
                const statusText = isActive ? 'Active' : 'Paused';

                return (
                  <motion.div
                    key={workflow.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group flex items-center gap-4 px-5 py-4 rounded-[14px] transition-colors"
                    style={{ 
                      backgroundColor: 'rgb(22, 22, 25)',
                      border: '1px solid rgba(255, 255, 255, 0.055)',
                      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(24, 24, 28)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(22, 22, 25)'}
                  >
                    {/* Left Icon */}
                    <div 
                      className="w-9 h-9 flex items-center justify-center rounded-[10px] flex-shrink-0"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
                    >
                      <Zap size={16} style={{ color: '#FACC15' }} />
                    </div>

                    {/* Workflow Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 
                          className="text-[14px] font-semibold truncate cursor-pointer transition-colors"
                          style={{ color: 'rgba(255, 255, 255, 0.88)' }}
                          onClick={() => handleEditWorkflow(workflow.id)}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#FACC15'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.88)'}
                        >
                          {workflow.name}
                        </h3>
                      </div>
                      <p 
                        className="text-[12px] mt-0.5"
                        style={{ color: 'rgba(255, 255, 255, 0.28)' }}
                      >
                        {workflow.nodes?.length || 0} nodes &middot; Last run {workflow.lastRun === "Never" ? "never" : getRelativeTime(workflow.updatedAt)}
                      </p>
                      {/* Node type pills */}
                      <div className="flex items-center gap-1.5 mt-2">
                        {workflow.nodes?.slice(0, 3).map((node, idx) => (
                          <span 
                            key={idx}
                            className="text-[11px] px-2 py-0.5 rounded-md"
                            style={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.055)',
                              color: 'rgba(255, 255, 255, 0.50)',
                            }}
                          >
                            {node.type || 'Node'}
                          </span>
                        ))}
                        {(workflow.nodes?.length || 0) > 3 && (
                          <span 
                            className="text-[11px]"
                            style={{ color: 'rgba(255, 255, 255, 0.28)' }}
                          >
                            +{workflow.nodes!.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Last run info (center-right) */}
                    <div className="flex flex-col items-end mr-4">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: statusColor }}
                        />
                        <span 
                          className="text-[13px]"
                          style={{ color: statusColor }}
                        >
                          {statusText}
                        </span>
                      </div>
                      <span 
                        className="text-[11px] mt-0.5"
                        style={{ color: 'rgba(255, 255, 255, 0.28)' }}
                      >
                        {workflow.executions || 0} runs total
                      </span>
                    </div>

                    {/* Action Buttons (visible on hover) */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleExecuteWorkflow(workflow.id)}
                        disabled={executingWorkflowId === workflow.id || !isActive}
                        className="h-8 px-3 flex items-center gap-1.5 text-[12px] font-medium rounded-lg transition-colors disabled:opacity-40"
                        style={{ 
                          backgroundColor: 'transparent',
                          border: '1px solid rgba(255, 255, 255, 0.055)',
                          color: 'rgba(255, 255, 255, 0.50)',
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.88)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.50)';
                        }}
                      >
                        <Play size={12} fill="currentColor" />
                        Run
                      </button>

                      {/* More menu */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === workflow.id ? null : workflow.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                          style={{ 
                            backgroundColor: openMenuId === workflow.id ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                            color: 'rgba(255, 255, 255, 0.50)',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'}
                          onMouseLeave={(e) => {
                            if (openMenuId !== workflow.id) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        <AnimatePresence>
                          {openMenuId === workflow.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <motion.div 
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="absolute right-0 top-10 z-50 w-40 rounded-lg overflow-hidden"
                                style={{ 
                                  backgroundColor: 'rgb(22, 22, 25)',
                                  border: '1px solid rgba(255, 255, 255, 0.055)',
                                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
                                }}
                              >
                                <button
                                  onClick={() => {
                                    setLogsWorkflow({ id: workflow.id, name: workflow.name });
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-[13px] flex items-center gap-2 transition-colors"
                                  style={{ color: 'rgba(255, 255, 255, 0.88)' }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <History size={14} style={{ color: '#3B82F6' }} />
                                  View History
                                </button>
                                <button
                                  onClick={() => handleEditWorkflow(workflow.id)}
                                  className="w-full px-3 py-2 text-left text-[13px] flex items-center gap-2 transition-colors"
                                  style={{ color: 'rgba(255, 255, 255, 0.88)' }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <Edit size={14} style={{ color: '#FACC15' }} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDuplicateWorkflow(workflow.id)}
                                  disabled={duplicatingWorkflowId === workflow.id}
                                  className="w-full px-3 py-2 text-left text-[13px] flex items-center gap-2 transition-colors disabled:opacity-50"
                                  style={{ color: 'rgba(255, 255, 255, 0.88)' }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <Copy size={14} style={{ color: '#10B981' }} />
                                  {duplicatingWorkflowId === workflow.id ? "Duplicating..." : "Duplicate"}
                                </button>
                                <button
                                  onClick={() => handleDeleteWorkflow(workflow.id)}
                                  className="w-full px-3 py-2 text-left text-[13px] flex items-center gap-2 transition-colors"
                                  style={{ color: '#EF4444' }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        isOpen={!!confirmTargetId}
        title="Delete Workflow?"
        message={
          <div className="space-y-2">
            <p>Are you sure you want to delete this workflow?</p>
            <p className="text-[13px]" style={{ color: 'rgba(255, 255, 255, 0.28)' }}>
              This action cannot be undone and will stop all scheduled executions.
            </p>
          </div>
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmLoading={isConfirming}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmTargetId(null)}
      />

      <ExecutionHistoryModal
        isOpen={!!logsWorkflow}
        onClose={() => setLogsWorkflow(null)}
        workflowId={logsWorkflow?.id || ""}
        workflowName={logsWorkflow?.name || ""}
      />

      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </Layout>
  );
};

export default WorkflowsPage;
