import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  // Validate URL format and protocol
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Only http and https URLs are supported" }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HomepageTitleFetcher/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    })

    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json({ error: `Fetch failed with status ${res.status}` }, { status: 502 })
    }

    const contentType = res.headers.get("content-type") || ""
    if (!contentType.includes("text/html") && !contentType.includes("text/xml") && !contentType.includes("application/xhtml")) {
      return NextResponse.json({ error: "Response is not HTML" }, { status: 422 })
    }

    // Read only the first 16KB to find the title — no need to download the full page
    const reader = res.body?.getReader()
    if (!reader) {
      return NextResponse.json({ error: "No response body" }, { status: 502 })
    }

    let html = ""
    const decoder = new TextDecoder()
    const maxBytes = 16384

    let bytesRead = 0
    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
      bytesRead += value.byteLength
    }

    reader.cancel()

    // Extract <title> tag content
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (match && match[1]) {
      const title = match[1]
        .replace(/\s+/g, " ")
        .trim()
        // Decode common HTML entities
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))

      return NextResponse.json({ title })
    }

    return NextResponse.json({ error: "No title found" }, { status: 404 })
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 })
    }
    console.error("fetch-title error:", err)
    return NextResponse.json({ error: "Failed to fetch URL" }, { status: 502 })
  }
}
