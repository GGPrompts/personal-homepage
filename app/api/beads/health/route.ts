import { NextResponse } from "next/server"
import { execFileSync } from "child_process"

export const dynamic = "force-dynamic"

/**
 * GET /api/beads/health
 * Check if the beads CLI (bd) is available and working
 */
export async function GET() {
  try {
    // Try to run bd --version to check if it's installed
    const version = execFileSync("bd", ["--version"], {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim()

    return NextResponse.json({
      available: true,
      version,
    })
  } catch (error) {
    // bd CLI not available or errored
    console.error("Beads health check failed:", error)
    return NextResponse.json({
      available: false,
      error: error instanceof Error ? error.message : "bd CLI not available",
    })
  }
}
