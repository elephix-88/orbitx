// src/components/workflow/node-config/NodeConfigPanel.tsx
// OrbitX Unique Node Configuration Panel - Clean, focused design
import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Play,
  Settings2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Zap,
  Database,
  ArrowRight,
  Sparkles,
  Code2,
  Info,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowNode } from '@/types/workflow';
import { getNodeSpecByDisplayName, getNodeSpec } from '@/workflow/registry';
import { motion, AnimatePresence } from 'framer-motion';
import { getNodeIcon } from '@/components/icons/BrandIcons';

/**
 * Generates a descriptive display name for a node based on its configuration.
 * Uses the node spec's generateDisplayName function if available.
 */
function generateNodeDisplayName(node: WorkflowNode, data: Record<string, unknown>): string | undefined {
  const spec = getNodeSpecByDisplayName(node.name) || (node.definitionId ? getNodeSpec(node.definitionId) : undefined);
  if (spec?.generateDisplayName) {
    return spec.generateDisplayName(data);
  }
  return undefined;
}

// Types
type TabId = 'parameters' | 'settings' | 'docs';

interface NodeConfigPanelProps {
  node: WorkflowNode;
  onUpdate: (node: WorkflowNode) => void;
  onClose: () => void;
  onExecuteNode?: () => void;
  isExecuting?: boolean;
  executionStatus?: 'idle' | 'running' | 'success' | 'error';
  onPreview?: (nodeId: string) => void;
}

