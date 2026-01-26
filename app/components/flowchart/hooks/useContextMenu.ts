import { useState, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

// Context menu state
export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string | null;
  edgeId: string | null;
  menuType: 'node' | 'canvas' | 'edge';
}

export interface UseContextMenuOptions {
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
}

export interface UseContextMenuResult {
  contextMenu: ContextMenuState;
  canvasClickPosition: { x: number; y: number };
  handleNodeContextMenu: (event: ReactMouseEvent, nodeId: string) => void;
  handleEdgeContextMenu: (event: ReactMouseEvent, edgeId: string) => void;
  handleCanvasContextMenu: (event: ReactMouseEvent) => void;
  closeContextMenu: () => void;
}

/**
 * Hook for managing context menu state and handlers.
 * Handles both node context menus (right-click on node) and
 * canvas context menus (right-click on empty space).
 */
export function useContextMenu(options: UseContextMenuOptions): UseContextMenuResult {
  const { screenToFlowPosition } = options;

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: null,
    edgeId: null,
    menuType: 'node',
  });

  // Canvas context menu flow position (where to create the node)
  const [canvasClickPosition, setCanvasClickPosition] = useState({ x: 0, y: 0 });

  // Context menu handler for nodes
  const handleNodeContextMenu = useCallback((event: ReactMouseEvent, nodeId: string) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      nodeId,
      edgeId: null,
      menuType: 'node',
    });
  }, []);

  // Context menu handler for edges
  const handleEdgeContextMenu = useCallback((event: ReactMouseEvent, edgeId: string) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: null,
      edgeId,
      menuType: 'edge',
    });
  }, []);

  // Context menu handler for canvas (right-click on empty space)
  const handleCanvasContextMenu = useCallback((event: ReactMouseEvent) => {
    event.preventDefault();
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    setCanvasClickPosition(position);
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: null,
      edgeId: null,
      menuType: 'canvas',
    });
  }, [screenToFlowPosition]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false, nodeId: null, edgeId: null, menuType: 'node' }));
  }, []);

  return {
    contextMenu,
    canvasClickPosition,
    handleNodeContextMenu,
    handleEdgeContextMenu,
    handleCanvasContextMenu,
    closeContextMenu,
  };
}
