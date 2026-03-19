import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { WorkflowNode } from '../../types/workflow';
import { getNodeSpecByDisplayName, getNodeSpec } from '@/workflow/registry';

interface UnifiedNodeFormProps {
  node: WorkflowNode;
  onUpdate: (_node: WorkflowNode) => void;
  onClose: () => void;
}

/** Loading fallback for lazy-loaded editors */
const EditorLoading = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
    <span className="ml-2 text-sm text-text-secondary">Loading editor...</span>
  </div>
);

export const UnifiedNodeForm: React.FC<UnifiedNodeFormProps> = ({ node, onUpdate, onClose }) => {
  // Try to find spec by displayName first, then by definitionId as fallback
  const spec = getNodeSpecByDisplayName(node.name) || (node.definitionId ? getNodeSpec(node.definitionId) : undefined);

  if (!spec) {
    return <div className="text-sm text-gray-500 p-4">No editor available for this node type.</div>;
  }

  const Editor = spec.ui.editor as React.ComponentType<any>;
  return (
    <Suspense fallback={<EditorLoading />}>
      <Editor
        key={node.id}
        nodeId={node.id}
        data={node.data}
        onChange={(updated: Record<string, unknown>) => onUpdate({ ...node, data: updated })}
        onClose={onClose}
      />
    </Suspense>
  );
};



