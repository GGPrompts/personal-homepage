import { NextRequest, NextResponse } from "next/server"
import { spawnKittyTerminal, validateWorkDir, kittyRemote } from "@/lib/terminal-native"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { command, workingDir, name } = body as {
      command?: string
      workingDir?: string
      name?: string
    }

    if (workingDir) {
      const valid = await validateWorkDir(workingDir)
      if (!valid) {
        return NextResponse.json(
          { success: false, error: `Working directory does not exist: ${workingDir}` },
          { status: 400 }
        )
      }
    }

    spawnKittyTerminal({ command, workingDir, name })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * PUT /api/terminal - Send text to the active (most recent) kitty window.
 * Body: { text: string, execute?: boolean }
 *
 * Uses `kitty @ send-text` which targets the active window by default.
 * When execute is true (default), appends a newline to run the command.
 * When execute is false, sends text only (paste without pressing Enter).
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, execute = true } = body as { text?: string; execute?: boolean }

    if (!text) {
      return NextResponse.json(
        { success: false, error: "text is required" },
        { status: 400 }
      )
    }

    // send-text without --match sends to the most recently focused window
    kittyRemote(["send-text", execute ? text + "\n" : text])

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
