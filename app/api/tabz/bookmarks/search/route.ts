import { NextRequest, NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export const dynamic = "force-dynamic"

interface ChromeBookmark {
  id: string
  title: string
  url: string
  parentId: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")?.trim()
  const limit = parseInt(searchParams.get("limit") || "20", 10)

  if (!query || query.length < 1) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 })
  }

  try {
    // Call mcp-cli to search bookmarks using execFile for security
    // (avoids shell injection by passing args as array, not string interpolation)
    const jsonArgs = JSON.stringify({
      query,
      limit: Math.min(Math.max(limit, 1), 100),
      response_format: "json",
    })

    const claudePath = process.env.CLAUDE_PATH || "/home/marci/.local/bin/claude"
    const { stdout } = await execFileAsync(
      claudePath,
      ["--mcp-cli", "call", "tabz/tabz_search_bookmarks", jsonArgs],
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

    // Extract bookmarks from the response content
    let bookmarks: ChromeBookmark[] = []
    if (response.content) {
      // MCP tools return content array with text items
      for (const item of response.content) {
        if (item.type === "text" && item.text) {
          try {
            const parsed = JSON.parse(item.text)
            if (Array.isArray(parsed)) {
              bookmarks = parsed
            } else if (parsed.bookmarks) {
              bookmarks = parsed.bookmarks
            }
          } catch {
            // Not JSON, might be markdown format
          }
        }
      }
    }

    return NextResponse.json({ results: bookmarks, query })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search bookmarks"

    // Check if it's an MCP session error (no active Claude Code session)
    if (
      message.includes("not found") ||
      message.includes("Is Claude Code running") ||
      message.includes("MCP state file") ||
      message.includes("endpoint file")
    ) {
      // Don't log expected errors when Claude isn't running
      return NextResponse.json(
        {
          error: "Chrome bookmark search requires an active Claude Code session with TabzChrome MCP.",
          hint: "Start Claude Code in a terminal to enable this feature.",
        },
        { status: 503 }
      )
    }

    console.error("Error searching bookmarks:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
