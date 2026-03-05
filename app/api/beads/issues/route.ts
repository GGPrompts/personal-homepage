import { NextRequest, NextResponse } from "next/server"
import { listIssues, createIssue } from "@/lib/beads-db"

export const dynamic = "force-dynamic"

/**
 * GET /api/beads/issues
 * List all beads issues via direct Postgres query.
 *
 * Query params:
 *   - all: Include closed issues (default true for kanban)
 *   - status: Filter by status (open, in_progress, closed, blocked)
 *   - priority: Filter by priority (1-4)
 *   - limit: Max number of issues (default 0 = unlimited)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const includeAll = searchParams.get("all") !== "false" // Default to true
  const status = searchParams.get("status")
  const priority = searchParams.get("priority")
  const limit = searchParams.get("limit") || "0" // 0 = unlimited
  const prefix = searchParams.get("prefix")

  try {
    const issues = await listIssues({
      includeAll: includeAll && !status,
      status: status || undefined,
      priority: priority ? Number(priority) : undefined,
      limit: Number(limit) || undefined,
      prefix: prefix || undefined,
    })

    return NextResponse.json({
      issues,
      total: issues.length,
    })
  } catch (error) {
    console.error("Failed to list beads issues:", error)

    const message = error instanceof Error ? error.message : "Failed to list issues"

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/beads/issues
 * Create a new beads issue.
 *
 * Body params:
 *   - title: Issue title (required)
 *   - description, priority, type, labels, assignee, estimate
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

    const issue = await createIssue({
      title,
      description,
      priority: priority !== undefined ? Number(priority) : undefined,
      type,
      labels,
      assignee,
      estimate: estimate !== undefined ? Number(estimate) : undefined,
    })

    return NextResponse.json({ issue })
  } catch (error) {
    console.error("Failed to create beads issue:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create issue" },
      { status: 500 }
    )
  }
}
