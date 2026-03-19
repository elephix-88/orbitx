import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  /** If true, prevent default browser behavior */
  preventDefault?: boolean;
  /** Scope where shortcut is active (global, workflow, modal) */
  scope?: 'global' | 'workflow' | 'modal';
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  scope?: 'global' | 'workflow' | 'modal';
}

/**
 * Hook for managing keyboard shortcuts
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: 's', ctrl: true, action: handleSave, description: 'Save workflow' },
 *   { key: 'Escape', action: handleClose, description: 'Close modal' },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, scope = 'global' } = options;
  const shortcutsRef = useRef(shortcuts);

  // Keep shortcuts ref up to date
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' ||
                   target.tagName === 'TEXTAREA' ||
                   target.isContentEditable;

    for (const shortcut of shortcutsRef.current) {
      // Skip if scope doesn't match
      if (shortcut.scope && shortcut.scope !== scope) continue;

      // Check modifiers
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const metaMatch = shortcut.meta ? event.metaKey : true;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;

      // Check key
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        // Allow Escape in inputs, but block other shortcuts
        if (isInput && shortcut.key.toLowerCase() !== 'escape') {
          continue;
        }

        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.action();
        return;
      }
    }
  }, [enabled, scope]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Common workflow builder shortcuts
 */
export const WORKFLOW_SHORTCUTS = {
  SAVE: { key: 's', ctrl: true, description: 'Save workflow' },
  UNDO: { key: 'z', ctrl: true, description: 'Undo' },
  REDO: { key: 'z', ctrl: true, shift: true, description: 'Redo' },
  DELETE: { key: 'Delete', description: 'Delete selected' },
  BACKSPACE: { key: 'Backspace', description: 'Delete selected' },
  SELECT_ALL: { key: 'a', ctrl: true, description: 'Select all nodes' },
  DESELECT: { key: 'Escape', description: 'Deselect / Close' },
  ZOOM_IN: { key: '+', ctrl: true, description: 'Zoom in' },
  ZOOM_OUT: { key: '-', ctrl: true, description: 'Zoom out' },
  ZOOM_FIT: { key: '0', ctrl: true, description: 'Fit to view' },
  DUPLICATE: { key: 'd', ctrl: true, description: 'Duplicate selected' },
  RUN: { key: 'Enter', ctrl: true, description: 'Run workflow' },
  SETTINGS: { key: ',', ctrl: true, description: 'Open settings' },
} as const;

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: Pick<KeyboardShortcut, 'key' | 'ctrl' | 'shift' | 'alt' | 'meta'>): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');

  // Format special keys
  const keyMap: Record<string, string> = {
    'escape': 'Esc',
    'delete': 'Del',
    'backspace': '⌫',
    'enter': '↵',
    'arrowup': '↑',
    'arrowdown': '↓',
    'arrowleft': '←',
    'arrowright': '→',
    ' ': 'Space',
  };

  const key = keyMap[shortcut.key.toLowerCase()] || shortcut.key.toUpperCase();
  parts.push(key);

  return parts.join(isMac ? '' : '+');
}

