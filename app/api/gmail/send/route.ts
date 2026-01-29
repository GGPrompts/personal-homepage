import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

/**
 * POST /api/gmail/send
 *
 * Send an email via Gmail API
 * Body:
 * - to: string - Recipient email address
 * - cc?: string - CC email addresses (comma-separated)
 * - bcc?: string - BCC email addresses (comma-separated)
 * - subject: string - Email subject
 * - body: string - Email body (plain text)
 * - htmlBody?: string - Email body (HTML)
 * - threadId?: string - Thread ID for replies
 * - inReplyTo?: string - Message-ID header for threading
 * - references?: string - References header for threading
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
    const {
      to,
      cc,
      bcc,
      subject,
      body,
      htmlBody,
      threadId,
      inReplyTo,
      references,
    } = await request.json()

    if (!to || !subject) {
      return NextResponse.json(
        { error: "Recipient (to) and subject are required" },
        { status: 400 }
      )
    }

    // First, get the user's email address for the From field
    const profileResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!profileResponse.ok) {
      return NextResponse.json(
        { error: "Failed to get user profile" },
        { status: 401 }
      )
    }

    const profile = await profileResponse.json()
    const fromEmail = profile.email
    const fromName = profile.name || fromEmail.split("@")[0]

    // Build the email in RFC 2822 format
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`

    let emailLines: string[] = [
      `From: "${fromName}" <${fromEmail}>`,
      `To: ${to}`,
    ]

    if (cc) {
      emailLines.push(`Cc: ${cc}`)
    }

    if (bcc) {
      emailLines.push(`Bcc: ${bcc}`)
    }

    emailLines.push(`Subject: ${subject}`)
    emailLines.push("MIME-Version: 1.0")

    // Add threading headers for replies
    if (inReplyTo) {
      emailLines.push(`In-Reply-To: ${inReplyTo}`)
    }
    if (references) {
      emailLines.push(`References: ${references}`)
    }

    // Build multipart message if we have HTML
    if (htmlBody) {
      emailLines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
      emailLines.push("")
      emailLines.push(`--${boundary}`)
      emailLines.push("Content-Type: text/plain; charset=UTF-8")
      emailLines.push("")
      emailLines.push(body || stripHtml(htmlBody))
      emailLines.push(`--${boundary}`)
      emailLines.push("Content-Type: text/html; charset=UTF-8")
      emailLines.push("")
      emailLines.push(htmlBody)
      emailLines.push(`--${boundary}--`)
    } else {
      emailLines.push("Content-Type: text/plain; charset=UTF-8")
      emailLines.push("")
      emailLines.push(body || "")
    }

    const rawEmail = emailLines.join("\r\n")

    // Encode to base64url format
    const encodedEmail = Buffer.from(rawEmail)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")

    // Send via Gmail API
    const sendBody: any = {
      raw: encodedEmail,
    }

    if (threadId) {
      sendBody.threadId = threadId
    }

    const sendResponse = await fetch(`${GMAIL_API_BASE}/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sendBody),
    })

    if (!sendResponse.ok) {
      const error = await sendResponse.json().catch(() => ({}))
      console.error("Gmail send error:", error)
      return NextResponse.json(
        { error: error.error?.message || "Failed to send email" },
        { status: sendResponse.status }
      )
    }

    const result = await sendResponse.json()
    return NextResponse.json({
      success: true,
      messageId: result.id,
      threadId: result.threadId,
    })
  } catch (error) {
    console.error("Gmail send error:", error)
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    )
  }
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim()
}
