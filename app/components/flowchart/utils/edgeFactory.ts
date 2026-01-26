import type { Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import type { EdgeConnection } from '../types';

/**
 * Creates an edge connection between two nodes.
 */
export function createEdge(
  conn: EdgeConnection,
  visible: boolean,
  onLabelChange?: (edgeId: string, newLabel: string) => void,
  onFlipDirection?: (edgeId: string) => void,
  onContextMenu?: (event: React.MouseEvent, edgeId: string) => void
): Edge {
  const edgeId = `e${conn.source}-${conn.target}`;
  return {
    id: edgeId,
    type: 'editable',
    source: conn.source,
    target: conn.target,
    sourceHandle: conn.sourceHandle,
    targetHandle: conn.targetHandle,
    animated: visible,
    style: {
      stroke: '#8b949e',
      strokeWidth: 2,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease-in-out',
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#8b949e',
    },
    data: {
      label: conn.label,
      onLabelChange: onLabelChange ? (newLabel: string) => onLabelChange(edgeId, newLabel) : undefined,
      onFlipDirection: onFlipDirection ? () => onFlipDirection(edgeId) : undefined,
      onContextMenu: onContextMenu,
    },
  };
}
