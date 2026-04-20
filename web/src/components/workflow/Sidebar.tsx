import React, { useMemo, useCallback, useState } from 'react';
import { nodeTypes, NodeTypeDefinition } from '../../data/nodeTypes';
import { getNodeSpecByDisplayName } from '@/workflow/registry';
import { getIcon } from '@/utils/iconMap';
import { cn } from '@/lib/utils';
import { Search, PanelLeftClose } from 'lucide-react';

interface SidebarProps {
 onNodeDragStart: () => void;
 isCollapsed: boolean;
 onToggleCollapse: () => void;
 isMobile?: boolean;
}

type CategoryKey = 'source' | 'transform' | 'destination';

const CATEGORY_LABEL: Record<CategoryKey, string> = {
 source: 'Sources',
 transform: 'Transforms',
 destination: 'Destinations',
};

const CATEGORY_ORDER: CategoryKey[] = ['source', 'transform', 'destination'];

const categoryIconTileClass: Record<CategoryKey, string> = {
 source: 'bg-blue-soft text-blue-primary',
 transform: 'bg-warning-bg text-warning',
 destination: 'bg-success-bg text-success',
};

export const Sidebar: React.FC<SidebarProps> = ({
 onNodeDragStart,
 isCollapsed,
 onToggleCollapse,
}) => {
 const [search, setSearch] = useState('');

 const handleDragStart = useCallback(
 (nodeType: NodeTypeDefinition, event: React.DragEvent) => {
 const spec = getNodeSpecByDisplayName(nodeType.name);
 const payload = spec ? { ...nodeType, registryTypeId: spec.typeId } : nodeType;
 event.dataTransfer.setData('application/json', JSON.stringify(payload));
 event.dataTransfer.effectAllowed = 'move';

 const ghost = document.createElement('div');
 ghost.textContent = nodeType.name;
 ghost.className =
 'px-3 py-2 bg-bg-card border border-line-1 rounded-lg text-[12px] text-text-1 shadow-sm';
 ghost.style.position = 'absolute';
 ghost.style.top = '-1000px';
 document.body.appendChild(ghost);
 event.dataTransfer.setDragImage(ghost, 0, 0);
 setTimeout(() => document.body.removeChild(ghost), 0);

 onNodeDragStart();
 },
 [onNodeDragStart]
 );

 const groupedNodes = useMemo(() => {
 const term = search.trim().toLowerCase();
 const filtered = term
 ? nodeTypes.filter(
 (node) =>
 node.name.toLowerCase().includes(term) ||
 node.description?.toLowerCase().includes(term)
 )
 : nodeTypes;

 const groups: Record<CategoryKey, NodeTypeDefinition[]> = {
 source: [],
 transform: [],
 destination: [],
 };
 for (const node of filtered) {
 if (CATEGORY_ORDER.includes(node.type as CategoryKey)) {
 groups[node.type as CategoryKey].push(node);
 }
 }
 return groups;
 }, [search]);

 if (isCollapsed) {
 return (
 <div className="h-full flex flex-col items-center py-3 gap-2">
 <button
 type="button"
 onClick={onToggleCollapse}
 className="w-8 h-8 flex items-center justify-center rounded-md text-text-3 hover:bg-bg-row-hv hover:text-text-1 transition-colors"
 title="Expand palette"
 aria-label="Expand palette"
 >
 <PanelLeftClose size={16} className="rotate-180" />
 </button>
 <div className="flex flex-col items-center gap-1.5 overflow-y-auto">
 {CATEGORY_ORDER.map((category) =>
 groupedNodes[category].slice(0, 6).map((node) => {
 const Icon = getIcon(node.icon);
 return (
 <div
 key={`${category}-${node.name}`}
 draggable
 onDragStart={(event) => handleDragStart(node, event)}
 className={cn(
 'w-9 h-9 rounded-md flex items-center justify-center cursor-grab active:cursor-grabbing active:scale-95 transition-transform',
 categoryIconTileClass[category]
 )}
 title={node.name}
 >
 <Icon size={16} />
 </div>
 );
 })
 )}
 </div>
 </div>
 );
 }

 return (
 <div className="h-full flex flex-col">
 <div className="px-3 pt-3 pb-2">
 <label className="flex items-center gap-2 px-[10px] py-[6px] bg-bg-muted border border-line-1 rounded-lg text-[13px] text-text-3 focus-within:border-blue-border focus-within:bg-bg-card transition-colors">
 <Search size={14} className="shrink-0" aria-hidden="true" />
 <input
 type="search"
 placeholder="Search nodes…"
 value={search}
 onChange={(event) => setSearch(event.target.value)}
 className="flex-1 bg-transparent outline-none border-none p-0 text-text-1 placeholder:text-text-3 min-w-0"
 />
 </label>
 </div>

 <div className="flex-1 overflow-y-auto px-3 pb-3">
 {CATEGORY_ORDER.map((category) => {
 const items = groupedNodes[category];
 if (items.length === 0) return null;
 return (
 <div key={category} className="mb-4 last:mb-0">
 <div className="text-[11px] font-semibold text-text-3 uppercase tracking-[0.08em] px-1 mb-1.5">
 {CATEGORY_LABEL[category]}
 </div>
 <div className="flex flex-col gap-[2px]">
 {items.map((node) => {
 const Icon = getIcon(node.icon);
 return (
 <div
 key={`${category}-${node.name}`}
 draggable
 onDragStart={(event) => handleDragStart(node, event)}
 className="group flex items-center gap-2 p-2 rounded-md text-[12.5px] text-text-1 hover:bg-bg-row-hv cursor-grab active:cursor-grabbing transition-colors"
 >
 <span
 className={cn(
 'shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-semibold',
 categoryIconTileClass[category]
 )}
 aria-hidden="true"
 >
 <Icon size={13} />
 </span>
 <span className="flex-1 truncate">{node.name}</span>
 </div>
 );
 })}
 </div>
 </div>
 );
 })}

 {CATEGORY_ORDER.every((category) => groupedNodes[category].length === 0) && (
 <div className="px-1 py-6 text-center text-[12px] text-text-3">
 No nodes match “{search}”.
 </div>
 )}
 </div>
 </div>
 );
};
