import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
// React Flow canvas (migrated from custom canvas)
import { ReactFlowCanvas } from "../components/workflow/reactflow";
import { type WorkflowMeta } from "../components/forms/WorkflowMetaForm";
import { Sidebar } from "../components/workflow/Sidebar";
import { Toolbar } from "../components/workflow/Toolbar";
import { useWorkflowStore } from "../store/workflowStore";
import { WorkflowNode, WorkflowStatus, WorkflowConnection } from "../types/workflow";
import { cn } from "../lib/utils";
import { workflowApiService } from "../services/workflowApiService";
import { useNotification } from "../hooks/useNotification";
import { transformBackendWorkflowDetailed } from "../utils/workflowTransformers";
import { normalizeWorkflowPayload } from "../utils/normalizeWorkflow";
import { getNodeSpec } from "../workflow/registry";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { useWorkflowExecution } from "../hooks/useWorkflowExecution";
import { WorkflowData, BackendWorkflow } from "../types/backend";
import { DeliveryConfig, DEFAULT_DELIVERY_CONFIG } from "../types/delivery";
import { prefetchWorkflowNodeData } from "../services/nodeDataPrefetch";
import { extractMongoId } from "../utils/mongoUtils";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { useElementSize } from "../hooks/useElementSize";
import { autoLayoutDynamic } from "../utils/workflowLayout";
import { pinService } from "../services/pinService";
import { stepRunService, type StepRunResponse } from "../services/stepRunService";
import { executionDebugService, type ExecutionDetail } from "../services/executionDebugService";

// Lazy load heavy components (modals and panels)
const ExecutionLogPanel = lazy(() => import("../components/workflow/ExecutionLogPanel").then(m => ({ default: m.ExecutionLogPanel })));
const WorkflowMetaForm = lazy(() => import("../components/forms/WorkflowMetaForm").then(m => ({ default: m.WorkflowMetaForm })));
const NodeConfigPanel = lazy(() => import("../components/workflow/node-config/NodeConfigPanel").then(m => ({ default: m.NodeConfigPanel })));
const PreviewPanel = lazy(() => import("../components/workflow/PreviewPanel").then(m => ({ default: m.PreviewPanel })));
const ScheduleDeliverySheet = lazy(() => import("../components/workflow/ScheduleDeliverySheet").then(m => ({ default: m.ScheduleDeliverySheet })));
const ExecutionHistoryPanel = lazy(() => import("../components/workflow/ExecutionHistoryPanel").then(m => ({ default: m.ExecutionHistoryPanel })));

// Location state type
interface LocationState {
  workflow?: BackendWorkflow;
  template?: {
    name: string;
    description: string;
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
  };
}

