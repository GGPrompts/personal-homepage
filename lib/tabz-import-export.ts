/**
 * TabzChrome Import/Export Utilities
 *
 * Handles conversion between Personal Homepage bookmarks and TabzChrome JSON formats.
 *
 * TabzChrome Profile Export Format:
 * {
 *   profiles: TabzProfile[],
 *   categorySettings: { [name]: { color, collapsed?, order? } },
 *   exportedAt: ISO timestamp,
 *   version: "1.0"
 * }
 *
 * TabzChrome Bookmark Format (Chrome API style):
 * {
 *   id: string,
 *   title: string,
 *   url?: string,
 *   parentId?: string,
 *   index?: number,
 *   dateAdded?: number,
 *   children?: BookmarkNode[]
 * }
 */

// ============================================================================
// TYPES - TabzChrome Native Formats
// ============================================================================

export interface TabzProfile {
  id: string
  name: string
  workingDir: string
  command?: string
  fontSize?: number
  fontFamily?: string
  themeName?: string
  backgroundGradient?: string
  panelColor?: string
  transparency?: number
  backgroundMedia?: string
  backgroundMediaType?: "none" | "image" | "video"
  backgroundMediaOpacity?: number
  audioOverrides?: TabzProfileAudioOverrides
  category?: string
  reference?: string
  pinnedToNewTab?: boolean
  useDefaultTheme?: boolean
}

export interface TabzProfileAudioOverrides {
  mode?: "default" | "enabled" | "disabled"
  voice?: string
  rate?: string
  pitch?: string
}

export interface TabzCategorySettings {
  [categoryName: string]: {
    color: string
    collapsed?: boolean
    order?: number
  }
}

export interface TabzProfileExport {
  profiles: TabzProfile[]
  categorySettings?: TabzCategorySettings
  exportedAt: string
  version: string
}

export interface TabzBookmarkNode {
  id: string
  title: string
  url?: string
  parentId?: string
  index?: number
  dateAdded?: number
  children?: TabzBookmarkNode[]
}

export interface TabzBookmarkExport {
  bookmarks: TabzBookmarkNode[]
  exportedAt: string
  version: string
}

// ============================================================================
// TYPES - Personal Homepage Formats
// ============================================================================

export interface TerminalContextAction {
  label: string
  command: string
}

export interface BookmarkItem {
  id: string
  name: string
  url: string
  folderId: string | null
  icon?: string
  description?: string
  createdAt: string
  type?: "link" | "terminal"
  command?: string
  workingDir?: string
  profile?: string
  autoExecute?: boolean
  sendToChat?: boolean
  color?: string
  contextActions?: TerminalContextAction[]
}

export interface FolderItem {
  id: string
  name: string
  parentId: string | null
  icon?: string
}

