import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import { existsSync } from "fs"
import { join } from "path"
import { homedir } from "os"
import { computeGraphLayout, type Commit, type Ref } from "@/lib/git/graph-layout"

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

/**
 * Parse the %D refs string into typed Ref objects.
 *
 * Examples:
 *   "HEAD -> main, origin/main, origin/HEAD"
 *   "tag: v1.0.0, main"
 *   ""
 */
function parseRefs(refsStr: string): Ref[] {
  if (!refsStr || !refsStr.trim()) return []

  return refsStr.split(",").map((r) => r.trim()).filter(Boolean).map((raw): Ref => {
    // HEAD -> branch
    if (raw.startsWith("HEAD -> ")) {
      return { name: raw.replace("HEAD -> ", ""), type: "head" }
    }
    // HEAD alone
    if (raw === "HEAD") {
      return { name: "HEAD", type: "head" }
    }
    // tag: name
    if (raw.startsWith("tag: ")) {
      return { name: raw.replace("tag: ", ""), type: "tag" }
    }
    // origin/... or any remote/...
    if (raw.includes("/")) {
      return { name: raw, type: "remote" }
    }
    // local branch
    return { name: raw, type: "branch" }
  })
}

/**
 * Parse a single git log line into a Commit.
 *
 * Format: %H|%P|%an|%ae|%aI|%s|%D
 * Note: %P (parents) can contain multiple space-separated hashes.
 * Note: %D (refs) can contain commas, so we split on '|' only for the
 * first 6 fields and treat the rest as refs.
 */
function parseLogLine(line: string): Commit | null {
  // Split into at most 7 parts (sha|parents|author|email|date|message|refs)
  const parts = line.split("|")
  if (parts.length < 6) return null

  const sha = parts[0]
  const parentsStr = parts[1]
  const author = parts[2]
  const email = parts[3]
  const date = parts[4]
  const message = parts[5]
  // Refs may contain '|' if there are pipes in branch names (unlikely but safe)
  const refsStr = parts.slice(6).join("|")

  const parents = parentsStr.trim() ? parentsStr.trim().split(" ") : []
  const refs = parseRefs(refsStr)

  return {
    sha,
    shortSha: sha.substring(0, 7),
    message,
    author,
    email,
    date,
    parents,
    refs,
  }
}

/**
 * GET /api/git/log
 *
 * Query params:
 *   path (required) - repo root path
 *   limit (default 50) - max commits
 *   skip (default 0) - offset for pagination
 *   branch (optional) - filter to specific branch (default: --all)
 *   file (optional) - filter to commits touching a specific file
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const rawPath = params.get("path")
  const limit = Math.min(Math.max(parseInt(params.get("limit") || "50", 10) || 50, 1), 500)
  const skip = Math.max(parseInt(params.get("skip") || "0", 10) || 0, 0)
  const branch = params.get("branch")
  const file = params.get("file")

  if (!rawPath) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 })
  }

  let path = expandHome(rawPath)

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

  // Use the git root for all operations (path may be a subdirectory)
  path = gitRoot

  try {
    // Build git log command
    // Request one extra commit to determine hasMore
    const fetchLimit = limit + 1
    const branchArg = branch ? `"${branch.replace(/"/g, '\\"')}"` : "--all"
    const skipArg = skip > 0 ? `--skip=${skip}` : ""
    const fileArg = file ? `-- "${file.replace(/"/g, '\\"')}"` : ""

    const cmd = [
      "git log",
      branchArg,
      `--format=%H|%P|%an|%ae|%aI|%s|%D`,
      `--max-count=${fetchLimit}`,
      skipArg,
      fileArg,
    ].filter(Boolean).join(" ")

    const logOutput = execSync(cmd, {
      cwd: path,
      encoding: "utf-8",
      timeout: 15000,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    })

    // Parse commits
    const lines = logOutput.trim().split("\n").filter(Boolean)
    const allCommits: Commit[] = []

    for (const line of lines) {
      const commit = parseLogLine(line)
      if (commit) {
        allCommits.push(commit)
      }
    }

    // Determine hasMore and trim to limit
    const hasMore = allCommits.length > limit
    const commits = allCommits.slice(0, limit)

    // Run graph layout
    const layout = computeGraphLayout(commits)

    // Get total commit count (cached per request, fast for most repos)
    let totalCommits = 0
    try {
      const countCmd = branch
        ? `git rev-list --count "${branch.replace(/"/g, '\\"')}"`
        : "git rev-list --count --all"
      totalCommits = parseInt(
        execSync(countCmd, { cwd: path, encoding: "utf-8", timeout: 5000 }).trim(),
        10
      ) || 0
    } catch {
      // Fallback: we know at least this many
      totalCommits = skip + commits.length + (hasMore ? 1 : 0)
    }

    // Get branch list with current branch marker
    let branches: { name: string; current: boolean }[] = []
    try {
      const branchOutput = execSync("git branch --format=%(refname:short)|%(HEAD)", {
        cwd: path,
        encoding: "utf-8",
        timeout: 5000,
      })
      branches = branchOutput.trim().split("\n").filter(Boolean).map((line) => {
        const [name, head] = line.split("|")
        return { name: name.trim(), current: head?.trim() === "*" }
      })
    } catch {
      // Non-critical, return empty
    }

    // Map layout nodes to response format
    const responseCommits = layout.nodes.map((node) => ({
      sha: node.sha,
      shortSha: node.shortSha,
      message: node.message,
      author: node.author,
      email: node.email,
      date: node.date,
      parents: node.parents,
      refs: node.refs,
      lane: node.lane,
    }))

    return NextResponse.json({
      commits: responseCommits,
      connections: layout.connections,
      branches,
      totalCommits,
      hasMore,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get git log"
    console.error("Git log error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
