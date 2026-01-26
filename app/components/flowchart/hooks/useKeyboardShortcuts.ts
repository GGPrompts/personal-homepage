import { useEffect, useCallback } from 'react';

export interface UseKeyboardShortcutsOptions {
  /** Callback for undo action (Ctrl+Z) */
  onUndo: () => void;
  /** Callback for redo action (Ctrl+Shift+Z or Ctrl+Y) */
  onRedo: () => void;
  /** Callback to toggle help modal (?) */
  onToggleHelp: () => void;
  /** Callback to close help modal (Escape when modal is open) */
  onCloseHelp: () => void;
  /** Whether the help modal is currently showing */
  isHelpModalOpen: boolean;
}

/**
 * Hook for managing keyboard shortcuts.
 * Handles:
 * - Undo (Ctrl+Z)
 * - Redo (Ctrl+Shift+Z or Ctrl+Y)
 * - Toggle help modal (?)
 * - Close help modal (Escape)
 *
 * Note: Delete/Backspace for node deletion is handled by ReactFlow's
 * built-in deleteKeyCode prop, so we don't handle it here.
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
  const { onUndo, onRedo, onToggleHelp, onCloseHelp, isHelpModalOpen } = options;

  const handleKeyDown = useCallback(
    (e: globalThis.KeyboardEvent) => {
      // Ignore if typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // "?" key toggles help modal (Shift + / on most keyboards)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        onToggleHelp();
        return;
      }

      // Escape closes help modal
      if (e.key === 'Escape' && isHelpModalOpen) {
        e.preventDefault();
        onCloseHelp();
        return;
      }

      // Check for Ctrl/Cmd key for undo/redo
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;

      if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
          // Ctrl+Shift+Z = Redo
          e.preventDefault();
          onRedo();
        } else {
          // Ctrl+Z = Undo
          e.preventDefault();
          onUndo();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        // Ctrl+Y = Redo (alternative)
        e.preventDefault();
        onRedo();
      }
    },
    [onUndo, onRedo, onToggleHelp, onCloseHelp, isHelpModalOpen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
