import React, { useMemo, useCallback, useState } from 'react';
import { nodeTypes, NodeTypeDefinition } from '../../data/nodeTypes';
import { getNodeSpecByDisplayName } from '@/workflow/registry';
import { getIcon } from '@/utils/iconMap';
import { cn } from '../../lib/utils';
import { Search, PanelLeftOpen, PanelLeftClose, GripVertical, ChevronDown, ChevronRight, Download, Repeat, Upload } from 'lucide-react';

interface SidebarProps {
  onNodeDragStart: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
}

type CategoryKey = 'source' | 'transform' | 'destination';

interface CategoryConfig {
  label: string;
  icon: React.ElementType;
  borderClass: string;
  badgeClass: string;
  dotClass: string;
}

const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
  source: {
    label: 'Sources',
    icon: Download,
    borderClass: 'border-l-primary-400',
    badgeClass: 'bg-primary-400/10 text-primary-400',
    dotClass: 'bg-primary-400',
  },
  transform: {
    label: 'Transforms',
    icon: Repeat,
    borderClass: 'border-l-amber-400',
    badgeClass: 'bg-amber-400/10 text-amber-400',
    dotClass: 'bg-amber-400',
  },
  destination: {
    label: 'Destinations',
    icon: Upload,
    borderClass: 'border-l-emerald-400',
    badgeClass: 'bg-emerald-400/10 text-emerald-400',
    dotClass: 'bg-emerald-400',
  },
};

const CATEGORY_ORDER: CategoryKey[] = ['source', 'transform', 'destination'];

export const Sidebar: React.FC<SidebarProps> = ({
  onNodeDragStart,
  isCollapsed,
  onToggleCollapse,
  isMobile = false
}) => {
  const [search, setSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const renderIcon = useCallback((iconName: string, size?: number) => {
    const iconSize = size ?? (isMobile ? 36 : 40);
    const Icon = getIcon(iconName);
    return <Icon size={iconSize} strokeWidth={1.5} />;
  }, [isMobile]);

  const handleDragStart = useCallback((nodeType: NodeTypeDefinition, e: React.DragEvent) => {
    const spec = getNodeSpecByDisplayName(nodeType.name);
    const payload = spec ? { ...nodeType, registryTypeId: spec.typeId } : nodeType;
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    onNodeDragStart();
  }, [onNodeDragStart]);

  const toggleCategory = useCallback((category: string) => {
    setCollapsedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  }, []);

  // Group filtered nodes by category
  const groupedNodes = useMemo(() => {
    const searchLower = search.toLowerCase();
    const filtered = nodeTypes.filter(n =>
      n.name.toLowerCase().includes(searchLower) ||
      n.description.toLowerCase().includes(searchLower)
    );

    const groups: Record<string, NodeTypeDefinition[]> = {};
    for (const category of CATEGORY_ORDER) {
      const nodes = filtered.filter(n => n.type === category);
      if (nodes.length > 0) {
        groups[category] = nodes;
      }
    }
    return groups;
  }, [search]);

  return (
    <div className="h-full flex flex-col bg-surface-dark border-r border-neutral-800">
      {/* Header */}
      <div className={cn(
        "flex flex-col transition-all duration-300 border-b border-neutral-800",
        isCollapsed ? "p-3 items-center" : "p-4"
      )}
      >
        <div className={cn(
          "flex items-center w-full",
          isCollapsed ? "justify-center" : "justify-between mb-2"
        )}>
          {!isCollapsed && (
            <h3 className="text-sm font-semibold text-text-primary">
              Library
            </h3>
          )}
          <button
            onClick={onToggleCollapse}
            className={cn(
              "hover:bg-neutral-800 transition-colors flex items-center justify-center text-text-secondary rounded-md",
              isCollapsed ? "w-8 h-8" : "p-1.5"
            )}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        </div>

        {!isCollapsed && (
          <div className="relative w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs focus:outline-none transition-all bg-neutral-900 border border-neutral-700 rounded-md text-text-primary focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
            />
          </div>
        )}
      </div>

      {/* Node Types List — Grouped by Category */}
      <div className={cn(
        "flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700",
        isCollapsed ? "p-3 space-y-2 flex flex-col items-center" : "p-2"
      )}>
        {isCollapsed ? (
          // Collapsed: show icons only, grouped by colored dots
          CATEGORY_ORDER.map(category => {
            const nodes = groupedNodes[category];
            if (!nodes) return null;
            const config = CATEGORY_CONFIG[category];
            return (
              <React.Fragment key={category}>
                <div className={cn("w-2 h-2 rounded-full my-1", config.dotClass)} title={config.label} />
                {nodes.map((nodeType) => (
                  <div
                    key={nodeType.type + nodeType.name}
                    draggable
                    onDragStart={(e) => handleDragStart(nodeType, e)}
                    className="group relative flex items-center justify-center cursor-grab transition-all duration-300 hover:shadow-sm active:scale-95 hover:bg-neutral-800 bg-surface-secondary border border-neutral-800 rounded-md p-2 w-10 h-10"
                    title={nodeType.name}
                  >
                    <div className="flex items-center justify-center transition-transform duration-300 group-hover:scale-110 rounded-md bg-surface-tertiary text-text-secondary w-8 h-8">
                      {renderIcon(nodeType.icon, 28)}
                    </div>
                  </div>
                ))}
              </React.Fragment>
            );
          })
        ) : (
          // Expanded: show grouped sections with headers
          CATEGORY_ORDER.map(category => {
            const nodes = groupedNodes[category];
            if (!nodes) return null;
            const config = CATEGORY_CONFIG[category];
            const CategoryIcon = config.icon;
            const isCategoryCollapsed = collapsedCategories[category] ?? false;

            return (
              <div key={category} className="mb-1">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-800/50 rounded-md transition-colors group"
                >
                  <div className="text-text-tertiary transition-transform">
                    {isCategoryCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </div>
                  <CategoryIcon size={14} className="text-text-tertiary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    {config.label}
                  </span>
                  <span className={cn("ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full", config.badgeClass)}>
                    {nodes.length}
                  </span>
                </button>

                {/* Category Nodes */}
                {!isCategoryCollapsed && (
                  <div className="space-y-1.5 px-1 pb-2">
                    {nodes.map((nodeType) => (
                      <div
                        key={nodeType.type + nodeType.name}
                        draggable
                        onDragStart={(e) => handleDragStart(nodeType, e)}
                        className={cn(
                          "group relative flex items-center gap-3 cursor-grab transition-all duration-300",
                          "hover:shadow-sm active:scale-95 hover:bg-neutral-800",
                          "bg-surface-secondary border border-neutral-800 rounded-md",
                          "p-3 h-auto border-l-4",
                          config.borderClass
                        )}
                      >
                        {/* Icon */}
                        <div className="flex items-center justify-center transition-transform duration-300 group-hover:scale-110 rounded-md bg-surface-tertiary text-text-secondary w-12 h-12">
                          {renderIcon(nodeType.icon, 40)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate transition-colors text-text-primary">
                            {nodeType.name}
                          </h4>
                          <p className="text-[10px] truncate text-text-secondary">
                            {nodeType.description}
                          </p>
                        </div>

                        {/* Drag Handle Hint */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary">
                          <GripVertical size={14} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
