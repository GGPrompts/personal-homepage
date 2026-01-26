import { useRef, useState, useEffect } from 'react';
import type { NodeType } from '../../types';
import { allNodeTypes, nodeColors } from '../../constants';

export interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  nodeType: NodeType;
  skillPath?: string;
  promptPath?: string;  // Path to .prompty file for TFE integration
  tabzConnected: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onChangeType: (newType: NodeType) => void;
  onUngroup?: () => void;
  onOpenInTFE?: (method: 'spawn' | 'queue') => void;
}

export function NodeContextMenu({
  x,
  y,
  nodeType,
  skillPath,
  promptPath,
  tabzConnected,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  onChangeType,
  onUngroup,
  onOpenInTFE,
}: NodeContextMenuProps) {
  // Show TFE option if either skillPath or promptPath is set
  const hasEditablePath = skillPath || promptPath;
  const editablePathLabel = promptPath ? 'prompt file' : 'skill folder';
  const menuRef = useRef<HTMLDivElement>(null);
  const [showTypeSubmenu, setShowTypeSubmenu] = useState(false);
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

  const handleEdit = () => {
    onEdit();
    onClose();
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  const handleDuplicate = () => {
    onDuplicate();
    onClose();
  };

  const handleUngroup = () => {
    if (onUngroup) {
      onUngroup();
    }
    onClose();
  };

  const handleChangeType = (newType: NodeType) => {
    onChangeType(newType);
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
      <button className="context-menu-item" onClick={handleEdit}>
        <span className="context-menu-icon">&#x270F;&#xFE0F;</span>
        Edit
      </button>
      <button className="context-menu-item" onClick={handleDuplicate}>
        <span className="context-menu-icon">&#x1F4CB;</span>
        Duplicate
      </button>
      <div
        className="context-menu-item has-submenu"
        onMouseEnter={() => setShowTypeSubmenu(true)}
        onMouseLeave={() => setShowTypeSubmenu(false)}
      >
        <span className="context-menu-icon">&#x1F504;</span>
        Change Type
        <span className="submenu-arrow">&#x25B6;</span>
        {showTypeSubmenu && (
          <div className="context-submenu">
            {allNodeTypes.map(({ type, label }) => (
              <button
                key={type}
                className={`context-menu-item ${type === nodeType ? 'active' : ''}`}
                onClick={() => handleChangeType(type)}
                disabled={type === nodeType}
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
      {nodeType === 'group' && onUngroup && (
        <>
          <div className="context-menu-divider" />
          <button className="context-menu-item" onClick={handleUngroup}>
            <span className="context-menu-icon">&#x1F4E4;</span>
            Ungroup
          </button>
        </>
      )}
      {hasEditablePath && onOpenInTFE && (
        <>
          <div className="context-menu-divider" />
          <button
            className={`context-menu-item ${!tabzConnected ? 'disabled' : ''}`}
            onClick={() => { onOpenInTFE('spawn'); onClose(); }}
            disabled={!tabzConnected}
            title={!tabzConnected ? 'TabzChrome not connected' : `Open ${editablePathLabel} in new TFE tab`}
          >
            <span className="context-menu-icon">&#x1F4C2;</span>
            Open in New TFE Tab
          </button>
          <button
            className={`context-menu-item ${!tabzConnected ? 'disabled' : ''}`}
            onClick={() => { onOpenInTFE('queue'); onClose(); }}
            disabled={!tabzConnected}
            title={!tabzConnected ? 'TabzChrome not connected' : `Open ${editablePathLabel} in current terminal`}
          >
            <span className="context-menu-icon">&#x1F4BB;</span>
            Open in Current Terminal
          </button>
        </>
      )}
      <div className="context-menu-divider" />
      <button className="context-menu-item danger" onClick={handleDelete}>
        <span className="context-menu-icon">&#x1F5D1;&#xFE0F;</span>
        Delete
      </button>
    </div>
  );
}
