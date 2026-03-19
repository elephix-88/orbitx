import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { workflowApiService } from "@/services/workflowApiService";
import Layout from "../components/Layout";
import { useWorkflows, useWorkflowCategories } from "../hooks/useWorkflows";
import { useDeferredLoading } from "../hooks/useDeferredLoading";
import { getRelativeTime } from "../utils/workflowTransformers";
import {
  Plus,
  Grid as GridIcon,
  List as ListIcon,
  RefreshCw,
  Play,
  Edit,
  Trash2,
  Clock,
  Search,
  Zap,
  Activity,
  Pause,
  Check,
  History,
  ChevronDown,
  Calendar,
  MoreHorizontal,
  X,
  FileText,
  Sparkles,
  Copy,
} from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ExecutionHistoryModal } from "@/components/workflow/ExecutionHistoryModal";
import { TemplateSelector } from "@/components/workflow/TemplateSelector";
import { templateToWorkflow, WorkflowTemplate } from "@/data/workflowTemplates";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/shared/form/Switch";
import { Button } from "@/components/shared/Button";
import { WorkflowStatus } from "../types/workflow";

interface StatusConfig {
  color: string;
  text: string;
  bg: string;
  icon: React.ComponentType<{ className?: string }>;
  dot: string;
  borderColor: string;
}

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
    setStatus,
    updatingStatusId,
    executingWorkflowId,
    duplicatingWorkflowId,
  } = useWorkflows();

  const showLoading = useDeferredLoading(loading, 150);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState<"All" | WorkflowStatus>("All");
  const [isGridView, setIsGridView] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [logsWorkflow, setLogsWorkflow] = useState<{ id: string; name: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showNewWorkflowMenu, setShowNewWorkflowMenu] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const categories = useWorkflowCategories(workflows);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredWorkflows = useMemo(() => {
    return workflows.filter((w) => {
      const matchesText = w.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCategory = selectedCategory === "All" || w.category === selectedCategory;
      const matchesStatus = selectedStatus === "All" || w.status === selectedStatus;
      return matchesText && matchesCategory && matchesStatus;
    });
  }, [workflows, debouncedSearch, selectedCategory, selectedStatus]);

  const statusConfig: Record<string, StatusConfig> = {
    [WorkflowStatus.ACTIVE]: {
      color: "text-emerald-400",
      text: "Active",
      bg: "bg-emerald-500/10",
      icon: Zap,
      dot: "bg-emerald-400",
      borderColor: "#00E5A0",
    },
    [WorkflowStatus.PAUSED]: {
      color: "text-amber-400",
      text: "Paused",
      bg: "bg-amber-500/10",
      icon: Pause,
      dot: "bg-amber-400",
      borderColor: "#FFB800",
    },
  };

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
    // Convert template to workflow nodes and connections with unique IDs
    const { nodes, connections } = templateToWorkflow(template);

    // Navigate to builder with template data
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

  const activeCount = workflows.filter((w) => w.status === WorkflowStatus.ACTIVE).length;
  const pausedCount = workflows.filter((w) => w.status === WorkflowStatus.PAUSED).length;

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="p-8 text-center max-w-md mx-4" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }}>
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(255, 77, 106, 0.1)', borderRadius: '4px' }}>
              <Activity className="w-8 h-8" style={{ color: '#FF4D6A' }} />
            </div>
            <h2 className="text-xl font-bold mb-2 uppercase tracking-wider" style={{ color: '#E8ECF4' }}>Failed to load workflows</h2>
            <p className="mb-6" style={{ color: '#8896AD' }}>{error}</p>
            <button onClick={refreshWorkflows} className="px-6 py-2 font-medium uppercase tracking-wider" style={{ backgroundColor: 'rgba(0, 212, 255, 0.15)', color: '#00D4FF', borderRadius: '4px', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div style={{ width: '48px', height: '2px', background: 'linear-gradient(to right, #00D4FF, transparent)' }} />
              </div>
              <h1 className="text-2xl font-bold uppercase tracking-wider" style={{ color: '#E8ECF4' }}>Workflows</h1>
              <p className="text-sm mt-0.5" style={{ color: '#8896AD' }}>
                <span className="font-mono">{workflows.length}</span> workflows &middot; <span className="font-mono">{activeCount}</span> active &middot; <span className="font-mono">{pausedCount}</span> paused
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refreshWorkflows}
                disabled={loading}
                className="h-9 px-3 flex items-center gap-2 text-sm transition-colors"
                style={{ color: '#8896AD', backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '4px' }}
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                <span className="hidden sm:inline uppercase tracking-wider text-xs">Refresh</span>
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowNewWorkflowMenu(!showNewWorkflowMenu)}
                  className="h-9 px-4 flex items-center gap-2 text-sm font-medium transition-colors uppercase tracking-wider"
                  style={{ backgroundColor: '#00D4FF', color: '#0F1729', borderRadius: '4px' }}
                >
                  <Plus className="w-4 h-4" />
                  New Workflow
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showNewWorkflowMenu && "rotate-180")} />
                </button>

                {/* Dropdown Menu */}
                {showNewWorkflowMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNewWorkflowMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 overflow-hidden z-50" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '4px' }}>
                      <button
                        onClick={() => {
                          navigate("/workflows/builder");
                          setShowNewWorkflowMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 212, 255, 0.05)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                      >
                        <div className="p-2" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }}>
                          <FileText className="w-4 h-4" style={{ color: '#00D4FF' }} />
                        </div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: '#E8ECF4' }}>Blank Workflow</div>
                          <div className="text-xs" style={{ color: '#506080' }}>Start from scratch</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowTemplateSelector(true);
                          setShowNewWorkflowMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                        style={{ borderTop: '1px solid rgba(0, 212, 255, 0.08)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 212, 255, 0.05)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                      >
                        <div className="p-2" style={{ backgroundColor: 'rgba(255, 184, 0, 0.1)', borderRadius: '4px' }}>
                          <Sparkles className="w-4 h-4" style={{ color: '#FFB800' }} />
                        </div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: '#E8ECF4' }}>From Template</div>
                          <div className="text-xs" style={{ color: '#506080' }}>Use a pre-built workflow</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }}>
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#506080' }} />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-9 text-sm focus:outline-none transition-all"
                style={{ backgroundColor: '#0F1729', border: '1px solid rgba(0, 212, 255, 0.15)', borderRadius: '4px', color: '#E8ECF4' }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#8896AD' }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Category Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  className="h-9 px-3 flex items-center gap-2 text-sm transition-colors min-w-[120px]"
                  style={{ backgroundColor: '#0F1729', border: '1px solid rgba(0, 212, 255, 0.15)', borderRadius: '4px', color: '#E8ECF4' }}
                >
                  <span>{selectedCategory}</span>
                  <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform", categoryDropdownOpen && "rotate-180")} style={{ color: '#8896AD' }} />
                </button>
                {categoryDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full overflow-hidden" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '4px' }}>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setCategoryDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between"
                        style={{ color: '#E8ECF4', backgroundColor: cat === selectedCategory ? 'rgba(0, 212, 255, 0.08)' : 'transparent' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 212, 255, 0.05)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = cat === selectedCategory ? 'rgba(0, 212, 255, 0.08)' : 'transparent'; }}
                      >
                        <span>{cat}</span>
                        {cat === selectedCategory && <Check className="w-4 h-4" style={{ color: '#00D4FF' }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Tabs */}
              <div className="flex p-0.5" style={{ backgroundColor: '#0F1729', border: '1px solid rgba(0, 212, 255, 0.15)', borderRadius: '4px' }}>
                {([
                  { key: "All", label: "All" },
                  { key: WorkflowStatus.ACTIVE, label: "Active" },
                  { key: WorkflowStatus.PAUSED, label: "Paused" },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedStatus(tab.key as "All" | WorkflowStatus)}
                    className="px-3 py-1.5 text-sm font-medium transition-all uppercase tracking-wider"
                    style={{
                      borderRadius: '4px',
                      backgroundColor: selectedStatus === tab.key ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                      color: selectedStatus === tab.key ? '#00D4FF' : '#8896AD',
                      borderBottom: selectedStatus === tab.key ? '2px solid #00D4FF' : '2px solid transparent',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* View Toggle */}
              <div className="flex p-0.5" style={{ border: '1px solid rgba(0, 212, 255, 0.15)', borderRadius: '4px' }}>
                <button
                  onClick={() => setIsGridView(true)}
                  className="p-1.5 transition-all"
                  style={{
                    borderRadius: '4px',
                    backgroundColor: isGridView ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                    color: isGridView ? '#00D4FF' : '#8896AD',
                  }}
                >
                  <GridIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsGridView(false)}
                  className="p-1.5 transition-all"
                  style={{
                    borderRadius: '4px',
                    backgroundColor: !isGridView ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                    color: !isGridView ? '#00D4FF' : '#8896AD',
                  }}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Workflows */}
          <AnimatePresence mode="wait">
            {showLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  isGridView
                    ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                    : "space-y-2"
                )}
              >
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "animate-pulse",
                      isGridView ? "p-4 h-48" : "p-4 h-20"
                    )}
                    style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }} />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }} />
                        <div className="h-3 w-24" style={{ backgroundColor: 'rgba(0, 212, 255, 0.05)', borderRadius: '4px' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : filteredWorkflows.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-12 text-center"
                style={{ backgroundColor: '#1A2744', border: '2px dashed rgba(0, 212, 255, 0.15)', borderRadius: '6px' }}
              >
                <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }}>
                  <Search className="w-8 h-8" style={{ color: '#506080' }} />
                </div>
                <h3 className="text-lg font-medium mb-2 uppercase tracking-wider" style={{ color: '#E8ECF4' }}>No workflows found</h3>
                <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: '#8896AD' }}>
                  {searchTerm || selectedCategory !== "All" || selectedStatus !== "All"
                    ? "Try adjusting your filters to find what you're looking for."
                    : "Get started by creating your first workflow."}
                </p>
                <button
                  onClick={() => navigate("/workflows/builder")}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors uppercase tracking-wider"
                  style={{ backgroundColor: '#00D4FF', color: '#0F1729', borderRadius: '4px' }}
                >
                  <Plus className="w-4 h-4" />
                  Create Workflow
                </button>
              </motion.div>
            ) : isGridView ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {filteredWorkflows.map((workflow) => {
                  const config = statusConfig[workflow.status];
                  return (
                    <motion.div
                      key={workflow.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group overflow-hidden transition-all"
                      style={{
                        backgroundColor: '#1A2744',
                        border: '1px solid rgba(0, 212, 255, 0.12)',
                        borderLeft: `4px solid ${config.borderColor}`,
                        borderRadius: '6px',
                      }}
                    >
                      {/* Card Header */}
                      <div className="p-4 pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="p-2 flex-shrink-0" style={{ backgroundColor: 'rgba(0, 212, 255, 0.05)', borderRadius: '4px' }}>
                              <config.icon className={cn("w-5 h-5", config.color)} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3
                                className="font-medium truncate cursor-pointer transition-colors"
                                style={{ color: '#E8ECF4' }}
                                onClick={() => handleEditWorkflow(workflow.id)}
                              >
                                {workflow.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={cn("inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider", config.color)}>
                                  {/* LED dot with glow */}
                                  <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} style={{ boxShadow: workflow.status === WorkflowStatus.ACTIVE ? '0 0 4px rgba(0, 229, 160, 0.5)' : '0 0 4px rgba(255, 184, 0, 0.5)' }} />
                                  {config.text}
                                </span>
                                <span className="text-xs" style={{ color: '#506080' }}>&middot;</span>
                                <span className="text-xs" style={{ color: '#506080' }}>{workflow.category}</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === workflow.id ? null : workflow.id)}
                              className="p-1.5 transition-colors"
                              style={{ color: '#506080', borderRadius: '4px' }}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {openMenuId === workflow.id && (
                              <div className="absolute right-0 top-8 z-50 w-40 overflow-hidden" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '4px' }}>
                                <button
                                  onClick={() => {
                                    setLogsWorkflow({ id: workflow.id, name: workflow.name });
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2"
                                  style={{ color: '#E8ECF4' }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 212, 255, 0.05)'; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                                >
                                  <History className="w-4 h-4 text-purple-400" />
                                  View Logs
                                </button>
                                <button
                                  onClick={() => handleDuplicateWorkflow(workflow.id)}
                                  disabled={duplicatingWorkflowId === workflow.id}
                                  className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                                  style={{ color: '#E8ECF4' }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 212, 255, 0.05)'; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                                >
                                  <Copy className="w-4 h-4 text-teal-400" />
                                  {duplicatingWorkflowId === workflow.id ? "Duplicating..." : "Duplicate"}
                                </button>
                                <button
                                  onClick={() => {
                                    handleEditWorkflow(workflow.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2"
                                  style={{ color: '#E8ECF4' }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 212, 255, 0.05)'; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                                >
                                  <Edit className="w-4 h-4 text-blue-400" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteWorkflow(workflow.id)}
                                  className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2"
                                  style={{ color: '#FF4D6A' }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 77, 106, 0.05)'; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-xs line-clamp-2 mt-3 leading-relaxed" style={{ color: '#8896AD' }}>
                          {workflow.description || "No description"}
                        </p>
                      </div>

                      {/* Card Footer */}
                      <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'rgba(0, 212, 255, 0.02)', borderTop: '1px solid rgba(0, 212, 255, 0.08)' }}>
                        <div className="flex items-center gap-4 text-xs" style={{ color: '#506080' }}>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {workflow.lastRun === "Never" ? "Never run" : getRelativeTime(workflow.updatedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {workflow.nextRun}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={workflow.status === WorkflowStatus.ACTIVE}
                            onChange={(checked) =>
                              setStatus(workflow.id, checked ? WorkflowStatus.ACTIVE : WorkflowStatus.PAUSED)
                            }
                            disabled={updatingStatusId === workflow.id}
                            size="sm"
                          />
                          <Button
                            onClick={() => handleExecuteWorkflow(workflow.id)}
                            disabled={executingWorkflowId === workflow.id || workflow.status !== WorkflowStatus.ACTIVE}
                            isLoading={executingWorkflowId === workflow.id}
                            leftIcon={<Play className="w-3 h-3 fill-current" />}
                            size="sm"
                            className="h-7 px-2.5"
                          >
                            Run
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden"
                style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }}
              >
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ backgroundColor: 'rgba(0, 212, 255, 0.02)', borderBottom: '1px solid rgba(0, 212, 255, 0.12)', color: '#8896AD' }}>
                  <div className="col-span-4">Workflow</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Schedule</div>
                  <div className="col-span-2">Last Run</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                {/* Table Body */}
                <div>
                  {filteredWorkflows.map((workflow) => {
                    const config = statusConfig[workflow.status];
                    return (
                      <div
                        key={workflow.id}
                        className="grid grid-cols-12 gap-4 px-4 py-3 transition-colors group"
                        style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.06)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 212, 255, 0.03)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                      >
                        <div className="col-span-4 flex items-center gap-3 min-w-0">
                          <div className="p-1.5 flex-shrink-0" style={{ backgroundColor: 'rgba(0, 212, 255, 0.05)', borderRadius: '4px' }}>
                            <config.icon className={cn("w-4 h-4", config.color)} />
                          </div>
                          <div className="min-w-0">
                            <p
                              className="font-medium truncate cursor-pointer transition-colors text-sm"
                              style={{ color: '#E8ECF4' }}
                              onClick={() => handleEditWorkflow(workflow.id)}
                            >
                              {workflow.name}
                            </p>
                            <p className="text-xs truncate" style={{ color: '#506080' }}>{workflow.category}</p>
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center">
                          <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider", config.color)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} style={{ boxShadow: workflow.status === WorkflowStatus.ACTIVE ? '0 0 4px rgba(0, 229, 160, 0.5)' : '0 0 4px rgba(255, 184, 0, 0.5)' }} />
                            {config.text}
                          </span>
                        </div>

                        <div className="col-span-2 flex items-center">
                          <span className="text-sm truncate font-mono" style={{ color: '#8896AD' }}>{workflow.nextRun}</span>
                        </div>

                        <div className="col-span-2 flex items-center">
                          <span className="text-sm" style={{ color: '#8896AD' }}>
                            {workflow.lastRun === "Never" ? "-" : getRelativeTime(workflow.updatedAt)}
                          </span>
                        </div>

                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <div className="flex items-center gap-0.5 p-0.5" style={{ backgroundColor: 'rgba(0, 212, 255, 0.05)', borderRadius: '4px' }}>
                            <button
                              onClick={() => setLogsWorkflow({ id: workflow.id, name: workflow.name })}
                              className="p-1.5 transition-colors"
                              style={{ borderRadius: '4px', color: '#8896AD' }}
                              title="View Logs"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleExecuteWorkflow(workflow.id)}
                              disabled={executingWorkflowId === workflow.id || workflow.status !== WorkflowStatus.ACTIVE}
                              className="p-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              style={{ borderRadius: '4px', color: '#8896AD' }}
                              title="Run Now"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDuplicateWorkflow(workflow.id)}
                              disabled={duplicatingWorkflowId === workflow.id}
                              className="p-1.5 transition-colors disabled:opacity-30"
                              style={{ borderRadius: '4px', color: '#8896AD' }}
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditWorkflow(workflow.id)}
                              className="p-1.5 transition-colors"
                              style={{ borderRadius: '4px', color: '#8896AD' }}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteWorkflow(workflow.id)}
                              className="p-1.5 transition-colors"
                              style={{ borderRadius: '4px', color: '#8896AD' }}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <Switch
                            checked={workflow.status === WorkflowStatus.ACTIVE}
                            onChange={(checked) =>
                              setStatus(workflow.id, checked ? WorkflowStatus.ACTIVE : WorkflowStatus.PAUSED)
                            }
                            disabled={updatingStatusId === workflow.id}
                            size="sm"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!confirmTargetId}
        title="Delete Workflow?"
        message={
          <div className="space-y-2">
            <p>Are you sure you want to delete this workflow?</p>
            <p className="text-sm text-text-tertiary">
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
