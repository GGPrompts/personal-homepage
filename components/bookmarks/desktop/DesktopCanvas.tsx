"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useReactFlow,
  type NodeMouseHandler,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Bookmark,
  ClipboardPaste,
  Copy,
  ExternalLink,
  FolderPlus,
  MessageSquare,
  Pencil,
  Play,
  Terminal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

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
  TerminalActions,
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
// Context menu button helper
// ---------------------------------------------------------------------------

function CtxButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors ${
        disabled
          ? "opacity-40 cursor-not-allowed"
          : destructive
            ? "text-destructive hover:bg-muted/60"
            : "hover:bg-muted/60"
      }`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
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
  onMoveToFolder?: (bookmarkId: string, folderId: string) => void;
  terminalActions?: TerminalActions;
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
  onMoveToFolder,
  terminalActions,
}: DesktopCanvasProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { getIntersectingNodes } = useReactFlow();

  // Inject callbacks into nodes
  const injectCallbacks = useCallback(
    (nodes: Node[]) =>
      nodes.map((n) => {
        if (n.type === "folder") {
          return { ...n, data: { ...n.data, onEditBookmark, onDeleteBookmark, terminalActions } };
        }
        if (n.type === "bookmark") {
          return { ...n, data: { ...n.data, terminalActions } };
        }
        return n;
      }),
    [onEditBookmark, onDeleteBookmark, terminalActions],
  );

  // Build initial nodes from data + saved layout
  const initialNodes = useMemo(() => {
    const saved = loadDesktopLayout();
    const layout: DesktopLayout = saved ?? { positions: {}, version: 1 };
    return injectCallbacks(bookmarksToNodes(data, layout));
  }, [data, injectCallbacks]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  // Sync nodes when data changes (new bookmarks/folders added externally)
  React.useEffect(() => {
    const saved = loadDesktopLayout();
    const layout: DesktopLayout = saved ?? { positions: {}, version: 1 };
    const updated = injectCallbacks(bookmarksToNodes(data, layout));
    setNodes(updated);
  }, [data, setNodes, injectCallbacks]);

  // Highlight folder drop targets while dragging a bookmark
  const onNodeDrag: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type !== "bookmark") return;

      const intersecting = getIntersectingNodes(node);
      const overlappingFolderId = intersecting.find((n) => n.type === "folder")?.id ?? null;

      setNodes((currentNodes) =>
        currentNodes.map((n) => {
          if (n.type !== "folder") return n;
          const shouldHighlight = n.id === overlappingFolderId;
          if ((n.data as Record<string, unknown>).isDropTarget === shouldHighlight) return n;
          return {
            ...n,
            data: { ...n.data, isDropTarget: shouldHighlight },
          };
        }),
      );
    },
    [getIntersectingNodes, setNodes],
  );

  // Save layout on drag stop + handle drop onto folder
  const onNodeDragStop: NodeMouseHandler = useCallback(
    (_event, node) => {
      // Clear all drop-target highlights
      setNodes((currentNodes) =>
        currentNodes.map((n) =>
          n.type === "folder" && (n.data as Record<string, unknown>).isDropTarget
            ? { ...n, data: { ...n.data, isDropTarget: false } }
            : n,
        ),
      );

      // Check if a bookmark was dropped on a folder
      if (node.type === "bookmark" && onMoveToFolder) {
        const intersecting = getIntersectingNodes(node);
        const targetFolder = intersecting.find((n) => n.type === "folder");
        if (targetFolder) {
          const saved = loadDesktopLayout();
          if (saved) {
            delete saved.positions[node.id];
            try {
              localStorage.setItem("bookmarks-desktop-layout", JSON.stringify(saved));
            } catch {
              // ignore
            }
          }
          onMoveToFolder(node.id, targetFolder.id);
          return;
        }
      }

      // Normal drag — just persist positions
      setNodes((currentNodes) => {
        saveDesktopLayout(currentNodes);
        return currentNodes;
      });
    },
    [setNodes, getIntersectingNodes, onMoveToFolder],
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

  // Find the bookmark for the current context menu
  const ctxBookmark =
    contextMenu?.type === "bookmark" && contextMenu.nodeId
      ? data.bookmarks.find((b) => b.id === contextMenu.nodeId)
      : null;

  const ctxFolder =
    contextMenu?.type === "folder" && contextMenu.nodeId
      ? data.folders.find((f) => f.id === contextMenu.nodeId)
      : null;

  const closeMenu = useCallback(() => setContextMenu(null), []);

  // -- Render context menu content based on type ----------------------------
  function renderContextMenuContent() {
    if (!contextMenu) return null;

    if (contextMenu.type === "canvas") {
      return (
        <>
          <CtxButton icon={Bookmark} label="New Bookmark" onClick={() => { onOpenAddBookmark(); closeMenu(); }} />
          <CtxButton icon={FolderPlus} label="New Folder" onClick={() => { onOpenAddFolder(); closeMenu(); }} />
        </>
      );
    }

    if (contextMenu.type === "folder" && ctxFolder) {
      return (
        <>
          <CtxButton icon={Pencil} label="Edit" onClick={() => { onEditFolder(ctxFolder); closeMenu(); }} />
          <CtxButton icon={Trash2} label="Delete" destructive onClick={() => { onDeleteFolder(ctxFolder.id); closeMenu(); }} />
        </>
      );
    }

    if (contextMenu.type === "bookmark" && ctxBookmark) {
      if (ctxBookmark.type === "terminal") {
        return (
          <>
            {ctxBookmark.command && (
              <>
                <CtxButton
                  icon={Play}
                  label="Run in Terminal"
                  disabled={!terminalActions?.available}
                  onClick={() => {
                    terminalActions?.run(ctxBookmark.command!, {
                      workingDir: ctxBookmark.workingDir,
                      name: ctxBookmark.name,
                    });
                    closeMenu();
                  }}
                />
                <CtxButton
                  icon={ClipboardPaste}
                  label="Paste to Terminal"
                  disabled={!terminalActions?.available}
                  onClick={() => {
                    terminalActions?.paste(ctxBookmark.command!, {
                      workingDir: ctxBookmark.workingDir,
                      name: ctxBookmark.name,
                      profile: ctxBookmark.profile,
                      color: ctxBookmark.color,
                    });
                    closeMenu();
                  }}
                />
                <CtxButton
                  icon={MessageSquare}
                  label="Send to Chat"
                  disabled={!terminalActions?.available}
                  onClick={() => {
                    terminalActions?.sendToChat(ctxBookmark.command!);
                    toast.success("Sent to TabzChrome chat");
                    closeMenu();
                  }}
                />
              </>
            )}
            <div className="h-px bg-border/40 my-1" />
            <CtxButton
              icon={Copy}
              label="Copy Command"
              onClick={() => {
                navigator.clipboard.writeText(ctxBookmark.command || "");
                toast.success("Command copied");
                closeMenu();
              }}
            />
            {ctxBookmark.contextActions && ctxBookmark.contextActions.length > 0 && (
              <>
                <div className="h-px bg-border/40 my-1" />
                {ctxBookmark.contextActions.map((action, idx) => (
                  <CtxButton
                    key={idx}
                    icon={Terminal}
                    label={action.label}
                    disabled={!terminalActions?.available}
                    onClick={() => {
                      terminalActions?.run(action.command, {
                        workingDir: ctxBookmark.workingDir,
                        name: action.label,
                      });
                      closeMenu();
                    }}
                  />
                ))}
              </>
            )}
            <div className="h-px bg-border/40 my-1" />
            <CtxButton icon={Pencil} label="Edit" onClick={() => { onEditBookmark(ctxBookmark); closeMenu(); }} />
            <CtxButton icon={Trash2} label="Delete" destructive onClick={() => { onDeleteBookmark(ctxBookmark.id); closeMenu(); }} />
          </>
        );
      }

      // Web link bookmark
      return (
        <>
          <CtxButton
            icon={ExternalLink}
            label="Open in New Tab"
            onClick={() => {
              window.open(ctxBookmark.url, "_blank");
              closeMenu();
            }}
          />
          <div className="h-px bg-border/40 my-1" />
          <CtxButton icon={Pencil} label="Edit" onClick={() => { onEditBookmark(ctxBookmark); closeMenu(); }} />
          <CtxButton icon={Trash2} label="Delete" destructive onClick={() => { onDeleteBookmark(ctxBookmark.id); closeMenu(); }} />
        </>
      );
    }

    return null;
  }

  return (
    <div ref={containerRef} className="relative w-full h-[calc(100vh-12rem)] min-h-[400px] rounded-lg border border-border/40 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDrag={onNodeDrag}
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

      {/* Context Menu — portaled to body to escape React Flow transforms */}
      {contextMenu &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[100]" onClick={closeMenu} />
            <div
              className="fixed z-[100] min-w-[180px] bg-popover/95 backdrop-blur-sm border border-border rounded-md shadow-lg py-1"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              {renderContextMenuContent()}
            </div>
          </>,
          document.body,
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
