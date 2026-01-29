import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

// Google Calendar API base URL
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"

/**
 * GET /api/calendar/calendars
 *
 * List user's calendars from Google Calendar
 * Query params:
 * - minAccessRole: Minimum access role (default: reader)
 * - showHidden: Include hidden calendars (default: false)
 */
export async function GET(request: NextRequest) {
  // Get access token from Authorization header
  const authHeader = request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    )
  }
  const accessToken = authHeader.slice(7)

  // Parse query parameters
  const { searchParams } = new URL(request.url)
  const minAccessRole = searchParams.get("minAccessRole") || "reader"
  const showHidden = searchParams.get("showHidden") || "false"

  try {
    const params = new URLSearchParams({
      minAccessRole,
      showHidden,
    })

    const response = await fetch(
      `${CALENDAR_API_BASE}/users/me/calendarList?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }))
      return NextResponse.json(
        { error: error.error?.message || `Google Calendar API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Calendar list fetch error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch calendars" },
      { status: 500 }
    )
  }
}
