import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Node } from '@xyflow/react';
import type { Step, Note, NodeType, SkillMetadata } from '../types';
import { nodeWidth, nodeHeight } from '../constants';

/**
 * Creates a workflow node from a Step definition.
 */
export function createNode(
  step: Step,
  visible: boolean,
  position?: { x: number; y: number },
  onDataChange?: (newTitle: string, newDescription: string, newSkillPath?: string, newSkillMetadata?: SkillMetadata) => void,
  onContextMenu?: (event: ReactMouseEvent, nodeId: string) => void,
  triggerEdit?: boolean,
  onEditComplete?: () => void,
  toolbarCallbacks?: {
    onToolbarEdit?: () => void;
    onToolbarDelete?: () => void;
    onToolbarDuplicate?: () => void;
    onToolbarChangeType?: (type: NodeType) => void;
  }
): Node {
  return {
    id: step.id,
    type: 'custom',
    position: position || { x: 0, y: 0 },
    data: {
      title: step.label,
      description: step.description,
      nodeType: step.nodeType,
      skillPath: step.skillPath,
      skillMetadata: step.skillMetadata,
      promptPath: step.promptPath,
      onDataChange,
      onContextMenu,
      nodeId: step.id,
      triggerEdit,
      onEditComplete,
      ...toolbarCallbacks,
    },
    style: {
      width: nodeWidth,
      height: nodeHeight,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease-in-out',
      pointerEvents: visible ? 'auto' : 'none',
    },
  };
}

/**
 * Creates a sticky note node from a Note definition.
 */
export function createNoteNode(
  note: Note,
  visible: boolean,
  position?: { x: number; y: number },
  onContentChange?: (newContent: string) => void
): Node {
  return {
    id: note.id,
    type: 'note',
    position: position || note.position,
    data: {
      content: note.content,
      color: note.color,
      width: note.width,
      height: note.height,
      appearsWithStep: note.appearsWithStep,
      onContentChange,
    },
    style: {
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease-in-out',
      pointerEvents: visible ? 'auto' : 'none',
      ...(note.width && { width: note.width }),
      ...(note.height && { height: note.height }),
    },
    draggable: true,
    selectable: true,
    connectable: false,
  };
}
