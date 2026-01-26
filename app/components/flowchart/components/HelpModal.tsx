import { useRef, useEffect } from 'react';

export interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as globalThis.Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const shortcuts = [
    { keys: ['?'], description: 'Show/hide this help' },
    { keys: ['Delete', 'Backspace'], description: 'Delete selected nodes' },
    { keys: ['Ctrl', 'Z'], description: 'Undo' },
    { keys: ['Ctrl', 'Y'], description: 'Redo' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo (alternative)' },
    { keys: ['Ctrl', 'A'], description: 'Select all' },
    { keys: ['Escape'], description: 'Deselect all / Close modal' },
    { keys: ['Mouse wheel'], description: 'Zoom in/out' },
    { keys: ['Click + Drag'], description: 'Pan canvas' },
    { keys: ['Double-click node'], description: 'Edit node text' },
    { keys: ['Double-click edge'], description: 'Edit edge label' },
    { keys: ['Right-click'], description: 'Context menu' },
  ];

  return (
    <div className="help-modal-overlay">
      <div className="help-modal" ref={modalRef}>
        <div className="help-modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="help-modal-close" onClick={onClose} title="Close (Escape)">
            ×
          </button>
        </div>
        <div className="help-modal-content">
          <table className="shortcuts-table">
            <tbody>
              {shortcuts.map((shortcut, index) => (
                <tr key={index}>
                  <td className="shortcut-keys">
                    {shortcut.keys.map((key, keyIndex) => (
                      <span key={keyIndex}>
                        <kbd>{key}</kbd>
                        {keyIndex < shortcut.keys.length - 1 && ' + '}
                      </span>
                    ))}
                  </td>
                  <td className="shortcut-description">{shortcut.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="help-modal-footer">
          Press <kbd>?</kbd> or <kbd>Escape</kbd> to close
        </div>
      </div>
    </div>
  );
}
