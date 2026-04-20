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
 borderClass: string;
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
 const [isGridView, setIsGridView] = useState(() => {
 try { return localStorage.getItem('workflows-grid-view') === 'true'; } catch { return false; }
 });
 const [debouncedSearch, setDebouncedSearch] = useState("");
 const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
 const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null);
 const [isConfirming, setIsConfirming] = useState(false);
 const [logsWorkflow, setLogsWorkflow] = useState<{ id: string; name: string } | null>(null);
 const [openMenuId, setOpenMenuId] = useState<string | null>(null);
 const [showNewWorkflowMenu, setShowNewWorkflowMenu] = useState(false);
 const [showTemplateSelector, setShowTemplateSelector] = useState(false);

 const categories = useWorkflowCategories(workflows);

 // Persist grid/list view preference
 useEffect(() => {
 try { localStorage.setItem('workflows-grid-view', String(isGridView)); } catch {}
 }, [isGridView]);

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
 color: "text-success",
 text: "Active",
 bg: "bg-success-bg",
 icon: Zap,
 dot: "bg-success",
 borderClass: "border-l-success",
 },
 [WorkflowStatus.PAUSED]: {
 color: "text-warning",
 text: "Paused",
 bg: "bg-warning-bg",
 icon: Pause,
 dot: "bg-warning",
 borderClass: "border-l-warning",
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
 <div className="p-8 text-center max-w-md mx-4 bg-bg-card border border-line-1 rounded-xl">
 <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-error rounded-lg">
 <Activity className="w-8 h-8 text-white" />
 </div>
 <h2 className="text-xl font-semibold mb-2 text-text-1">Failed to load workflows</h2>
 <p className="mb-6 text-text-2">{error}</p>
 <button onClick={refreshWorkflows} className="px-6 py-2 text-white font-medium bg-blue-primary hover:bg-blue-primary-hover rounded-md transition-colors">
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
 <div className="w-12 h-1 bg-blue-primary" />
 </div>
 <h1 className="text-2xl font-semibold text-text-1">Workflows</h1>
 <p className="text-sm mt-0.5 text-text-2">
 {workflows.length} workflows &#9632; {activeCount} active &#9632; {pausedCount} paused
 </p>
 </div>

 <div className="flex items-center gap-2">
 <button
 onClick={refreshWorkflows}
 disabled={loading}
 className="h-9 px-3 flex items-center gap-2 text-sm transition-colors text-text-2 bg-bg-card border border-line-1 rounded-md hover:bg-bg-muted"
 >
 <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
 <span className="hidden sm:inline text-xs">Refresh</span>
 </button>
 <div className="relative">
 <button
 onClick={() => setShowNewWorkflowMenu(!showNewWorkflowMenu)}
 className="h-9 px-4 flex items-center gap-2 text-sm font-medium text-white transition-colors bg-blue-primary hover:bg-blue-primary-hover rounded-md"
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
 <div className="absolute right-0 mt-2 w-56 overflow-hidden z-50 bg-bg-card border border-line-1 rounded-lg shadow-md">
 <button
 onClick={() => {
 navigate("/workflows/builder");
 setShowNewWorkflowMenu(false);
 }}
 className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-muted transition-colors"
 >
 <div className="p-2 bg-bg-muted rounded-md">
 <FileText className="w-4 h-4 text-text-2" />
 </div>
 <div>
 <div className="text-sm font-medium text-text-1">Blank Workflow</div>
 <div className="text-xs text-text-2">Start from scratch</div>
 </div>
 </button>
 <button
 onClick={() => {
 setShowTemplateSelector(true);
 setShowNewWorkflowMenu(false);
 }}
 className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-muted transition-colors border-t border-line-1"
 >
 <div className="p-2 bg-blue-primary rounded-md">
 <Sparkles className="w-4 h-4 text-white" />
 </div>
 <div>
 <div className="text-sm font-medium text-text-1">From Template</div>
 <div className="text-xs text-text-2">Use a pre-built workflow</div>
 </div>
 </button>
 </div>
 </>
 )}
 </div>
 </div>
 </div>

 {/* Filters Bar */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-bg-card border border-line-1 rounded-lg">
 {/* Search */}
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-2" />
 <input
 type="text"
 placeholder="Search workflows..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full h-9 pl-9 pr-9 text-sm focus:outline-none transition-all bg-bg-page border border-line-1 rounded-md text-text-1 placeholder:text-text-3 focus:border-blue-primary focus:ring-1 focus:ring-blue-primary"
 />
 {searchTerm && (
 <button
 onClick={() => setSearchTerm("")}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-text-2 hover:text-text-1"
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
 className="h-9 px-3 flex items-center gap-2 text-sm transition-colors min-w-[120px] bg-bg-card border border-line-1 rounded-md text-text-1 hover:bg-bg-muted"
 >
 <span>{selectedCategory}</span>
 <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform text-text-2", categoryDropdownOpen && "rotate-180")} />
 </button>
 {categoryDropdownOpen && (
 <div className="absolute z-50 mt-1 w-full overflow-hidden bg-bg-card border border-line-1 rounded-lg shadow-md">
 {categories.map((cat) => (
 <button
 key={cat}
 onClick={() => {
 setSelectedCategory(cat);
 setCategoryDropdownOpen(false);
 }}
 className={cn(
 "w-full px-3 py-2 text-left text-sm hover:bg-bg-muted transition-colors flex items-center justify-between text-text-1",
 cat === selectedCategory && "bg-bg-muted"
 )}
 >
 <span>{cat}</span>
 {cat === selectedCategory && <Check className="w-4 h-4 text-blue-primary" />}
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Status Tabs */}
 <div className="flex p-0.5 bg-bg-card border border-line-1 rounded-md">
 {([
 { key: "All", label: "All" },
 { key: WorkflowStatus.ACTIVE, label: "Active" },
 { key: WorkflowStatus.PAUSED, label: "Paused" },
 ] as const).map((tab) => (
 <button
 key={tab.key}
 onClick={() => setSelectedStatus(tab.key as "All" | WorkflowStatus)}
 className={cn(
 "px-3 py-1.5 text-sm font-medium transition-all rounded-md",
 selectedStatus === tab.key
 ? "bg-bg-card text-blue-primary"
 : "text-text-2 hover:text-text-1 hover:bg-bg-muted"
 )}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* View Toggle */}
 <div className="flex p-0.5 bg-bg-card border border-line-1 rounded-md">
 <button
 onClick={() => setIsGridView(true)}
 className={cn(
 "p-1.5 transition-all rounded-md",
 isGridView
 ? "bg-bg-card text-blue-primary"
 : "text-text-2 hover:text-text-1 hover:bg-bg-muted"
 )}
 >
 <GridIcon className="w-4 h-4" />
 </button>
 <button
 onClick={() => setIsGridView(false)}
 className={cn(
 "p-1.5 transition-all rounded-md",
 !isGridView
 ? "bg-bg-card text-blue-primary"
 : "text-text-2 hover:text-text-1 hover:bg-bg-muted"
 )}
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
 "animate-pulse bg-bg-card border border-line-1 rounded-xl",
 isGridView ? "p-4 h-48" : "p-4 h-20"
 )}
 >
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 bg-bg-card rounded-md" />
 <div className="flex-1 space-y-2">
 <div className="h-4 w-32 bg-bg-card rounded-md" />
 <div className="h-3 w-24 bg-bg-card rounded-md" />
 </div>
 </div>
 </div>
 ))}
 </motion.div>
 ) : filteredWorkflows.length === 0 ? (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="p-12 text-center bg-bg-card border-2 border-dashed border-line-1 rounded-xl"
 >
 <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-bg-muted rounded-lg">
 <Search className="w-8 h-8 text-text-2" />
 </div>
 <h3 className="text-lg font-medium mb-2 text-text-1">No workflows found</h3>
 <p className="text-sm mb-6 max-w-sm mx-auto text-text-2">
 {searchTerm || selectedCategory !== "All" || selectedStatus !== "All"
 ? "Try adjusting your filters to find what you're looking for."
 : "Get started by creating your first workflow."}
 </p>
 <button
 onClick={() => navigate("/workflows/builder")}
 className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-primary hover:bg-blue-primary-hover rounded-md"
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
 className={cn(
 "group overflow-hidden transition-all bg-bg-card border border-line-1 border-l-4 rounded-xl",
 config.borderClass
 )}
 >
 {/* Card Header */}
 <div className="p-4 pb-3">
 <div className="flex items-start justify-between gap-3">
 <div className="flex items-start gap-3 min-w-0 flex-1">
 <div className="p-2 flex-shrink-0 bg-bg-muted rounded-md">
 <config.icon className={cn("w-5 h-5", config.color)} />
 </div>
 <div className="min-w-0 flex-1">
 <h3
 className="font-medium truncate cursor-pointer transition-colors text-text-1 hover:text-blue-primary"
 onClick={() => handleEditWorkflow(workflow.id)}
 >
 {workflow.name}
 </h3>
 <div className="flex items-center gap-2 mt-1">
 <span className={cn("inline-flex items-center gap-1 text-xs font-medium", config.color)}>
 <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
 {config.text}
 </span>
 <span className="text-xs text-text-3">&#9632;</span>
 <span className="text-xs text-text-2">{workflow.category}</span>
 </div>
 </div>
 </div>

 {/* Actions Menu */}
 <div className="relative">
 <button
 onClick={() => setOpenMenuId(openMenuId === workflow.id ? null : workflow.id)}
 className="p-1.5 transition-colors text-text-2 hover:text-text-1 rounded-md hover:bg-bg-muted"
 >
 <MoreHorizontal className="w-4 h-4" />
 </button>
 {openMenuId === workflow.id && (
 <div className="absolute right-0 top-8 z-50 w-40 overflow-hidden bg-bg-card border border-line-1 rounded-lg shadow-md">
 <button
 onClick={() => {
 setLogsWorkflow({ id: workflow.id, name: workflow.name });
 setOpenMenuId(null);
 }}
 className="w-full px-3 py-2 text-left text-sm hover:bg-bg-muted transition-colors flex items-center gap-2 text-text-1"
 >
 <History className="w-4 h-4 text-blue-primary" />
 View Logs
 </button>
 <button
 onClick={() => handleDuplicateWorkflow(workflow.id)}
 disabled={duplicatingWorkflowId === workflow.id}
 className="w-full px-3 py-2 text-left text-sm hover:bg-bg-muted transition-colors flex items-center gap-2 disabled:opacity-50 text-text-1"
 >
 <Copy className="w-4 h-4 text-success" />
 {duplicatingWorkflowId === workflow.id ? "Duplicating..." : "Duplicate"}
 </button>
 <button
 onClick={() => {
 handleEditWorkflow(workflow.id);
 setOpenMenuId(null);
 }}
 className="w-full px-3 py-2 text-left text-sm hover:bg-bg-muted transition-colors flex items-center gap-2 text-text-1"
 >
 <Edit className="w-4 h-4 text-blue-primary" />
 Edit
 </button>
 <button
 onClick={() => handleDeleteWorkflow(workflow.id)}
 className="w-full px-3 py-2 text-left text-sm hover:bg-danger-bg transition-colors flex items-center gap-2 text-error"
 >
 <Trash2 className="w-4 h-4" />
 Delete
 </button>
 </div>
 )}
 </div>
 </div>

 <p className="text-xs line-clamp-2 mt-3 leading-relaxed text-text-2">
 {workflow.description || "No description"}
 </p>
 </div>

 {/* Card Footer */}
 <div className="px-4 py-3 flex items-center justify-between bg-bg-muted border-t border-line-1">
 <div className="flex items-center gap-4 text-xs text-text-2">
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
 className="overflow-hidden bg-bg-card border border-line-1 rounded-xl"
 >
 {/* Table Header */}
 <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium bg-bg-muted border-b border-line-1 text-text-2">
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
 className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-bg-muted/50 transition-colors group border-b border-line-1"
 >
 <div className="col-span-4 flex items-center gap-3 min-w-0">
 <div className="p-1.5 flex-shrink-0 bg-bg-muted rounded-md">
 <config.icon className={cn("w-4 h-4", config.color)} />
 </div>
 <div className="min-w-0">
 <p
 className="font-medium truncate cursor-pointer transition-colors text-sm text-text-1 hover:text-blue-primary"
 onClick={() => handleEditWorkflow(workflow.id)}
 >
 {workflow.name}
 </p>
 <p className="text-xs truncate text-text-2">{workflow.category}</p>
 </div>
 </div>

 <div className="col-span-2 flex items-center">
 <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", config.color)}>
 <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
 {config.text}
 </span>
 </div>

 <div className="col-span-2 flex items-center">
 <span className="text-sm truncate text-text-2">{workflow.nextRun}</span>
 </div>

 <div className="col-span-2 flex items-center">
 <span className="text-sm text-text-2">
 {workflow.lastRun === "Never" ? "-" : getRelativeTime(workflow.updatedAt)}
 </span>
 </div>

 <div className="col-span-2 flex items-center justify-end gap-2">
 <div className="flex items-center gap-0.5 p-0.5 bg-bg-muted rounded-md">
 <button
 onClick={() => setLogsWorkflow({ id: workflow.id, name: workflow.name })}
 className="p-1.5 text-text-3 hover:text-blue-primary hover:bg-blue-soft/10 transition-colors rounded-md"
 title="View Logs"
 >
 <History className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleExecuteWorkflow(workflow.id)}
 disabled={executingWorkflowId === workflow.id || workflow.status !== WorkflowStatus.ACTIVE}
 className="p-1.5 text-text-3 hover:text-success hover:bg-success-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-md"
 title="Run Now"
 >
 <Play className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleDuplicateWorkflow(workflow.id)}
 disabled={duplicatingWorkflowId === workflow.id}
 className="p-1.5 text-text-3 hover:text-success hover:bg-success-bg transition-colors disabled:opacity-30 rounded-md"
 title="Duplicate"
 >
 <Copy className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleEditWorkflow(workflow.id)}
 className="p-1.5 text-text-3 hover:text-blue-primary hover:bg-blue-soft transition-colors rounded-md"
 title="Edit"
 >
 <Edit className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleDeleteWorkflow(workflow.id)}
 className="p-1.5 text-text-3 hover:text-error hover:bg-danger-bg transition-colors rounded-md"
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
 <p className="text-sm text-text-3">
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
