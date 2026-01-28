import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// TabzChrome backend server URL
const TABZ_BACKEND_URL = process.env.TABZ_BACKEND_URL || "http://localhost:8129"

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
    // Call TabzChrome backend HTTP API directly
    const url = new URL(`${TABZ_BACKEND_URL}/api/browser/bookmarks/search`)
    url.searchParams.set("query", query)
    url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 100)))

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
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

    // Extract bookmarks from the response
    // TabzChrome backend returns { success: true, bookmarks: [...] }
    const bookmarks: ChromeBookmark[] = result.bookmarks || []

    return NextResponse.json({ results: bookmarks, query })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search bookmarks"

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

    console.error("Error searching bookmarks:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
