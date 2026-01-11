import { NextRequest, NextResponse } from "next/server"
import { existsSync, readFileSync } from "fs"
import path from "path"

export const dynamic = "force-dynamic"

/**
 * Validate and resolve workspace path
 */
function validateWorkspace(workspace: string | null): string | undefined {
  if (!workspace) return undefined

  const resolved = workspace.startsWith("~")
    ? path.join(process.env.HOME || "/home", workspace.slice(1))
    : workspace

  const absolute = path.resolve(resolved)

  if (!existsSync(absolute)) {
    throw new Error(`Workspace path does not exist: ${workspace}`)
  }

  const beadsDir = path.join(absolute, ".beads")
  if (!existsSync(beadsDir)) {
    throw new Error(`No .beads directory found in: ${workspace}`)
  }

  return absolute
}

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/beads/issues/[id]/transcript
 * Get the transcript for a closed issue if it exists
 *
 * Query params:
 *   - workspace: Project path containing .beads directory
 *
 * Response:
 *   - 200: { exists: true, content: string, path: string }
 *   - 200: { exists: false }
 *   - 400: { error: string } - Invalid workspace
 *   - 500: { error: string } - Server error
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params
  const workspace = request.nextUrl.searchParams.get("workspace")

  try {
    const cwd = validateWorkspace(workspace)

    if (!cwd) {
      return NextResponse.json(
        { error: "Workspace is required" },
        { status: 400 }
      )
    }

    // Check if transcript file exists
    const transcriptPath = path.join(cwd, ".beads", "transcripts", `${id}.md`)

    if (!existsSync(transcriptPath)) {
      return NextResponse.json({ exists: false })
    }

    // Read the transcript file
    const content = readFileSync(transcriptPath, "utf-8")

    return NextResponse.json({
      exists: true,
      content,
      path: transcriptPath,
    })
  } catch (error) {
    console.error(`Failed to get transcript for issue ${id}:`, error)

    const message = error instanceof Error ? error.message : "Failed to get transcript"

    if (message.includes("does not exist") || message.includes("No .beads")) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
