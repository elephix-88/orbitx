import React, { useMemo, useCallback } from 'react';
import { nodeTypes, NodeTypeDefinition } from '../../data/nodeTypes';
import { getNodeSpecByDisplayName } from '@/workflow/registry';
import { getIcon } from '@/utils/iconMap';
import { cn } from '../../lib/utils';
import { Search, PanelLeftOpen, PanelLeftClose, GripVertical } from 'lucide-react';

interface SidebarProps {
  onNodeDragStart: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
}

// Map node category to design token border class
const getCategoryBorderClass = (type: string): string => {
  if (type === 'source') return 'border-l-info';
  if (type === 'transform') return 'border-l-warning';
  if (type === 'destination') return 'border-l-success';
  return 'border-l-border';
};

export const Sidebar: React.FC<SidebarProps> = ({
  onNodeDragStart,
  isCollapsed,
  onToggleCollapse,
  isMobile = false
}) => {
  const [search, setSearch] = React.useState('');

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

  // Memoize filtered nodes to avoid recalculating on every render
  const filteredNodes = useMemo(() => {
    const searchLower = search.toLowerCase();
    return nodeTypes.filter(n =>
      n.name.toLowerCase().includes(searchLower) ||
      n.description.toLowerCase().includes(searchLower)
    );
  }, [search]);

  return (
    <div className="h-full flex flex-col bg-surface-primary border-r border-border">
      {/* Header */}
      <div className={cn(
        "flex flex-col transition-all duration-300 border-b border-border",
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
              "hover:bg-surface-tertiary transition-colors flex items-center justify-center text-text-secondary rounded-sm",
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
              className="w-full pl-9 pr-3 py-2 text-xs focus:outline-none transition-all bg-surface-secondary border border-border rounded-sm text-text-primary"
            />
          </div>
        )}
      </div>

      {/* Node Types List */}
      <div className={cn(
        "flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-surface-tertiary",
        isCollapsed ? "p-3 space-y-2 flex flex-col items-center" : "p-3 space-y-2"
      )}>
        {filteredNodes.map((nodeType) => (
          <div
            key={nodeType.type + nodeType.name}
            draggable
            onDragStart={(e) => handleDragStart(nodeType, e)}
            className={cn(
              "group relative flex items-center gap-3 cursor-grab transition-all duration-300",
              "hover:shadow-sm active:scale-95",
              "bg-surface-primary border border-border rounded-sm",
              isCollapsed ? "justify-center p-2 w-10 h-10" : cn("p-3 h-auto border-l-4", getCategoryBorderClass(nodeType.type))
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                "flex items-center justify-center transition-transform duration-300 group-hover:scale-110 rounded-sm bg-surface-secondary text-text-secondary",
                isCollapsed ? "w-8 h-8" : "w-12 h-12"
              )}
            >
              {renderIcon(nodeType.icon, isCollapsed ? 28 : 40)}
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate transition-colors text-text-primary">
                  {nodeType.name}
                </h4>
                <p className="text-[10px] truncate text-text-secondary">
                  {nodeType.description}
                </p>
              </div>
            )}

            {/* Drag Handle Hint */}
            {!isCollapsed && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary">
                <GripVertical size={14} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
