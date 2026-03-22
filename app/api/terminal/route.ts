import { NextRequest, NextResponse } from "next/server"
import { spawnKittyTerminal, validateWorkDir } from "@/lib/terminal-native"

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