const WorkflowBuilderPage: React.FC = () => {
  const { isMobile, isTablet } = useResponsiveLayout();
  const location = useLocation() as { state?: LocationState };
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const docId = searchParams.get("id");

  const nodes = useWorkflowStore((state) => state.nodes);
  const connections = useWorkflowStore((state) => state.connections);
  const originalBackendWorkflow = useWorkflowStore(
    (state) => state.originalBackendWorkflow
  );
  const hasUnsavedChanges = useWorkflowStore(
    (state) => state.hasUnsavedChanges
  );
  const lastSavedAt = useWorkflowStore((state) => state.lastSavedAt);
  const setNodes = useWorkflowStore((state) => state.updateNodes);
  const setConnections = useWorkflowStore((state) => state.updateConnections);
  const updateWorkflow = useWorkflowStore((state) => state.updateWorkflow);
  const setOriginalBackendWorkflow = useWorkflowStore(
    (state) => state.setOriginalBackendWorkflow
  );
  const markAsSaved = useWorkflowStore((state) => state.markAsSaved);
  const pinnedNodes = useWorkflowStore((state) => state.pinnedNodes);
  const previewCache = useWorkflowStore((state) => state.previewCache);
  const loadPinnedNodes = useWorkflowStore((state) => state.loadPinnedNodes);
  const addPinnedNode = useWorkflowStore((state) => state.addPinnedNode);
  const removePinnedNode = useWorkflowStore((state) => state.removePinnedNode);
  const debugExecution = useWorkflowStore((state) => state.debugExecution);
  const enterDebugMode = useWorkflowStore((state) => state.enterDebugMode);
  const exitDebugMode = useWorkflowStore((state) => state.exitDebugMode);

  const workflowId = originalBackendWorkflow?.job_id || docId;

  // Execution ID: prefer Mongo ObjectId, fall back to job_id
  const executionId = extractMongoId(originalBackendWorkflow?._id) || originalBackendWorkflow?.job_id;
  const { executing, handleExecute, stopExecuting } = useWorkflowExecution({
    workflowId: executionId,
    nodes,
    setNodes,
  });

  const [editorNode, setEditorNode] = useState<WorkflowNode | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewNodeId, setPreviewNodeId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!!docId); // Only show loading if we have a docId to fetch
  const [bootstrapped, setBootstrapped] = useState(false); // Track if bootstrap has run
  const { notify } = useNotification();
  const [metaOpen, setMetaOpen] = useState(false);
  const [scheduleDeliveryOpen, setScheduleDeliveryOpen] = useState(false);

  // Schedule & delivery local state (saved via onSave)
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig>(DEFAULT_DELIVERY_CONFIG);
  const [errorWorkflowId, setErrorWorkflowId] = useState<string | null>(
    () => originalBackendWorkflow?.error_workflow_id ?? null
  );

  // Derived sets for the canvas — recomputed only when maps change
  const pinnedNodeInstanceIds = useMemo(
    () => new Set(Object.keys(pinnedNodes)),
    [pinnedNodes]
  );
  const previewedNodeIds = useMemo(
    () => new Set(Object.keys(previewCache)),
    [previewCache]
  );

  // Pin / unpin handlers wired to the pin service
  const handlePinNode = useCallback(
    async (node: WorkflowNode) => {
      const instanceId = node.data?.node_instance_id;
      const preview = previewCache[node.id];
      if (!workflowId || instanceId === undefined || !preview) return;
      try {
        await pinService.pinNode(workflowId, Number(instanceId), preview);
        addPinnedNode(String(instanceId), {
          data: preview.data,
          columns: preview.columns,
          pinned_at: Date.now() / 1000,
        });
        notify.success("Pinned", `${node.display_name || node.name} data is now pinned.`);
      } catch {
        notify.error("Pin failed", "Could not pin node data. Please try again.");
      }
    },
    [workflowId, previewCache, addPinnedNode, notify]
  );

  const handleUnpinNode = useCallback(
    async (node: WorkflowNode) => {
      const instanceId = node.data?.node_instance_id;
      if (!workflowId || instanceId === undefined) return;
      try {
        await pinService.unpinNode(workflowId, Number(instanceId));
        removePinnedNode(String(instanceId));
        notify.success("Unpinned", `${node.display_name || node.name} pin cleared.`);
      } catch {
        notify.error("Unpin failed", "Could not remove pin. Please try again.");
      }
    },
    [workflowId, removePinnedNode, notify]
  );

  // ---------------------------------------------------------------------------
  // F2-FE-1 / F2-FE-2 — Step-run state
  // ---------------------------------------------------------------------------

  /**
   * Per-node step-run status map. Key = node React ID.
   * Lives in page state — not Zustand (it's ephemeral per session interaction).
   */
  const [stepRunStatusMap, setStepRunStatusMap] = useState<
    Map<string, 'idle' | 'running' | 'done' | 'error'>
  >(new Map());

  /** The node ID whose step-run result is currently shown in PreviewPanel. */
  const [stepRunNodeId, setStepRunNodeId] = useState<string | null>(null);

  /** The last step-run response for the active step-run panel node. */
  const [stepRunResult, setStepRunResult] = useState<StepRunResponse | null>(null);

  /** Whether the auto-pin checkbox is checked for the current step-run result. */
  const [autoPinChecked, setAutoPinChecked] = useState(false);

  const setNodeStepRunStatus = useCallback(
    (nodeId: string, status: 'idle' | 'running' | 'done' | 'error') => {
      setStepRunStatusMap((prev) => {
        const next = new Map(prev);
        next.set(nodeId, status);
        return next;
      });
    },
    []
  );

  const handleStepRunNode = useCallback(
    async (node: WorkflowNode) => {
      const instanceId = node.data?.node_instance_id;
      if (!workflowId || instanceId === undefined) return;

      setNodeStepRunStatus(node.id, 'running');
      setStepRunNodeId(node.id);
      setStepRunResult(null);
      setAutoPinChecked(false);

      try {
        const result = await stepRunService.stepRunNode(
          workflowId,
          Number(instanceId),
          false // auto_pin controlled by checkbox, not sent as true here
        );
        setStepRunResult(result);

        if (result.error_message) {
          setNodeStepRunStatus(node.id, 'error');
        } else {
          setNodeStepRunStatus(node.id, 'done');
          // Cache the result so the Pin button becomes active
          const preview = {
            data: result.data,
            columns: result.columns,
            row_count: result.row_count,
          };
          useWorkflowStore.getState().cachePreviewResult(node.id, preview);
        }
      } catch {
        setNodeStepRunStatus(node.id, 'error');
        setStepRunResult({
          data: [],
          columns: [],
          row_count: 0,
          node_output: {},
          error_message: 'Step run request failed. Check your network connection.',
          traceback: null,
        });
      }
    },
    [workflowId, setNodeStepRunStatus]
  );

  /**
   * When the auto-pin checkbox is toggled ON after a successful step-run,
   * immediately pin the cached result.
   */
  const handleAutoPinChange = useCallback(
    async (checked: boolean) => {
      setAutoPinChecked(checked);
      if (!checked || !stepRunNodeId || !stepRunResult || stepRunResult.error_message) return;

      const node = nodes.find((n) => n.id === stepRunNodeId);
      if (!node) return;

      const instanceId = node.data?.node_instance_id;
      if (!workflowId || instanceId === undefined) return;

      const preview = {
        data: stepRunResult.data,
        columns: stepRunResult.columns,
        row_count: stepRunResult.row_count,
      };

      try {
        await pinService.pinNode(workflowId, Number(instanceId), preview);
        addPinnedNode(String(instanceId), {
          data: preview.data,
          columns: preview.columns,
          pinned_at: Date.now() / 1000,
        });
        notify.success("Pinned", `${node.display_name || node.name} result pinned.`);
      } catch {
        setAutoPinChecked(false);
        notify.error("Pin failed", "Could not auto-pin result. Please try again.");
      }
    },
    [stepRunNodeId, stepRunResult, nodes, workflowId, addPinnedNode, notify]
  );

  // ---------------------------------------------------------------------------
  // F4-FE-1 / F4-FE-2 — Execution history + debug mode
  // ---------------------------------------------------------------------------

  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);

  /**
   * Build a map from node_instance_id (string) → debug overlay data so the
   * canvas can highlight each node without reading the store directly.
   */
  const debugNodeMap = useMemo<ReadonlyMap<string, {
    failed: boolean;
    succeeded: boolean;
    rowCount: number;
    errorMessage: string | null;
  }> | undefined>(() => {
    if (!debugExecution) return undefined;
    const map = new Map<string, {
      failed: boolean;
      succeeded: boolean;
      rowCount: number;
      errorMessage: string | null;
    }>();
    for (const [instanceId, step] of Object.entries(debugExecution.steps)) {
      map.set(instanceId, {
        failed: step.status === 'FAILED',
        succeeded: step.status === 'SUCCESS',
        rowCount: step.row_count ?? 0,
        errorMessage: step.error ?? null,
      });
    }
    return map;
  }, [debugExecution]);

  /**
   * The node the user has selected to inspect in debug mode.
   * Drives the debug-mode PreviewPanel.
   */
  const [debugInspectNode, setDebugInspectNode] = useState<WorkflowNode | null>(null);

  const debugPreviewResult = useMemo(() => {
    if (!debugInspectNode || !debugExecution) return null;
    const instanceId = debugInspectNode.data?.node_instance_id;
    if (instanceId === undefined) return null;
    const step = debugExecution.steps[String(instanceId)];
    if (!step) return null;
    return {
      data: [],
      columns: [],
      row_count: step.row_count ?? 0,
    };
  }, [debugInspectNode, debugExecution]);

  const handleDebugInspectNode = useCallback((node: WorkflowNode) => {
    setDebugInspectNode(node);
    // Close any open step-run panel so the two panels don't stack
    setStepRunNodeId(null);
    setStepRunResult(null);
  }, []);

  const handleExitDebugMode = useCallback(() => {
    exitDebugMode();
    setDebugInspectNode(null);
  }, [exitDebugMode]);

  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryExecution = useCallback(
    async (executionId: string) => {
      if (!workflowId) return;
      setIsRetrying(true);
      try {
        const result = await executionDebugService.retryExecution(workflowId, executionId);
        notify.success(
          "Retry started",
          `New execution launched (ID: ${result.execution_id}).`
        );
        handleExitDebugMode();
        setHistoryPanelOpen(false);
      } catch {
        notify.error("Retry failed", "Could not start retry. Please try again.");
      } finally {
        setIsRetrying(false);
      }
    },
    [workflowId, notify, handleExitDebugMode]
  );

  // Left Sidebar State
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("workflow-left-sidebar-collapsed");
    return saved ? JSON.parse(saved) : isMobile || isTablet;
  });

  // Right Sidebar State (Reserved for future properties panel)
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("workflow-right-sidebar-collapsed");
    return saved ? JSON.parse(saved) : isMobile || isTablet;
  });

  const makeLayoutWithSize = useCallback(
    (cw: number, ch: number) => (list: WorkflowNode[]) =>
      autoLayoutDynamic(list, {
        canvasWidth: Math.max(cw, 800),
        canvasHeight: Math.max(ch, 600),
        nodeWidth: 200,    // Match actual node width
        nodeHeight: 80,    // Match actual node height
        minGapX: 100,      // Horizontal gap between source and destinations
        minGapY: 20,       // Vertical gap between stacked destinations
        groupGapY: 50,     // Gap between source groups
        margin: 60,
        order: ["source", "transform", "destination"],
      }),
    []
  );

  const applyLayoutIfMissing = (
    existing: WorkflowNode[],
    layoutFn: (_l: WorkflowNode[]) => WorkflowNode[]
  ) => {
    const need = existing.filter(
      (n) =>
        !n.position || Number.isNaN(n.position.x) || Number.isNaN(n.position.y)
    );
    if (need.length === 0) return existing;
    const laid = layoutFn(need);
    const posMap = new Map(laid.map((n) => [n.id, n.position]));
    return existing.map((n) =>
      posMap.has(n.id) ? { ...n, position: posMap.get(n.id)! } : n
    );
  };

  const {
    ref: canvasRef,
    width: cw,
    height: ch,
  } = useElementSize<HTMLDivElement>();
  const layoutNodes = React.useMemo(
    () => makeLayoutWithSize(cw, ch),
    [cw, ch, makeLayoutWithSize]
  );

  useEffect(() => {
    const bootstrap = async () => {
      // Skip bootstrap if already bootstrapped for new workflows
      // This prevents resetting state when dependencies change (e.g., location)
      if (bootstrapped && !docId) {
        return;
      }

      try {
        setError(null);
        if (docId) setIsLoading(true);
        if (!docId) {
          const now = new Date().toISOString();
          const templateData = location?.state?.template;

          // Use template data if provided, otherwise create blank workflow
          const workflowName = templateData?.name || "New Workflow";
          const workflowDescription = templateData?.description || "";
          const templateNodes = templateData?.nodes || [];
          const templateConnections = templateData?.connections || [];

          const seeded: Partial<WorkflowData> = {
            workflow_id: "",
            job_id: "",
            job_name: "",
            application_name: "cron5",
            name: workflowName,
            description: workflowDescription,
            status: WorkflowStatus.ACTIVE,
            created_at: now,
            updated_at: now,
            schedule_expression: "0 0 * * *",
            environment_tag: "development",
            execution_mode: "sequential",
            user_id: "",
            project_id: "",
            nodes: [],
          };

          setOriginalBackendWorkflow(seeded);
          updateWorkflow({
            job_id: "",
            job_name: workflowName,
            description: workflowDescription,
            status: WorkflowStatus.ACTIVE,
            environment_tag: "development",
            schedule_expression: "0 0 * * *",
            project_id: "",
            application_name: "cron5",
            execution_mode: "sequential",
            created_at: now,
            updated_at: now,
            nodes: [],
          });

          // Apply layout to template nodes if provided
          if (templateNodes.length > 0) {
            // Use template positions if all nodes already have valid positions,
            // otherwise fall back to auto-layout
            const allHavePositions = templateNodes.every(
              (n: WorkflowNode) => n.position && !Number.isNaN(n.position.x) && !Number.isNaN(n.position.y)
            );
            const finalNodes = allHavePositions ? templateNodes : layoutNodes(templateNodes);
            setNodes(finalNodes);
            setConnections(templateConnections);
          } else {
            setNodes([]);
            setConnections([]);
          }
          markAsSaved();
          setBootstrapped(true);
        } else {
          const preload = location?.state?.workflow;
          const backendData =
            preload && Array.isArray(preload.nodes)
              ? preload
              : (await workflowApiService.getWorkflow(docId)).data;
          const {
            workflow,
            nodes: workflowNodes,
            connections: workflowConnections,
          } = transformBackendWorkflowDetailed(backendData);

          if (!Array.isArray(backendData.nodes)) {
            throw new Error(
              "Invalid workflow payload: nodes missing or not an array"
            );
          }
          setOriginalBackendWorkflow(backendData);

          // Use positions from transformer (dagre layout based on connections)
          // Don't re-layout - dagre already calculated optimal positions
          updateWorkflow({
            ...workflow,
          });
          setNodes(workflowNodes);
          setConnections(workflowConnections);
          markAsSaved();
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load workflow";
        setError(errorMessage);
        console.error("Error initializing workflow:", err);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, [
    docId,
    bootstrapped,
    setNodes,
    setConnections,
    updateWorkflow,
    setOriginalBackendWorkflow,
    markAsSaved,
    layoutNodes,
    location,
  ]);

  // Sync error_workflow_id from backend when workflow loads
  useEffect(() => {
    if (originalBackendWorkflow?.error_workflow_id !== undefined) {
      setErrorWorkflowId(originalBackendWorkflow.error_workflow_id ?? null);
    }
  }, [originalBackendWorkflow?.error_workflow_id]);

  // F1-FE-2: Load pinned node data from server when a workflow is opened.
  // Pin state is server-authoritative — never stored in sessionStorage or localStorage.
  useEffect(() => {
    if (!workflowId) return;
    pinService
      .getPinnedData(workflowId)
      .then(loadPinnedNodes)
      .catch(() => {
        // Non-fatal: pin state is a UI enhancement; silently ignore if unavailable
      });
  }, [workflowId, loadPinnedNodes]);

  // Prefetch all node data when workflow is loaded
  const prefetchedRef = useRef(false);

  useEffect(() => {
    // Prefetch node data when nodes are available and not already prefetched
    if (!isLoading && nodes.length > 0 && !prefetchedRef.current) {
      prefetchedRef.current = true;
      // Fire and forget - don't block UI
      prefetchWorkflowNodeData(nodes).catch(console.error);
    }
  }, [isLoading, nodes]);

  // Reset prefetch flag when component unmounts
  useEffect(() => {
    return () => {
      prefetchedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isMobile || isTablet) {
      setLeftSidebarCollapsed(true);
      setRightSidebarCollapsed(true);
    }
  }, [isMobile, isTablet]);

  const handleToggleLeftSidebar = useCallback(() => {
    const newCollapsed = !leftSidebarCollapsed;
    setLeftSidebarCollapsed(newCollapsed);
    localStorage.setItem(
      "workflow-left-sidebar-collapsed",
      JSON.stringify(newCollapsed)
    );
  }, [leftSidebarCollapsed]);

  const handleToggleRightSidebar = useCallback(() => {
    const newCollapsed = !rightSidebarCollapsed;
    setRightSidebarCollapsed(newCollapsed);
    localStorage.setItem(
      "workflow-right-sidebar-collapsed",
      JSON.stringify(newCollapsed)
    );
  }, [rightSidebarCollapsed]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isMobile || isTablet) return;

      if ((event.ctrlKey || event.metaKey) && event.key === "b") {
        event.preventDefault();
        handleToggleLeftSidebar();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "i") {
        event.preventDefault();
        handleToggleRightSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobile, isTablet, handleToggleLeftSidebar, handleToggleRightSidebar]);

  // Auto-collapse sidebars on mobile/tablet - run only once on mount
  useEffect(() => {
    if (isMobile || isTablet) {
      // Collapse sidebars on mobile by setting state directly (not toggling)
      setLeftSidebarCollapsed(true);
      setRightSidebarCollapsed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - intentionally ignore isMobile/isTablet changes

  const handleNodesChange = (
    newNodes: WorkflowNode[] | ((_prev: WorkflowNode[]) => WorkflowNode[])
  ) => {
    setNodes(newNodes);
  };

  const handleConnectionsChange = (newConnections: WorkflowConnection[] | ((prev: WorkflowConnection[]) => WorkflowConnection[])) => {
    setConnections(newConnections);
  };

  const handleNodeUpdate = (updatedNode: WorkflowNode) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id !== updatedNode.id) return node;
        // Merge all fields from updatedNode, not just data
        return {
          ...node,
          ...updatedNode,
          data: { ...node.data, ...updatedNode.data },
        };
      })
    );
  };

  const handleSave = async () => {
    if (!originalBackendWorkflow) {
      notify.error("Save failed", "Workflow not initialized");
      return;
    }

    if (!hasUnsavedChanges) {
      notify.info("No changes", "There are no changes to save");
      return;
    }

    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 350));
      const needsMetadata =
        !originalBackendWorkflow.job_id ||
        !originalBackendWorkflow.workflow_id ||
        !originalBackendWorkflow.job_name;
      if (needsMetadata) {
        setMetaOpen(true);
        setSaving(false);
        return;
      }
      const strictWorkflow = normalizeWorkflowPayload(
        originalBackendWorkflow,
        nodes,
        connections
      );
      const toMinimal = (wf: typeof strictWorkflow): Partial<WorkflowData> => {
        const objectId = extractMongoId(wf._id);
        // Preserve display_name in nodes when sending to backend
        const nodesWithDisplayName = wf.nodes.map((node) => ({
          ...node,
          display_name: node.display_name || undefined,
        }));
        const base: Partial<WorkflowData> = {
          workflow_id: wf.workflow_id,
          job_id: wf.job_id,
          job_name: wf.job_name,
          status: wf.status,
          created_at: wf.created_at,
          updated_at: wf.updated_at,
          schedule_expression: wf.schedule_expression,
          nodes: nodesWithDisplayName,
          ...(wf.connections ? { connections: wf.connections } : {}),
          error_workflow_id: errorWorkflowId ?? undefined,
        };
        if (objectId) base._id = objectId;
        return base;
      };

      if (!docId || !strictWorkflow._id) {
        const created = await workflowApiService.createWorkflowBuilder(strictWorkflow);
        const newWorkflowData = created.data;
        const {
          workflow: wf,
          nodes: wfNodes,
          connections: wfConnections,
        } = transformBackendWorkflowDetailed(newWorkflowData);

        setOriginalBackendWorkflow(newWorkflowData);
        updateWorkflow(wf);
        setNodes(() => applyLayoutIfMissing(wfNodes, layoutNodes));
        setConnections(() => wfConnections);
        markAsSaved();

        notify.successDialog("Workflow saved", [
          "All changes have been committed.",
        ]);

        const newId = extractMongoId(newWorkflowData?._id) || newWorkflowData?.job_id;
        if (newId) {
          window.history.replaceState(
            null,
            "",
            `/workflows/builder?id=${newId}`
          );
        }
        return;
      }

      await workflowApiService.updateWorkflowBuilder(
        toMinimal(strictWorkflow),
        docId || undefined
      );
      try {
        const refreshed = await workflowApiService.getWorkflow(docId);
        const {
          workflow: wf,
          nodes: wfNodes,
          connections: wfConnections,
        } = transformBackendWorkflowDetailed(refreshed.data);
        setOriginalBackendWorkflow(refreshed.data);

        const currentId = extractMongoId(refreshed.data?._id) || refreshed.data?.job_id;
        if (currentId && currentId !== docId) {
          window.history.replaceState(
            null,
            "",
            `/workflows/builder?id=${currentId}`
          );
        }
        updateWorkflow(wf);
        setNodes(() => applyLayoutIfMissing(wfNodes, layoutNodes));
        setConnections(() => wfConnections);
      } catch (refetchErr) {
        console.warn("Refetch after save failed:", refetchErr);
      }
      markAsSaved();
      notify.successDialog("Workflow saved", [
        "All changes have been committed.",
      ]);
    } catch (error) {
      console.error("Failed to save workflow:", error);
      notify.error(
        "Save failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setSaving(false);
    }
  };

  const getNodeIdFromType = (nodeType: string, nodeData?: Record<string, unknown>) => {
    if (nodeData?.accessToken || nodeData?.adAccountId) return "facebook_ads";
    if (nodeData?.project_id || nodeData?.dataset) return "bigquery";
    if (nodeData?.spreadsheet_id) return "google_sheets";
    if (nodeData?.host || nodeData?.database) return "mysql";
    if (nodeData?.sql_query) return "sql_transform";
    if (nodeData?.customer_id) return "google_ads";

    if (nodeType === "source") return "facebook_ads";
    if (nodeType === "destination") return "bigquery";
    if (nodeType === "transform") return "sql_transform";

    return "unknown";
  };

  const handleMetaSubmit = async (data: WorkflowMeta) => {
    try {
      setSaving(true);
      const workflowPayload = {
        _id: data._id,
        job_name: data.job_name,
        status: data.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        schedule_expression: data.schedule_expression,
        nodes: nodes.map((node, index) => {
          const spec = getNodeSpec(node.definitionId);
          let parameters = node.data || {};
          let nodeId: string =
            node.definitionId ||
            getNodeIdFromType(node.type, node.data) ||
            "unknown";

          if (spec && spec.adapters?.toBackend) {
            const adapted = spec.adapters.toBackend(node.data || {});
            parameters = adapted.parameters;
            nodeId = adapted.node_id;
          }

          return {
            node_instance_id: index + 1,
            node_id: nodeId,
            node_type: node.type === "destination" ? "destinations" : node.type,
            parameters,
            display_name: node.display_name || undefined, // Preserve display_name
          };
        }),
        connections: connections.map((conn) => {
          const fromIndex = nodes.findIndex((n) => n.id === conn.sourceNodeId);
          const toIndex = nodes.findIndex((n) => n.id === conn.targetNodeId);
          return {
            from_node: fromIndex + 1,
            to_node: toIndex + 1,
          };
        }),
      };

      // Check if this is an update or create
      const existingId =
        data._id ||
        docId ||
        extractMongoId(originalBackendWorkflow?._id);

      if (existingId) {
        // UPDATE existing workflow
        await workflowApiService.updateWorkflowBuilder(
          workflowPayload,
          existingId
        );

        // Refetch to get updated data
        const refreshed = await workflowApiService.getWorkflow(existingId);
        const { workflow: wf } = transformBackendWorkflowDetailed(refreshed.data);

        setOriginalBackendWorkflow(refreshed.data);
        updateWorkflow(wf);

        markAsSaved();
        setMetaOpen(false);
        notify.successDialog("Workflow updated", [
          "Your workflow has been updated successfully.",
        ]);
      } else {
        // CREATE new workflow
        const result = await workflowApiService.createWorkflowBuilder(
          workflowPayload
        );
        const newWorkflowData = result.data;
        const { workflow: wf } = transformBackendWorkflowDetailed(newWorkflowData);

        setOriginalBackendWorkflow(newWorkflowData);
        updateWorkflow(wf);

        const newId = extractMongoId(newWorkflowData?._id);
        if (newId) {
          window.history.replaceState(
            null,
            "",
            `/workflows/builder?id=${newId}`
          );
        }

        markAsSaved();
        setMetaOpen(false);
        notify.successDialog("Workflow created", [
          "Your workflow has been saved successfully.",
        ]);
      }
    } catch (error) {
      console.error("Failed to save workflow:", error);
      notify.error(
        "Save failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleDeliverySave = () => {
    // Real persistence happens when the user clicks Save on the main toolbar.
    // Here we just close the sheet and remind the user.
    setScheduleDeliveryOpen(false);
    notify.success("Schedule updated", "Save the workflow to persist these changes.");
  };

  const handleLoad = () => {
    document
      .querySelector<HTMLInputElement>(
        'input[type="file"][accept="application/json"]'
      )
      ?.click();
  };

  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const looksLikeUi =
        Array.isArray(json?.nodes) && Array.isArray(json?.connections);
      if (looksLikeUi) {
        const importedNodes = (json.nodes as WorkflowNode[]).map((n) => ({
          ...n,
        }));
        const importedConnections = Array.isArray(json.connections)
          ? json.connections
          : [];
        setNodes(importedNodes);
        setConnections(importedConnections);
        notify.success("Imported", "Workflow JSON imported successfully");
        return;
      }
      if (json && Array.isArray(json.nodes)) {
        const {
          workflow: wf,
          nodes: wfNodes,
          connections: wfConnections,
        } = transformBackendWorkflowDetailed(json);
        updateWorkflow(wf);
        setNodes(wfNodes);
        setConnections(wfConnections);
        notify.success(
          "Imported",
          "Backend workflow JSON transformed and imported"
        );
        return;
      }
      throw new Error("Unsupported JSON format");
    } catch (err) {
      console.error("Import failed:", err);
      notify.error(
        "Import failed",
        err instanceof Error ? err.message : "Invalid JSON"
      );
    }
  };

  const handleExportJson = () => {
    try {
      const payload =
        !hasUnsavedChanges && originalBackendWorkflow
          ? (() => {
              const orig = originalBackendWorkflow;
              const nodesTrimmed = Array.isArray(orig.nodes)
                ? orig.nodes.map((n) => ({
                    node_id: n.node_id,
                    node_type: n.node_type,
                    parameters: n.parameters,
                  }))
                : [];
              return {
                _id: orig._id,
                workflow_id: orig.workflow_id,
                job_id: orig.job_id,
                job_name: orig.job_name,
                status: orig.status,
                created_at: orig.created_at,
                updated_at: orig.updated_at,
                schedule_expression: orig.schedule_expression,
                nodes: nodesTrimmed,
                ...(orig.connections ? { connections: orig.connections } : {}),
              };
            })()
          : (() => {
              const strictWorkflow = normalizeWorkflowPayload(
                originalBackendWorkflow || null,
                nodes,
                connections
              );
              return {
                _id: strictWorkflow._id,
                workflow_id: strictWorkflow.workflow_id,
                job_id: strictWorkflow.job_id,
                job_name: strictWorkflow.job_name,
                status: strictWorkflow.status,
                created_at: strictWorkflow.created_at,
                updated_at: strictWorkflow.updated_at,
                schedule_expression: strictWorkflow.schedule_expression,
                nodes: strictWorkflow.nodes,
                ...(strictWorkflow.connections
                  ? { connections: strictWorkflow.connections }
                  : {}),
              };
            })();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const fileName = `${(originalBackendWorkflow?.name || "workflow").replace(
        /\s+/g,
        "_"
      )}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      notify.error(
        "Export failed",
        err instanceof Error ? err.message : "Unknown error"
      );
    }
  };

  // Loading state - show minimal spinner without re-rendering entire page
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-surface-secondary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-sm text-text-secondary">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-surface-secondary">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-error rounded-sm">
            <AlertTriangle className="text-text-inverse w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-text-primary">
            Failed to Load Workflow
          </h2>
          <p className="mb-6 text-text-secondary">{error}</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => window.location.reload()} variant="primary">
              Try Again
            </Button>
            <Button onClick={() => navigate("/workflows")} variant="secondary">
              Back to Workflows
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-secondary">
      {/* Background layer */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-surface-secondary" />

      <div className="relative z-10 flex flex-col h-full">
        <Toolbar
          workflow={{
            id: extractMongoId(originalBackendWorkflow?._id) || "temp",
            name: originalBackendWorkflow?.job_name || "New Workflow",
            description: originalBackendWorkflow?.description || "",
            nodes: nodes,
            connections: connections,
            isActive:
              originalBackendWorkflow?.status === WorkflowStatus.ACTIVE ||
              false,
            schedule:
              originalBackendWorkflow?.schedule_expression || "0 0 * * *",
            status: (originalBackendWorkflow?.status as WorkflowStatus) || WorkflowStatus.ACTIVE,
            createdAt: originalBackendWorkflow?.created_at || new Date().toISOString(),
            updatedAt: originalBackendWorkflow?.updated_at || new Date().toISOString(),
          }}
          onExecute={handleExecute}
          onSave={handleSave}
          onSettings={() => setMetaOpen(true)}
          onScheduleDelivery={() => setScheduleDeliveryOpen(true)}
          executing={executing}
          saving={saving}
          hasUnsavedChanges={hasUnsavedChanges}
          lastSavedAt={lastSavedAt}
          onLoad={handleLoad}
          onImport={handleImportJson}
          onExportJson={handleExportJson}
          leftSidebarCollapsed={leftSidebarCollapsed}
          onToggleLeftSidebar={handleToggleLeftSidebar}
          rightSidebarCollapsed={rightSidebarCollapsed}
          onToggleRightSidebar={handleToggleRightSidebar}
          onToggleHistory={() => setHistoryPanelOpen((prev) => !prev)}
          historyOpen={historyPanelOpen}
          isDebugMode={!!debugExecution}
          isRetrying={isRetrying}
          onRetryExecution={
            debugExecution
              ? () => handleRetryExecution(debugExecution.execution_id)
              : undefined
          }
          onExitDebugMode={handleExitDebugMode}
        />

        <div
          className={cn(
            "flex flex-1 overflow-hidden p-4 gap-4 relative",
            isMobile && "flex-col p-2 gap-2"
          )}
        >
          {/* Left Sidebar - Node Types */}
          <div
            className={cn(
              "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-width",
              isMobile ? (leftSidebarCollapsed ? "h-12" : "h-64") : "h-full",
              leftSidebarCollapsed ? "w-12" : "w-[280px]"
            )}
          >
            <div
              className="h-full w-full overflow-hidden bg-surface-primary border border-border rounded-sm"
            >
              <Sidebar
                onNodeDragStart={() => {}}
                isCollapsed={leftSidebarCollapsed}
                onToggleCollapse={handleToggleLeftSidebar}
                isMobile={isMobile}
              />
            </div>
          </div>

          {/* Main Canvas */}
          <div
            ref={canvasRef}
            className="flex-1 overflow-hidden relative bg-surface-secondary border border-border rounded-sm"
          >
            <ReactFlowCanvas
              nodes={Array.isArray(nodes) ? nodes : []}
              connections={Array.isArray(connections) ? connections : []}
              onNodesChange={handleNodesChange}
              onConnectionsChange={handleConnectionsChange}
              onNodeSelect={() => {}}
              onNodeOpenEditor={debugExecution ? undefined : (n) => setEditorNode(n)}
              isMobile={isMobile}
              pinnedNodeInstanceIds={pinnedNodeInstanceIds}
              previewedNodeIds={previewedNodeIds}
              onPinNode={debugExecution ? undefined : handlePinNode}
              onUnpinNode={debugExecution ? undefined : handleUnpinNode}
              stepRunStatusMap={debugExecution ? undefined : stepRunStatusMap}
              onStepRunNode={debugExecution ? undefined : handleStepRunNode}
              debugNodeMap={debugNodeMap}
              onDebugInspectNode={debugExecution ? handleDebugInspectNode : undefined}
            />
            {/* Execution Log Panel */}
            <Suspense fallback={null}>
              <ExecutionLogPanel
                workflowId={extractMongoId(originalBackendWorkflow?._id) || docId}
                executing={executing}
                onExecutionComplete={stopExecuting}
              />
            </Suspense>

            {/* Execution History Panel — absolute overlay inside canvas area */}
            <Suspense fallback={null}>
              <ExecutionHistoryPanel
                workflowId={workflowId}
                isOpen={historyPanelOpen}
                onClose={() => setHistoryPanelOpen(false)}
                onLoadExecution={(detail: ExecutionDetail) => {
                  enterDebugMode(detail);
                  setDebugInspectNode(null);
                }}
                activeExecutionId={debugExecution?.execution_id ?? null}
                onRetry={handleRetryExecution}
                isRetrying={isRetrying}
              />
            </Suspense>
          </div>

          {/* Node Configuration Panel - n8n-inspired full-screen panel */}
          {editorNode && (
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>}>
              <NodeConfigPanel
                node={editorNode}
                onUpdate={handleNodeUpdate}
                onClose={() => setEditorNode(null)}
                executionStatus={editorNode.status === 'running' ? 'running' : editorNode.status === 'success' ? 'success' : editorNode.status === 'error' ? 'error' : 'idle'}
                onPreview={(nodeId) => {
                  setPreviewNodeId(nodeId);
                  setEditorNode(null);
                }}
              />
            </Suspense>
          )}

          {/* Workflow Settings Modal */}
          {metaOpen && (
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50"><Loader2 className="w-6 h-6 animate-spin text-text-inverse" /></div>}>
              <WorkflowMetaForm
                initial={{
                  _id: extractMongoId(originalBackendWorkflow?._id),
                  job_name: originalBackendWorkflow?.job_name || "",
                  status: (originalBackendWorkflow?.status as WorkflowStatus) || WorkflowStatus.ACTIVE,
                  schedule_expression:
                    originalBackendWorkflow?.schedule_expression || "0 0 * * *",
                }}
                onSubmit={handleMetaSubmit}
                onCancel={() => setMetaOpen(false)}
                hasUnsavedChanges={hasUnsavedChanges}
              />
            </Suspense>
          )}

          {/* Schedule & Delivery Sheet */}
          <Suspense fallback={null}>
            <ScheduleDeliverySheet
              isOpen={scheduleDeliveryOpen}
              onClose={() => setScheduleDeliveryOpen(false)}
              workflowId={extractMongoId(originalBackendWorkflow?._id) || docId}
              scheduleExpression={originalBackendWorkflow?.schedule_expression || "0 0 * * *"}
              scheduleEnabled={scheduleEnabled}
              deliveryConfig={deliveryConfig}
              onScheduleChange={(cron) => {
                updateWorkflow({ schedule_expression: cron });
              }}
              onScheduleEnabledChange={setScheduleEnabled}
              onDeliveryConfigChange={setDeliveryConfig}
              onSave={handleScheduleDeliverySave}
              isSaving={saving}
              errorWorkflowId={errorWorkflowId}
              onErrorWorkflowChange={(id) => {
                setErrorWorkflowId(id);
                updateWorkflow({ error_workflow_id: id ?? undefined });
              }}
            />
          </Suspense>

          {/* Data Preview Panel — preview mode (opened from NodeConfigPanel) */}
          {previewNodeId && (
            <Suspense fallback={null}>
              <PreviewPanel
                nodeId={previewNodeId}
                isOpen={!!previewNodeId}
                onClose={() => setPreviewNodeId(null)}
                source="preview"
                onPreviewSuccess={useWorkflowStore.getState().cachePreviewResult}
              />
            </Suspense>
          )}

          {/* Data Preview Panel — step-run mode (opened by Play button on node) */}
          {stepRunNodeId && !previewNodeId && (
            <Suspense fallback={null}>
              <PreviewPanel
                nodeId={stepRunNodeId}
                isOpen={!!stepRunNodeId}
                onClose={() => {
                  setStepRunNodeId(null);
                  setStepRunResult(null);
                  setAutoPinChecked(false);
                }}
                source="step-run"
                stepRunResult={stepRunResult}
                canAutoPin={
                  !!stepRunResult && !stepRunResult.error_message
                }
                autoPinChecked={autoPinChecked}
                onAutoPinChange={handleAutoPinChange}
              />
            </Suspense>
          )}

          {/* Data Preview Panel — debug mode (opened by double-clicking a node in debug view) */}
          {debugInspectNode && !previewNodeId && !stepRunNodeId && (
            <Suspense fallback={null}>
              <PreviewPanel
                nodeId={debugInspectNode.id}
                isOpen={!!debugInspectNode}
                onClose={() => setDebugInspectNode(null)}
                source="debug"
                debugResult={debugPreviewResult}
              />
            </Suspense>
          )}


        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilderPage;
