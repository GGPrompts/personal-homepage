import { NextResponse } from "next/server"
import { listIssues } from "@/lib/beads-db"

export const dynamic = "force-dynamic"

/**
 * GET /api/beads/health
 * Check if the beads Postgres backend is reachable.
 */
export async function GET() {
  try {
    // Attempt a lightweight query to verify connectivity
    const issues = await listIssues({ limit: 1 })

    return NextResponse.json({
      available: true,
      backend: "postgres",
      issueCount: issues.length > 0 ? "1+" : "0",
    })
  } catch (error) {
    console.error("Beads health check failed:", error)
    return NextResponse.json({
      available: false,
      error: error instanceof Error ? error.message : "Beads Postgres backend not reachable",
    })
  }
}
