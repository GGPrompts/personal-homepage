import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface SpeakRequest {
  text: string
  voice?: string
  rate?: string
  pitch?: string
  volume?: number
  priority?: "low" | "high"
}

const TABZ_API_BASE = process.env.TABZ_API_BASE || "http://localhost:8129"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SpeakRequest
    const { text, voice, rate, pitch, volume } = body

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Truncate text to max 3000 chars (TTS limit)
    const truncatedText = text.slice(0, 3000)

    // Call TabzChrome's audio/speak endpoint directly
    const response = await fetch(`${TABZ_API_BASE}/api/audio/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: truncatedText,
        voice: voice || "en-US-AndrewNeural",
        rate: rate || "+0%",
        pitch: pitch || "+0Hz",
        volume: volume ?? 0.7,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error || `TabzChrome API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ success: true, ...data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to speak text"

    // Check if TabzChrome is not running
    if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
      return NextResponse.json(
        {
          error: "TabzChrome is not running.",
          hint: "Start TabzChrome to enable TTS features.",
        },
        { status: 503 }
      )
    }

    console.error("Error speaking text:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
