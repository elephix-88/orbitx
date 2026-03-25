// src/components/editors/BaseEditorWrapper.tsx
import React, { useMemo, useRef, useState } from "react";
import { X, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { cva, type VariantProps } from "class-variance-authority";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { isDeepEqual } from "@/lib/utils";

const editorWrapperVariants = cva("h-full flex flex-col", {
  variants: {
    size: {
      default: "",
      full: "w-full",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

interface BaseEditorWrapperProps
  extends VariantProps<typeof editorWrapperVariants> {
  title: string;
  /** Optional platform icon to display in header. If not provided, shows default Settings icon */
  icon?: React.ReactNode;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onSubmit: (e: React.FormEvent) => void;
  isValid: boolean;
  // Optional raw values for generic dirty-check
  initialValues?: any;
  currentValues?: any;
  onDeleteNode?: () => void;
  children: React.ReactNode;
}

const BaseEditorWrapper = ({
  title,
  icon,
  onClose,
  onSubmit,
  isValid,
  initialValues,
  currentValues,
  onDeleteNode,
  children,
}: BaseEditorWrapperProps) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const initialRef = useRef<any>(initialValues);
  const isDirty = useMemo(() => {
    if (typeof currentValues === "undefined") return true;
    return !isDeepEqual(initialRef.current, currentValues);
  }, [currentValues]);

  const handleClickDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDeleteNode) return;
    setIsDeleting(true);
    try {
      await Promise.resolve(onDeleteNode());
    } finally {
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-black/50 backdrop-blur-sm animate-fade-in">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-5xl h-[85vh] sm:h-[80vh] flex flex-col bg-surface-primary rounded-2xl shadow-2xl border border-border animate-scale-in"
      >
        <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-surface-secondary">
              {icon || <Settings className="w-5 h-5 text-text-secondary" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {title}
              </h2>
              <p className="text-sm text-text-secondary">
                Configure this node
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDeleteNode && (
              <button
                type="button"
                onClick={handleClickDelete}
                className="p-2 text-text-tertiary hover:text-error hover:bg-surface-secondary rounded-lg transition-colors"
                title="Delete node"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-surface-secondary">
          <div className="h-full p-6 lg:p-8">
            <div className="space-y-6">{children}</div>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-border px-6 py-4">
          <Button
            type="submit"
            disabled={!isValid || !isDirty}
            variant={isValid && isDirty ? "primary" : "secondary"}
            width="full"
            size="md"
          >
            {!isDirty ? "Saved" : isValid ? "Save" : "Invalid Configuration"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Delete node?"
        message={
          <div>
            <p className="mb-1">
              This will remove this node from the workflow.
            </p>
            <p className="text-text-secondary">
              Connected edges may also be removed.
            </p>
          </div>
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};

export default BaseEditorWrapper;
