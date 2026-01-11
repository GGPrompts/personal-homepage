import { NextRequest, NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export const dynamic = "force-dynamic"

interface SpeakRequest {
  text: string
  voice?: string
  rate?: string
  pitch?: string
  priority?: "low" | "high"
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SpeakRequest
    const { text, voice, rate, pitch, priority } = body

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Truncate text to max 3000 chars (TTS limit)
    const truncatedText = text.slice(0, 3000)

    // Build args object, only including defined values
    const args: Record<string, string> = { text: truncatedText }
    if (voice) args.voice = voice
    if (rate) args.rate = rate
    if (pitch) args.pitch = pitch
    if (priority) args.priority = priority

    const jsonArgs = JSON.stringify(args)

    const claudePath = process.env.CLAUDE_PATH || "/home/marci/.local/bin/claude"
    const { stdout } = await execFileAsync(
      claudePath,
      ["--mcp-cli", "call", "tabz/tabz_speak", jsonArgs],
      { encoding: "utf-8", timeout: 15000 }
    )

    // Parse the MCP response
    const response = JSON.parse(stdout)

    // Handle MCP response format
    if (response.error) {
      return NextResponse.json(
        { error: response.error.message || "MCP error" },
        { status: 500 }
      )
    }

    // Extract result from response content
    let result = { success: false, error: null as string | null }
    if (response.content) {
      for (const item of response.content) {
        if (item.type === "text" && item.text) {
          try {
            const parsed = JSON.parse(item.text)
            if (parsed.success !== undefined) {
              result = parsed
            }
          } catch {
            // Not JSON, check for success indicators in text
            if (item.text.includes("success") || item.text.includes("speaking")) {
              result.success = true
            }
          }
        }
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to speak text"

    // Check if it's an MCP session error (no active Claude Code session)
    if (
      message.includes("not found") ||
      message.includes("Is Claude Code running") ||
      message.includes("MCP state file") ||
      message.includes("endpoint file")
    ) {
      return NextResponse.json(
        {
          error: "Text-to-speech requires an active Claude Code session.",
          hint: "Start Claude Code to enable TTS features.",
        },
        { status: 503 }
      )
    }

    // Check for TTS-specific errors
    if (message.includes("TTS generation failed")) {
      return NextResponse.json(
        { error: "TTS generation failed - network or service issue" },
        { status: 502 }
      )
    }

    console.error("Error speaking text:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