// Panel Header with Node Info
const PanelHeader: React.FC<{
  node: WorkflowNode;
  onClose: () => void;
  onExecute?: () => void;
  isExecuting?: boolean;
  executionStatus?: 'idle' | 'running' | 'success' | 'error';
  onPreview?: () => void;
}> = ({ node, onClose, onExecute, isExecuting, executionStatus, onPreview }) => {
  const spec = getNodeSpecByDisplayName(node.name) || (node.definitionId ? getNodeSpec(node.definitionId) : undefined);

  const statusIcon = useMemo(() => {
    switch (executionStatus) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-brand-500" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  }, [executionStatus]);

  const getNodeTypeColor = () => {
    switch (node.type) {
      case 'source':
        return 'from-emerald-500 to-teal-600';
      case 'transform':
        return 'from-purple-500 to-indigo-600';
      case 'destination':
        return 'from-orange-500 to-rose-600';
      default:
        return 'from-brand-500 to-purple-600';
    }
  };

  const getNodeTypeIcon = () => {
    // Try to get platform-specific icon from spec's typeId
    if (spec?.typeId) {
      const platformIcon = getNodeIcon(spec.typeId, 28);
      if (platformIcon) return platformIcon;
    }
    // Fallback to generic icons by node type
    switch (node.type) {
      case 'source':
        return <Database className="w-5 h-5" />;
      case 'transform':
        return <Code2 className="w-5 h-5" />;
      case 'destination':
        return <ArrowRight className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  const getNodeTypeBadge = () => {
    switch (node.type) {
      case 'source':
        return { label: 'Source', color: 'bg-emerald-500/10 text-emerald-400' };
      case 'transform':
        return { label: 'Transform', color: 'bg-purple-500/10 text-purple-400' };
      case 'destination':
        return { label: 'Destination', color: 'bg-orange-500/10 text-orange-400' };
      default:
        return { label: 'Node', color: 'bg-neutral-500/10 text-text-secondary' };
    }
  };

  const badge = getNodeTypeBadge();

  // Check if we have a platform-specific icon
  const hasPlatformIcon = spec?.typeId && getNodeIcon(spec.typeId, 28) !== null;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
            hasPlatformIcon
              ? "bg-surface-secondary" // Neutral background for platform logos
              : cn("text-white bg-gradient-to-br", spec?.color ? '' : getNodeTypeColor())
          )}
          style={!hasPlatformIcon && spec?.color ? { background: `linear-gradient(135deg, ${spec.color}, ${spec.color}dd)` } : undefined}
        >
          {getNodeTypeIcon()}
        </div>

        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-text-primary">
              {node.name}
            </h2>
            {statusIcon}
          </div>
          {/* Show alias below the main name if set */}
          {node.display_name && (
            <p className="text-sm text-text-secondary mt-0.5">
              {node.display_name}
            </p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", badge.color)}>
              {badge.label}
            </span>
            {spec?.typeId && (
              <span className="text-xs text-text-tertiary">
                {spec.typeId}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onPreview && (
          <button
            onClick={onPreview}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              "bg-surface-secondary border border-border text-text-primary",
              "hover:bg-surface-tertiary"
            )}
          >
            <Eye className="w-4 h-4" />
            <span>Preview</span>
          </button>
        )}

        {onExecute && (
          <button
            onClick={onExecute}
            disabled={isExecuting}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              "bg-primary-400 text-neutral-950",
              "hover:bg-primary-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "shadow-md shadow-primary-400/20 hover:shadow-lg hover:shadow-primary-400/30"
            )}
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>Test Node</span>
          </button>
        )}

        <button
          onClick={onClose}
          className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// Tab Navigation - Pill style
const TabNavigation: React.FC<{
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasErrors?: boolean;
}> = ({ activeTab, onTabChange, hasErrors }) => {
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'parameters', label: 'Parameters', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings2 className="w-4 h-4" /> },
    { id: 'docs', label: 'Documentation', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="px-6 py-3 border-b border-border">
      <div className="flex items-center gap-1 p-1 bg-surface-secondary rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
              activeTab === tab.id
                ? "bg-surface-primary text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.id === 'parameters' && hasErrors && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// Main Node Configuration Panel
export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  node,
  onUpdate,
  onClose,
  onExecuteNode,
  isExecuting = false,
  executionStatus = 'idle',
  onPreview,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('parameters');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [pendingData, setPendingData] = useState<Record<string, unknown>>(node.data || {});
  // Local state for settings tab to avoid re-rendering parent on every keystroke
  // display_name is the alias (custom name), name is the actual node type
  const [pendingDisplayName, setPendingDisplayName] = useState(node.display_name || '');
  const [pendingDescription, setPendingDescription] = useState(node.description || '');
  const [pendingContinueOnFail, setPendingContinueOnFail] = useState(node.continueOnFail ?? false);
  const [pendingRetryOnFail, setPendingRetryOnFail] = useState(node.retryOnFail ?? false);

  // Use definitionId to find spec (more reliable than name which can be customized)
  const spec = node.definitionId ? getNodeSpec(node.definitionId) : getNodeSpecByDisplayName(node.name);

  const handleDataChange = useCallback((newData: Record<string, unknown>) => {
    setPendingData(newData);
  }, []);

  const handleSave = useCallback(() => {
    // Auto-generate descriptive display_name if not manually set
    let display_name = pendingDisplayName.trim();
    if (!display_name) {
      // If no alias set, try to auto-generate from config
      const generatedName = generateNodeDisplayName(node, pendingData);
      if (generatedName && generatedName !== node.name) {
        display_name = generatedName;
      }
    }

    // Calculate dynamic ports if spec supports it (e.g., BigQuery destination with enable_output)
    let inputs = node.inputs;
    let outputs = node.outputs;
    if (spec?.getDynamicPorts) {
      const dynamicPorts = spec.getDynamicPorts(pendingData);
      inputs = dynamicPorts
        .filter((p) => p.io === 'input')
        .map((p) => ({ id: p.id, name: p.name }));
      outputs = dynamicPorts
        .filter((p) => p.io === 'output')
        .map((p) => ({ id: p.id, name: p.name }));
    }

    // Build the updated node with all pending changes
    const updatedNode = {
      ...node,
      data: pendingData,
      display_name: display_name || undefined, // Only set if there's a value
      description: pendingDescription,
      continueOnFail: pendingContinueOnFail,
      retryOnFail: pendingRetryOnFail,
      inputs,
      outputs,
    };

    onUpdate(updatedNode);
    onClose();
  }, [node, pendingData, pendingDisplayName, pendingDescription, pendingContinueOnFail, pendingRetryOnFail, onUpdate, onClose, spec]);

  const handleValidate = useCallback((valid: boolean, errors: string[]) => {
    setIsValid(valid);
    setValidationErrors(errors);
  }, []);

  const Editor = spec?.ui.editor as React.ComponentType<{
    nodeId: string;
    data: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
    onClose: () => void;
    onValidate?: (valid: boolean, errors: string[]) => void;
    compact?: boolean;
  }>;

  const panelContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel - Fixed size regardless of content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative z-10 w-full max-w-3xl flex flex-col",
          "h-[85vh] sm:h-[80vh]", // Fixed height
          "bg-surface-primary rounded-2xl shadow-2xl",
          "border border-border",
          "overflow-hidden"
        )}
      >
        <PanelHeader
          node={node}
          onClose={onClose}
          onExecute={onExecuteNode}
          isExecuting={isExecuting}
          executionStatus={executionStatus}
          onPreview={onPreview ? () => onPreview(node.id) : undefined}
        />

        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasErrors={validationErrors.length > 0}
        />

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'parameters' && (
              <motion.div
                key="parameters"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="h-full overflow-y-auto"
              >
                <div className="p-6">
                  {spec && Editor ? (
                    <Editor
                      nodeId={node.id}
                      data={pendingData}
                      onChange={handleDataChange}
                      onClose={onClose}
                      onValidate={handleValidate}
                      compact
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-surface-secondary flex items-center justify-center mb-4">
                        <Settings2 className="w-8 h-8 text-text-tertiary" />
                      </div>
                      <p className="text-sm text-text-secondary">
                        No configuration available for this node type.
                      </p>
                    </div>
                  )}

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <div className="mt-6 p-4 bg-red-900/20 border border-red-800/50 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-red-300 mb-2">
                            Please fix the following issues:
                          </h4>
                          <ul className="text-sm text-red-400 space-y-1">
                            {validationErrors.map((error, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="h-full overflow-y-auto"
              >
                <div className="p-6 space-y-6">
                  {/* Node Alias */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-secondary">
                      Alias
                      <span className="ml-2 text-xs font-normal text-text-tertiary">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={pendingDisplayName}
                      onChange={(e) => setPendingDisplayName(e.target.value)}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl text-sm transition-all",
                        "bg-surface-secondary border border-border",
                        "focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400",
                        "placeholder:text-text-tertiary"
                      )}
                      placeholder={`e.g., "${node.name} - Campaign Data"`}
                    />
                    <p className="text-xs text-text-tertiary">
                      Custom name shown on the node. Leave empty to auto-generate from configuration.
                    </p>
                  </div>

                  {/* Node Description */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-secondary">
                      Description
                      <span className="ml-2 text-xs font-normal text-text-tertiary">(optional)</span>
                    </label>
                    <textarea
                      value={pendingDescription}
                      onChange={(e) => setPendingDescription(e.target.value)}
                      rows={3}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl text-sm transition-all resize-none",
                        "bg-surface-secondary border border-border",
                        "focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400",
                        "placeholder:text-text-tertiary"
                      )}
                      placeholder="Add a description to help you remember what this node does..."
                    />
                  </div>

                  {/* Execution Settings */}
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-brand-500" />
                      Execution Behavior
                    </h3>

                    <div className="space-y-4">
                      <label className="flex items-start gap-4 p-4 bg-surface-secondary rounded-xl cursor-pointer hover:bg-surface-tertiary transition-colors">
                        <input
                          type="checkbox"
                          checked={pendingContinueOnFail}
                          onChange={(e) => setPendingContinueOnFail(e.target.checked)}
                          className="mt-0.5 w-5 h-5 rounded border-border text-primary-400 focus:ring-primary-400/30"
                        />
                        <div>
                          <span className="text-sm font-medium text-text-secondary block">
                            Continue on Failure
                          </span>
                          <p className="text-xs text-text-secondary mt-1">
                            If this node fails, the workflow will continue executing subsequent nodes instead of stopping.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-4 p-4 bg-surface-secondary rounded-xl cursor-pointer hover:bg-surface-tertiary transition-colors">
                        <input
                          type="checkbox"
                          checked={pendingRetryOnFail}
                          onChange={(e) => setPendingRetryOnFail(e.target.checked)}
                          className="mt-0.5 w-5 h-5 rounded border-border text-primary-400 focus:ring-primary-400/30"
                        />
                        <div>
                          <span className="text-sm font-medium text-text-secondary block">
                            Retry on Failure
                          </span>
                          <p className="text-xs text-text-secondary mt-1">
                            Automatically retry this node up to 3 times if it fails before marking as failed.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'docs' && (
              <motion.div
                key="docs"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="h-full overflow-y-auto"
              >
                <div className="p-6">
                  {/* Node Info Card */}
                  <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-primary-400/10 to-purple-900/20 border border-primary-400/20 rounded-2xl mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary-400/10 flex items-center justify-center flex-shrink-0">
                      <Info className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-primary-300 mb-1">
                        About {node.name}
                      </h4>
                      <p className="text-sm text-text-secondary">
                        {spec?.typeId ? `Node Type: ${spec.typeId}` : 'Standard workflow node'}
                      </p>
                    </div>
                  </div>

                  {/* Documentation based on node type */}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {node.type === 'source' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-900/20 rounded-xl border border-emerald-800/30">
                          <h3 className="text-base font-semibold text-emerald-100 mb-2 flex items-center gap-2">
                            <Database className="w-5 h-5" />
                            Source Node
                          </h3>
                          <p className="text-sm text-emerald-300">
                            Source nodes extract data from external services, APIs, or databases. The data flows to connected transform or destination nodes in your workflow.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-text-primary">Key Features</h4>
                          <ul className="text-sm text-text-secondary space-y-2">
                            <li className="flex items-start gap-2">
                              <ChevronRight className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                              Connects to external data sources securely
                            </li>
                            <li className="flex items-start gap-2">
                              <ChevronRight className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                              Supports incremental data loading where available
                            </li>
                            <li className="flex items-start gap-2">
                              <ChevronRight className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                              Outputs structured records to downstream nodes
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {node.type === 'transform' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-900/20 rounded-xl border border-purple-800/30">
                          <h3 className="text-base font-semibold text-purple-100 mb-2 flex items-center gap-2">
                            <Code2 className="w-5 h-5" />
                            Transform Node
                          </h3>
                          <p className="text-sm text-purple-300">
                            Transform nodes modify, filter, aggregate, or reshape data as it flows through your workflow. They receive input from upstream nodes and output processed data.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-text-primary">Common Operations</h4>
                          <ul className="text-sm text-text-secondary space-y-2">
                            <li className="flex items-start gap-2">
                              <ChevronRight className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                              Filter records based on conditions
                            </li>
                            <li className="flex items-start gap-2">
                              <ChevronRight className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                              Rename or map fields to new schemas
                            </li>
                            <li className="flex items-start gap-2">
                              <ChevronRight className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                              Join data from multiple sources
                            </li>
                            <li className="flex items-start gap-2">
                              <ChevronRight className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                              Run SQL queries for complex transformations
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {node.type === 'destination' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-orange-900/20 rounded-xl border border-orange-800/30">
                          <h3 className="text-base font-semibold text-orange-100 mb-2 flex items-center gap-2">
                            <ArrowRight className="w-5 h-5" />
                            Destination Node
                          </h3>
                          <p className="text-sm text-orange-300">
                            Destination nodes load processed data into external systems like databases, data warehouses, spreadsheets, or cloud services.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-text-primary">Supported Destinations</h4>
                          <ul className="text-sm text-text-secondary space-y-2">
                            <li className="flex items-start gap-2">
                              <ChevronRight className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                              BigQuery data warehouse
                            </li>
                            <li className="flex items-start gap-2">
                              <ChevronRight className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                              MySQL / PostgreSQL databases
                            </li>
                            <li className="flex items-start gap-2">
                              <ChevronRight className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                              Google Sheets for reports
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer with Save/Cancel buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary">
          <button
            onClick={onClose}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
              "text-text-secondary",
              "hover:bg-surface-tertiary",
              "border border-border"
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
              "bg-primary-400 text-neutral-950",
              "hover:bg-primary-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "shadow-md shadow-primary-400/20 hover:shadow-lg hover:shadow-primary-400/30"
            )}
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(panelContent, document.body);
};

export default NodeConfigPanel;
