"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  type NodeMouseHandler,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Pencil, Trash2, Bookmark, FolderPlus } from "lucide-react";

import { BookmarkNode } from "./BookmarkNode";
import { FolderNode } from "./FolderNode";
import {
  bookmarksToNodes,
  saveDesktopLayout,
  loadDesktopLayout,
} from "./adapter";
import type {
  BookmarksData,
  BookmarkItem,
  FolderItem,
  DesktopLayout,
} from "./types";

// ---------------------------------------------------------------------------
// Node types (must be defined outside component to avoid re-renders)
// ---------------------------------------------------------------------------

const nodeTypes = { bookmark: BookmarkNode, folder: FolderNode };

// ---------------------------------------------------------------------------
// Context menu types
// ---------------------------------------------------------------------------

interface ContextMenuState {
  x: number;
  y: number;
  type: "canvas" | "bookmark" | "folder";
  nodeId?: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DesktopCanvasProps {
  data: BookmarksData;
  onEditBookmark: (bookmark: BookmarkItem) => void;
  onDeleteBookmark: (id: string) => void;
  onEditFolder: (folder: FolderItem) => void;
  onDeleteFolder: (id: string) => void;
  onOpenAddBookmark: () => void;
  onOpenAddFolder: () => void;
}

// ---------------------------------------------------------------------------
// Inner component (must be inside ReactFlowProvider)
// ---------------------------------------------------------------------------

function DesktopCanvasInner({
  data,
  onEditBookmark,
  onDeleteBookmark,
  onEditFolder,
  onDeleteFolder,
  onOpenAddBookmark,
  onOpenAddFolder,
}: DesktopCanvasProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build initial nodes from data + saved layout
  const initialNodes = useMemo(() => {
    const saved = loadDesktopLayout();
    const layout: DesktopLayout = saved ?? { positions: {}, version: 1 };
    return bookmarksToNodes(data, layout);
  }, [data]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  // Sync nodes when data changes (new bookmarks/folders added externally)
  React.useEffect(() => {
    const saved = loadDesktopLayout();
    const layout: DesktopLayout = saved ?? { positions: {}, version: 1 };
    const updated = bookmarksToNodes(data, layout);
    setNodes(updated);
  }, [data, setNodes]);

  // Save layout on drag stop
  const onNodeDragStop: NodeMouseHandler = useCallback(
    (_event, _node) => {
      // Use a callback to read current nodes from state
      setNodes((currentNodes) => {
        saveDesktopLayout(currentNodes);
        return currentNodes;
      });
    },
    [setNodes],
  );

  // Close context menu on pane click
  const onPaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Canvas context menu (right-click on empty space)
  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      setContextMenu({
        x: (event as React.MouseEvent).clientX,
        y: (event as React.MouseEvent).clientY,
        type: "canvas",
      });
    },
    [],
  );

  // Node context menu
  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      setContextMenu({
        x: (event as unknown as React.MouseEvent).clientX,
        y: (event as unknown as React.MouseEvent).clientY,
        type: node.type === "folder" ? "folder" : "bookmark",
        nodeId: node.id,
      });
    },
    [],
  );

  // Context menu action helpers
  const handleContextMenuAction = useCallback(
    (action: string) => {
      if (!contextMenu) return;

      switch (action) {
        case "new-bookmark":
          onOpenAddBookmark();
          break;
        case "new-folder":
          onOpenAddFolder();
          break;
        case "edit": {
          if (contextMenu.type === "bookmark" && contextMenu.nodeId) {
            const bm = data.bookmarks.find((b) => b.id === contextMenu.nodeId);
            if (bm) onEditBookmark(bm);
          } else if (contextMenu.type === "folder" && contextMenu.nodeId) {
            const folder = data.folders.find(
              (f) => f.id === contextMenu.nodeId,
            );
            if (folder) onEditFolder(folder);
          }
          break;
        }
        case "delete": {
          if (contextMenu.type === "bookmark" && contextMenu.nodeId) {
            onDeleteBookmark(contextMenu.nodeId);
          } else if (contextMenu.type === "folder" && contextMenu.nodeId) {
            onDeleteFolder(contextMenu.nodeId);
          }
          break;
        }
      }

      setContextMenu(null);
    },
    [
      contextMenu,
      data,
      onEditBookmark,
      onDeleteBookmark,
      onEditFolder,
      onDeleteFolder,
      onOpenAddBookmark,
      onOpenAddFolder,
    ],
  );

  return (
    <div ref={containerRef} className="relative w-full h-[600px] rounded-lg border border-border/40 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        zoomOnDoubleClick={false}
        minZoom={0.3}
        maxZoom={2}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        deleteKeyCode={null}
        nodesDraggable
        elementsSelectable
      >
        <Background variant={"dots" as never} gap={20} size={1} color="#30363d" />
        <Controls showInteractive={false} />
      </ReactFlow>

      {/* Context Menu Overlay */}
      {contextMenu && (
        <>
          {/* Invisible backdrop to catch clicks */}
          <div
            className="fixed inset-0 z-50"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 min-w-[160px] bg-popover/95 backdrop-blur-sm border border-border rounded-md shadow-lg py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.type === "canvas" ? (
              <>
                <button
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors"
                  onClick={() => handleContextMenuAction("new-bookmark")}
                >
                  <Bookmark className="h-4 w-4" />
                  New Bookmark
                </button>
                <button
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors"
                  onClick={() => handleContextMenuAction("new-folder")}
                >
                  <FolderPlus className="h-4 w-4" />
                  New Folder
                </button>
              </>
            ) : (
              <>
                <button
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors"
                  onClick={() => handleContextMenuAction("edit")}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-destructive hover:bg-muted/60 transition-colors"
                  onClick={() => handleContextMenuAction("delete")}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported wrapper with ReactFlowProvider
// ---------------------------------------------------------------------------

export function DesktopCanvas(props: DesktopCanvasProps) {
  return (
    <ReactFlowProvider>
      <DesktopCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
