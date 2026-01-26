import { useRef, useEffect } from 'react';

export interface EdgeContextMenuProps {
  x: number;
  y: number;
  edgeId: string;
  label?: string;
  onClose: () => void;
  onFlipDirection: () => void;
  onDelete: () => void;
  onEditLabel: () => void;
}

export function EdgeContextMenu({
  x,
  y,
  onClose,
  onFlipDirection,
  onDelete,
  onEditLabel,
}: EdgeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleFlipDirection = () => {
    onFlipDirection();
    onClose();
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  const handleEditLabel = () => {
    onEditLabel();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="node-context-menu"
      style={{
        position: 'fixed',
        left: x,
        top: y,
      }}
    >
      <button className="context-menu-item" onClick={handleFlipDirection}>
        <span className="context-menu-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4" />
          </svg>
        </span>
        Flip Direction
      </button>
      <button className="context-menu-item" onClick={handleEditLabel}>
        <span className="context-menu-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </span>
        Edit Label
      </button>
      <div className="context-menu-divider" />
      <button className="context-menu-item danger" onClick={handleDelete}>
        <span className="context-menu-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </span>
        Delete
      </button>
    </div>
  );
}
