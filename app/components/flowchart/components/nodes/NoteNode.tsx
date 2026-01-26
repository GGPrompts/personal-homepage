import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { NodeResizer } from '@xyflow/react';

export interface NoteNodeData {
  content: string;
  color: { bg: string; border: string; text?: string };
  width?: number;
  height?: number;
  onContentChange?: (newContent: string) => void;
}

// Determine if a hex color is "light" (needs dark text)
function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Perceived brightness formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
}

export function NoteNode({ data, selected }: { data: NoteNodeData; selected?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(data.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Position cursor at end
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setEditContent(data.content);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (data.onContentChange) {
      data.onContentChange(editContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(data.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      // Ctrl/Cmd+Enter to save (regular Enter creates newlines)
      e.preventDefault();
      handleSave();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
  };

  const handleBlur = () => {
    handleSave();
  };

  const textColor = data.color.text || (isLightColor(data.color.bg) ? '#1c1c1c' : '#e6edf3');

  return (
    <>
      <NodeResizer
        minWidth={100}
        minHeight={50}
        isVisible={selected}
        lineClassName="note-resizer-line"
        handleClassName="note-resizer-handle"
      />
      <div
        className={`note-node ${isEditing ? 'editing' : ''}`}
        style={{
          backgroundColor: data.color.bg,
          borderColor: data.color.border,
          width: data.width ? '100%' : undefined,
          height: data.height ? '100%' : undefined,
          color: textColor,
        }}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="note-edit-textarea nodrag"
            value={editContent}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            style={{
              color: textColor,
              backgroundColor: 'transparent',
            }}
          />
        ) : (
          <pre style={{ color: 'inherit' }}>{data.content}</pre>
        )}
      </div>
    </>
  );
}
