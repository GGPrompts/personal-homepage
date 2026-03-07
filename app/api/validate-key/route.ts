import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { service, key } = await req.json()

  if (!key || typeof key !== "string") {
    return NextResponse.json({ valid: false, error: "No key provided" }, { status: 400 })
  }

  try {
    switch (service) {
      case "finnhub": {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${key.trim()}`
        )
        if (res.ok) {
          const data = await res.json()
          return NextResponse.json({ valid: data.c && data.c > 0 })
        }
        return NextResponse.json({ valid: false })
      }
      case "youtube": {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${key.trim()}`
        )
        if (res.ok) {
          const data = await res.json()
          return NextResponse.json({ valid: data.items && data.items.length > 0 })
        }
        return NextResponse.json({ valid: false })
      }
      default:
        return NextResponse.json({ valid: false, error: "Unknown service" }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ valid: false })
  }
}
