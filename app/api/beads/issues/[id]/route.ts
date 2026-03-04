import { NextRequest, NextResponse } from "next/server"
import { getIssue, updateIssue, closeIssue } from "@/lib/beads-db"

export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/beads/issues/[id]
 * Get detailed info for a single issue via direct Postgres query.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params

  try {
    const issue = await getIssue(id)

    if (!issue) {
      return NextResponse.json(
        { error: "Issue not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ issue })
  } catch (error) {
    console.error(`Failed to get beads issue ${id}:`, error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get issue" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/beads/issues/[id]
 * Update an existing issue via direct Postgres query.
 *
 * Body fields (all optional):
 *   - status: New status (open, in_progress, closed, blocked)
 *   - priority: Priority level (1-4)
 *   - title: New title
 *   - description: New description
 *   - notes: Issue notes/comments
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
    const { status, priority, title, description, notes, labels, assignee, estimate } = body

    const issue = await updateIssue(id, {
      status,
      priority: priority !== undefined ? Number(priority) : undefined,
      title,
      description,
      notes,
      labels,
      assignee,
      estimate: estimate !== undefined ? Number(estimate) : undefined,
    })

    if (!issue) {
      return NextResponse.json(
        { error: "Issue not found" },
        { status: 404 }
      )
    }

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
 * Close an issue (beads does not support hard delete).
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params

  try {
    const closed = await closeIssue(id)

    if (!closed) {
      return NextResponse.json(
        { error: "Issue not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`Failed to close beads issue ${id}:`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to close issue" },
      { status: 500 }
    )
  }
}
