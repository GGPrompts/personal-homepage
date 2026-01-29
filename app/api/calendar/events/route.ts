import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

// Google Calendar API base URL
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"

/**
 * GET /api/calendar/events
 *
 * List events from Google Calendar
 * Query params:
 * - calendarId: Calendar to fetch from (default: "primary")
 * - timeMin: Start of time range (ISO string, default: start of today)
 * - timeMax: End of time range (ISO string, default: 30 days from now)
 * - maxResults: Max events to return (default: 100)
 * - singleEvents: Expand recurring events (default: true)
 * - orderBy: Order by field (default: startTime)
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
  const calendarId = searchParams.get("calendarId") || "primary"

  // Default time range: today to 30 days from now
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const defaultTimeMin = today.toISOString()
  const defaultTimeMax = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const timeMin = searchParams.get("timeMin") || defaultTimeMin
  const timeMax = searchParams.get("timeMax") || defaultTimeMax
  const maxResults = searchParams.get("maxResults") || "100"
  const singleEvents = searchParams.get("singleEvents") || "true"
  const orderBy = searchParams.get("orderBy") || "startTime"

  try {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      maxResults,
      singleEvents,
      orderBy,
    })

    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
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
    console.error("Calendar events fetch error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch calendar events" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/calendar/events
 *
 * Create a new event in Google Calendar
 * Body: Google Calendar event resource
 * Query params:
 * - calendarId: Calendar to add event to (default: "primary")
 */
export async function POST(request: NextRequest) {
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
  const calendarId = searchParams.get("calendarId") || "primary"

  try {
    const body = await request.json()

    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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
    console.error("Calendar event create error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create calendar event" },
      { status: 500 }
    )
  }
}
