import { NextRequest, NextResponse } from "next/server"
import { execFileSync } from "child_process"

export const dynamic = "force-dynamic"

/**
 * Raw issue from bd list --json
 * Uses snake_case as returned by the CLI
 */
interface RawBeadsIssue {
  id: string
  title: string
  description?: string
  status: string
  priority: number
  issue_type?: string
  labels?: string[]
  assignee?: string
  estimate?: number
  branch?: string
  pr?: number
  external_ref?: string
  created_at?: string
  updated_at?: string
  closed_at?: string
  close_reason?: string
  dependency_count?: number
  dependent_count?: number
  // From bd show - detailed dependencies
  dependencies?: Array<{
    id: string
    title: string
    status: string
    dependency_type: string
  }>
  dependents?: Array<{
    id: string
    title: string
    status: string
    dependency_type: string
  }>
}

/**
 * Transform raw CLI output to API format
 * Converts snake_case to camelCase and normalizes fields
 */
function transformIssue(raw: RawBeadsIssue) {
  // Extract blocked_by and blocks from dependencies/dependents
  const blockedBy: string[] = []
  const blocks: string[] = []

  if (raw.dependencies) {
    for (const dep of raw.dependencies) {
      if (dep.dependency_type === "blocks" && dep.status !== "closed") {
        blockedBy.push(dep.id)
      }
    }
  }

  if (raw.dependents) {
    for (const dep of raw.dependents) {
      if (dep.dependency_type === "blocks") {
        blocks.push(dep.id)
      }
    }
  }

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    status: raw.status,
    priority: raw.priority,
    type: raw.issue_type,
    labels: raw.labels ?? [],
    assignee: raw.assignee,
    estimate: raw.estimate ? `${raw.estimate}m` : undefined,
    branch: raw.branch,
    pr: raw.pr,
    externalRef: raw.external_ref,
    blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
    blocks: blocks.length > 0 ? blocks : undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    closedAt: raw.closed_at,
    closeReason: raw.close_reason,
  }
}

/**
 * GET /api/beads/issues
 * List all beads issues
 *
 * Query params:
 *   - status: Filter by status (open, in_progress, closed, blocked)
 *   - priority: Filter by priority (1-4)
 *   - limit: Max number of issues (default 100)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get("status")
  const priority = searchParams.get("priority")
  const limit = searchParams.get("limit") || "100"

  try {
    // Build bd list command with filters using execFileSync for security
    const args = ["list", "--json"]

    if (status) {
      args.push("--status", status)
    }
    if (priority) {
      args.push("--priority", priority)
    }
    args.push("--limit", limit)

    const output = execFileSync("bd", args, {
      encoding: "utf-8",
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large issue lists
    })

    const rawIssues: RawBeadsIssue[] = JSON.parse(output)
    const issues = rawIssues.map(transformIssue)

    return NextResponse.json({
      issues,
      total: issues.length,
    })
  } catch (error) {
    console.error("Failed to list beads issues:", error)

    const message = error instanceof Error ? error.message : "Failed to list issues"

    // Check if it's a "no issues" case
    if (message.includes("no issues found") || message.includes("empty")) {
      return NextResponse.json({
        issues: [],
        total: 0,
      })
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/beads/issues
 * Create a new beads issue
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, priority, type, labels, assignee, estimate } = body

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    // Build bd create command using execFileSync for security
    const args = ["create", "--json", title]

    if (description) {
      args.push("-d", description)
    }
    if (priority !== undefined) {
      args.push("-p", String(priority))
    }
    if (type) {
      args.push("-t", type)
    }
    if (assignee) {
      args.push("-a", assignee)
    }
    if (estimate) {
      args.push("-e", String(estimate))
    }
    if (labels && labels.length > 0) {
      for (const label of labels) {
        args.push("--add-label", label)
      }
    }

    const output = execFileSync("bd", args, {
      encoding: "utf-8",
      timeout: 10000,
    })

    // Parse the created issue
    const rawIssue: RawBeadsIssue = JSON.parse(output)
    const issue = transformIssue(rawIssue)

    return NextResponse.json({ issue })
  } catch (error) {
    console.error("Failed to create beads issue:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create issue" },
      { status: 500 }
    )
  }
}
