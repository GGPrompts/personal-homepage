import { NextRequest, NextResponse } from "next/server"
import * as path from "path"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

// Expand ~ to home directory
function expandTilde(filePath: string): string {
  if (filePath.startsWith("~")) {
    const home = process.env.HOME || process.env.USERPROFILE || ""
    return path.join(home, filePath.slice(1))
  }
  return filePath
}

// Git status types
type GitStatus = "staged" | "modified" | "untracked"

interface GitStatusInfo {
  status: GitStatus
  indexStatus: string
  workTreeStatus: string
}

interface GitStatusMap {
  [path: string]: GitStatusInfo
}

// GET /api/files/git-status - Get git status for files in a directory
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const targetPath = searchParams.get("path") || process.cwd()

    const expandedPath = expandTilde(targetPath)
    const resolvedPath = path.resolve(expandedPath)

    // Find git root for this path
    let gitRoot: string
    try {
      const { stdout } = await execAsync("git rev-parse --show-toplevel", {
        cwd: resolvedPath,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      })
      gitRoot = stdout.trim()
    } catch {
      // Not a git repo
      return NextResponse.json({ isGitRepo: false, files: {} })
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

      const indexStatus = line[0] // Status in index (staged area)
      const workTreeStatus = line[1] // Status in work tree
      let filePath = line.substring(3) // File path starts at position 3

      // Handle renamed files (format: "R  old -> new")
      if (filePath.includes(" -> ")) {
        filePath = filePath.split(" -> ")[1]
      }

      // Convert relative path to absolute for matching
      const absolutePath = path.join(gitRoot, filePath)

      // Determine status type (priority: staged > modified > untracked)
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

    return NextResponse.json({
      isGitRepo: true,
      gitRoot,
      files,
    })
  } catch (error) {
    console.error("Error getting git status:", error)
    return NextResponse.json(
      { error: "Failed to get git status" },
      { status: 500 }
    )
  }
}
