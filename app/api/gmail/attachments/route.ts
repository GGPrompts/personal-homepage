import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

/**
 * GET /api/gmail/attachments?messageId=...&attachmentId=...&filename=...&mimeType=...
 *
 * Fetch attachment data from Gmail and return as downloadable binary.
 * Uses query params instead of path segments because Gmail attachment IDs
 * can contain characters (/, =, +) that break dynamic route segments.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      )
    }

    const accessToken = authHeader.slice(7)
    const { searchParams } = request.nextUrl
    const messageId = searchParams.get("messageId")
    const attachmentId = searchParams.get("attachmentId")
    const filename = searchParams.get("filename") || "attachment"
    const mimeType = searchParams.get("mimeType") || "application/octet-stream"

    if (!messageId || !attachmentId) {
      return NextResponse.json(
        { error: "messageId and attachmentId are required" },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${GMAIL_API_BASE}/messages/${messageId}/attachments/${attachmentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: error.error?.message || "Failed to fetch attachment" },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Gmail returns base64url-encoded data
    const base64 = data.data.replace(/-/g, "+").replace(/_/g, "/")
    const binary = Buffer.from(base64, "base64")

    return new NextResponse(binary, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
        "Content-Length": binary.length.toString(),
      },
    })
  } catch (error) {
    console.error("Gmail attachment fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch attachment" },
      { status: 500 }
    )
  }
}
