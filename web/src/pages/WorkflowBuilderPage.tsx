import React, { useState, useEffect, useCallback, lazy, Suspense, useRef } from "react";
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
import { useWorkflowEvents } from "../hooks/useWorkflowEvents";
import { WorkflowData, MongoId, BackendWorkflow } from "../types/backend";
import { prefetchWorkflowNodeData } from "../services/nodeDataPrefetch";

// Lazy load heavy components (modals and panels)
const ExecutionLogPanel = lazy(() => import("../components/workflow/ExecutionLogPanel").then(m => ({ default: m.ExecutionLogPanel })));
const WorkflowMetaForm = lazy(() => import("../components/forms/WorkflowMetaForm").then(m => ({ default: m.WorkflowMetaForm })));
const NodeConfigPanel = lazy(() => import("../components/workflow/node-config/NodeConfigPanel").then(m => ({ default: m.NodeConfigPanel })));

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

// Helper to extract MongoDB ID from MongoId type
const extractMongoId = (id: MongoId | undefined): string | undefined => {
  if (!id) return undefined;
  if (typeof id === 'string') return id;
  if (typeof id === 'object' && '$oid' in id) return id.$oid;
  return undefined;
};

const useResponsiveLayout = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth < 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { isMobile, isTablet };
};

// -------- Auto-layout helper (grouped flow layout) --------
// Groups sources with their destinations, creating a compact flow-based layout
type NodeType = "source" | "transform" | "destination" | string;

interface LayoutOpts {
  canvasWidth: number;
  canvasHeight: number;
  nodeWidth?: number;
  nodeHeight?: number;
  minGapX?: number;
  minGapY?: number;
  groupGapY?: number;
  margin?: number;
  order?: NodeType[];
}

