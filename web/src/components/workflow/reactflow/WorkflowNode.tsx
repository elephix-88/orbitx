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

// Category styling - Blueprint: colored left bar by type
const categoryStyles: Record<string, {
  borderColor: string;
  iconBg: string;
  dot: string;
}> = {
  source: {
    borderColor: '#FF4D6A',   // coral
    iconBg: '#FF4D6A',
    dot: '#FF4D6A',
  },
  transform: {
    borderColor: '#FFB800',   // amber
    iconBg: '#FFB800',
    dot: '#FFB800',
  },
  destination: {
    borderColor: '#00E5A0',   // mint
    iconBg: '#00E5A0',
    dot: '#00E5A0',
  },
};

// Status border styles
const getStatusBorderStyle = (status?: string, baseColor?: string) => {
  switch (status) {
    case 'running':
      return { borderColor: '#FFB800', boxShadow: '0 0 8px rgba(255, 184, 0, 0.3)' };
    case 'success':
      return { borderColor: '#00E5A0', boxShadow: 'none' };
    case 'error':
      return { borderColor: '#FF4D6A', boxShadow: '0 0 8px rgba(255, 77, 106, 0.3)' };
    default:
      return { borderColor: 'rgba(0, 212, 255, 0.2)', boxShadow: 'none' };
  }
};

const WorkflowNode = ({ data, selected }: WorkflowNodeProps) => {
  const styles = categoryStyles[data.category] || categoryStyles.transform;
  const statusBorder = getStatusBorderStyle(data.status);

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
            <CheckCircle size={iconSize} style={{ color: '#00E5A0' }} />
          </div>
        );
      case 'warning':
        return (
          <div title={tooltip} className="flex-shrink-0">
            <AlertTriangle size={iconSize} style={{ color: '#FFB800' }} />
          </div>
        );
      case 'error':
        return (
          <div title={tooltip} className="flex-shrink-0">
            <XCircle size={iconSize} style={{ color: '#FF4D6A' }} />
          </div>
        );
      case 'unconfigured':
        return (
          <div title={tooltip} className="flex-shrink-0">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#506080' }} />
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
      )}
      style={{
        backgroundColor: '#1A2744',
        border: `1px solid ${selected ? '#00D4FF' : statusBorder.borderColor}`,
        borderLeft: `4px solid ${styles.borderColor}`,
        borderRadius: '6px',
        boxShadow: selected
          ? '0 0 12px rgba(0, 212, 255, 0.3)'
          : statusBorder.boxShadow,
        transform: selected ? 'scale(1.02)' : 'none',
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
              backgroundColor: '#00D4FF',
              border: '2px solid #0F1729',
            }}
            className={cn(
              '!w-3 !h-3 !rounded-full',
              'hover:!scale-125',
              '!transition-all !duration-200'
            )}
          />
        ))
      ) : (
        <Handle
          id="in"
          type="target"
          position={Position.Left}
          style={{
            backgroundColor: '#00D4FF',
            border: '2px solid #0F1729',
          }}
          className={cn(
            '!w-3 !h-3 !rounded-full',
            'hover:!scale-125',
            '!transition-all !duration-200'
          )}
        />
      )}

      {/* Running State Overlay */}
      {data.status === 'running' && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ borderRadius: '6px', backgroundColor: 'rgba(26, 39, 68, 0.7)' }}
        >
          <div className="relative">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#FFB800' }} />
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
          style={{ borderRadius: '4px' }}
        >
          {renderIcon(data.icon || 'Circle')}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          {/* Actual node type name (always shown) */}
          <h4
            className="font-medium truncate leading-tight text-xs"
            style={{ color: '#E8ECF4' }}
            title={data.display_name ? `${data.name} - ${data.display_name}` : data.name}
          >
            {data.name}
          </h4>
          {/* Alias (shown if set) */}
          {data.display_name && (
            <p
              className="text-[10px] truncate leading-tight uppercase tracking-wider"
              style={{ color: '#8896AD' }}
              title={data.display_name}
            >
              {data.display_name}
            </p>
          )}
        </div>

        {/* Status Indicator - LED-style dot with glow */}
        {data.status && data.status !== 'idle' && data.status !== 'running' && data.status !== 'pending' ? (
          <div className="flex-shrink-0">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: data.status === 'error' ? '#FF4D6A' : data.status === 'success' ? '#00E5A0' : '#506080',
                boxShadow: data.status === 'error'
                  ? '0 0 6px rgba(255, 77, 106, 0.5)'
                  : data.status === 'success'
                  ? '0 0 6px rgba(0, 229, 160, 0.5)'
                  : 'none',
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
              backgroundColor: '#00D4FF',
              border: '2px solid #0F1729',
            }}
            className={cn(
              '!w-3 !h-3 !rounded-full',
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
              backgroundColor: '#1A2744',
              color: '#00D4FF',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: '4px',
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
              backgroundColor: '#FF4D6A',
              color: 'white',
              borderRadius: '4px',
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
