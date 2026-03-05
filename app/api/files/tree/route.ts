import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs/promises"
import * as path from "path"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

interface FileTreeNode {
  name: string
  path: string
  type: "file" | "directory"
  size?: number
  modified: string
  children?: FileTreeNode[]
  isObsidianVault?: boolean
}

// Simple in-memory cache for tree results
const treeCache = new Map<string, { data: FileTreeNode; timestamp: number }>()
const CACHE_TTL_MS = 5000 // 5 seconds
const CACHE_EVICT_MS = 30000 // Evict entries older than 30 seconds

function getCacheKey(path: string, depth: number, showHidden: boolean): string {
  return `${path}:${depth}:${showHidden}`
}

function evictStaleEntries(): void {
  const now = Date.now()
  for (const [key, entry] of treeCache) {
    if (now - entry.timestamp > CACHE_EVICT_MS) {
      treeCache.delete(key)
    }
  }
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

// Concurrency-limited parallel map to avoid file descriptor exhaustion
async function parallelMap<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number = 10): Promise<R[]> {
  const results: R[] = []
  let index = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
}

// Helper function to build file tree recursively
// isKnownDirectory: from parent's readdir withFileTypes — avoids redundant stat() calls
//   true = known directory, false = known file, undefined = root call (must stat)
async function buildFileTree(
  dirPath: string,
  depth: number = 5,
  currentDepth: number = 0,
  showHidden: boolean = false,
  isKnownDirectory?: boolean
): Promise<FileTreeNode | null> {
  try {
    const name = path.basename(dirPath)

    // If we already know this is a file from parent's readdir, return without stat()
    if (isKnownDirectory === false) {
      return {
        name,
        path: dirPath,
        type: "file",
        modified: "",
      }
    }

    // For root call (isKnownDirectory === undefined), we need to stat to determine type
    if (isKnownDirectory === undefined) {
      const stats = await fs.stat(dirPath)
      if (!stats.isDirectory()) {
        return {
          name,
          path: dirPath,
          type: "file",
          size: stats.size,
          modified: stats.mtime.toISOString(),
        }
      }
    }

    // At this point we know it's a directory (either from parent's readdir or from stat)

    // For directories at depth limit, include them but with empty children
    // (so they show up in the tree and can be clicked to navigate)
    if (currentDepth >= depth) {
      return {
        name,
        path: dirPath,
        type: "directory",
        children: [],
        modified: "",
      }
    }

    // It's a directory within depth limit - recurse into it
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

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

    // Process entries in parallel with concurrency limit
    const childResults = await parallelMap(sortedEntries, async (entry) => {
      const childPath = path.join(dirPath, entry.name)
      try {
        // Check if this is a symlink and if it's broken
        if (entry.isSymbolicLink()) {
          try {
            // Try to stat the symlink target - this will fail if broken
            await fs.stat(childPath)
          } catch {
            // Broken symlink - skip it silently
            return null
          }
        }

        return await buildFileTree(
          childPath,
          depth,
          currentDepth + 1,
          showHidden,
          entry.isDirectory()
        )
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
        return null
      }
    }, 10)

    const children = childResults.filter((child): child is FileTreeNode => child !== null)

    return {
      name,
      path: dirPath,
      type: "directory",
      children,
      modified: "",
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

// Git status types (shared with git-status route)
type GitStatus = "staged" | "modified" | "untracked"

interface GitStatusInfo {
  status: GitStatus
  indexStatus: string
  workTreeStatus: string
}

interface GitStatusMap {
  [filePath: string]: GitStatusInfo
}

interface GitStatusResult {
  isGitRepo: boolean
  gitRoot?: string
  files: GitStatusMap
}

async function getGitStatus(resolvedPath: string): Promise<GitStatusResult> {
  // Find git root for this path
  let gitRoot: string
  try {
    const { stdout } = await execAsync("git rev-parse --show-toplevel", {
      cwd: resolvedPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    })
    gitRoot = stdout.trim()
  } catch {
    return { isGitRepo: false, files: {} }
  }

  // Get git status
  const { stdout: statusOutput } = await execAsync(
    "git status -b --porcelain",
    {
      cwd: gitRoot,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    }
  )

  // Parse the status output into a map of absolute path -> status
  const files: GitStatusMap = {}
  const lines = statusOutput.trim().split("\n")

  for (const line of lines) {
    if (!line || line.length < 2 || line.startsWith("##")) continue

    const indexStatus = line[0]
    const workTreeStatus = line[1]
    let filePath = line.substring(3)

    // Handle renamed files (format: "R  old -> new")
    if (filePath.includes(" -> ")) {
      filePath = filePath.split(" -> ")[1]
    }

    const absolutePath = path.join(gitRoot, filePath)

    let status: GitStatus | null = null
    if (indexStatus === "?" && workTreeStatus === "?") {
      status = "untracked"
    } else if (indexStatus !== " " && indexStatus !== "?") {
      status = "staged"
    } else if (workTreeStatus !== " " && workTreeStatus !== "?") {
      status = "modified"
    }

    if (status) {
      files[absolutePath] = { status, indexStatus, workTreeStatus }
    }
  }

  return { isGitRepo: true, gitRoot, files }
}

// GET /api/files/tree - Get directory tree
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const targetPath = searchParams.get("path") || "~"
    const depth = parseInt(searchParams.get("depth") || "5", 10)
    const showHidden = searchParams.get("showHidden") === "true"
    const includeGitStatus = searchParams.get("includeGitStatus") === "true"

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

    // Check cache first
    const cacheKey = getCacheKey(resolvedPath, depth, showHidden)
    const cached = treeCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data)
    }

    // Build the file tree
    const tree = await buildFileTree(resolvedPath, depth, 0, showHidden)

    if (!tree) {
      return NextResponse.json(
        { error: "Failed to build file tree" },
        { status: 500 }
      )
    }

    // Store in cache and evict stale entries
    treeCache.set(cacheKey, { data: tree, timestamp: Date.now() })
    evictStaleEntries()

    // If git status requested, fetch it and return wrapped response
    if (includeGitStatus) {
      let gitStatusResult: GitStatusResult = { isGitRepo: false, files: {} }
      try {
        gitStatusResult = await getGitStatus(resolvedPath)
      } catch (err) {
        // Git status is optional - don't fail the whole request
        console.debug("[tree] Git status fetch failed:", err)
      }
      return NextResponse.json({ tree, gitStatus: gitStatusResult })
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
