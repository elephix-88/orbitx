import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { WORKFLOW_SHORTCUTS, formatShortcut } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal showing available keyboard shortcuts
 */
export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'General',
      shortcuts: [
        { ...WORKFLOW_SHORTCUTS.SAVE, action: () => {} },
        { ...WORKFLOW_SHORTCUTS.SETTINGS, action: () => {} },
        { ...WORKFLOW_SHORTCUTS.DESELECT, action: () => {} },
      ],
    },
    {
      title: 'Editing',
      shortcuts: [
        { ...WORKFLOW_SHORTCUTS.UNDO, action: () => {} },
        { ...WORKFLOW_SHORTCUTS.REDO, action: () => {} },
        { ...WORKFLOW_SHORTCUTS.DELETE, action: () => {} },
        { ...WORKFLOW_SHORTCUTS.DUPLICATE, action: () => {} },
        { ...WORKFLOW_SHORTCUTS.SELECT_ALL, action: () => {} },
      ],
    },
    {
      title: 'View',
      shortcuts: [
        { ...WORKFLOW_SHORTCUTS.ZOOM_IN, action: () => {} },
        { ...WORKFLOW_SHORTCUTS.ZOOM_OUT, action: () => {} },
        { ...WORKFLOW_SHORTCUTS.ZOOM_FIT, action: () => {} },
      ],
    },
    {
      title: 'Workflow',
      shortcuts: [
        { ...WORKFLOW_SHORTCUTS.RUN, action: () => {} },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-primary rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-400/15">
              <Keyboard className="w-5 h-5 text-primary-400" />
            </div>
            <h2 id="shortcuts-title" className="text-lg font-semibold text-text-primary">
              Keyboard shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-text-tertiary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {shortcutGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold text-text-tertiary mb-3">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.description}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-secondary"
                    >
                      <span className="text-sm text-text-primary">
                        {shortcut.description}
                      </span>
                      <ShortcutBadge shortcut={shortcut} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-secondary">
          <p className="text-xs text-text-tertiary text-center">
            Press <ShortcutBadge shortcut={{ key: '?', description: '' }} size="sm" /> to show this help
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Badge showing a keyboard shortcut
 */
export const ShortcutBadge: React.FC<{
  shortcut: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; description?: string };
  size?: 'sm' | 'md';
  className?: string;
}> = ({ shortcut, size = 'md', className }) => {
  const formatted = formatShortcut(shortcut);
  const parts = formatted.split(/([+])/);

  return (
    <kbd
      className={cn(
        'inline-flex items-center gap-0.5 font-mono',
        size === 'sm' ? 'text-xs' : 'text-sm',
        className
      )}
    >
      {parts.map((part, idx) => {
        if (part === '+') {
          return (
            <span key={idx} className="text-text-tertiary">
              +
            </span>
          );
        }
        return (
          <span
            key={idx}
            className={cn(
              'px-1.5 py-0.5 rounded-md bg-surface-secondary',
              'border border-border-subtle',
              'text-text-primary',
              'shadow-sm'
            )}
          >
            {part}
          </span>
        );
      })}
    </kbd>
  );
};

/**
 * Button to open shortcuts help
 */
export const ShortcutsHelpButton: React.FC<{
  onClick: () => void;
  className?: string;
}> = ({ onClick, className }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-2 rounded-lg hover:bg-surface-secondary',
        'text-text-tertiary hover:text-text-primary',
        'transition-colors',
        className
      )}
      title="Keyboard shortcuts (?)"
      aria-label="Show keyboard shortcuts"
    >
      <Keyboard className="w-5 h-5" />
    </button>
  );
};
