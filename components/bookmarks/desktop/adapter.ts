import type { Node } from "@xyflow/react";
import type {
  BookmarksData,
  BookmarkNodeData,
  FolderNodeData,
  DesktopLayout,
  DesktopNode,
} from "./types";

const LAYOUT_STORAGE_KEY = "bookmarks-desktop-layout";
const GRID_GAP_X = 220;
const GRID_GAP_Y = 180;
const GRID_COLUMNS = 6;

// ---------------------------------------------------------------------------
// Auto-grid layout
// ---------------------------------------------------------------------------

/**
 * Arrange items in a grid pattern for initial layout.
 */
export function autoGridLayout(
  items: { id: string }[],
  startX = 40,
  startY = 40,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  items.forEach((item, index) => {
    const col = index % GRID_COLUMNS;
    const row = Math.floor(index / GRID_COLUMNS);
    positions[item.id] = {
      x: startX + col * GRID_GAP_X,
      y: startY + row * GRID_GAP_Y,
    };
  });

  return positions;
}

// ---------------------------------------------------------------------------
// Bookmarks -> React Flow Nodes
// ---------------------------------------------------------------------------

/**
 * Convert BookmarksData into React Flow Node[] with positions sourced from
 * the supplied layout. Falls back to auto-grid when a node has no saved
 * position.
 */
export function bookmarksToNodes(
  data: BookmarksData,
  layout: DesktopLayout,
): DesktopNode[] {
  const nodes: DesktopNode[] = [];

  // Group bookmarks by folder
  const bookmarksByFolder = new Map<string | null, typeof data.bookmarks>();
  for (const bm of data.bookmarks) {
    const key = bm.folderId;
    if (!bookmarksByFolder.has(key)) {
      bookmarksByFolder.set(key, []);
    }
    bookmarksByFolder.get(key)!.push(bm);
  }

  // Collect all top-level items (folders + root bookmarks) for fallback grid
  const rootBookmarks = bookmarksByFolder.get(null) ?? [];
  const topLevelItems: { id: string }[] = [
    ...data.folders,
    ...rootBookmarks,
  ];

  // Build a fallback grid for any items missing from the layout
  const fallbackPositions = autoGridLayout(topLevelItems);

  // Helper to resolve position
  const positionOf = (id: string) =>
    layout.positions[id] ?? fallbackPositions[id] ?? { x: 0, y: 0 };

  // Folder nodes
  for (const folder of data.folders) {
    const folderBookmarks = bookmarksByFolder.get(folder.id) ?? [];
    const pos = positionOf(folder.id);

    const node: Node<FolderNodeData, "folder"> = {
      id: folder.id,
      type: "folder",
      position: pos,
      data: {
        folder,
        bookmarks: folderBookmarks,
        collapsed: false,
      },
    };
    nodes.push(node);
  }

  // Root bookmark nodes (folderId === null)
  for (const bm of rootBookmarks) {
    const pos = positionOf(bm.id);

    const node: Node<BookmarkNodeData, "bookmark"> = {
      id: bm.id,
      type: "bookmark",
      position: pos,
      data: {
        bookmark: bm,
        isTerminal: bm.type === "terminal",
      },
    };
    nodes.push(node);
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Layout persistence (localStorage)
// ---------------------------------------------------------------------------

/**
 * Extract positions from current nodes and persist to localStorage.
 */
export function saveDesktopLayout(nodes: Node[]): DesktopLayout {
  const positions: Record<string, { x: number; y: number }> = {};

  for (const node of nodes) {
    positions[node.id] = { x: node.position.x, y: node.position.y };
  }

  const layout: DesktopLayout = { positions, version: 1 };

  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // localStorage may be unavailable (SSR, quota exceeded, etc.)
  }

  return layout;
}

/**
 * Load a previously saved desktop layout from localStorage.
 */
export function loadDesktopLayout(): DesktopLayout | null {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DesktopLayout;
    if (parsed && typeof parsed.version === "number" && parsed.positions) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