export interface BookmarksData {
  bookmarks: BookmarkItem[]
  folders: FolderItem[]
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export terminal bookmarks as TabzChrome profiles
 */
export function exportAsTabzProfiles(data: BookmarksData): TabzProfileExport {
  const profiles: TabzProfile[] = []
  const categorySettings: TabzCategorySettings = {}

  // Build folder name lookup for categories
  const folderNameMap = new Map<string, string>()
  data.folders.forEach(f => folderNameMap.set(f.id, f.name))

  // Convert terminal bookmarks to profiles
  data.bookmarks
    .filter(b => b.type === "terminal" && b.command)
    .forEach(bookmark => {
      const profile: TabzProfile = {
        id: `homepage-${bookmark.id}`,
        name: bookmark.name,
        workingDir: bookmark.workingDir || "",
        command: bookmark.command,
      }

      // Map optional fields
      if (bookmark.profile) {
        profile.reference = bookmark.profile // Reference to existing TabzChrome profile
      }

      // Use folder as category
      if (bookmark.folderId) {
        const folderName = folderNameMap.get(bookmark.folderId)
        if (folderName) {
          profile.category = folderName
          // Add category settings if we have a color
          if (bookmark.color && !categorySettings[folderName]) {
            categorySettings[folderName] = {
              color: bookmark.color,
            }
          }
        }
      }

      profiles.push(profile)
    })

  return {
    profiles,
    categorySettings: Object.keys(categorySettings).length > 0 ? categorySettings : undefined,
    exportedAt: new Date().toISOString(),
    version: "1.0",
  }
}

/**
 * Export all bookmarks in TabzChrome bookmark tree format
 */
export function exportAsTabzBookmarks(data: BookmarksData): TabzBookmarkExport {
  const rootNodes: TabzBookmarkNode[] = []

  // Build a map of folder id -> children
  const folderChildren = new Map<string | null, (BookmarkItem | FolderItem)[]>()

  // Initialize with empty arrays
  folderChildren.set(null, []) // Root level
  data.folders.forEach(f => folderChildren.set(f.id, []))

  // Populate with items
  data.folders.forEach(folder => {
    const parent = folder.parentId
    if (!folderChildren.has(parent)) folderChildren.set(parent, [])
    folderChildren.get(parent)!.push(folder)
  })

  data.bookmarks.forEach(bookmark => {
    const parent = bookmark.folderId
    if (!folderChildren.has(parent)) folderChildren.set(parent, [])
    folderChildren.get(parent)!.push(bookmark)
  })

  // Recursive builder
  const buildNode = (item: BookmarkItem | FolderItem, index: number): TabzBookmarkNode => {
    if ("url" in item || "command" in item) {
      // It's a bookmark
      const bookmark = item as BookmarkItem
      const node: TabzBookmarkNode = {
        id: bookmark.id,
        title: bookmark.name,
        index,
        dateAdded: new Date(bookmark.createdAt).getTime(),
      }

      if (bookmark.type === "terminal" && bookmark.command) {
        // Encode terminal command in URL-like format for TabzChrome
        const params = new URLSearchParams()
        params.set("command", bookmark.command)
        if (bookmark.workingDir) params.set("workingDir", bookmark.workingDir)
        if (bookmark.profile) params.set("profile", bookmark.profile)
        if (bookmark.autoExecute === false) params.set("autoExecute", "false")
        if (bookmark.sendToChat) params.set("sendToChat", "true")
        if (bookmark.color) params.set("color", bookmark.color)
        node.url = `terminal://${bookmark.command}?${params.toString()}`
      } else {
        node.url = bookmark.url
      }

      return node
    } else {
      // It's a folder
      const folder = item as FolderItem
      const children = folderChildren.get(folder.id) || []
      const node: TabzBookmarkNode = {
        id: folder.id,
        title: folder.name,
        index,
        children: children.map((child, i) => buildNode(child, i)),
      }
      return node
    }
  }

  // Build root level items
  const rootItems = folderChildren.get(null) || []
  rootItems.forEach((item, index) => {
    rootNodes.push(buildNode(item, index))
  })

  return {
    bookmarks: rootNodes,
    exportedAt: new Date().toISOString(),
    version: "1.0",
  }
}

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

/**
 * Validate and parse TabzChrome profile export
 */
export function parseTabzProfileExport(json: string): TabzProfileExport {
  const data = JSON.parse(json)

  if (!data.profiles || !Array.isArray(data.profiles)) {
    throw new Error("Invalid TabzChrome profile export: missing profiles array")
  }

  // Filter to valid profiles (must have id and name)
  const validProfiles = data.profiles.filter(
    (p: any) => p && typeof p.id === "string" && typeof p.name === "string"
  )

  return {
    profiles: validProfiles,
    categorySettings: data.categorySettings || {},
    exportedAt: data.exportedAt || new Date().toISOString(),
    version: data.version || "1.0",
  }
}

/**
 * Validate and parse TabzChrome bookmark export
 */
export function parseTabzBookmarkExport(json: string): TabzBookmarkExport {
  const data = JSON.parse(json)

  // Handle both array format and object format
  let bookmarks: TabzBookmarkNode[]
  if (Array.isArray(data)) {
    bookmarks = data
  } else if (data.bookmarks && Array.isArray(data.bookmarks)) {
    bookmarks = data.bookmarks
  } else if (data.children && Array.isArray(data.children)) {
    // Chrome exports with root node that has children
    bookmarks = data.children
  } else {
    throw new Error("Invalid TabzChrome bookmark export: missing bookmarks array")
  }

  return {
    bookmarks,
    exportedAt: data.exportedAt || new Date().toISOString(),
    version: data.version || "1.0",
  }
}

/**
 * Profile data prepared for immediate spawning
 */
export interface SpawnReadyProfile {
  name: string
  command: string
  workingDir?: string
  profile?: string  // TabzChrome profile name
  color?: string
  themeName?: string
  backgroundGradient?: string
  panelColor?: string
  transparency?: number
}

/**
 * Prepare TabzChrome profiles for immediate spawning
 * Returns profiles with resolved workingDir (extracted from reference if needed)
 */
export function prepareProfilesForSpawn(
  profileExport: TabzProfileExport
): SpawnReadyProfile[] {
  return profileExport.profiles
    .filter(p => p.command) // Only profiles with commands
    .map(profile => {
      // Determine working directory:
      // 1. Use profile.workingDir if set
      // 2. Extract project dir from reference path if workingDir is empty
      let workingDir = profile.workingDir || undefined
      if (!workingDir && profile.reference) {
        workingDir = extractProjectDirFromReference(profile.reference)
      }

      return {
        name: profile.name,
        command: profile.command!,
        workingDir,
        profile: profile.themeName || profile.reference,  // Use theme name for profile
        color: profile.panelColor,  // Use panelColor for tab color
        themeName: profile.themeName,
        backgroundGradient: profile.backgroundGradient,
        panelColor: profile.panelColor,
        transparency: profile.transparency,
      }
    })
}

/**
 * Import TabzChrome profiles as terminal bookmarks
 */
export function importTabzProfiles(
  profileExport: TabzProfileExport,
  existingData: BookmarksData,
  mode: "merge" | "replace" = "merge"
): BookmarksData {
  const now = new Date().toISOString()

  // Build category -> folder id map
  const categoryFolderMap = new Map<string, string>()
  existingData.folders.forEach(f => categoryFolderMap.set(f.name, f.id))

  // Create folders for new categories
  const newFolders: FolderItem[] = mode === "replace" ? [] : [...existingData.folders]
  const existingCategoryColors = new Map<string, string>()

  // Extract colors from categorySettings
  if (profileExport.categorySettings) {
    Object.entries(profileExport.categorySettings).forEach(([name, settings]) => {
      existingCategoryColors.set(name, settings.color)
    })
  }

  profileExport.profiles.forEach(profile => {
    if (profile.category && !categoryFolderMap.has(profile.category)) {
      const folderId = generateId()
      categoryFolderMap.set(profile.category, folderId)
      newFolders.push({
        id: folderId,
        name: profile.category,
        parentId: null,
      })
    }
  })

  // Convert profiles to bookmarks
  const newBookmarks: BookmarkItem[] = profileExport.profiles
    .filter(p => p.command) // Only profiles with commands
    .map(profile => {
      // Determine working directory:
      // 1. Use profile.workingDir if set
      // 2. Extract project dir from reference path if workingDir is empty
      let workingDir = profile.workingDir || undefined
      if (!workingDir && profile.reference) {
        workingDir = extractProjectDirFromReference(profile.reference)
      }

      const bookmark: BookmarkItem = {
        id: profile.id.startsWith("homepage-")
          ? profile.id.replace("homepage-", "")
          : generateId(),
        name: profile.name,
        url: `terminal://${profile.command}`,
        folderId: profile.category ? categoryFolderMap.get(profile.category) || null : null,
        createdAt: now,
        type: "terminal",
        command: profile.command,
        workingDir,
        profile: profile.reference || undefined,
        color: profile.category ? existingCategoryColors.get(profile.category) : undefined,
      }
      return bookmark
    })

  if (mode === "replace") {
    // Replace all terminal bookmarks, keep link bookmarks
    const linkBookmarks = existingData.bookmarks.filter(b => b.type !== "terminal")
    return {
      folders: newFolders,
      bookmarks: [...linkBookmarks, ...newBookmarks],
    }
  }

  // Merge mode: add new profiles, skip duplicates by ID
  const existingIds = new Set(existingData.bookmarks.map(b => b.id))
  const uniqueNewBookmarks = newBookmarks.filter(b => !existingIds.has(b.id))

  return {
    folders: newFolders,
    bookmarks: [...existingData.bookmarks, ...uniqueNewBookmarks],
  }
}

/**
 * Import TabzChrome bookmarks
 */
export function importTabzBookmarks(
  bookmarkExport: TabzBookmarkExport,
  existingData: BookmarksData,
  mode: "merge" | "replace" = "merge"
): BookmarksData {
  const now = new Date().toISOString()
  const newFolders: FolderItem[] = mode === "replace" ? [] : [...existingData.folders]
  const newBookmarks: BookmarkItem[] = mode === "replace" ? [] : [...existingData.bookmarks]
  const existingIds = new Set(existingData.bookmarks.map(b => b.id))
  const existingFolderIds = new Set(existingData.folders.map(f => f.id))

  // Recursive import of bookmark tree
  const importNode = (node: TabzBookmarkNode, parentFolderId: string | null) => {
    if (node.children) {
      // It's a folder
      const folderId = existingFolderIds.has(node.id) ? generateId() : node.id
      if (!existingFolderIds.has(folderId)) {
        newFolders.push({
          id: folderId,
          name: node.title,
          parentId: parentFolderId,
        })
        existingFolderIds.add(folderId)
      }
      node.children.forEach(child => importNode(child, folderId))
    } else if (node.url) {
      // It's a bookmark
      const bookmarkId = existingIds.has(node.id) ? generateId() : node.id

      // Skip if already exists in merge mode
      if (mode === "merge" && existingIds.has(node.id)) {
        return
      }

      // Parse terminal:// URLs
      let bookmark: BookmarkItem
      if (node.url.startsWith("terminal://")) {
        const parsed = parseTerminalUrl(node.url)
        bookmark = {
          id: bookmarkId,
          name: node.title,
          url: node.url,
          folderId: parentFolderId,
          createdAt: node.dateAdded ? new Date(node.dateAdded).toISOString() : now,
          type: "terminal",
          command: parsed.command,
          workingDir: parsed.workingDir,
          profile: parsed.profile,
          autoExecute: parsed.autoExecute,
          sendToChat: parsed.sendToChat,
          color: parsed.color,
        }
      } else {
        bookmark = {
          id: bookmarkId,
          name: node.title,
          url: node.url,
          folderId: parentFolderId,
          createdAt: node.dateAdded ? new Date(node.dateAdded).toISOString() : now,
          type: "link",
        }
      }

      newBookmarks.push(bookmark)
      existingIds.add(bookmarkId)
    }
  }

  // Import all root nodes
  bookmarkExport.bookmarks.forEach(node => importNode(node, null))

  return {
    folders: newFolders,
    bookmarks: newBookmarks,
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

/**
 * Extract project directory from a reference doc path
 *
 * Reference docs are typically at paths like:
 * - ~/projects/TabzChrome/docs/reference/claude-code.md -> ~/projects/TabzChrome
 * - /home/user/code/myproject/docs/api.md -> /home/user/code/myproject
 *
 * The heuristic: find common project indicator directories (docs, src, lib, etc.)
 * and return the parent of that directory as the project root.
 */
function extractProjectDirFromReference(refPath: string): string | undefined {
  if (!refPath) return undefined

  // Normalize path separators
  const normalized = refPath.replace(/\\/g, '/')

  // Common project subdirectories that indicate we're inside a project
  const projectIndicators = [
    '/docs/',
    '/doc/',
    '/reference/',
    '/src/',
    '/lib/',
    '/packages/',
    '/scripts/',
    '/.claude/',
    '/.github/',
  ]

  // Find the first matching indicator and extract the parent directory
  for (const indicator of projectIndicators) {
    const index = normalized.indexOf(indicator)
    if (index > 0) {
      return normalized.substring(0, index)
    }
  }

  // Fallback: if the reference is a file (has extension), return its parent directory
  const lastSlash = normalized.lastIndexOf('/')
  const lastDot = normalized.lastIndexOf('.')
  if (lastDot > lastSlash && lastSlash > 0) {
    return normalized.substring(0, lastSlash)
  }

  return undefined
}

/**
 * Parse terminal:// URL into components
 */
function parseTerminalUrl(url: string): {
  command: string
  workingDir?: string
  profile?: string
  autoExecute?: boolean
  sendToChat?: boolean
  color?: string
} {
  // Format: terminal://command?workingDir=...&profile=...
  const withoutProtocol = url.replace("terminal://", "")
  const [commandPart, queryPart] = withoutProtocol.split("?")

  const result: ReturnType<typeof parseTerminalUrl> = {
    command: decodeURIComponent(commandPart),
  }

  if (queryPart) {
    const params = new URLSearchParams(queryPart)
    if (params.has("workingDir")) result.workingDir = params.get("workingDir")!
    if (params.has("profile")) result.profile = params.get("profile")!
    if (params.has("autoExecute")) result.autoExecute = params.get("autoExecute") !== "false"
    if (params.has("sendToChat")) result.sendToChat = params.get("sendToChat") === "true"
    if (params.has("color")) result.color = params.get("color")!
  }

  return result
}

// ============================================================================
// FILE DOWNLOAD/UPLOAD HELPERS
// ============================================================================

/**
 * Download data as a JSON file
 */
export function downloadJson(data: object, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Read a JSON file
 */
export function readJsonFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file)
  })
}

/**
 * Generate filename with date
 */
export function generateFilename(type: "profiles" | "bookmarks"): string {
  const date = new Date().toISOString().split("T")[0]
  return `tabz-${type}-${date}.json`
}
