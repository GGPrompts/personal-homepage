import { NextRequest, NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export const dynamic = "force-dynamic"

interface OpenUrlRequest {
  url: string
  newTab?: boolean
  background?: boolean
  reuseExisting?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OpenUrlRequest
    const { url, newTab = true, background = false, reuseExisting = true } = body

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Call mcp-cli to open URL using execFile for security
    // (avoids shell injection by passing args as array, not string interpolation)
    const jsonArgs = JSON.stringify({
      url,
      newTab,
      background,
      reuseExisting,
    })

    const { stdout } = await execFileAsync(
      "mcp-cli",
      ["call", "tabz/tabz_open_url", jsonArgs],
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
    let result = { success: false, url: "", tabId: null as number | null }
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
            if (item.text.includes("success") || item.text.includes("opened")) {
              result.success = true
            }
          }
        }
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error opening URL:", error)
    const message = error instanceof Error ? error.message : "Failed to open URL"

    if (message.includes("ENOENT") || message.includes("not found")) {
      return NextResponse.json(
        { error: "mcp-cli not available. Make sure MCP is configured." },
        { status: 503 }
      )
    }

    // Check for "URL not allowed" error
    if (message.includes("not allowed")) {
      return NextResponse.json(
        { error: "URL domain not allowed by TabzChrome" },
        { status: 403 }
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
