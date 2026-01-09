import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs/promises"
import * as path from "path"

interface FileTreeNode {
  name: string
  path: string
  type: "file" | "directory"
  size?: number
  modified: string
  children?: FileTreeNode[]
  isObsidianVault?: boolean
}

// Expand ~ to home directory
function expandTilde(filePath: string): string {
  if (filePath.startsWith("~")) {
    const home = process.env.HOME || process.env.USERPROFILE || ""
    return path.join(home, filePath.slice(1))
  }
  return filePath
}

// Check if a file/folder should always be visible even when showHidden=false
// These are AI-relevant files that developers need to monitor
function shouldAlwaysShow(name: string): boolean {
  // Core Claude ecosystem
  if (name === ".claude" || name === ".prompts" || name === ".claude-plugin") return true

  // Obsidian vault indicator
  if (name === ".obsidian") return true

  // Environment files (.env, .env.local, .env.production, etc.)
  if (/^\.env(\.[\w.-]+)?$/i.test(name)) return true

  // Git files
  if (name === ".gitignore") return true

  // Docker files
  if (name === ".dockerignore") return true

  // Secrets/credentials files (for awareness)
  if (/\.(pem|key|crt|cer|pfx|p12)$/i.test(name)) return true

  return false
}

// Security: Prevent path traversal attacks
function isPathSafe(requestedPath: string): boolean {
  const normalizedPath = path.normalize(requestedPath)

  // Block obvious traversal attempts
  if (normalizedPath.includes("..")) {
    // Re-check after normalization - if it still contains .., it's traversal
    const segments = normalizedPath.split(path.sep)
    if (segments.includes("..")) return false
  }

  // Block system directories
  const blockedPaths = ["/etc", "/var", "/usr", "/bin", "/sbin", "/boot", "/root"]
  for (const blocked of blockedPaths) {
    if (normalizedPath.startsWith(blocked + path.sep) || normalizedPath === blocked) {
      return false
    }
  }

  return true
}

// Helper function to build file tree recursively
async function buildFileTree(
  dirPath: string,
  depth: number = 5,
  currentDepth: number = 0,
  showHidden: boolean = false
): Promise<FileTreeNode | null> {
  try {
    const stats = await fs.stat(dirPath)
    const name = path.basename(dirPath)

    // Files are always included, regardless of depth
    if (!stats.isDirectory()) {
      return {
        name,
        path: dirPath,
        type: "file",
        size: stats.size,
        modified: stats.mtime.toISOString(),
      }
    }

    // For directories at depth limit, include them but with empty children
    // (so they show up in the tree and can be clicked to navigate)
    if (currentDepth >= depth) {
      return {
        name,
        path: dirPath,
        type: "directory",
        children: [],
        modified: stats.mtime.toISOString(),
      }
    }

    // It's a directory within depth limit - recurse into it
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const children: FileTreeNode[] = []

    // Check if this directory is an Obsidian vault (contains .obsidian folder)
    const isObsidianVault = entries.some(
      (e) => e.name === ".obsidian" && e.isDirectory()
    )

    // Filter and sort entries
    const sortedEntries = entries
      .filter((entry) => {
        // Always exclude node_modules
        if (entry.name === "node_modules") return false
        // If showHidden is true, show all files, otherwise filter hidden files
        if (!showHidden && entry.name.startsWith(".")) {
          // Always include AI-relevant hidden files/folders
          return shouldAlwaysShow(entry.name)
        }
        return true
      })
      .sort((a, b) => {
        // Directories first, then files
        if (a.isDirectory() !== b.isDirectory()) {
          return a.isDirectory() ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

    // Process entries
    for (const entry of sortedEntries) {
      const childPath = path.join(dirPath, entry.name)
      try {
        // Check if this is a symlink and if it's broken
        if (entry.isSymbolicLink()) {
          try {
            // Try to stat the symlink target - this will fail if broken
            await fs.stat(childPath)
          } catch {
            // Broken symlink - skip it silently
            continue
          }
        }

        const child = await buildFileTree(
          childPath,
          depth,
          currentDepth + 1,
          showHidden
        )
        if (child) children.push(child)
      } catch (err) {
        // Silently skip common errors:
        // - EACCES/EPERM: permission errors
        // - ENOENT: file disappeared between readdir and stat
        const error = err as NodeJS.ErrnoException
        if (
          error.code !== "EACCES" &&
          error.code !== "EPERM" &&
          error.code !== "ENOENT"
        ) {
          console.warn(`[buildFileTree] Skipping ${childPath}: ${error.message}`)
        }
      }
    }

    return {
      name,
      path: dirPath,
      type: "directory",
      children,
      modified: stats.mtime.toISOString(),
      ...(isObsidianVault && { isObsidianVault: true }),
    }
  } catch (err) {
    const error = err as NodeJS.ErrnoException
    // Silently skip permission denied errors
    if (error.code === "EACCES" || error.code === "EPERM") {
      return null
    }
    console.error(`Error building tree for ${dirPath}:`, err)
    return null
  }
}

// GET /api/files/tree - Get directory tree
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const targetPath = searchParams.get("path") || "~"
    const depth = parseInt(searchParams.get("depth") || "5", 10)
    const showHidden = searchParams.get("showHidden") === "true"

    // Expand ~ and resolve path
    const expandedPath = expandTilde(targetPath)
    const resolvedPath = path.resolve(expandedPath)

    // Security check
    if (!isPathSafe(resolvedPath)) {
      return NextResponse.json(
        { error: "Access denied: Path is not allowed" },
        { status: 403 }
      )
    }

    // Check if path exists
    try {
      await fs.access(resolvedPath)
    } catch {
      return NextResponse.json({ error: "Path not found" }, { status: 404 })
    }

    // Build the file tree
    const tree = await buildFileTree(resolvedPath, depth, 0, showHidden)

    if (!tree) {
      return NextResponse.json(
        { error: "Failed to build file tree" },
        { status: 500 }
      )
    }

    return NextResponse.json(tree)
  } catch (error) {
    console.error("Error getting file tree:", error)
    return NextResponse.json(
      { error: "Failed to get file tree" },
      { status: 500 }
    )
  }
}
