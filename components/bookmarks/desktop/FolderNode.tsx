"use client";

import { memo, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { NodeProps } from "@xyflow/react";
import { NodeResizer } from "@xyflow/react";
import {
  ChevronRight,
  ChevronDown,
  ClipboardPaste,
  Copy,
  ExternalLink,
  Folder,
  FolderOpen,
  Globe,
  MessageSquare,
  Pencil,
  Play,
  Terminal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { FolderNodeData, BookmarkItem } from "./types";

// ---------------------------------------------------------------------------
// Favicon helper (mirrors bookmarks.tsx FaviconWithFallback)
// ---------------------------------------------------------------------------

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return "";
  }
}

function MiniFavicon({ url, className }: { url: string; className?: string }) {
  const [hasError, setHasError] = useState(false);
  const src = getFaviconUrl(url);

  if (hasError || !src) {
    return <Globe className={className} />;
  }

  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

// ---------------------------------------------------------------------------
// Mini bookmark item inside expanded folder — clickable
// ---------------------------------------------------------------------------

function MiniBookmarkItem({
  bookmark,
  onContextMenu,
  onDoubleClick,
}: {
  bookmark: BookmarkItem;
  onContextMenu: (e: React.MouseEvent, bookmark: BookmarkItem) => void;
  onDoubleClick: (bookmark: BookmarkItem) => void;
}) {
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick(bookmark);
    },
    [bookmark, onDoubleClick],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e, bookmark);
    },
    [bookmark, onContextMenu],
  );

  return (
    <div
      className="nopan nodrag flex flex-col items-center gap-0.5 p-1 rounded hover:bg-muted/40 transition-colors cursor-pointer"
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      title={bookmark.name}
    >
      <MiniFavicon
        url={bookmark.url}
        className="h-8 w-8 rounded object-contain pointer-events-none"
      />
      <span className="text-[9px] text-muted-foreground leading-tight text-center truncate w-full pointer-events-none">
        {bookmark.name}
      </span>
    </div>
  );
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
// FolderNode — collapsible container for bookmarks on the desktop canvas
// ---------------------------------------------------------------------------

interface BookmarkContextMenu {
  x: number;
  y: number;
  bookmark: BookmarkItem;
}

