import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs/promises"
import * as path from "path"

interface FileTreeNode {
  name: string
  path: string
  type: "file" | "directory"
  modified?: string
  children?: FileTreeNode[]
}

interface TreeGroup {
  name: string
  icon: string
  basePath: string
  tree: FileTreeNode
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
function shouldAlwaysShow(name: string): boolean {
  if (name === ".claude" || name === ".prompts" || name === ".claude-plugin") return true
  if (name === ".obsidian") return true
  if (/^\.env(\.[\w.-]+)?$/i.test(name)) return true
  if (name === ".gitignore" || name === ".dockerignore") return true
  return false
}

// Get Claude file type for backend classification
function getClaudeFileType(name: string, filePath: string): string | null {
  // CLAUDE.md and CLAUDE.local.md
  if (/^CLAUDE(\.local)?\.md$/i.test(name)) {
    return "claude-config"
  }
  // .claude directory itself
  if (name === ".claude") {
    return "claude-config"
  }
  // settings.json in .claude/
  if (name === "settings.json" && filePath.includes("/.claude/")) {
    return "claude-config"
  }
  // .mcp.json
  if (name === ".mcp.json") {
    return "mcp"
  }
  // AGENTS.md
  if (name === "AGENTS.md") {
    return "agent"
  }
  // Files inside .claude subdirectories
  if (filePath.includes("/.claude/")) {
    if (filePath.includes("/agents/")) return "agent"
    if (filePath.includes("/skills/")) return "skill"
    if (filePath.includes("/hooks/")) return "hook"
    if (filePath.includes("/commands/")) return "command"
  }
  // .prompts directory
  if (name === ".prompts") {
    return "prompt"
  }
  // .prompty files
  if (/\.prompty$/i.test(name)) {
    return "prompt"
  }
  // Files inside .prompts/
  if (filePath.includes("/.prompts/")) {
    return "prompt"
  }
  // plugins directory
  if (name === "plugins" || filePath.includes("/plugins/")) {
    return "plugin"
  }
  return null
}

// Helper to build a filtered tree (only including matching files, but preserving folder structure)
async function buildFilteredTree(
  dirPath: string,
  matcher: (name: string, filePath: string) => boolean,
  maxDepth: number = 5,
  currentDepth: number = 0,
  showHidden: boolean = false
): Promise<FileTreeNode | null> {
  try {
    const stats = await fs.stat(dirPath)
    const name = path.basename(dirPath)

    if (!stats.isDirectory()) {
      // It's a file - check if it matches
      if (matcher(name, dirPath)) {
        return {
          name,
          path: dirPath,
          type: "file",
          modified: stats.mtime.toISOString(),
        }
      }
      return null
    }

    // It's a directory
    if (currentDepth >= maxDepth) {
      return null // Don't go deeper
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const children: FileTreeNode[] = []

    // Sort: directories first, then alphabetically
    const sortedEntries = entries
      .filter((entry) => {
        // Always exclude node_modules and .git
        if (entry.name === "node_modules" || entry.name === ".git") return false
        // Handle hidden files
        if (!showHidden && entry.name.startsWith(".")) {
          return shouldAlwaysShow(entry.name)
        }
        return true
      })
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) {
          return a.isDirectory() ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

    for (const entry of sortedEntries) {
      const childPath = path.join(dirPath, entry.name)

      // Handle symlinks
      if (entry.isSymbolicLink()) {
        try {
          await fs.stat(childPath)
        } catch {
          continue // Broken symlink
        }
      }

      const child = await buildFilteredTree(
        childPath,
        matcher,
        maxDepth,
        currentDepth + 1,
        showHidden
      )
      if (child) {
        children.push(child)
      }
    }

    // Only include directory if it has matching children
    if (children.length > 0) {
      return {
        name,
        path: dirPath,
        type: "directory",
        children,
        modified: stats.mtime.toISOString(),
      }
    }

    return null
  } catch {
    return null
  }
}

// GET /api/files/list - Get filtered file list (prompts, claude, favorites)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filter = searchParams.get("filter") || "all"
    const workingDirParam = searchParams.get("workingDir") || process.cwd()
    const workingDir = expandTilde(workingDirParam)
    const showHidden = searchParams.get("showHidden") === "true"

    const homeDir = process.env.HOME || process.env.USERPROFILE || ""
    const trees: TreeGroup[] = []

    if (filter === "claude") {
      // Claude file matcher
      const claudeMatcher = (name: string, filePath: string) => {
        return getClaudeFileType(name, filePath) !== null
      }

      // Global ~/.claude/
      const globalClaudeDir = path.join(homeDir, ".claude")
      try {
        await fs.access(globalClaudeDir)
        const tree = await buildFilteredTree(
          globalClaudeDir,
          claudeMatcher,
          4,
          0,
          showHidden
        )
        if (tree) {
          trees.push({
            name: "Global (~/.claude/)",
            icon: "globe",
            basePath: globalClaudeDir,
            tree,
          })
        }
      } catch {
        // Directory doesn't exist
      }

      // Project .claude/ and root config files
      const projectClaudeDir = path.join(workingDir, ".claude")
      try {
        await fs.access(projectClaudeDir)
        const tree = await buildFilteredTree(
          projectClaudeDir,
          claudeMatcher,
          4,
          0,
          showHidden
        )
        if (tree) {
          trees.push({
            name: "Project (.claude/)",
            icon: "folder",
            basePath: projectClaudeDir,
            tree,
          })
        }
      } catch {
        // Directory doesn't exist
      }

      // Project root files (CLAUDE.md, .mcp.json)
      const rootFiles: FileTreeNode[] = []
      for (const name of ["CLAUDE.md", "CLAUDE.local.md", ".mcp.json"]) {
        const filePath = path.join(workingDir, name)
        try {
          await fs.access(filePath)
          const stats = await fs.stat(filePath)
          rootFiles.push({
            name,
            path: filePath,
            type: "file",
            modified: stats.mtime.toISOString(),
          })
        } catch {
          // File doesn't exist
        }
      }
      if (rootFiles.length > 0) {
        trees.push({
          name: "Project Root",
          icon: "file",
          basePath: workingDir,
          tree: {
            name: path.basename(workingDir),
            path: workingDir,
            type: "directory",
            children: rootFiles,
          },
        })
      }

      // Project plugins/
      const pluginsDir = path.join(workingDir, "plugins")
      try {
        await fs.access(pluginsDir)
        const tree = await buildFilteredTree(
          pluginsDir,
          () => true,
          3,
          0,
          showHidden
        )
        if (tree) {
          trees.push({
            name: "Plugins",
            icon: "plug",
            basePath: pluginsDir,
            tree,
          })
        }
      } catch {
        // Directory doesn't exist
      }
    } else if (filter === "prompts") {
      // Prompt file matcher
      const promptMatcher = (name: string) => {
        return /\.(prompty|md|yaml|yml|txt)$/i.test(name)
      }

      // Global ~/.prompts/
      const globalPromptsDir = path.join(homeDir, ".prompts")
      try {
        await fs.access(globalPromptsDir)
        const tree = await buildFilteredTree(
          globalPromptsDir,
          promptMatcher,
          5,
          0,
          showHidden
        )
        if (tree) {
          trees.push({
            name: "Global (~/.prompts/)",
            icon: "globe",
            basePath: globalPromptsDir,
            tree,
          })
        }
      } catch {
        // Directory doesn't exist
      }

      // Global ~/.claude/commands/
      const globalCommandsDir = path.join(homeDir, ".claude", "commands")
      try {
        await fs.access(globalCommandsDir)
        const tree = await buildFilteredTree(
          globalCommandsDir,
          (name) => /\.md$/i.test(name),
          3,
          0,
          showHidden
        )
        if (tree) {
          trees.push({
            name: "Global Commands (~/.claude/commands/)",
            icon: "zap",
            basePath: globalCommandsDir,
            tree,
          })
        }
      } catch {
        // Directory doesn't exist
      }

      // Project .prompts/
      const projectPromptsDir = path.join(workingDir, ".prompts")
      try {
        await fs.access(projectPromptsDir)
        const tree = await buildFilteredTree(
          projectPromptsDir,
          promptMatcher,
          5,
          0,
          showHidden
        )
        if (tree) {
          trees.push({
            name: "Project (.prompts/)",
            icon: "folder",
            basePath: projectPromptsDir,
            tree,
          })
        }
      } catch {
        // Directory doesn't exist
      }

      // Project .claude/commands/
      const projectCommandsDir = path.join(workingDir, ".claude", "commands")
      try {
        await fs.access(projectCommandsDir)
        const tree = await buildFilteredTree(
          projectCommandsDir,
          (name) => /\.md$/i.test(name),
          3,
          0,
          showHidden
        )
        if (tree) {
          trees.push({
            name: "Project Commands (.claude/commands/)",
            icon: "zap",
            basePath: projectCommandsDir,
            tree,
          })
        }
      } catch {
        // Directory doesn't exist
      }
    } else if (filter === "favorites") {
      // Favorites are handled client-side from localStorage
      // Return empty trees array
    }

    return NextResponse.json({ trees })
  } catch (error) {
    console.error("Error listing filtered files:", error)
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    )
  }
}
