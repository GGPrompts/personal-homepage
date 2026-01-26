import type { Node, Edge } from '@xyflow/react';
import dagre from 'dagre';
import { nodeWidth as defaultNodeWidth, nodeHeight as defaultNodeHeight } from './nodeTypes';

// Note offset from associated step node
const NOTE_OFFSET_X = 50; // Gap between step and note
const NOTE_STACK_GAP = 20; // Gap between stacked notes

// Get actual node dimensions, falling back to defaults
function getNodeDimensions(node: Node): { width: number; height: number } {
  // Try measured dimensions first (actual rendered size)
  const measuredWidth = node.measured?.width;
  const measuredHeight = node.measured?.height;

  if (measuredWidth && measuredHeight) {
    return { width: measuredWidth, height: measuredHeight };
  }

  // Try explicit width/height properties
  const explicitWidth = node.width ?? (node.style?.width as number | undefined);
  const explicitHeight = node.height ?? (node.style?.height as number | undefined);

  return {
    width: typeof explicitWidth === 'number' ? explicitWidth : defaultNodeWidth,
    height: typeof explicitHeight === 'number' ? explicitHeight : defaultNodeHeight,
  };
}

// Auto-layout using dagre algorithm
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });

  // Separate node types
  const customNodes = nodes.filter(node => node.type === 'custom');
  const noteNodes = nodes.filter(node => node.type === 'note');
  const otherNodes = nodes.filter(node => node.type !== 'custom' && node.type !== 'note');

  // Store dimensions for later use
  const nodeDimensions: Map<string, { width: number; height: number }> = new Map();

  customNodes.forEach(node => {
    const dims = getNodeDimensions(node);
    nodeDimensions.set(node.id, dims);
    dagreGraph.setNode(node.id, { width: dims.width, height: dims.height });
  });

  edges.forEach(edge => {
    // Only add edges between custom nodes
    if (customNodes.some(n => n.id === edge.source) && customNodes.some(n => n.id === edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(dagreGraph);

  const layoutedCustomNodes = customNodes.map(node => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const dims = nodeDimensions.get(node.id) || { width: defaultNodeWidth, height: defaultNodeHeight };
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - dims.width / 2,
        y: nodeWithPosition.y - dims.height / 2,
      },
    };
  });

  // Group notes by their appearsWithStep to handle stacking
  const notesByStep: Map<number, Node[]> = new Map();
  noteNodes.forEach(note => {
    const data = note.data as Record<string, unknown> | undefined;
    const stepIndex = typeof data?.appearsWithStep === 'number' ? data.appearsWithStep : 0;
    if (!notesByStep.has(stepIndex)) {
      notesByStep.set(stepIndex, []);
    }
    notesByStep.get(stepIndex)!.push(note);
  });

  // Position notes relative to their associated step
  const layoutedNoteNodes = noteNodes.map(note => {
    const data = note.data as Record<string, unknown> | undefined;
    const stepIndex = typeof data?.appearsWithStep === 'number' ? data.appearsWithStep : 0;
    const associatedStep = layoutedCustomNodes[stepIndex];

    if (associatedStep) {
      // Find this note's position in the stack for this step
      const notesForStep = notesByStep.get(stepIndex) || [];
      const noteIndexInStack = notesForStep.indexOf(note);
      const noteH = typeof data?.height === 'number' ? data.height : 100;
      const stackOffset = noteIndexInStack * (noteH + NOTE_STACK_GAP);

      // Get actual step dimensions
      const stepDims = nodeDimensions.get(associatedStep.id) || { width: defaultNodeWidth, height: defaultNodeHeight };

      if (direction === 'TB') {
        // Vertical layout: notes to the right of their step
        return {
          ...note,
          position: {
            x: associatedStep.position.x + stepDims.width + NOTE_OFFSET_X,
            y: associatedStep.position.y + stackOffset,
          },
        };
      } else {
        // Horizontal layout: notes below their step
        return {
          ...note,
          position: {
            x: associatedStep.position.x + stackOffset,
            y: associatedStep.position.y + stepDims.height + NOTE_OFFSET_X,
          },
        };
      }
    }

    // Fallback: keep original position if no associated step
    return note;
  });

  // Update edge handles based on layout direction
  // TB (top-bottom): source=bottom, target=top
  // LR (left-right): source=right, target=left
  const sourceHandle = direction === 'TB' ? 'bottom' : 'right';
  const targetHandle = direction === 'TB' ? 'top' : 'left';

  const layoutedEdges = edges.map(edge => {
    // Only update handles for edges between custom nodes
    const isCustomEdge = customNodes.some(n => n.id === edge.source) && customNodes.some(n => n.id === edge.target);
    if (isCustomEdge) {
      return {
        ...edge,
        sourceHandle,
        targetHandle,
      };
    }
    return edge;
  });

  return {
    nodes: [...layoutedCustomNodes, ...layoutedNoteNodes, ...otherNodes],
    edges: layoutedEdges,
  };
}
