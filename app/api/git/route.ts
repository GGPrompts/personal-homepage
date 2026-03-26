import { NextRequest, NextResponse } from "next/server"
import { execSync, exec } from "child_process"
import { existsSync } from "fs"
import { join } from "path"
import { homedir } from "os"
import { promisify } from "util"

const execAsync = promisify(exec)

export const dynamic = "force-dynamic"

const PROJECTS_DIR = join(homedir(), "projects")

// Expand ~ to home directory
function expandHome(p: string): string {
  if (p.startsWith("~/")) return join(homedir(), p.slice(2))
  if (p === "~") return homedir()
  return p
}

// Validate path is within allowed directories
function validatePath(path: string): boolean {
  const resolved = join(expandHome(path))
  return resolved.startsWith(PROJECTS_DIR) || resolved.startsWith(homedir())
}

// Find the git root by walking up from the given path
function findGitRoot(path: string): string | null {
  try {
    return execSync("git rev-parse --show-toplevel", {
      cwd: path,
      encoding: "utf-8",
      timeout: 3000,
    }).trim()
  } catch {
    return null
  }
}

interface GitFile {
  path: string
  status: "modified" | "added" | "deleted" | "renamed" | "copied" | "untracked"
  staged: boolean
  oldPath?: string // for renames
}

interface GitStatus {
  branch: string
  upstream: string | null
  ahead: number
  behind: number
  status: "clean" | "dirty" | "untracked"
  files: GitFile[]
  stashCount: number
}

// Parse git status --porcelain=v2 output
function parseGitStatus(output: string, branch: string): GitFile[] {
  const files: GitFile[] = []
  const lines = output.trim().split("\n").filter(Boolean)

  for (const line of lines) {
    if (line.startsWith("1 ") || line.startsWith("2 ")) {
      // Changed entry (1) or renamed/copied entry (2)
      const parts = line.split(" ")
      const xy = parts[1] // XY status codes
      const x = xy[0] // staged status
      const y = xy[1] // unstaged status

      if (line.startsWith("2 ")) {
        // Rename/copy - path is after the scores
        const pathPart = line.substring(line.lastIndexOf("\t") + 1)
        const [oldPath, newPath] = pathPart.split("\t")

        if (x !== ".") {
          files.push({
            path: newPath || oldPath,
            oldPath: oldPath,
            status: x === "R" ? "renamed" : "copied",
            staged: true,
          })
        }
        if (y !== ".") {
          files.push({
            path: newPath || oldPath,
            status: "modified",
            staged: false,
          })
        }
      } else {
        // Regular change
        const pathIndex = line.indexOf("\t")
        const path = pathIndex > -1 ? line.substring(pathIndex + 1) : parts[parts.length - 1]

        // Map status codes to our types
        const getStatus = (code: string): GitFile["status"] => {
          switch (code) {
            case "M": return "modified"
            case "A": return "added"
            case "D": return "deleted"
            case "R": return "renamed"
            case "C": return "copied"
            default: return "modified"
          }
        }

        if (x !== ".") {
          files.push({ path, status: getStatus(x), staged: true })
        }
        if (y !== ".") {
          files.push({ path, status: getStatus(y), staged: false })
        }
      }
    } else if (line.startsWith("? ")) {
      // Untracked file
      const path = line.substring(2)
      files.push({ path, status: "untracked", staged: false })
    } else if (line.startsWith("u ")) {
      // Unmerged file
      const pathIndex = line.indexOf("\t")
      const path = pathIndex > -1 ? line.substring(pathIndex + 1) : ""
      files.push({ path, status: "modified", staged: false })
    }
  }

  return files
}

