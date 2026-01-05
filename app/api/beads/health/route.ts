import { NextRequest, NextResponse } from "next/server"
import { execFileSync } from "child_process"
import { existsSync } from "fs"
import path from "path"

export const dynamic = "force-dynamic"

/**
 * GET /api/beads/health
 * Check if the beads CLI (bd) is available and working
 *
 * Query params:
 *   - workspace: Project path to check for .beads directory
 */
export async function GET(request: NextRequest) {
  const workspace = request.nextUrl.searchParams.get("workspace")

  try {
    // Try to run bd --version to check if it's installed
    const version = execFileSync("bd", ["--version"], {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim()

    // If workspace provided, check if .beads exists there
    if (workspace) {
      const resolved = workspace.startsWith("~")
        ? path.join(process.env.HOME || "/home", workspace.slice(1))
        : workspace
      const absolute = path.resolve(resolved)
      const beadsDir = path.join(absolute, ".beads")

      if (!existsSync(beadsDir)) {
        return NextResponse.json({
          available: false,
          version,
          error: `No .beads directory found in: ${workspace}`,
        })
      }
    }

    return NextResponse.json({
      available: true,
      version,
      workspace: workspace || undefined,
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
