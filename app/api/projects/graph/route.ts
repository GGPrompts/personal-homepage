import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import { readdirSync, statSync, existsSync, readFileSync } from "fs"
import { join, resolve } from "path"
import { homedir } from "os"
import { detectTechStack } from "@/lib/projects"
import { getProjects as getBeadsProjects } from "@/lib/beads-db"

export const dynamic = "force-dynamic"

const DEFAULT_PROJECTS_DIR = join(homedir(), "projects")

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GraphNode {
  id: string
  name: string
  path: string
  techStack: string[]
  commitVelocity: number
  openIssues: number
  beadsPrefix?: string
  gitStatus: "clean" | "dirty" | "untracked"
  lastModified: string
}

interface GraphEdge {
  source: string
  target: string
  type: "dependency" | "beads-related"
}

interface GraphResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expandTilde(path: string): string {
  if (path.startsWith("~")) {
    return path.replace(/^~/, homedir())
  }
  return path
}

function getScanDirectory(workingDir?: string): string {
  if (!workingDir || workingDir === "~") {
    return DEFAULT_PROJECTS_DIR
  }
  return resolve(expandTilde(workingDir))
}

/** Get 7-day commit count for a project. Returns 0 on any error. */
function getCommitVelocity(projectPath: string): number {
  try {
    const output = execSync('git log --oneline --since="7 days ago"', {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim()
    if (!output) return 0
    return output.split("\n").length
  } catch {
    return 0
  }
}

/** Get git remote URL for matching with other data sources. */
function getRemoteUrl(projectPath: string): string | undefined {
  try {
    return execSync("git remote get-url origin", {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim()
  } catch {
    return undefined
  }
}

/** Get git status: clean, dirty, or untracked. */
function getGitStatus(projectPath: string): "clean" | "dirty" | "untracked" {
  try {
    // Check if repo has any commits
    execSync("git rev-parse HEAD", {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    })
  } catch {
    return "untracked"
  }

  try {
    const statusOutput = execSync("git status --porcelain", {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim()

    if (statusOutput.length === 0) return "clean"
    const hasModified = statusOutput.split("\n").some((line) => !line.startsWith("??"))
    return hasModified ? "dirty" : "untracked"
  } catch {
    return "clean"
  }
}

/**
 * Parse package.json dependencies and return any that match local project names.
 */
function getPackageJsonDeps(projectPath: string): string[] {
  const pkgPath = join(projectPath, "package.json")
  if (!existsSync(pkgPath)) return []

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
    const allDeps: string[] = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ]
    return allDeps
  } catch {
    return []
  }
}

/**
 * Parse Cargo.toml for path dependencies pointing to sibling projects.
 * Looks for lines like: some-crate = { path = "../sibling-project" }
 */
function getCargoPathDeps(projectPath: string): string[] {
  const cargoPath = join(projectPath, "Cargo.toml")
  if (!existsSync(cargoPath)) return []

  try {
    const content = readFileSync(cargoPath, "utf-8")
    const pathDeps: string[] = []

    // Match path = "../some-project" or path = "../some-project/"
    const pathRegex = /path\s*=\s*"\.\.\/([^"/]+)\/?"/g
    let match
    while ((match = pathRegex.exec(content)) !== null) {
      pathDeps.push(match[1])
    }
    return pathDeps
  } catch {
    return []
  }
}

/**
 * Scan a single directory entry and return a graph node if it's a valid project.
 */
function scanProjectForGraph(projectPath: string, name: string): GraphNode | null {
  try {
    const stat = statSync(projectPath)
    if (!stat.isDirectory()) return null

    const files = readdirSync(projectPath)

    // Skip if it's not a real project (no meaningful files)
    const hasProjectFiles = files.some((f) =>
      [
        "package.json",
        "go.mod",
        "Cargo.toml",
        "pyproject.toml",
        "requirements.txt",
        ".git",
        "Makefile",
        "CMakeLists.txt",
      ].includes(f)
    )
    if (!hasProjectFiles) return null

    const hasGit = existsSync(join(projectPath, ".git"))

    return {
      id: name,
      name,
      path: projectPath,
      techStack: detectTechStack(files),
      commitVelocity: hasGit ? getCommitVelocity(projectPath) : 0,
      openIssues: 0, // populated later from beads
      gitStatus: hasGit ? getGitStatus(projectPath) : "untracked",
      lastModified: stat.mtime.toISOString(),
    }
  } catch (error) {
    console.error(`[graph] Error scanning project ${projectPath}:`, error)
    return null
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const workingDir = searchParams.get("workingDir") || undefined

  const scanDir = getScanDirectory(workingDir)

  if (!existsSync(scanDir)) {
    return NextResponse.json(
      { error: `Directory not found: ${scanDir}`, nodes: [], edges: [] },
      { status: 404 }
    )
  }

  try {
    // ------------------------------------------------------------------
    // 1. Scan local projects
    // ------------------------------------------------------------------
    const nodes: GraphNode[] = []
    const projectNames = new Set<string>()
    // Map of project path -> dep names from package.json / Cargo.toml
    const rawDepsMap = new Map<string, string[]>()
    // Map of project path -> Cargo path dep names (already folder names)
    const cargoPathDepsMap = new Map<string, string[]>()

    const entries = readdirSync(scanDir)
    for (const entry of entries) {
      if (entry.startsWith(".")) continue
      const projectPath = join(scanDir, entry)
      const node = scanProjectForGraph(projectPath, entry)
      if (node) {
        nodes.push(node)
        projectNames.add(entry)
        rawDepsMap.set(entry, getPackageJsonDeps(projectPath))
        cargoPathDepsMap.set(entry, getCargoPathDeps(projectPath))
      }
    }

    // ------------------------------------------------------------------
    // 2. Fetch beads projects and issue counts
    // ------------------------------------------------------------------
    let beadsProjects: { prefix: string; name: string; description: string }[] = []
    try {
      beadsProjects = await getBeadsProjects()
    } catch (error) {
      console.error("[graph] Failed to fetch beads projects:", error)
      // Continue without beads data
    }

    // Build a map of beads project name -> prefix for matching
    const beadsByName = new Map<string, string>()
    for (const bp of beadsProjects) {
      // Match by project name (beads name often matches folder name)
      beadsByName.set(bp.name.toLowerCase(), bp.prefix)
    }

    // Count open issues per prefix
    const openIssuesByPrefix = new Map<string, number>()
    if (beadsProjects.length > 0) {
      try {
        // Query open issues grouped by prefix
        const { Pool } = await import("pg")
        const connectionString = process.env.BD_POSTGRES_URL
        if (connectionString) {
          const pool = new Pool({
            connectionString,
            max: 2,
            idleTimeoutMillis: 10_000,
            connectionTimeoutMillis: 5_000,
          })
          try {
            const res = await pool.query<{ prefix: string; count: string }>(
              `SELECT
                 split_part(id, '-', 1) AS prefix,
                 COUNT(*) AS count
               FROM beads.issues
               WHERE status != 'closed'
               GROUP BY split_part(id, '-', 1)`
            )
            for (const row of res.rows) {
              openIssuesByPrefix.set(row.prefix, parseInt(row.count, 10))
            }
          } finally {
            await pool.end()
          }
        }
      } catch (error) {
        console.error("[graph] Failed to count open issues:", error)
      }
    }

    // Enrich nodes with beads data
    for (const node of nodes) {
      const prefix = beadsByName.get(node.name.toLowerCase())
      if (prefix) {
        node.beadsPrefix = prefix
        node.openIssues = openIssuesByPrefix.get(prefix) || 0
      }
    }

    // ------------------------------------------------------------------
    // 3. Build edges
    // ------------------------------------------------------------------
    const edges: GraphEdge[] = []
    const edgeSet = new Set<string>() // dedupe "source->target"

    for (const node of nodes) {
      // --- package.json dependency edges ---
      const pkgDeps = rawDepsMap.get(node.id) || []
      for (const dep of pkgDeps) {
        // Check if any local project name matches this dep name
        // Dependencies can be scoped (@org/name) or plain (name)
        const depName = dep.startsWith("@") ? dep.split("/").pop() || dep : dep
        if (projectNames.has(depName) && depName !== node.id) {
          const key = `${node.id}->${depName}`
          if (!edgeSet.has(key)) {
            edgeSet.add(key)
            edges.push({
              source: node.id,
              target: depName,
              type: "dependency",
            })
          }
        }
      }

      // --- Cargo.toml path dependency edges ---
      const cargoDeps = cargoPathDepsMap.get(node.id) || []
      for (const dep of cargoDeps) {
        if (projectNames.has(dep) && dep !== node.id) {
          const key = `${node.id}->${dep}`
          if (!edgeSet.has(key)) {
            edgeSet.add(key)
            edges.push({
              source: node.id,
              target: dep,
              type: "dependency",
            })
          }
        }
      }
    }

    // --- beads-related edges: projects sharing the same prefix are related ---
    // (This is a lightweight heuristic — beads deps are issue-level, not project-level)
    // Skip this for now; real cross-project deps come from dependency files above.

    const response: GraphResponse = { nodes, edges }
    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build project graph"
    console.error("[graph] Error:", message)
    return NextResponse.json(
      { error: message, nodes: [], edges: [] },
      { status: 500 }
    )
  }
}
