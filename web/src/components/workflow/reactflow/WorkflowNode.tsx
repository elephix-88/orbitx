import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { getIcon } from '@/utils/iconMap';
import { X, Copy, Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ValidationStatus, ValidationIssue } from '../WorkflowValidation';

// Node data interface for React Flow workflow nodes
export interface WorkflowNodeData {
  name: string; // Actual node type name (e.g., "Facebook Ads")
  display_name?: string; // Alias/custom name (e.g., "FB - Age Data")
  icon?: string;
  color?: string;
  category: 'source' | 'transform' | 'destination';
  status?: 'pending' | 'running' | 'success' | 'error' | 'idle';
  inputs: Array<{ id: string; name: string }>;
  outputs: Array<{ id: string; name: string }>;
  validationStatus?: ValidationStatus;
  validationIssues?: ValidationIssue[];
  onOpenEditor?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  [key: string]: unknown; // Index signature for React Flow compatibility
}

// Props for WorkflowNode component
interface WorkflowNodeProps {
  data: WorkflowNodeData;
  selected?: boolean;
}

// Category styling - Bauhaus: colored left border by type
const categoryStyles: Record<string, {
  borderColor: string;
  iconBg: string;
  dot: string;
}> = {
  source: {
    borderColor: '#E63946',
    iconBg: '#E63946',
    dot: '#E63946',
  },
  transform: {
    borderColor: '#F4A261',
    iconBg: '#F4A261',
    dot: '#F4A261',
  },
  destination: {
    borderColor: '#457B9D',
    iconBg: '#457B9D',
    dot: '#457B9D',
  },
};

const WorkflowNode = ({ data, selected }: WorkflowNodeProps) => {
  const styles = categoryStyles[data.category] || categoryStyles.transform;

  const renderIcon = (iconName: string) => {
    const Icon = getIcon(iconName);
    return <Icon size={36} />;
  };

  // Validation indicator
  const renderValidationIndicator = () => {
    if (!data.validationStatus || data.status === 'running') return null;

    const iconSize = 16;
    const tooltip = data.validationIssues?.length
      ? data.validationIssues.map(i => i.message).join('\n')
      : data.validationStatus === 'valid'
      ? 'Configured correctly'
      : data.validationStatus === 'unconfigured'
      ? 'Double-click to configure'
      : '';

    switch (data.validationStatus) {
      case 'valid':
        return (
          <div title={tooltip} className="flex-shrink-0">
            <CheckCircle size={iconSize} className="text-green-500" />
          </div>
        );
      case 'warning':
        return (
          <div title={tooltip} className="flex-shrink-0">
            <AlertTriangle size={iconSize} className="text-amber-500" />
          </div>
        );
      case 'error':
        return (
          <div title={tooltip} className="flex-shrink-0">
            <XCircle size={iconSize} className="text-red-500" />
          </div>
        );
      case 'unconfigured':
        return (
          <div title={tooltip} className="flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-slate-300" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'select-none group',
        'flex items-center gap-2',
        'transition-all duration-300 ease-out',
        'w-[144px] h-[47px]',
        selected && 'ring-2 ring-offset-1 scale-[1.02]'
      )}
      style={{
        backgroundColor: 'white',
        border: '1px solid #A8DADC',
        borderLeft: `4px solid ${styles.borderColor}`,
        borderRadius: '2px',
        boxShadow: selected ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
        ringColor: selected ? styles.borderColor : undefined,
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        data.onOpenEditor?.();
      }}
    >
      {/* Input Handle - always render for target connections */}
      {data.inputs.length > 0 ? (
        data.inputs.map((input, index) => (
          <Handle
            key={input.id}
            id={input.id}
            type="target"
            position={Position.Left}
            style={{
              top: data.inputs.length === 1 ? '50%' : `${((index + 1) / (data.inputs.length + 1)) * 100}%`,
            }}
            className={cn(
              '!w-3 !h-3 !rounded-full',
              '!bg-slate-300 dark:!bg-slate-600 !border-2 !border-white dark:!border-slate-800',
              'hover:!bg-slate-500 hover:!scale-125',
              '!transition-all !duration-200'
            )}
          />
        ))
      ) : (
        <Handle
          id="in"
          type="target"
          position={Position.Left}
          className={cn(
            '!w-3 !h-3 !rounded-full',
            '!bg-slate-300 dark:!bg-slate-600 !border-2 !border-white dark:!border-slate-800',
            'hover:!bg-slate-500 hover:!scale-125',
            '!transition-all !duration-200'
          )}
        />
      )}

      {/* Running State Overlay */}
      {data.status === 'running' && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-slate-900/60"
          style={{ borderRadius: '2px' }}
        >
          <div className="relative">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: styles.iconBg }} />
          </div>
        </div>
      )}

      {/* Node Content */}
      <div
        className={cn(
          'flex items-center gap-2 w-full h-full px-2.5',
          data.status === 'running' && 'opacity-40 pointer-events-none'
        )}
      >
        {/* Icon Container */}
        <div
          className="flex-shrink-0 flex items-center justify-center w-9 h-9"
          style={{ borderRadius: '2px' }}
        >
          {renderIcon(data.icon || 'Circle')}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          {/* Actual node type name (always shown) */}
          <h4
            className="font-medium truncate leading-tight text-xs"
            style={{ color: '#1D3557' }}
            title={data.display_name ? `${data.name} - ${data.display_name}` : data.name}
          >
            {data.name}
          </h4>
          {/* Alias (shown if set) */}
          {data.display_name && (
            <p
              className="text-[10px] truncate leading-tight"
              style={{ color: '#457B9D' }}
              title={data.display_name}
            >
              {data.display_name}
            </p>
          )}
        </div>

        {/* Status Indicator - circle in top-right area */}
        {data.status && data.status !== 'idle' && data.status !== 'running' && data.status !== 'pending' ? (
          <div className="flex-shrink-0">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: data.status === 'error' ? '#E63946' : data.status === 'success' ? '#34d399' : '#A8DADC',
              }}
            />
          </div>
        ) : (
          renderValidationIndicator()
        )}
      </div>

      {/* Output Handle - only render when outputs exist */}
      {data.outputs.length > 0 &&
        data.outputs.map((output, index) => (
          <Handle
            key={output.id}
            id={output.id}
            type="source"
            position={Position.Right}
            style={{
              top: data.outputs.length === 1 ? '50%' : `${((index + 1) / (data.outputs.length + 1)) * 100}%`,
              backgroundColor: styles.dot,
            }}
            className={cn(
              '!w-3 !h-3 !rounded-full',
              '!border-2 !border-white dark:!border-slate-800',
              'hover:!scale-125',
              '!transition-all !duration-200'
            )}
          />
        ))}

      {/* Node Action Buttons */}
      <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
        {/* Duplicate Button */}
        {data.onDuplicate && (
          <button
            className="w-5 h-5 flex items-center justify-center transition-all duration-200"
            style={{
              backgroundColor: '#A8DADC',
              color: '#1D3557',
              borderRadius: '2px',
            }}
            onClick={(e) => {
              e.stopPropagation();
              data.onDuplicate?.();
            }}
            title="Duplicate node"
          >
            <Copy size={10} strokeWidth={2.5} />
          </button>
        )}
        {/* Delete Button */}
        {data.onDelete && (
          <button
            className="w-5 h-5 flex items-center justify-center transition-all duration-200"
            style={{
              backgroundColor: '#E63946',
              color: 'white',
              borderRadius: '2px',
            }}
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete?.();
            }}
            title="Delete node"
          >
            <X size={10} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
};

export default memo(WorkflowNode);
