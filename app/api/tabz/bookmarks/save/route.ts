import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// TabzChrome backend server URL
const TABZ_BACKEND_URL = process.env.TABZ_BACKEND_URL || "http://localhost:8129"

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

    // Call TabzChrome backend HTTP API directly
    const response = await fetch(`${TABZ_BACKEND_URL}/api/browser/bookmarks/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        title,
        parentId,
      }),
      signal: AbortSignal.timeout(10000),
    })

    const result = await response.json()

    // Handle error responses from TabzChrome backend
    if (!response.ok || result.error) {
      const errorMessage = result.error || `HTTP ${response.status}`

      // Check for WebSocket not available error (Chrome extension not connected)
      if (errorMessage.includes("WebSocket broadcast not available")) {
        return NextResponse.json(
          {
            error: "TabzChrome extension not connected to backend.",
            hint: "Make sure Chrome is running with the TabzChrome extension enabled.",
          },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status >= 400 ? response.status : 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error saving bookmark:", error)
    const message = error instanceof Error ? error.message : "Failed to save bookmark"

    // Check for connection errors (TabzChrome backend not running)
    if (
      message.includes("ECONNREFUSED") ||
      message.includes("fetch failed") ||
      message.includes("network")
    ) {
      return NextResponse.json(
        {
          error: "TabzChrome backend not running.",
          hint: "Start the TabzChrome backend server on port 8129.",
        },
        { status: 503 }
      )
    }

    // Check for timeout
    if (message.includes("timeout") || message.includes("TimeoutError")) {
      return NextResponse.json(
        { error: "Request timed out - TabzChrome backend may be unresponsive." },
        { status: 504 }
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
