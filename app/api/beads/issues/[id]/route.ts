import { NextRequest, NextResponse } from "next/server"
import { execFileSync } from "child_process"

export const dynamic = "force-dynamic"

/**
 * Raw issue from bd show --json
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
 */
function transformIssue(raw: RawBeadsIssue) {
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

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/beads/issues/[id]
 * Get detailed info for a single issue
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params

  try {
    // Use execFileSync with argument array to prevent command injection
    const output = execFileSync("bd", ["show", id, "--json"], {
      encoding: "utf-8",
      timeout: 10000,
    })

    // bd show returns an array with one item
    const rawIssues: RawBeadsIssue[] = JSON.parse(output)
    if (!rawIssues || rawIssues.length === 0) {
      return NextResponse.json(
        { error: "Issue not found" },
        { status: 404 }
      )
    }

    const issue = transformIssue(rawIssues[0])

    return NextResponse.json({ issue })
  } catch (error) {
    console.error(`Failed to get beads issue ${id}:`, error)

    const message = error instanceof Error ? error.message : "Failed to get issue"

    if (message.includes("not found") || message.includes("no such issue")) {
      return NextResponse.json(
        { error: "Issue not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/beads/issues/[id]
 * Update an existing issue
 *
 * Body fields (all optional):
 *   - status: New status (open, in_progress, closed, blocked)
 *   - priority: Priority level (1-4)
 *   - title: New title
 *   - description: New description
 *   - labels: Array of labels to set
 *   - assignee: Assignee name
 *   - estimate: Time estimate in minutes
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params

  try {
    const body = await request.json()
    const { status, priority, title, description, labels, assignee, estimate } = body

    // Build bd update command using execFileSync for security
    const args = ["update", id]

    if (status !== undefined) {
      args.push("-s", status)
    }
    if (priority !== undefined) {
      args.push("-p", String(priority))
    }
    if (title !== undefined) {
      args.push("--title", title)
    }
    if (description !== undefined) {
      args.push("-d", description)
    }
    if (assignee !== undefined) {
      args.push("-a", assignee || "")
    }
    if (estimate !== undefined) {
      args.push("-e", String(estimate))
    }
    if (labels !== undefined) {
      // Replace all labels
      args.push("--set-labels", labels.join(",") || "")
    }

    // Add --json for structured output
    args.push("--json")

    execFileSync("bd", args, {
      encoding: "utf-8",
      timeout: 10000,
    })

    // Fetch the updated issue
    const showOutput = execFileSync("bd", ["show", id, "--json"], {
      encoding: "utf-8",
      timeout: 10000,
    })

    const rawIssues: RawBeadsIssue[] = JSON.parse(showOutput)
    const issue = transformIssue(rawIssues[0])

    return NextResponse.json({ issue })
  } catch (error) {
    console.error(`Failed to update beads issue ${id}:`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update issue" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/beads/issues/[id]
 * Close an issue (beads doesn't support hard delete)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params

  try {
    // Use execFileSync with argument array to prevent command injection
    execFileSync("bd", ["close", id, "--json"], {
      encoding: "utf-8",
      timeout: 10000,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`Failed to close beads issue ${id}:`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to close issue" },
      { status: 500 }
    )
  }
}