async function getDetailedGitStatus(projectPath: string): Promise<GitStatus> {
  // Run branch, status, and stash in parallel (they're independent reads)
  const [branchResult, statusResult, stashResult] = await Promise.all([
    execAsync("git rev-parse --abbrev-ref HEAD", {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 5000,
    }),
    execAsync("git status --porcelain=v2", {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 10000,
    }),
    execAsync("git stash list", {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 5000,
    }).catch(() => ({ stdout: "", stderr: "" })),
  ])

  const branch = branchResult.stdout.trim()
  const files = parseGitStatus(statusResult.stdout, branch)
  const stashOutput = stashResult.stdout.trim()
  const stashCount = stashOutput ? stashOutput.split("\n").length : 0

  // Get upstream and ahead/behind (depends on branch name)
  let upstream: string | null = null
  let ahead = 0
  let behind = 0
  try {
    upstream = (await execAsync(`git rev-parse --abbrev-ref ${branch}@{upstream}`, {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 5000,
    })).stdout.trim()
  } catch {
    // No upstream
  }

  if (upstream) {
    try {
      const countOutput = (await execAsync(`git rev-list --left-right --count ${branch}...${upstream}`, {
        cwd: projectPath,
        encoding: "utf-8",
        timeout: 5000,
      })).stdout.trim()
      const [a, b] = countOutput.split(/\s+/).map(Number)
      ahead = a || 0
      behind = b || 0
    } catch {
      // Error getting counts
    }
  }

  // Determine overall status
  let status: GitStatus["status"] = "clean"
  if (files.length > 0) {
    const hasModified = files.some((f) => f.status !== "untracked")
    status = hasModified ? "dirty" : "untracked"
  }

  return {
    branch,
    upstream,
    ahead,
    behind,
    status,
    files,
    stashCount,
  }
}

/**
 * Lightweight status after local-only mutations (stage/unstage/discard).
 * Skips upstream/ahead/behind and stash since those don't change.
 */
async function getLightGitStatus(projectPath: string, knownBranch?: string): Promise<GitStatus> {
  const [branchResult, statusResult] = await Promise.all([
    knownBranch
      ? Promise.resolve({ stdout: knownBranch, stderr: "" })
      : execAsync("git rev-parse --abbrev-ref HEAD", {
          cwd: projectPath,
          encoding: "utf-8",
          timeout: 5000,
        }),
    execAsync("git status --porcelain=v2", {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 10000,
    }),
  ])

  const branch = branchResult.stdout.trim()
  const files = parseGitStatus(statusResult.stdout, branch)

  let status: GitStatus["status"] = "clean"
  if (files.length > 0) {
    const hasModified = files.some((f) => f.status !== "untracked")
    status = hasModified ? "dirty" : "untracked"
  }

  return {
    branch,
    upstream: null,
    ahead: 0,
    behind: 0,
    status,
    files,
    stashCount: 0,
  }
}

