import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

// Gmail API endpoints
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

/**
 * GET /api/gmail/messages
 *
 * List emails from the user's Gmail inbox.
 * Query params:
 * - maxResults: number of emails to fetch (default 20)
 * - pageToken: pagination token
 * - labelIds: comma-separated label IDs to filter by (default INBOX)
 * - q: search query
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
    const searchParams = request.nextUrl.searchParams

    const maxResults = searchParams.get("maxResults") || "20"
    const pageToken = searchParams.get("pageToken")
    const labelIds = searchParams.get("labelIds") || "INBOX"
    const query = searchParams.get("q")

    // Build the query params for Gmail API
    const params = new URLSearchParams({
      maxResults,
    })

    if (pageToken) {
      params.set("pageToken", pageToken)
    }

    // Add label IDs
    const labels = labelIds.split(",").filter(Boolean)
    for (const label of labels) {
      params.append("labelIds", label)
    }

    if (query) {
      params.set("q", query)
    }

    // Fetch message list
    const listResponse = await fetch(
      `${GMAIL_API_BASE}/messages?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!listResponse.ok) {
      const error = await listResponse.json().catch(() => ({}))
      console.error("Gmail list error:", error)
      return NextResponse.json(
        { error: error.error?.message || "Failed to fetch emails" },
        { status: listResponse.status }
      )
    }

    const listData = await listResponse.json()
    const messages = listData.messages || []
    const nextPageToken = listData.nextPageToken

    // Fetch full details for each message (in parallel, batch of 10)
    const messageDetails = []
    const batchSize = 10

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize)
      const batchPromises = batch.map(async (msg: { id: string }) => {
        const detailResponse = await fetch(
          `${GMAIL_API_BASE}/messages/${msg.id}?format=full`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )

        if (!detailResponse.ok) {
          console.error(`Failed to fetch message ${msg.id}`)
          return null
        }

        return detailResponse.json()
      })

      const batchResults = await Promise.all(batchPromises)
      messageDetails.push(...batchResults.filter(Boolean))
    }

    // Transform Gmail API response to our format
    const transformedMessages = messageDetails.map((msg) => transformMessage(msg))

    return NextResponse.json({
      messages: transformedMessages,
      nextPageToken,
      resultSizeEstimate: listData.resultSizeEstimate,
    })
  } catch (error) {
    console.error("Gmail messages error:", error)
    return NextResponse.json(
      { error: "Failed to fetch emails" },
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

  // Parse email addresses
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

  // Get message body
  const getBody = (payload: any): { text: string; html: string } => {
    let text = ""
    let html = ""

    const decodeBase64 = (data: string) => {
      try {
        // URL-safe base64 to regular base64
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

  // Get attachments
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

  // Get labels for folder/category mapping
  const labelIds = gmailMessage.labelIds || []
  const isRead = !labelIds.includes("UNREAD")
  const isStarred = labelIds.includes("STARRED")

  // Create body preview (first 200 chars of text)
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
