import { NextResponse } from "next/server"
import { getProjects } from "@/lib/beads-db"

export const dynamic = "force-dynamic"

/**
 * GET /api/beads/projects
 * List all registered beads projects.
 */
export async function GET() {
  try {
    const projects = await getProjects()
    return NextResponse.json({ projects })
  } catch (error) {
    console.error("Failed to list beads projects:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list projects" },
      { status: 500 }
    )
  }
}