// GET - Get git status
export async function GET(request: NextRequest) {
  const rawPath = request.nextUrl.searchParams.get("path")

  if (!rawPath) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 })
  }

  const path = expandHome(rawPath)

  if (!validatePath(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 403 })
  }

  if (!existsSync(path)) {
    return NextResponse.json({ error: "Path does not exist" }, { status: 404 })
  }

  const gitRoot = findGitRoot(path)
  if (!gitRoot) {
    return NextResponse.json({ error: "Not a git repository" }, { status: 400 })
  }

  try {
    const status = await getDetailedGitStatus(gitRoot)
    return NextResponse.json(status)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get git status"
    console.error("Git status error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST - Execute git action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path: rawPostPath, action, files, message } = body as {
      path: string
      action: "fetch" | "pull" | "push" | "sync" | "stage" | "unstage" | "commit" | "discard"
      files?: string[]
      message?: string
    }

    if (!rawPostPath || !action) {
      return NextResponse.json({ error: "Path and action are required" }, { status: 400 })
    }

    const path = expandHome(rawPostPath)

    if (!validatePath(path)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 })
    }

    if (!existsSync(path)) {
      return NextResponse.json({ error: "Path does not exist" }, { status: 404 })
    }

    const gitRootPost = findGitRoot(path)
    if (!gitRootPost) {
      return NextResponse.json({ error: "Not a git repository" }, { status: 400 })
    }

    const execOpts = { cwd: gitRootPost, encoding: "utf-8" as const, timeout: 60000 }
    let output = ""

    switch (action) {
      case "fetch": {
        const { stdout, stderr } = await execAsync("git fetch --all --prune", execOpts)
        output = stdout + stderr
        break
      }

      case "pull": {
        const { stdout, stderr } = await execAsync("git pull", execOpts)
        output = stdout + stderr
        break
      }

      case "push": {
        const { stdout, stderr } = await execAsync("git push", execOpts)
        output = stdout + stderr
        break
      }

      case "sync": {
        // Fetch, then pull, then push
        const results: string[] = []

        try {
          const { stdout: fetchOut, stderr: fetchErr } = await execAsync("git fetch --all --prune", execOpts)
          results.push("=== Fetch ===", fetchOut + fetchErr)
        } catch (e) {
          results.push("=== Fetch (failed) ===", (e as Error).message)
        }

        try {
          const { stdout: pullOut, stderr: pullErr } = await execAsync("git pull", execOpts)
          results.push("=== Pull ===", pullOut + pullErr)
        } catch (e) {
          results.push("=== Pull (failed) ===", (e as Error).message)
        }

        try {
          const { stdout: pushOut, stderr: pushErr } = await execAsync("git push", execOpts)
          results.push("=== Push ===", pushOut + pushErr)
        } catch (e) {
          results.push("=== Push (failed) ===", (e as Error).message)
        }

        output = results.join("\n")
        break
      }

      case "stage": {
        if (!files || files.length === 0) {
          // Stage all
          const { stdout, stderr } = await execAsync("git add -A", execOpts)
          output = stdout + stderr || "All files staged"
        } else {
          // Stage specific files
          const escaped = files.map((f) => `"${f.replace(/"/g, '\\"')}"`).join(" ")
          const { stdout, stderr } = await execAsync(`git add ${escaped}`, execOpts)
          output = stdout + stderr || `Staged ${files.length} file(s)`
        }
        break
      }

      case "unstage": {
        if (!files || files.length === 0) {
          // Unstage all
          const { stdout, stderr } = await execAsync("git reset HEAD", execOpts)
          output = stdout + stderr || "All files unstaged"
        } else {
          // Unstage specific files
          const escaped = files.map((f) => `"${f.replace(/"/g, '\\"')}"`).join(" ")
          const { stdout, stderr } = await execAsync(`git reset HEAD ${escaped}`, execOpts)
          output = stdout + stderr || `Unstaged ${files.length} file(s)`
        }
        break
      }

      case "commit": {
        if (!message) {
          return NextResponse.json({ error: "Commit message is required" }, { status: 400 })
        }
        const escaped = message.replace(/"/g, '\\"').replace(/\$/g, '\\$')
        const { stdout, stderr } = await execAsync(`git commit -m "${escaped}"`, execOpts)
        output = stdout + stderr
        break
      }

      case "discard": {
        if (!files || files.length === 0) {
          return NextResponse.json({ error: "Files are required for discard" }, { status: 400 })
        }
        // Check each file - if untracked, remove it; if modified, checkout
        for (const file of files) {
          try {
            // Try to checkout (for tracked files)
            await execAsync(`git checkout -- "${file.replace(/"/g, '\\"')}"`, execOpts)
          } catch {
            // If that fails, it might be an untracked file - we won't delete those automatically
            // User should use rm manually for safety
          }
        }
        output = `Discarded changes to ${files.length} file(s)`
        break
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Get updated status after action
    // For local-only mutations (stage/unstage/discard), use lightweight status
    // that skips upstream/ahead/behind and stash queries
    const useLight = action === "stage" || action === "unstage" || action === "discard"
    const status = useLight
      ? await getLightGitStatus(gitRootPost)
      : await getDetailedGitStatus(gitRootPost)

    return NextResponse.json({ success: true, output, status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Git operation failed"
    console.error("Git action error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
