import React, { useState, useEffect, useMemo, useCallback } from 'react';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import { useWorkflowStore } from '@/store/workflowStore';
import { findUpstreamNodes, inferColumnsFromNode } from '@/utils/upstreamColumns';
import { Select } from '@/components/shared/form/Select';
import { GripVertical, ArrowRight, Database, Columns3, Crown, Plus, X, GitMerge } from 'lucide-react';
import { cn } from '@/lib/utils';

// dnd-kit imports
import {
 DndContext,
 closestCenter,
 KeyboardSensor,
 PointerSensor,
 useSensor,
 useSensors,
 DragEndEvent,
 DragStartEvent,
 DragOverlay,
} from '@dnd-kit/core';
import {
 arrayMove,
 SortableContext,
 sortableKeyboardCoordinates,
 useSortable,
 verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type JoinType = 'inner' | 'left' | 'right' | 'outer';

// Key pair for multi-key joins
interface JoinKeyPair {
 left: string;
 right: string;
}

interface JoinSource {
 node_id: number;
 key?: string; // Legacy single-key
 keys?: JoinKeyPair[]; // Multi-key support
 join_type: JoinType;
}

interface JoinConfig {
 base_node_id: number;
 base_key?: string; // Legacy single-key
 base_keys?: string[]; // Multi-key support
 sources: JoinSource[];
 suffixes?: [string, string];
}

type JoinEditorProps = {
 nodeId?: string;
 onClose: () => void;
 setSelectedNode?: (node: null) => void;
 data?: Record<string, unknown>;
 onChange?: (data: Record<string, unknown>) => void;
 onDeleteNode?: () => void;
 onValidate?: (valid: boolean, errors: string[]) => void;
 /** When true, renders only the form without BaseEditorWrapper */
 compact?: boolean;
};

const JOIN_TYPES: { value: JoinType; label: string; description: string; color: string; bgColor: string }[] = [
 { value: 'inner', label: 'Inner Join', description: 'Only matching rows from both tables', color: 'text-blue-primary', bgColor: 'bg-blue-primary/10' },
 { value: 'left', label: 'Left Join', description: 'All from base + matching from source', color: 'text-success', bgColor: 'bg-success-bg' },
 { value: 'right', label: 'Right Join', description: 'All from source + matching from base', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
 { value: 'outer', label: 'Full Outer', description: 'All rows from both tables', color: 'text-violet', bgColor: 'bg-violet-bg' },
];

const JoinTypeBadge: React.FC<{ type: JoinType; compact?: boolean }> = ({ type, compact }) => {
 const joinType = JOIN_TYPES.find((j) => j.value === type);
 if (!joinType) return null;

 return (
 <span className={cn(
 'inline-flex items-center font-medium rounded-lg',
 joinType.color,
 joinType.bgColor,
 compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
 )}>
 {compact ? joinType.label.replace(' Join', '').replace(' Outer', '') : joinType.label}
 </span>
 );
};

interface SourceItem {
 id: string;
 name: string;
}

// Config for each source - supports multiple key pairs
interface SourceConfig {
 keys: Array<{ left: string; right: string }>; // Multiple key pairs
 joinType: JoinType;
}

interface SortableSourceCardProps {
 source: SourceItem;
 index: number;
 baseColumns: string[]; // Columns from base table (for left side of join)
 sourceColumns: string[]; // Columns from this source (for right side)
 config: SourceConfig;
 onConfigChange: (config: SourceConfig) => void;
 isDragging?: boolean;
}

const SortableSourceCard: React.FC<SortableSourceCardProps> = ({
 source,
 index,
 baseColumns,
 sourceColumns,
 config,
 onConfigChange,
 isDragging: isOverlayDragging,
}) => {
 const {
 attributes,
 listeners,
 setNodeRef,
 transform,
 transition,
 isDragging,
 } = useSortable({ id: source.id });

 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 };

 const isBase = index === 0;
 const hasKeys = config.keys.length > 0 && config.keys[0].left !== '';
 const isConfigured = hasKeys;

 // Add a new key pair
 const handleAddKey = () => {
 onConfigChange({
 ...config,
 keys: [...config.keys, { left: '', right: '' }],
 });
 };

 // Remove a key pair
 const handleRemoveKey = (keyIndex: number) => {
 const newKeys = config.keys.filter((_, i) => i !== keyIndex);
 onConfigChange({
 ...config,
 keys: newKeys.length > 0 ? newKeys : [{ left: '', right: '' }],
 });
 };

 // Update a key pair
 const handleKeyChange = (keyIndex: number, side: 'left' | 'right', value: string) => {
 const newKeys = [...config.keys];
 newKeys[keyIndex] = { ...newKeys[keyIndex], [side]: value };
 onConfigChange({ ...config, keys: newKeys });
 };

 // Update join type
 const handleJoinTypeChange = (value: string) => {
 onConfigChange({ ...config, joinType: value as JoinType });
 };

 return (
 <div
 ref={setNodeRef}
 style={style}
 className={cn(
 'rounded-xl border transition-shadow duration-200 overflow-hidden',
 isDragging && 'opacity-50 shadow-lg z-50',
 isOverlayDragging && 'shadow-2xl',
 isBase
 ? 'border-emerald-800/50 bg-gradient-to-br from-emerald-900/10 to-surface-primary/50'
 : isConfigured
 ? 'border-blue-800/50 bg-blue-900/10'
 : 'border-line-1 bg-bg-page/30'
 )}
 >
 {/* Header */}
 <div className={cn(
 'px-4 py-3 border-b flex items-center justify-between',
 isBase
 ? 'border-emerald-800/30 bg-emerald-900/20'
 : isConfigured
 ? 'border-blue-800/30 bg-blue-900/20'
 : 'border-line-1/50'
 )}>
 <div className="flex items-center gap-3">
 {/* Drag Handle */}
 <button
 type="button"
 {...attributes}
 {...listeners}
 className="touch-none text-text-3 hover:text-text-2 transition-colors cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-bg-muted"
 >
 <GripVertical size={16} />
 </button>

 {/* Position Badge */}
 <div className={cn(
 'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
 isBase
 ? 'bg-emerald-500 text-white'
 : isConfigured
 ? 'bg-blue-primary text-white'
 : 'bg-bg-card text-text-2'
 )}>
 {isBase ? <Crown size={14} /> : index}
 </div>

 {/* Source Name */}
 <div className="flex items-center gap-2">
 {!isBase && <ArrowRight size={14} className="text-text-3" />}
 <span className="font-medium text-text-1">{source.name}</span>
 </div>
 </div>

 {/* Status Badge */}
 <div className="flex items-center gap-2">
 {isBase ? (
 <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-success-bg text-success">
 BASE TABLE
 </span>
 ) : isConfigured ? (
 <JoinTypeBadge type={config.joinType} compact />
 ) : null}
 </div>
 </div>

 {/* Config */}
 <div className="p-4 space-y-3">
 {isBase ? (
 // Base table - just select the first key column(s)
 <>
 {config.keys.map((keyPair, keyIndex) => (
 <div key={keyIndex} className="flex items-end gap-2">
 <div className="flex-1">
 <Select
 label={keyIndex === 0 ? "Join Key Column" : undefined}
 value={keyPair.left}
 onChange={(val) => handleKeyChange(keyIndex, 'left', String(val))}
 options={baseColumns.map((col) => ({
 value: col,
 label: col,
 }))}
 placeholder="Select key column..."
 disabled={baseColumns.length === 0}
 helperText={keyIndex === 0 && baseColumns.length === 0 ? 'No columns available' : undefined}
 />
 </div>
 {config.keys.length > 1 && (
 <button
 type="button"
 onClick={() => handleRemoveKey(keyIndex)}
 className="p-2 text-text-3 hover:text-red-500 hover:bg-red-900/20 rounded-lg transition-colors"
 >
 <X size={16} />
 </button>
 )}
 </div>
 ))}
 <button
 type="button"
 onClick={handleAddKey}
 className="flex items-center gap-1.5 text-xs text-success hover:text-emerald-300 font-medium"
 >
 <Plus size={14} />
 Add another key
 </button>
 </>
 ) : (
 // Source table - select key pairs and join type
 <>
 {config.keys.map((keyPair, keyIndex) => (
 <div key={keyIndex} className="flex items-end gap-2">
 <div className="flex-1">
 <Select
 label={keyIndex === 0 ? "Base Key" : undefined}
 value={keyPair.left}
 onChange={(val) => handleKeyChange(keyIndex, 'left', String(val))}
 options={baseColumns.map((col) => ({
 value: col,
 label: col,
 }))}
 placeholder="Base column..."
 disabled={baseColumns.length === 0}
 />
 </div>
 <span className="pb-2 text-text-3">=</span>
 <div className="flex-1">
 <Select
 label={keyIndex === 0 ? "Source Key" : undefined}
 value={keyPair.right}
 onChange={(val) => handleKeyChange(keyIndex, 'right', String(val))}
 options={sourceColumns.map((col) => ({
 value: col,
 label: col,
 }))}
 placeholder="Source column..."
 disabled={sourceColumns.length === 0}
 />
 </div>
 {config.keys.length > 1 && (
 <button
 type="button"
 onClick={() => handleRemoveKey(keyIndex)}
 className="p-2 text-text-3 hover:text-red-500 hover:bg-red-900/20 rounded-lg transition-colors"
 >
 <X size={16} />
 </button>
 )}
 </div>
 ))}
 <div className="flex items-center justify-between pt-2">
 <button
 type="button"
 onClick={handleAddKey}
 className="flex items-center gap-1.5 text-xs text-blue-primary hover:text-blue-300 font-medium"
 >
 <Plus size={14} />
 Add another key (AND condition)
 </button>
 <div className="w-32">
 <Select
 value={config.joinType}
 onChange={(val) => handleJoinTypeChange(String(val))}
 options={JOIN_TYPES.map((jt) => ({
 value: jt.value,
 label: jt.label,
 }))}
 />
 </div>
 </div>
 </>
 )}
 </div>
 </div>
 );
};

// Drag overlay card (the one that follows the cursor)
const DragOverlayCard: React.FC<{ source: SourceItem; index: number; isConfigured: boolean }> = ({
 source,
 index,
 isConfigured,
}) => {
 const isBase = index === 0;

 return (
 <div className={cn(
 'rounded-xl border shadow-2xl overflow-hidden cursor-grabbing',
 isBase
 ? 'border-emerald-700 bg-success-bg'
 : isConfigured
 ? 'border-blue-700 bg-blue-soft'
 : 'border-line-1 bg-bg-page'
 )}>
 <div className={cn(
 'px-4 py-3 flex items-center gap-3',
 isBase
 ? 'bg-emerald-900/40'
 : isConfigured
 ? 'bg-blue-900/40'
 : 'bg-bg-card'
 )}>
 <div className="text-text-3">
 <GripVertical size={16} />
 </div>
 <div className={cn(
 'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
 isBase
 ? 'bg-emerald-500 text-white'
 : isConfigured
 ? 'bg-blue-primary text-white'
 : 'bg-bg-card text-text-2'
 )}>
 {isBase ? <Crown size={14} /> : index}
 </div>
 <span className="font-medium text-text-1">{source.name}</span>
 </div>
 </div>
 );
};

const JoinEditor: React.FC<JoinEditorProps> = ({
 nodeId,
 onClose,
 setSelectedNode,
 data: rawData,
 onChange,
 onDeleteNode,
 onValidate,
 compact = false,
}) => {
 // Cast raw data to JoinConfig type
 const data = rawData as Partial<JoinConfig> | undefined;

 const nodes = useWorkflowStore((state) => state.nodes);
 const connections = useWorkflowStore((state) => state.connections);

 // Get upstream nodes (all connected sources)
 const upstreamNodes = useMemo(() => {
 if (!nodeId) return [];
 return findUpstreamNodes(nodeId, nodes, connections);
 }, [nodeId, nodes, connections]);

 // Get columns for each upstream node
 const nodeColumns = useMemo(() => {
 const result: Record<string, string[]> = {};
 upstreamNodes.forEach((node) => {
 result[node.id] = inferColumnsFromNode(node);
 });
 return result;
 }, [upstreamNodes]);

 // Ordered list of source IDs (first one is base, rest are join sources)
 const [orderedSources, setOrderedSources] = useState<SourceItem[]>([]);

 // State for each source's join config (keyed by node.id)
 const [sourceConfigs, setSourceConfigs] = useState<Record<string, SourceConfig>>({});
 const [touched, setTouched] = useState(false);
 const [initialized, setInitialized] = useState(false);

 // Active drag item for overlay
 const [activeId, setActiveId] = useState<string | null>(null);

 // dnd-kit sensors
 const sensors = useSensors(
 useSensor(PointerSensor, {
 activationConstraint: {
 distance: 8,
 },
 }),
 useSensor(KeyboardSensor, {
 coordinateGetter: sortableKeyboardCoordinates,
 })
 );

 // Create mapping from UI node ID to backend instance ID
 // Use stored node_instance_id if available, otherwise fallback to array index + 1
 const uiIdToInstanceId = useMemo(() => {
 const map = new Map<string, number>();
 nodes.forEach((node, idx) => {
 // First check for stored node_instance_id in node.data
 const storedInstanceId = (node.data as Record<string, unknown>)?.node_instance_id;
 if (typeof storedInstanceId === 'number' && storedInstanceId > 0) {
 map.set(node.id, storedInstanceId);
 } else {
 // Fallback to array index + 1 for new nodes
 map.set(node.id, idx + 1);
 }
 });
 return map;
 }, [nodes]);

 // Create reverse mapping from instance ID to UI node ID
 const instanceIdToUiId = useMemo(() => {
 const map = new Map<number, string>();
 nodes.forEach((node, idx) => {
 const storedInstanceId = (node.data as Record<string, unknown>)?.node_instance_id;
 if (typeof storedInstanceId === 'number' && storedInstanceId > 0) {
 map.set(storedInstanceId, node.id);
 } else {
 map.set(idx + 1, node.id);
 }
 });
 return map;
 }, [nodes]);

 // Convert node ID string to instance ID number for backend
 const getNodeInstanceId = useCallback((nodeStringId: string): number => {
 return uiIdToInstanceId.get(nodeStringId) || 0;
 }, [uiIdToInstanceId]);

 // Find node string ID from instance ID
 const findNodeStringId = useCallback((instanceId: number): string => {
 return instanceIdToUiId.get(instanceId) || '';
 }, [instanceIdToUiId]);

 // Helper to convert legacy single-key to multi-key format
 const legacyToMultiKey = (baseKey?: string, sourceKey?: string): Array<{ left: string; right: string }> => {
 if (baseKey || sourceKey) {
 return [{ left: baseKey || '', right: sourceKey || '' }];
 }
 return [{ left: '', right: '' }];
 };

 // Initialize from data or upstream nodes
 useEffect(() => {
 if (initialized || upstreamNodes.length === 0) return;

 // Build ordered sources list
 const sourceItems: SourceItem[] = [];
 const initialConfigs: Record<string, SourceConfig> = {};

 // If we have existing data, use that order
 if (data?.base_node_id) {
 const baseId = findNodeStringId(data.base_node_id);
 const baseNode = upstreamNodes.find(n => n.id === baseId);
 if (baseNode) {
 sourceItems.push({ id: baseNode.id, name: baseNode.name });
 // Support both legacy (base_key) and new (base_keys) formats
 const baseKeys = data.base_keys?.length
 ? data.base_keys.map(k => ({ left: k, right: '' }))
 : legacyToMultiKey(data.base_key);
 initialConfigs[baseNode.id] = {
 keys: baseKeys,
 joinType: 'inner',
 };
 }

 // Add sources in order
 if (data.sources) {
 data.sources.forEach((source) => {
 const sourceId = findNodeStringId(source.node_id);
 const sourceNode = upstreamNodes.find(n => n.id === sourceId);
 if (sourceNode && !sourceItems.find(s => s.id === sourceNode.id)) {
 sourceItems.push({ id: sourceNode.id, name: sourceNode.name });
 // Support both legacy (key) and new (keys) formats
 const sourceKeys = source.keys?.length
 ? source.keys
 : legacyToMultiKey(data.base_key, source.key);
 initialConfigs[sourceNode.id] = {
 keys: sourceKeys,
 joinType: source.join_type,
 };
 }
 });
 }
 }

 // Add any remaining upstream nodes not in the data
 upstreamNodes.forEach((node) => {
 if (!sourceItems.find(s => s.id === node.id)) {
 sourceItems.push({ id: node.id, name: node.name });
 initialConfigs[node.id] = {
 keys: [{ left: '', right: '' }],
 joinType: 'inner',
 };
 }
 });

 setOrderedSources(sourceItems);
 setSourceConfigs(initialConfigs);
 setInitialized(true);
 }, [upstreamNodes, data, initialized, findNodeStringId]);

 // Handle upstream nodes change (new connections)
 useEffect(() => {
 if (!initialized) return;

 const currentIds = new Set(orderedSources.map(s => s.id));
 const upstreamIds = new Set(upstreamNodes.map(n => n.id));

 // Check if we need to update
 const needsUpdate = upstreamNodes.some(n => !currentIds.has(n.id)) ||
 orderedSources.some(s => !upstreamIds.has(s.id));

 if (needsUpdate) {
 // Add any new nodes
 const newSources = [...orderedSources];
 upstreamNodes.forEach((node) => {
 if (!newSources.find(s => s.id === node.id)) {
 newSources.push({ id: node.id, name: node.name });
 setSourceConfigs(prev => ({
 ...prev,
 [node.id]: { keys: [{ left: '', right: '' }], joinType: 'inner' },
 }));
 }
 });
 // Remove any nodes that are no longer connected
 const filteredSources = newSources.filter(s => upstreamIds.has(s.id));
 setOrderedSources(filteredSources);
 }
 }, [upstreamNodes, orderedSources, initialized]);

 // Get base node (first in order)
 const baseSource = orderedSources[0];
 const baseNodeId = baseSource?.id || '';
 const baseConfig = sourceConfigs[baseNodeId];
 const baseKeys = baseConfig?.keys || [{ left: '', right: '' }];
 const hasBaseKeys = baseKeys.length > 0 && baseKeys[0].left !== '';

 // Other sources (not the base) - maintain order
 const otherSources = orderedSources.slice(1);

 // Build config for submission - uses multi-key format
 const buildConfig = (): JoinConfig => {
 // Extract base keys (left side of key pairs)
 const baseKeysList = baseKeys.map(k => k.left).filter(Boolean);

 return {
 base_node_id: getNodeInstanceId(baseNodeId),
 // Use multi-key format
 base_keys: baseKeysList,
 sources: otherSources
 .filter((source) => {
 const cfg = sourceConfigs[source.id];
 return cfg?.keys?.some(k => k.left && k.right);
 })
 .map((source) => {
 const cfg = sourceConfigs[source.id];
 return {
 node_id: getNodeInstanceId(source.id),
 keys: cfg?.keys?.filter(k => k.left && k.right) || [],
 join_type: cfg?.joinType || 'inner',
 };
 }),
 suffixes: ['_x', '_y'],
 };
 };

 // Validation
 const isValid = useMemo(() => {
 if (!baseNodeId || !hasBaseKeys) return false;
 if (otherSources.length === 0) return false;
 return otherSources.some((source) => {
 const cfg = sourceConfigs[source.id];
 return cfg?.keys?.some(k => k.left && k.right);
 });
 }, [baseNodeId, hasBaseKeys, otherSources, sourceConfigs]);

 // Check if data changed
 const isDirty = useMemo(() => {
 const current = buildConfig();
 const original = data || {};
 return JSON.stringify(current) !== JSON.stringify(original);
 }, [baseNodeId, baseKeys, sourceConfigs, data, otherSources]);

 // Notify parent of validation changes
 useEffect(() => {
 if (onValidate) {
 const errors: string[] = [];
 if (!hasBaseKeys) errors.push('Please select at least one join key for the base table');
 if (!otherSources.some((s) => sourceConfigs[s.id]?.keys?.some(k => k.left && k.right))) {
 errors.push('Configure at least one source table with key pairs to join with');
 }
 onValidate(isValid, errors);
 }
 }, [isValid, hasBaseKeys, otherSources, sourceConfigs, onValidate]);

 // In compact mode, propagate changes immediately
 useEffect(() => {
 if (compact && onChange && isValid) {
 onChange(buildConfig() as unknown as Record<string, unknown>);
 }
 }, [compact, baseNodeId, baseKeys, sourceConfigs, isValid]);

 // Handler for config change
 const handleSourceConfigChange = (sourceNodeId: string, newConfig: SourceConfig) => {
 setSourceConfigs((prev) => ({
 ...prev,
 [sourceNodeId]: newConfig,
 }));
 setTouched(true);
 };

 // dnd-kit handlers
 const handleDragStart = (event: DragStartEvent) => {
 setActiveId(event.active.id as string);
 };

 const handleDragEnd = (event: DragEndEvent) => {
 const { active, over } = event;

 if (over && active.id !== over.id) {
 setOrderedSources((items) => {
 const oldIndex = items.findIndex((item) => item.id === active.id);
 const newIndex = items.findIndex((item) => item.id === over.id);
 return arrayMove(items, oldIndex, newIndex);
 });
 }

 setActiveId(null);
 };

 const handleDragCancel = () => {
 setActiveId(null);
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 setTouched(true);

 if (!isValid || !isDirty) return;

 if (onChange) {
 onChange(buildConfig() as unknown as Record<string, unknown>);
 }

 if (setSelectedNode) setSelectedNode(null);
 else onClose();
 };

 const handleClose = () => {
 if (setSelectedNode) setSelectedNode(null);
 else onClose();
 };

 const hasEnoughUpstream = upstreamNodes.length >= 2;

 // Find active item for overlay
 const activeItem = activeId ? orderedSources.find(s => s.id === activeId) : null;
 const activeIndex = activeId ? orderedSources.findIndex(s => s.id === activeId) : -1;

 // Stop propagation to prevent clicks from affecting parent components
 const stopPropagation = (e: React.MouseEvent) => {
 e.stopPropagation();
 };

 // Form content - shared between compact and full mode
 const formContent = (
 <div className="flex flex-col gap-5" onClick={stopPropagation} onMouseDown={stopPropagation}>
 {hasEnoughUpstream ? (
 <>
 {/* Connected Sources Info */}
 <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-bg-card border border-line-1">
 <div className="flex items-center gap-2">
 <Database size={16} className="text-text-3" />
 <span className="text-sm text-text-2">
 <span className="font-semibold text-text-1">{upstreamNodes.length}</span> sources connected
 </span>
 </div>
 <span className="text-xs text-text-3 flex items-center gap-1">
 <GripVertical size={12} />
 Drag to reorder
 </span>
 </div>

 {/* Draggable Sources List */}
 <DndContext
 sensors={sensors}
 collisionDetection={closestCenter}
 onDragStart={handleDragStart}
 onDragEnd={handleDragEnd}
 onDragCancel={handleDragCancel}
 >
 <SortableContext
 items={orderedSources.map(s => s.id)}
 strategy={verticalListSortingStrategy}
 >
 <div className="space-y-2">
 {orderedSources.map((source, index) => {
 // Base table columns come from the first source
 const baseColumns = nodeColumns[orderedSources[0]?.id] || [];
 // Source columns come from the current source
 const sourceColumns = nodeColumns[source.id] || [];
 return (
 <SortableSourceCard
 key={source.id}
 source={source}
 index={index}
 baseColumns={baseColumns}
 sourceColumns={sourceColumns}
 config={sourceConfigs[source.id] || { keys: [{ left: '', right: '' }], joinType: 'inner' }}
 onConfigChange={(newConfig) => handleSourceConfigChange(source.id, newConfig)}
 />
 );
 })}
 </div>
 </SortableContext>

 <DragOverlay>
 {activeItem ? (
 <DragOverlayCard
 source={activeItem}
 index={activeIndex}
 isConfigured={sourceConfigs[activeItem.id]?.keys?.some(k => k.left && k.right) || false}
 />
 ) : null}
 </DragOverlay>
 </DndContext>

 {/* Join Preview */}
 {hasBaseKeys && otherSources.some((s) => sourceConfigs[s.id]?.keys?.some(k => k.left && k.right)) && (
 <div className="rounded-xl border border-line-1 bg-gradient-to-br from-surface-secondary to-transparent overflow-hidden">
 <div className="px-4 py-2.5 border-b border-line-1/50 bg-bg-card/50">
 <div className="flex items-center gap-2">
 <Columns3 size={14} className="text-text-3" />
 <span className="text-xs font-semibold text-text-2 uppercase tracking-wider">Join Preview</span>
 </div>
 </div>
 <div className="p-4 space-y-2">
 {/* Base table row */}
 <div className="flex items-center gap-2 text-sm flex-wrap">
 <span className="text-xs font-medium text-text-3 w-12">Start</span>
 <code className="px-2 py-1 rounded-lg bg-success-bg text-success font-mono text-xs">
 {baseSource?.name}
 </code>
 <span className="text-text-3">on</span>
 <code className="px-2 py-0.5 rounded bg-bg-card text-text-2 font-mono text-xs">
 {baseKeys.filter(k => k.left).map(k => k.left).join(', ')}
 </code>
 </div>

 {/* Join operations */}
 {otherSources
 .filter((s) => sourceConfigs[s.id]?.keys?.some(k => k.left && k.right))
 .map((source, idx) => {
 const config = sourceConfigs[source.id];
 const keyConditions = config.keys
 .filter(k => k.left && k.right)
 .map(k => `${k.left} = ${k.right}`)
 .join(' AND ');
 return (
 <div key={source.id} className="flex items-center gap-2 text-sm flex-wrap">
 <span className="text-xs font-medium text-text-3 w-12">{idx === 0 ? 'Join' : 'Then'}</span>
 <JoinTypeBadge type={config.joinType} compact />
 <code className="px-2 py-1 rounded-lg bg-blue-soft text-blue-primary font-mono text-xs">
 {source.name}
 </code>
 <span className="text-text-3">on</span>
 <code className="px-2 py-0.5 rounded bg-bg-card text-text-2 font-mono text-xs">
 {keyConditions}
 </code>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Join Type Reference */}
 <details className="group">
 <summary className="flex items-center gap-2 text-xs text-text-3 cursor-pointer hover:text-text-2 transition-colors">
 <span className="group-open:rotate-90 transition-transform">▶</span>
 Join type reference
 </summary>
 <div className="mt-3 p-3 rounded-xl bg-bg-card border border-line-1">
 <div className="grid grid-cols-1 gap-2">
 {JOIN_TYPES.map((jt) => (
 <div key={jt.value} className="flex items-center gap-3">
 <JoinTypeBadge type={jt.value} />
 <span className="text-xs text-text-2">{jt.description}</span>
 </div>
 ))}
 </div>
 </div>
 </details>

 {/* Validation Messages */}
 {touched && !hasBaseKeys && (
 <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/20 border border-red-800/50">
 <span className="text-xs text-red-400">Please select at least one join key for the base table.</span>
 </div>
 )}
 {touched && !otherSources.some((s) => sourceConfigs[s.id]?.keys?.some(k => k.left && k.right)) && (
 <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/20 border border-red-800/50">
 <span className="text-xs text-red-400">Configure at least one source table with key pairs to join with.</span>
 </div>
 )}
 </>
 ) : (
 <div className="text-center py-12">
 <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-surface-secondary to-surface-tertiary flex items-center justify-center">
 <Database size={28} className="text-text-3" />
 </div>
 <p className="text-base font-medium text-text-1 mb-1">
 Connect at least 2 sources
 </p>
 <p className="text-sm text-text-3 max-w-xs mx-auto">
 Drag connections from multiple source nodes to this Join node to configure your join.
 </p>
 <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-card">
 <span className="text-sm text-text-2">Currently connected:</span>
 <span className="text-sm font-semibold text-text-1">{upstreamNodes.length} source(s)</span>
 </div>
 </div>
 )}
 </div>
 );

 // Compact mode - render just the form without wrapper
 if (compact) {
 return <div className="space-y-4">{formContent}</div>;
 }

 // Full mode - render with BaseEditorWrapper
 return (
 <BaseEditorWrapper
 title="Join Tables"
 icon={<GitMerge size={28} className="text-violet" />}
 onClose={handleClose}
 onSubmit={handleSubmit}
 isValid={isValid && isDirty}
 initialValues={data || {}}
 currentValues={buildConfig()}
 onDeleteNode={onDeleteNode}
 >
 {formContent}
 </BaseEditorWrapper>
 );
};

export default JoinEditor;
