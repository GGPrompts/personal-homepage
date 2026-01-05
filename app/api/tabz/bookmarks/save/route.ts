import { NextRequest, NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export const dynamic = "force-dynamic"

interface SaveBookmarkRequest {
  url: string
  title: string
  parentId?: string // Default: "1" (Bookmarks Bar)
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SaveBookmarkRequest
    const { url, title, parentId = "1" } = body

    if (!url || !title) {
      return NextResponse.json(
        { error: "URL and title are required" },
        { status: 400 }
      )
    }

    // Call mcp-cli to save bookmark using execFile for security
    // (avoids shell injection by passing args as array, not string interpolation)
    const jsonArgs = JSON.stringify({
      url,
      title,
      parentId,
    })

    const { stdout } = await execFileAsync(
      "/home/matt/.local/bin/claude",
      ["--mcp-cli", "call", "tabz/tabz_save_bookmark", jsonArgs],
      { encoding: "utf-8", timeout: 10000 }
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
    let result = { success: false, bookmark: null as unknown }
    if (response.content) {
      for (const item of response.content) {
        if (item.type === "text" && item.text) {
          try {
            const parsed = JSON.parse(item.text)
            if (parsed.success !== undefined) {
              result = parsed
            }
          } catch {
            // Not JSON
          }
        }
      }
    }

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        { error: "Failed to save bookmark" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error saving bookmark:", error)
    const message = error instanceof Error ? error.message : "Failed to save bookmark"

    if (message.includes("ENOENT") || message.includes("not found")) {
      return NextResponse.json(
        { error: "mcp-cli not available. Make sure MCP is configured." },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
