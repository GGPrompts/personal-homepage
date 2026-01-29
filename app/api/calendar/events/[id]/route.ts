import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

// Google Calendar API base URL
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/calendar/events/[id]
 *
 * Get a specific event from Google Calendar
 * Query params:
 * - calendarId: Calendar containing the event (default: "primary")
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: eventId } = await params

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
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
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
    console.error("Calendar event fetch error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch calendar event" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/calendar/events/[id]
 *
 * Update an event in Google Calendar
 * Body: Google Calendar event resource (partial)
 * Query params:
 * - calendarId: Calendar containing the event (default: "primary")
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: eventId } = await params

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
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "PUT",
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
    console.error("Calendar event update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update calendar event" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/calendar/events/[id]
 *
 * Delete an event from Google Calendar
 * Query params:
 * - calendarId: Calendar containing the event (default: "primary")
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: eventId } = await params

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
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok && response.status !== 204) {
      const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }))
      return NextResponse.json(
        { error: error.error?.message || `Google Calendar API error: ${response.status}` },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Calendar event delete error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete calendar event" },
      { status: 500 }
    )
  }
}
