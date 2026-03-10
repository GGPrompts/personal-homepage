export type {
  BookmarkItem,
  FolderItem,
  BookmarksData,
  BookmarkNodeData,
  FolderNodeData,
  BookmarkNode as BookmarkNodeType,
  FolderNode as FolderNodeType,
  DesktopNode,
  DesktopLayout,
  TerminalContextAction,
} from "./types";

export { BookmarkNode } from "./BookmarkNode";
export { FolderNode } from "./FolderNode";

export {
  bookmarksToNodes,
  autoGridLayout,
  saveDesktopLayout,
  loadDesktopLayout,
} from "./adapter";
