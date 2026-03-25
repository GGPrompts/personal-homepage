import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import { existsSync } from "fs"
import { join } from "path"
import { homedir } from "os"

export const dynamic = "force-dynamic"

const PROJECTS_DIR = join(homedir(), "projects")

// Validate path is within allowed directories
function validatePath(path: string): boolean {
  const resolved = join(path)
  return resolved.startsWith(PROJECTS_DIR) || resolved.startsWith(homedir())
}

// Check if directory is a git repo
function isGitRepo(path: string): boolean {
  return existsSync(join(path, ".git"))
}

// Sanitize a ref/SHA to prevent command injection
function sanitizeRef(ref: string): string {
  // Allow only alphanumeric, hyphens, underscores, dots, slashes, tildes, carets
  if (!/^[a-zA-Z0-9\-_./~^@{}]+$/.test(ref)) {
    throw new Error(`Invalid ref: ${ref}`)
  }
  return ref
}

interface DiffFile {
  path: string
  status: "modified" | "added" | "deleted" | "renamed"
  insertions: number
  deletions: number
}

interface DiffStats {
  filesChanged: number
  insertions: number
  deletions: number
}

/**
 * Parse `git diff --name-status` output into a status map.
 * Lines look like:
 *   M       src/foo.ts
 *   A       src/bar.ts
 *   D       old.ts
 *   R100    old-name.ts    new-name.ts
 */
function parseNameStatus(output: string): Map<string, DiffFile["status"]> {
  const statusMap = new Map<string, DiffFile["status"]>()
  const lines = output.trim().split("\n").filter(Boolean)

  for (const line of lines) {
    const parts = line.split("\t")
    if (parts.length < 2) continue

    const code = parts[0].trim()
    const filePath = parts.length >= 3 ? parts[2] : parts[1] // renamed: use new path

    if (code.startsWith("R")) {
      statusMap.set(filePath, "renamed")
    } else if (code === "A") {
      statusMap.set(parts[1], "added")
    } else if (code === "D") {
      statusMap.set(parts[1], "deleted")
    } else {
      statusMap.set(parts[1], "modified")
    }
  }

  return statusMap
}

/**
 * Parse `git diff --numstat` output into per-file insertion/deletion counts.
 * Lines look like:
 *   5       3       src/foo.ts
 *   -       -       binary-file.png    (binary files)
 */
function parseNumstat(
  output: string,
  statusMap: Map<string, DiffFile["status"]>
): { files: DiffFile[]; stats: DiffStats } {
  const files: DiffFile[] = []
  let totalInsertions = 0
  let totalDeletions = 0

  const lines = output.trim().split("\n").filter(Boolean)

  for (const line of lines) {
    const parts = line.split("\t")
    if (parts.length < 3) continue

    const ins = parts[0] === "-" ? 0 : parseInt(parts[0], 10)
    const del = parts[1] === "-" ? 0 : parseInt(parts[1], 10)
    // For renames, numstat shows "old => new" or just the path
    const filePath = parts.length > 3 ? parts[3] : parts[2]

    files.push({
      path: filePath,
      status: statusMap.get(filePath) || "modified",
      insertions: ins,
      deletions: del,
    })

    totalInsertions += ins
    totalDeletions += del
  }

  return {
    files,
    stats: {
      filesChanged: files.length,
      insertions: totalInsertions,
      deletions: totalDeletions,
    },
  }
}

/**
 * GET /api/git/diff
 *
 * Query parameters:
 *   path (required)  - repo root path
 *   file (optional)  - relative file path for single-file diff
 *   commit (optional) - SHA to show that commit's diff (git show)
 *   from / to (optional) - diff between two refs (git diff from..to)
 *   staged (optional) - if "true", show staged diff (git diff --cached)
 *
 * Default (no commit/from/to/staged): git diff (unstaged working tree)
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const path = params.get("path")
  const file = params.get("file")
  const commit = params.get("commit")
  const from = params.get("from")
  const to = params.get("to")
  const staged = params.get("staged")

  if (!path) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 })
  }

  if (!validatePath(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 403 })
  }

  if (!existsSync(path)) {
    return NextResponse.json({ error: "Path does not exist" }, { status: 404 })
  }

  if (!isGitRepo(path)) {
    return NextResponse.json(
      { error: "Not a git repository" },
      { status: 400 }
    )
  }

  try {
    const execOpts = {
      cwd: path,
      encoding: "utf-8" as const,
      timeout: 15000,
      maxBuffer: 10 * 1024 * 1024, // 10MB for large diffs
    }

    // Build the base git command parts based on mode
    let diffArgs: string
    let numstatArgs: string
    let nameStatusArgs: string

    if (commit) {
      // Show a specific commit's diff
      const safeCommit = sanitizeRef(commit)
      diffArgs = `git show --format="" ${safeCommit}`
      numstatArgs = `git show --format="" --numstat ${safeCommit}`
      nameStatusArgs = `git show --format="" --name-status ${safeCommit}`
    } else if (from && to) {
      // Diff between two refs
      const safeFrom = sanitizeRef(from)
      const safeTo = sanitizeRef(to)
      diffArgs = `git diff ${safeFrom}..${safeTo}`
      numstatArgs = `git diff --numstat ${safeFrom}..${safeTo}`
      nameStatusArgs = `git diff --name-status ${safeFrom}..${safeTo}`
    } else if (staged === "true") {
      // Staged changes
      diffArgs = "git diff --cached"
      numstatArgs = "git diff --cached --numstat"
      nameStatusArgs = "git diff --cached --name-status"
    } else {
      // Default: unstaged working tree changes
      diffArgs = "git diff"
      numstatArgs = "git diff --numstat"
      nameStatusArgs = "git diff --name-status"
    }

    // Append file filter if specified
    const fileArg = file ? ` -- "${file.replace(/"/g, '\\"')}"` : ""
    diffArgs += fileArg
    numstatArgs += fileArg
    nameStatusArgs += fileArg

    // Run all three commands
    let diffOutput = ""
    let numstatOutput = ""
    let nameStatusOutput = ""

    try {
      diffOutput = execSync(diffArgs, execOpts)
    } catch (err) {
      // git diff exits 0 on success, but git show may fail for invalid SHAs
      if (commit || (from && to)) {
        const msg = err instanceof Error ? err.message : "Git command failed"
        return NextResponse.json({ error: msg }, { status: 400 })
      }
      // For working tree diff, empty output is normal
    }

    try {
      numstatOutput = execSync(numstatArgs, execOpts)
    } catch {
      // Non-critical: stats may not be available
    }

    try {
      nameStatusOutput = execSync(nameStatusArgs, execOpts)
    } catch {
      // Non-critical: status may not be available
    }

    // Parse file statuses and numstat
    const statusMap = parseNameStatus(nameStatusOutput)
    const { files, stats } = parseNumstat(numstatOutput, statusMap)

    return NextResponse.json({
      diff: diffOutput,
      files,
      stats,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get git diff"
    console.error("Git diff error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