const autoLayoutDynamic = (
  list: WorkflowNode[],
  opts: LayoutOpts
): WorkflowNode[] => {
  if (!Array.isArray(list) || list.length === 0) return list;

  const {
    nodeWidth = 200,
    nodeHeight = 80,
    minGapX = 120,
    minGapY = 30,
    groupGapY = 60,
    margin = 60,
  } = opts;

  // Separate nodes by type
  const sources = list.filter(n => n.type === 'source');
  const transforms = list.filter(n => n.type === 'transform');
  const destinations = list.filter(n => n.type === 'destination');

  const result: WorkflowNode[] = [];
  let currentY = margin;

  // For each source, create a group with its connected destinations
  sources.forEach((source, sourceIdx) => {
    // Find transforms and destinations (for now, distribute evenly)
    // Each source gets its share of destinations
    const destsPerSource = Math.ceil(destinations.length / Math.max(sources.length, 1));
    const startDestIdx = sourceIdx * destsPerSource;
    const sourceDestinations = destinations.slice(startDestIdx, startDestIdx + destsPerSource);

    // Calculate group height based on max of source side vs destination side
    const destCount = sourceDestinations.length || 1;
    const groupHeight = Math.max(nodeHeight, destCount * nodeHeight + (destCount - 1) * minGapY);

    // Position source - vertically centered in the group
    const sourceY = currentY + (groupHeight - nodeHeight) / 2;
    result.push({ ...source, position: { x: margin, y: sourceY } });

    // Position destinations - stacked vertically, aligned to the right
    const destX = margin + nodeWidth + minGapX;
    const destStartY = currentY + (groupHeight - (destCount * nodeHeight + (destCount - 1) * minGapY)) / 2;

    sourceDestinations.forEach((dest, destIdx) => {
      const destY = destStartY + destIdx * (nodeHeight + minGapY);
      result.push({ ...dest, position: { x: destX, y: destY } });
    });

    // Move to next group
    currentY += groupHeight + groupGapY;
  });

  // Handle any remaining destinations not assigned to sources
  const assignedDestCount = sources.length * Math.ceil(destinations.length / Math.max(sources.length, 1));
  const remainingDests = destinations.slice(assignedDestCount);
  remainingDests.forEach((dest, idx) => {
    result.push({
      ...dest,
      position: { x: margin + nodeWidth + minGapX, y: currentY + idx * (nodeHeight + minGapY) }
    });
  });

  // Handle transforms (place between sources and destinations if present)
  if (transforms.length > 0) {
    const transformX = margin + (nodeWidth + minGapX) / 2;
    transforms.forEach((transform, idx) => {
      result.push({
        ...transform,
        position: { x: transformX, y: margin + idx * (nodeHeight + minGapY) }
      });
    });
  }

  // Handle orphan sources (sources without any destinations to pair with)
  if (sources.length === 0 && destinations.length > 0) {
    destinations.forEach((dest, idx) => {
      result.push({
        ...dest,
        position: { x: margin, y: margin + idx * (nodeHeight + minGapY) }
      });
    });
  }

  return result;
};

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

  // Real-time status updates
  const workflowId = originalBackendWorkflow?.job_id || docId;
  useWorkflowEvents(workflowId);

  // Separate selection from editor modal
  const [, setSelectedNodeId] = useState<string | null>(null);
  const [editorNode, setEditorNode] = useState<WorkflowNode | null>(null);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!!docId); // Only show loading if we have a docId to fetch
  const [bootstrapped, setBootstrapped] = useState(false); // Track if bootstrap has run
  const { notify } = useNotification();
  const [metaOpen, setMetaOpen] = useState(false);

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

  function useElementSize<T extends HTMLElement>() {
    const ref = React.useRef<T | null>(null);
    const [rect, setRect] = React.useState({ width: 0, height: 0 });

    React.useLayoutEffect(() => {
      if (!ref.current) return;
      const el = ref.current;
      const ro = new ResizeObserver(([entry]) => {
        const cr = entry.contentRect;
        setRect({ width: cr.width, height: cr.height });
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    return { ref, ...rect } as const;
  }

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
            const layoutedTemplateNodes = layoutNodes(templateNodes);
            setNodes(layoutedTemplateNodes);
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

  const handleExecute = async () => {
    try {
      const id = extractMongoId(originalBackendWorkflow?._id) || originalBackendWorkflow?.job_id;
      if (!id) {
        notify.error(
          "Execute failed",
          "Workflow has no job_id. Please save first."
        );
        return;
      }

      // Show blocking modal during API call and until first status update
      setTriggering(true);

      // Reset all node statuses to 'pending' before execution
      setNodes((prevNodes) =>
        prevNodes.map((node) => ({
          ...node,
          status: "pending" as const,
        }))
      );

      // Execute workflow - wait for trigger API to complete
      await workflowApiService.executeWorkflow(id);

      // Start tracking execution status (modal will close when first node status changes)
      setExecuting(true);

      // Note: setTriggering(false) will be called by useEffect when first node starts running
      // Note: setExecuting(false) will be called by the useEffect monitoring node completion
    } catch (err) {
      console.error("Failed to execute workflow:", err);
      notify.error(
        "Execute failed",
        err instanceof Error ? err.message : "Unknown error"
      );
      setTriggering(false);
      setExecuting(false);
    }
  };

  // Close triggering modal when first node starts running
  useEffect(() => {
    if (!triggering) return;

    // Check if any node has started (status changed from pending to running/success/error)
    const hasStartedNode = nodes.some(
      (node) => node.status === "running" || node.status === "success" || node.status === "error"
    );

    if (hasStartedNode) {
      setTriggering(false);
    }
  }, [nodes, triggering]);

  // Timeout for triggering - fail if no response within 1 minute
  useEffect(() => {
    if (!triggering) return;

    const timeoutId = setTimeout(() => {
      // Still triggering after 1 minute = failed
      setTriggering(false);
      setExecuting(false);
      notify.error(
        "Triggered failed",
        "Workflow did not start within 1 minute. Please try again."
      );
    }, 60000); // 1 minute timeout

    return () => clearTimeout(timeoutId);
  }, [triggering, notify]);

  // Monitor node status changes and stop spinning when all destinations complete
  useEffect(() => {
    if (!executing) return;

    const destinationNodes = nodes.filter(
      (node) => node.type === "destination"
    );

    // If no destination nodes, stop executing immediately
    if (destinationNodes.length === 0) {
      setExecuting(false);
      return;
    }

    // Check if all destination nodes have completed (success or error)
    const allDestinationsComplete = destinationNodes.every(
      (node) => node.status === "success" || node.status === "error"
    );

    if (allDestinationsComplete) {
      setExecuting(false);
    }
  }, [nodes, executing]);

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
              onNodeSelect={(n) => setSelectedNodeId(n ? n.id : null)}
              onNodeOpenEditor={(n) => setEditorNode(n)}
              isMobile={isMobile}
            />
            {/* Execution Log Panel */}
            <Suspense fallback={null}>
              <ExecutionLogPanel
                workflowId={extractMongoId(originalBackendWorkflow?._id) || docId}
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

          {/* Triggering Modal - Blocks user interaction during Cloud Run head-up */}
          {triggering && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/60">
              <div className="p-8 flex flex-col items-center gap-4 bg-surface-primary border-2 border-primary-600 rounded-sm">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                <p className="text-lg font-medium text-text-primary">Triggering...</p>
                <p className="text-sm text-text-secondary">Starting workflow execution</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilderPage;
