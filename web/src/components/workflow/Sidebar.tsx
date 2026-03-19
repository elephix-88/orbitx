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

// Map node category to Bauhaus left-border color
const getCategoryBorderColor = (type: string): string => {
  if (type === 'source') return '#E63946';
  if (type === 'transform') return '#F4A261';
  if (type === 'destination') return '#457B9D';
  return '#A8DADC';
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
    <div className="h-full flex flex-col" style={{ backgroundColor: 'white', borderRight: '1px solid #A8DADC' }}>
      {/* Header */}
      <div className={cn(
        "flex flex-col transition-all duration-300",
        isCollapsed ? "p-3 items-center" : "p-4"
      )}
      style={{ borderBottom: '1px solid #A8DADC' }}
      >
        <div className={cn(
          "flex items-center w-full",
          isCollapsed ? "justify-center" : "justify-between mb-2"
        )}>
          {!isCollapsed && (
            <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: '#1D3557' }}>
              Library
            </h3>
          )}
          <button
            onClick={onToggleCollapse}
            className={cn(
              "hover:bg-gray-100 transition-colors flex items-center justify-center",
              isCollapsed ? "w-8 h-8" : "p-1.5"
            )}
            style={{ borderRadius: '2px', color: '#457B9D' }}
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#457B9D' }} />
            <input
              type="text"
              placeholder="Search nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs focus:outline-none transition-all"
              style={{
                backgroundColor: '#F1FAEE',
                border: '1px solid #A8DADC',
                borderRadius: '2px',
                color: '#1D3557',
              }}
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
              isCollapsed ? "justify-center p-2 w-10 h-10" : "p-3 h-auto"
            )}
            style={{
              backgroundColor: 'white',
              border: '1px solid #A8DADC',
              borderLeft: isCollapsed ? '1px solid #A8DADC' : `4px solid ${getCategoryBorderColor(nodeType.type)}`,
              borderRadius: '2px',
            }}
          >
            {/* Icon */}
            <div
              className={cn(
                "flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                isCollapsed ? "w-8 h-8" : "w-12 h-12"
              )}
              style={{
                borderRadius: '2px',
                background: nodeType.color ? `rgba(${parseInt(nodeType.color.slice(1,3), 16)}, ${parseInt(nodeType.color.slice(3,5), 16)}, ${parseInt(nodeType.color.slice(5,7), 16)}, 0.1)` : '#F1FAEE',
                color: nodeType.color || '#457B9D'
              }}
            >
              {renderIcon(nodeType.icon, isCollapsed ? 28 : 40)}
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate transition-colors" style={{ color: '#1D3557' }}>
                  {nodeType.name}
                </h4>
                <p className="text-[10px] truncate" style={{ color: '#457B9D' }}>
                  {nodeType.description}
                </p>
              </div>
            )}

            {/* Drag Handle Hint */}
            {!isCollapsed && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#A8DADC' }}>
                <GripVertical size={14} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
