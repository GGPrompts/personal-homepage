import type { Node } from "@xyflow/react";

// ---------------------------------------------------------------------------
// Core bookmark data types (mirrored from bookmarks.tsx to avoid coupling)
// ---------------------------------------------------------------------------

export interface BookmarkItem {
  id: string;
  name: string;
  url: string;
  folderId: string | null;
  icon?: string;
  description?: string;
  createdAt: string;
  type?: "link" | "terminal";
  command?: string;
  workingDir?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  icon?: string;
}

export interface BookmarksData {
  bookmarks: BookmarkItem[];
  folders: FolderItem[];
}

// ---------------------------------------------------------------------------
// React Flow node data types
// ---------------------------------------------------------------------------

export interface TerminalActions {
  run: (command: string, options?: { workingDir?: string; name?: string }) => void;
  paste: (command: string, options?: { workingDir?: string; name?: string }) => void;
  sendToChat: (command: string) => void;
  spawn: (bookmark: BookmarkItem) => void;
  available: boolean;
}

export interface BookmarkNodeData {
  bookmark: BookmarkItem;
  isTerminal: boolean;
  terminalActions?: TerminalActions;
  [key: string]: unknown; // required by @xyflow/react Node generic
}

export interface FolderNodeData {
  folder: FolderItem;
  bookmarks: BookmarkItem[];
  collapsed: boolean;
  isDropTarget?: boolean;
  onEditBookmark?: (bookmark: BookmarkItem) => void;
  onDeleteBookmark?: (id: string) => void;
  terminalActions?: TerminalActions;
  [key: string]: unknown; // required by @xyflow/react Node generic
}

export type BookmarkNode = Node<BookmarkNodeData, "bookmark">;
export type FolderNode = Node<FolderNodeData, "folder">;
export type DesktopNode = BookmarkNode | FolderNode;

// ---------------------------------------------------------------------------
// Layout persistence
// ---------------------------------------------------------------------------

export interface DesktopLayout {
  positions: Record<string, { x: number; y: number }>;
  version: number;
}
