import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

// System labels that we care about
const SYSTEM_LABEL_NAMES: Record<string, string> = {
  INBOX: "Inbox",
  SENT: "Sent",
  DRAFT: "Drafts",
  TRASH: "Trash",
  SPAM: "Spam",
  STARRED: "Starred",
  IMPORTANT: "Important",
  UNREAD: "Unread",
}

// Label type for frontend
interface Label {
  id: string
  name: string
  type: "system" | "user"
  color?: string
  unreadCount?: number
  totalCount?: number
}

/**
 * GET /api/gmail/labels
 *
 * Get all labels from the user's Gmail account
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

    // Fetch all labels
    const response = await fetch(`${GMAIL_API_BASE}/labels`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: error.error?.message || "Failed to fetch labels" },
        { status: response.status }
      )
    }

    const data = await response.json()
    const labels: Label[] = []

    // Fetch detailed info for each label (for unread counts)
    const labelPromises = (data.labels || []).map(async (label: any) => {
      try {
        const detailResponse = await fetch(
          `${GMAIL_API_BASE}/labels/${label.id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )

        if (detailResponse.ok) {
          return detailResponse.json()
        }
        return label
      } catch {
        return label
      }
    })

    const detailedLabels = await Promise.all(labelPromises)

    for (const label of detailedLabels) {
      const isSystem = label.type === "system"
      const displayName = isSystem
        ? SYSTEM_LABEL_NAMES[label.id] || label.name
        : label.name

      // Skip some system labels we don't want to show
      if (
        label.id === "CATEGORY_PERSONAL" ||
        label.id === "CATEGORY_SOCIAL" ||
        label.id === "CATEGORY_PROMOTIONS" ||
        label.id === "CATEGORY_UPDATES" ||
        label.id === "CATEGORY_FORUMS" ||
        label.id === "CHAT"
      ) {
        continue
      }

      labels.push({
        id: label.id,
        name: displayName,
        type: isSystem ? "system" : "user",
        color: label.color?.backgroundColor,
        unreadCount: label.messagesUnread || 0,
        totalCount: label.messagesTotal || 0,
      })
    }

    // Sort: system labels first, then user labels alphabetically
    labels.sort((a, b) => {
      if (a.type === "system" && b.type !== "system") return -1
      if (a.type !== "system" && b.type === "system") return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({ labels })
  } catch (error) {
    console.error("Gmail labels error:", error)
    return NextResponse.json(
      { error: "Failed to fetch labels" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/gmail/labels
 *
 * Create a new label
 * Body:
 * - name: string - Label name
 * - color?: { backgroundColor: string, textColor: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      )
    }

    const accessToken = authHeader.slice(7)
    const { name, color } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: "Label name is required" },
        { status: 400 }
      )
    }

    const body: any = {
      name,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    }

    if (color) {
      body.color = color
    }

    const response = await fetch(`${GMAIL_API_BASE}/labels`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: error.error?.message || "Failed to create label" },
        { status: response.status }
      )
    }

    const label = await response.json()
    return NextResponse.json({
      id: label.id,
      name: label.name,
      type: "user",
      color: label.color?.backgroundColor,
    })
  } catch (error) {
    console.error("Gmail create label error:", error)
    return NextResponse.json(
      { error: "Failed to create label" },
      { status: 500 }
    )
  }
}
