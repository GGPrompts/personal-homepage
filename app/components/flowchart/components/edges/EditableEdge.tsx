import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import type { EdgeProps } from '@xyflow/react';
import { getBezierPath, EdgeLabelRenderer } from '@xyflow/react';

// Custom edge data type
export interface CustomEdgeData {
  label?: string;
  onLabelChange?: (newLabel: string) => void;
  onFlipDirection?: () => void;
  onContextMenu?: (event: React.MouseEvent, edgeId: string) => void;
  triggerEdit?: boolean;
  onEditComplete?: () => void;
}

// Custom edge component with editable labels
export function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState((data as CustomEdgeData)?.label || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Trigger edit mode from external source (context menu)
  useEffect(() => {
    const edgeData = data as CustomEdgeData;
    if (edgeData?.triggerEdit && !isEditing) {
      setEditLabel(edgeData.label || '');
      setIsEditing(true);
      // Notify parent that edit was triggered
      if (edgeData.onEditComplete) {
        edgeData.onEditComplete();
      }
    }
  }, [(data as CustomEdgeData)?.triggerEdit, isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditLabel((data as CustomEdgeData)?.label || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    const edgeData = data as CustomEdgeData;
    if (edgeData?.onLabelChange) {
      edgeData.onLabelChange(editLabel);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditLabel((data as CustomEdgeData)?.label || '');
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

  const handleBlur = () => {
    handleSave();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const edgeData = data as CustomEdgeData;
    if (edgeData?.onContextMenu) {
      edgeData.onContextMenu(e, id);
    }
  };

  const edgeData = data as CustomEdgeData;
  const label = edgeData?.label;

  return (
    <>
      {/* Invisible wider path for easier clicking/right-clicking */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        className="react-flow__edge-interaction"
        onContextMenu={handleContextMenu}
        style={{ cursor: 'pointer' }}
      />
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        onContextMenu={handleContextMenu}
      />
      <EdgeLabelRenderer>
        <div
          className="edge-label-container"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: style.opacity === 0 ? 'none' : 'all',
            opacity: style.opacity ?? 1,
            transition: style.transition as string | undefined,
          }}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              className="edge-label-input nodrag nopan"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder="Label"
            />
          ) : (
            <div className="edge-label-wrapper">
              {edgeData?.onFlipDirection && (
                <button
                  className="edge-flip-btn nodrag nopan"
                  onClick={(e) => {
                    e.stopPropagation();
                    edgeData.onFlipDirection?.();
                  }}
                  title="Flip arrow direction"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4" />
                  </svg>
                </button>
              )}
              {label ? (
                <div className="edge-label" title="Double-click to edit">
                  {label}
                </div>
              ) : (
                <div className="edge-label-placeholder" title="Double-click to add label">
                  +
                </div>
              )}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
