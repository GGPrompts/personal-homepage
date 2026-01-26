import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent, MouseEvent as ReactMouseEvent } from 'react';
import { Handle, Position, NodeToolbar } from '@xyflow/react';
import type { NodeType, SkillMetadata } from '../../types';
import { nodeColors, allNodeTypes } from '../../constants';

export interface CustomNodeData {
  title: string;
  description: string;
  nodeType: NodeType;
  skillPath?: string;  // Path to skill folder, e.g., "~/.claude/skills/code-review"
  skillMetadata?: SkillMetadata;  // SKILL.md frontmatter fields
  promptPath?: string;  // Path to .prompty file for TFE integration
  onDataChange?: (newTitle: string, newDescription: string, newSkillPath?: string, newSkillMetadata?: SkillMetadata) => void;
  onContextMenu?: (event: ReactMouseEvent, nodeId: string) => void;
  nodeId?: string;
  triggerEdit?: boolean;
  onEditComplete?: () => void;
  // Toolbar action callbacks
  onToolbarEdit?: () => void;
  onToolbarDelete?: () => void;
  onToolbarDuplicate?: () => void;
  onToolbarChangeType?: (type: NodeType) => void;
}

export function CustomNode({ data, selected }: { data: CustomNodeData; selected?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.title);
  const [editDescription, setEditDescription] = useState(data.description);
  // Use skillPath if set, otherwise fall back to promptPath (for dragged prompts)
  const [editSkillPath, setEditSkillPath] = useState(data.skillPath || data.promptPath || '');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const editContainerRef = useRef<HTMLDivElement>(null);

  const colors = nodeColors[data.nodeType];
  const isHumanEntry = data.nodeType === 'human-entry';
  // Show skillPath input for node types that make sense
  const showSkillPathInput = data.nodeType === 'skill' || data.nodeType === 'agent' || data.nodeType === 'mcp';

  // Handle blur - save if focus leaves the edit container entirely
  const handleEditBlur = (e: React.FocusEvent) => {
    // Check if the new focus target is still within our edit container
    const relatedTarget = e.relatedTarget as globalThis.Node | null;
    if (editContainerRef.current && relatedTarget && editContainerRef.current.contains(relatedTarget)) {
      return; // Focus moved to another input within the container, don't save yet
    }
    // Focus left the edit area, save changes
    if (data.onDataChange) {
      data.onDataChange(editLabel, editDescription, editSkillPath || undefined);
    }
    setIsEditing(false);
  };

  const handleDoubleClick = () => {
    setEditLabel(data.title);
    setEditDescription(data.description);
    setEditSkillPath(data.skillPath || data.promptPath || '');
    setIsEditing(true);
  };

  const handleContextMenu = (event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (data.onContextMenu && data.nodeId) {
      data.onContextMenu(event, data.nodeId);
    }
  };

  // Trigger edit mode from external source (context menu)
  useEffect(() => {
    if (data.triggerEdit && !isEditing) {
      setEditLabel(data.title);
      setEditDescription(data.description);
      setEditSkillPath(data.skillPath || data.promptPath || '');
      setIsEditing(true);
      // Notify parent that edit was triggered
      if (data.onEditComplete) {
        data.onEditComplete();
      }
    }
  }, [data.triggerEdit, data.title, data.description, data.skillPath, data.promptPath, data.onEditComplete, isEditing]);

  const handleSave = () => {
    if (data.onDataChange) {
      data.onDataChange(editLabel, editDescription, editSkillPath || undefined);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditLabel(data.title);
    setEditDescription(data.description);
    setEditSkillPath(data.skillPath || data.promptPath || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditLabel(e.target.value);
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditDescription(e.target.value);
  };

  const handleSkillPathChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditSkillPath(e.target.value);
  };

  // Render skill metadata for skill nodes
  const renderSkillMetadata = () => {
    if (data.nodeType !== 'skill' || !data.skillMetadata) return null;

    const meta = data.skillMetadata;
    const hasMetadata = meta.allowedTools?.length || meta.context || meta.hooks?.length ||
                        meta.disableModelInvocation !== undefined || meta.userInvocable !== undefined;

    if (!hasMetadata) return null;

    return (
      <div className="skill-metadata">
        {meta.allowedTools && meta.allowedTools.length > 0 && (
          <div className="skill-meta-row" title="Allowed tools">
            <span className="skill-meta-icon">T</span>
            <span className="skill-meta-value">{meta.allowedTools.slice(0, 3).join(', ')}{meta.allowedTools.length > 3 ? '...' : ''}</span>
          </div>
        )}
        {meta.context && (
          <div className="skill-meta-row" title={`Context: ${meta.context}${meta.agent ? ` -> ${meta.agent}` : ''}`}>
            <span className="skill-meta-icon">F</span>
            <span className="skill-meta-value">{meta.context}{meta.agent ? ` -> ${meta.agent}` : ''}</span>
          </div>
        )}
        {meta.hooks && meta.hooks.length > 0 && (
          <div className="skill-meta-row" title="Hooks">
            <span className="skill-meta-icon">H</span>
            <span className="skill-meta-value">{meta.hooks.join(', ')}</span>
          </div>
        )}
        {(meta.disableModelInvocation || meta.userInvocable === false) && (
          <div className="skill-meta-row skill-meta-flags">
            {meta.disableModelInvocation && <span className="skill-meta-flag" title="Model cannot invoke">manual</span>}
            {meta.userInvocable === false && <span className="skill-meta-flag" title="Not user invocable">hidden</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <NodeToolbar
        isVisible={selected && !isEditing}
        position={Position.Top}
        offset={8}
        className="node-toolbar"
      >
        <button
          className="toolbar-btn"
          onClick={() => data.onToolbarEdit?.()}
          title="Edit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          className="toolbar-btn"
          onClick={() => data.onToolbarDuplicate?.()}
          title="Duplicate"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
        <div
          className="toolbar-btn-wrapper"
          onMouseEnter={() => setShowTypeDropdown(true)}
          onMouseLeave={() => setShowTypeDropdown(false)}
        >
          <button
            className="toolbar-btn"
            title="Change Type"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
          {showTypeDropdown && (
            <div className="toolbar-type-dropdown">
              {allNodeTypes.filter(t => t.type !== 'group').map(({ type, label }) => (
                <button
                  key={type}
                  className={`toolbar-type-option ${type === data.nodeType ? 'active' : ''}`}
                  onClick={() => {
                    data.onToolbarChangeType?.(type);
                    setShowTypeDropdown(false);
                  }}
                  disabled={type === data.nodeType}
                >
                  <span
                    className="type-dot"
                    style={{ backgroundColor: nodeColors[type].border }}
                  />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className="toolbar-btn toolbar-btn-danger"
          onClick={() => data.onToolbarDelete?.()}
          title="Delete"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </NodeToolbar>
      <div
        className={`custom-node ${isHumanEntry ? 'human-entry' : ''} ${isEditing ? 'editing' : ''}`}
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderWidth: isHumanEntry ? '3px' : '2px',
        }}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <Handle type="target" position={Position.Top} id="top" />
        <Handle type="target" position={Position.Left} id="left" />
        <Handle type="source" position={Position.Right} id="right" />
        <Handle type="source" position={Position.Bottom} id="bottom" />
        <Handle type="target" position={Position.Right} id="right-target" style={{ right: 0 }} />
        <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ bottom: 0 }} />
        <Handle type="source" position={Position.Top} id="top-source" />
        <Handle type="source" position={Position.Left} id="left-source" />
        <div className="node-content">
          {isEditing ? (
            <div ref={editContainerRef}>
              <input
                type="text"
                className="node-edit-input node-edit-label nodrag"
                value={editLabel}
                onChange={handleLabelChange}
                onKeyDown={handleKeyDown}
                onBlur={handleEditBlur}
                autoFocus
                placeholder="Label"
              />
              <input
                type="text"
                className="node-edit-input node-edit-description nodrag"
                value={editDescription}
                onChange={handleDescriptionChange}
                onKeyDown={handleKeyDown}
                onBlur={handleEditBlur}
                placeholder="Description"
              />
              {showSkillPathInput && (
                <input
                  type="text"
                  className="node-edit-input node-edit-skillpath nodrag"
                  value={editSkillPath}
                  onChange={handleSkillPathChange}
                  onKeyDown={handleKeyDown}
                  onBlur={handleEditBlur}
                  placeholder="Path for TFE (skill folder or prompt file)"
                />
              )}
            </div>
          ) : (
            <>
              <div className="node-title" style={{ color: isHumanEntry ? colors.border : '#e6edf3' }}>
                {data.title}
              </div>
              {data.description && <div className="node-description">{data.description}</div>}
              {renderSkillMetadata()}
            </>
          )}
        </div>
      </div>
    </>
  );
}