function FolderNodeComponent({
  data,
  selected,
}: NodeProps & { data: FolderNodeData }) {
  const { folder, bookmarks, isDropTarget, terminalActions } = data;
  const [isCollapsed, setIsCollapsed] = useState(data.collapsed);
  const [ctxMenu, setCtxMenu] = useState<BookmarkContextMenu | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  const toggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCollapsed((prev) => !prev);
  }, []);

  const handleBookmarkContextMenu = useCallback(
    (e: React.MouseEvent, bookmark: BookmarkItem) => {
      setCtxMenu({ x: e.clientX, y: e.clientY, bookmark });
    },
    [],
  );

  const handleBookmarkDoubleClick = useCallback(
    (bookmark: BookmarkItem) => {
      if (bookmark.type === "terminal" && terminalActions) {
        terminalActions.spawn(bookmark);
      } else if (bookmark.url && bookmark.type !== "terminal") {
        window.open(bookmark.url, "_blank");
      }
    },
    [terminalActions],
  );

  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  const showResizer = selected && !isCollapsed;

  const dropTargetClasses = isDropTarget
    ? "border-primary/60 bg-primary/10"
    : "border-border/40";

  // -- Header row (draggable — no nopan/nodrag) -----------------------------
  const header = (
    <div
      className="flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing"
      onDoubleClick={toggleCollapse}
    >
      <span className="shrink-0 text-muted-foreground">
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </span>
      <span className="shrink-0 text-base">
        {folder.icon ? (
          <span>{folder.icon}</span>
        ) : isCollapsed ? (
          <Folder className="h-4 w-4 text-muted-foreground" />
        ) : (
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        )}
      </span>
      <span className="text-sm font-medium truncate flex-1">
        {folder.name}
      </span>
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
        {bookmarks.length}
      </Badge>
    </div>
  );

  // -- Context menu for bookmarks inside folder (portaled to body) ----------
  const contextMenuOverlay = ctxMenu
    ? createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={closeCtxMenu} />
          <div
            className="fixed z-[100] min-w-[180px] bg-popover/95 backdrop-blur-sm border border-border rounded-md shadow-lg py-1"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            {ctxMenu.bookmark.type === "terminal" ? (
              <>
                {ctxMenu.bookmark.command && (
                  <>
                    <CtxButton
                      icon={Play}
                      label="Run in Terminal"
                      disabled={!terminalActions?.available}
                      onClick={() => {
                        terminalActions?.run(ctxMenu.bookmark.command!, {
                          workingDir: ctxMenu.bookmark.workingDir,
                          name: ctxMenu.bookmark.name,
                        });
                        closeCtxMenu();
                      }}
                    />
                    <CtxButton
                      icon={ClipboardPaste}
                      label="Paste to Terminal"
                      disabled={!terminalActions?.available}
                      onClick={() => {
                        terminalActions?.paste(ctxMenu.bookmark.command!, {
                          workingDir: ctxMenu.bookmark.workingDir,
                          name: ctxMenu.bookmark.name,
                          profile: ctxMenu.bookmark.profile,
                          color: ctxMenu.bookmark.color,
                        });
                        closeCtxMenu();
                      }}
                    />
                    <CtxButton
                      icon={MessageSquare}
                      label="Send to Chat"
                      disabled={!terminalActions?.available}
                      onClick={() => {
                        terminalActions?.sendToChat(ctxMenu.bookmark.command!);
                        toast.success("Sent to TabzChrome chat");
                        closeCtxMenu();
                      }}
                    />
                  </>
                )}
                <div className="h-px bg-border/40 my-1" />
                <CtxButton
                  icon={Copy}
                  label="Copy Command"
                  onClick={() => {
                    navigator.clipboard.writeText(ctxMenu.bookmark.command || "");
                    toast.success("Command copied");
                    closeCtxMenu();
                  }}
                />
                {/* Custom context actions */}
                {ctxMenu.bookmark.contextActions &&
                  ctxMenu.bookmark.contextActions.length > 0 && (
                    <>
                      <div className="h-px bg-border/40 my-1" />
                      {ctxMenu.bookmark.contextActions.map((action, idx) => (
                        <CtxButton
                          key={idx}
                          icon={Terminal}
                          label={action.label}
                          disabled={!terminalActions?.available}
                          onClick={() => {
                            terminalActions?.run(action.command, {
                              workingDir: ctxMenu.bookmark.workingDir,
                              name: action.label,
                            });
                            closeCtxMenu();
                          }}
                        />
                      ))}
                    </>
                  )}
              </>
            ) : (
              /* Web link bookmark */
              <CtxButton
                icon={ExternalLink}
                label="Open in New Tab"
                onClick={() => {
                  window.open(ctxMenu.bookmark.url, "_blank");
                  closeCtxMenu();
                }}
              />
            )}
            {/* Edit / Delete — always available */}
            <div className="h-px bg-border/40 my-1" />
            {data.onEditBookmark && (
              <CtxButton
                icon={Pencil}
                label="Edit"
                onClick={() => {
                  data.onEditBookmark!(ctxMenu.bookmark);
                  closeCtxMenu();
                }}
              />
            )}
            {data.onDeleteBookmark && (
              <CtxButton
                icon={Trash2}
                label="Delete"
                destructive
                onClick={() => {
                  data.onDeleteBookmark!(ctxMenu.bookmark.id);
                  closeCtxMenu();
                }}
              />
            )}
          </div>
        </>,
        document.body,
      )
    : null;

  // -- Collapsed view -------------------------------------------------------
  if (isCollapsed) {
    return (
      <div
        ref={nodeRef}
        className={`glass border rounded-lg select-none ${dropTargetClasses}`}
        style={{ minWidth: 180 }}
      >
        {header}
      </div>
    );
  }

  // -- Expanded view --------------------------------------------------------
  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={120}
        isVisible={showResizer}
        lineClassName="!border-primary/30"
        handleClassName="!h-2.5 !w-2.5 !border-primary/50 !bg-background"
      />
      <div
        ref={nodeRef}
        className={`glass border rounded-lg flex flex-col select-none ${dropTargetClasses}`}
        style={{ width: "100%", height: "100%", minWidth: 200, minHeight: 120 }}
      >
        <div className="border-b border-border/30">{header}</div>

        {/* Body — nopan/nodrag so bookmarks are interactive */}
        <div className="nopan nodrag flex-1 overflow-y-auto max-h-[300px] p-2">
          {bookmarks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Empty folder
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {bookmarks.map((bm) => (
                <MiniBookmarkItem
                  key={bm.id}
                  bookmark={bm}
                  onContextMenu={handleBookmarkContextMenu}
                  onDoubleClick={handleBookmarkDoubleClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {contextMenuOverlay}
    </>
  );
}

export const FolderNode = memo(FolderNodeComponent);
