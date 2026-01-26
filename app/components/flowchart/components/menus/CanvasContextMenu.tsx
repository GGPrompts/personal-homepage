import { useRef, useState, useEffect } from 'react';
import type { NodeType } from '../../types';
import { allNodeTypes, nodeColors } from '../../constants';

export interface CanvasContextMenuProps {
  x: number;
  y: number;
  flowPosition: { x: number; y: number };
  onClose: () => void;
  onAddNode: (nodeType: NodeType, position: { x: number; y: number }) => void;
  onAddNote?: (position: { x: number; y: number }) => void;
}

export function CanvasContextMenu({
  x,
  y,
  flowPosition,
  onClose,
  onAddNode,
  onAddNote,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showAddSubmenu, setShowAddSubmenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x, y });

  // Adjust menu position to avoid going off-screen
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const padding = 10;
      let newX = x;
      let newY = y;

      if (rect.right > window.innerWidth - padding) {
        newX = window.innerWidth - rect.width - padding;
      }
      if (rect.bottom > window.innerHeight - padding) {
        newY = window.innerHeight - rect.height - padding;
      }
      if (newX < padding) newX = padding;
      if (newY < padding) newY = padding;

      if (newX !== x || newY !== y) {
        setMenuPosition({ x: newX, y: newY });
      }
    }
  }, [x, y]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as globalThis.Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleAddNode = (type: NodeType) => {
    onAddNode(type, flowPosition);
    onClose();
  };

  const handleAddNote = () => {
    onAddNote?.(flowPosition);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="node-context-menu"
      style={{
        position: 'fixed',
        left: menuPosition.x,
        top: menuPosition.y,
      }}
    >
      <div
        className="context-menu-item has-submenu"
        onMouseEnter={() => setShowAddSubmenu(true)}
        onMouseLeave={() => setShowAddSubmenu(false)}
      >
        <span className="context-menu-icon">+</span>
        Add Node
        <span className="submenu-arrow">&#9654;</span>
        {showAddSubmenu && (
          <div className="context-submenu">
            {allNodeTypes.map(({ type, label }) => (
              <button
                key={type}
                className="context-menu-item"
                onClick={() => handleAddNode(type)}
              >
                <span
                  className="type-indicator"
                  style={{ backgroundColor: nodeColors[type].border }}
                />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {onAddNote && (
        <button
          className="context-menu-item"
          onClick={handleAddNote}
        >
          <span className="context-menu-icon">📝</span>
          Add Note
        </button>
      )}
    </div>
  );
}
