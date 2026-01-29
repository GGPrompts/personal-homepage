import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

/**
 * GET /api/gmail/messages/[id]
 *
 * Get a single email by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      )
    }

    const accessToken = authHeader.slice(7)

    const response = await fetch(
      `${GMAIL_API_BASE}/messages/${id}?format=full`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: error.error?.message || "Failed to fetch email" },
        { status: response.status }
      )
    }

    const message = await response.json()
    return NextResponse.json(transformMessage(message))
  } catch (error) {
    console.error("Gmail message fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch email" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/gmail/messages/[id]
 *
 * Modify an email (add/remove labels for read status, archive, etc.)
 * Body:
 * - addLabelIds: string[] - Labels to add
 * - removeLabelIds: string[] - Labels to remove
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      )
    }

    const accessToken = authHeader.slice(7)
    const body = await request.json()

    const response = await fetch(
      `${GMAIL_API_BASE}/messages/${id}/modify`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addLabelIds: body.addLabelIds || [],
          removeLabelIds: body.removeLabelIds || [],
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: error.error?.message || "Failed to modify email" },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Gmail message modify error:", error)
    return NextResponse.json(
      { error: "Failed to modify email" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/gmail/messages/[id]
 *
 * Move an email to trash
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      )
    }

    const accessToken = authHeader.slice(7)

    const response = await fetch(
      `${GMAIL_API_BASE}/messages/${id}/trash`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: error.error?.message || "Failed to delete email" },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Gmail message delete error:", error)
    return NextResponse.json(
      { error: "Failed to delete email" },
      { status: 500 }
    )
  }
}

/**
 * Transform Gmail API message format to our frontend format
 */
function transformMessage(gmailMessage: any) {
  const headers = gmailMessage.payload?.headers || []
  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ""

  const parseEmailAddress = (raw: string) => {
    const match = raw.match(/^(?:"?([^"]*)"?\s)?<?([^<>]+@[^<>]+)>?$/)
    if (match) {
      return {
        name: match[1]?.trim() || match[2].split("@")[0],
        email: match[2],
      }
    }
    return { name: raw.split("@")[0], email: raw }
  }

  const parseEmailAddresses = (raw: string) => {
    if (!raw) return []
    return raw.split(",").map((addr) => parseEmailAddress(addr.trim()))
  }

  const getBody = (payload: any): { text: string; html: string } => {
    let text = ""
    let html = ""

    const decodeBase64 = (data: string) => {
      try {
        const base64 = data.replace(/-/g, "+").replace(/_/g, "/")
        return Buffer.from(base64, "base64").toString("utf-8")
      } catch {
        return ""
      }
    }

    const extractFromParts = (parts: any[]) => {
      for (const part of parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          text = decodeBase64(part.body.data)
        } else if (part.mimeType === "text/html" && part.body?.data) {
          html = decodeBase64(part.body.data)
        } else if (part.parts) {
          extractFromParts(part.parts)
        }
      }
    }

    if (payload.body?.data) {
      const decoded = decodeBase64(payload.body.data)
      if (payload.mimeType === "text/html") {
        html = decoded
      } else {
        text = decoded
      }
    }

    if (payload.parts) {
      extractFromParts(payload.parts)
    }

    return { text, html }
  }

  const getAttachments = (payload: any): any[] => {
    const attachments: any[] = []

    const extractAttachments = (parts: any[]) => {
      for (const part of parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            name: part.filename,
            mimeType: part.mimeType,
            size: part.body.size,
          })
        }
        if (part.parts) {
          extractAttachments(part.parts)
        }
      }
    }

    if (payload.parts) {
      extractAttachments(payload.parts)
    }

    return attachments
  }

  const body = getBody(gmailMessage.payload)
  const attachments = getAttachments(gmailMessage.payload)
  const from = parseEmailAddress(getHeader("From"))
  const to = parseEmailAddresses(getHeader("To"))
  const cc = parseEmailAddresses(getHeader("Cc"))
  const labelIds = gmailMessage.labelIds || []
  const isRead = !labelIds.includes("UNREAD")
  const isStarred = labelIds.includes("STARRED")

  const bodyPreview =
    body.text?.slice(0, 200).replace(/\s+/g, " ").trim() ||
    body.html
      ?.replace(/<[^>]+>/g, "")
      .slice(0, 200)
      .replace(/\s+/g, " ")
      .trim() ||
    gmailMessage.snippet ||
    ""

  return {
    id: gmailMessage.id,
    threadId: gmailMessage.threadId,
    from,
    to,
    cc: cc.length > 0 ? cc : undefined,
    subject: getHeader("Subject") || "(No Subject)",
    body: body.html || body.text || "",
    bodyText: body.text || "",
    bodyPreview,
    date: new Date(parseInt(gmailMessage.internalDate)),
    isRead,
    isStarred,
    labelIds,
    attachments: attachments.length > 0 ? attachments : undefined,
    snippet: gmailMessage.snippet,
  }
}
