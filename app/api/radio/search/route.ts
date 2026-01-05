import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Radio Browser API - uses multiple mirrors for redundancy
const RADIO_BROWSER_SERVERS = [
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://at1.api.radio-browser.info",
]

// Get a random server to distribute load
function getRandomServer(): string {
  return RADIO_BROWSER_SERVERS[Math.floor(Math.random() * RADIO_BROWSER_SERVERS.length)]
}

export interface RadioStation {
  stationuuid: string
  name: string
  url: string
  url_resolved: string
  favicon: string
  tags: string
  country: string
  countrycode: string
  language: string
  codec: string
  bitrate: number
  votes: number
  clickcount: number
  clicktrend: number
  homepage: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get("action") || "search"
  const query = searchParams.get("q")?.trim()
  const tag = searchParams.get("tag")?.trim()
  const country = searchParams.get("country")?.trim()
  const limit = parseInt(searchParams.get("limit") || "30")
  const offset = parseInt(searchParams.get("offset") || "0")

  const server = getRandomServer()
  let endpoint: string
  let body: Record<string, string | number> = {
    limit,
    offset,
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
  }

  try {
    switch (action) {
      case "search":
        // Advanced search with multiple parameters
        endpoint = "/json/stations/search"
        if (query) body.name = query
        if (tag) body.tag = tag
        if (country) body.countrycode = country
        break

      case "bytag":
        // Browse by genre/tag
        if (!tag) {
          return NextResponse.json({ error: "Tag is required" }, { status: 400 })
        }
        endpoint = `/json/stations/bytag/${encodeURIComponent(tag)}`
        break

      case "topclick":
        // Popular stations
        endpoint = "/json/stations/topclick"
        break

      case "topvote":
        // Top voted stations
        endpoint = "/json/stations/topvote"
        break

      case "lastchange":
        // Recently updated stations
        endpoint = "/json/stations/lastchange"
        break

      case "tags":
        // Get available tags/genres
        endpoint = "/json/tags"
        body = { limit: 100, order: "stationcount", reverse: "true" }
        break

      case "countries":
        // Get available countries
        endpoint = "/json/countries"
        body = { limit: 100, order: "stationcount", reverse: "true" }
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const response = await fetch(`${server}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "PersonalHomepage/1.0",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      console.error(`Radio Browser API error: ${response.status}`)
      return NextResponse.json(
        { error: "Failed to fetch from Radio Browser API" },
        { status: response.status }
      )
    }

    const data = await response.json()

    // For station results, filter and transform
    if (action !== "tags" && action !== "countries") {
      const stations: RadioStation[] = data
        .filter((s: RadioStation) => s.url_resolved && s.name)
        .map((s: RadioStation) => ({
          stationuuid: s.stationuuid,
          name: s.name,
          url: s.url,
          url_resolved: s.url_resolved,
          favicon: s.favicon || "",
          tags: s.tags || "",
          country: s.country || "",
          countrycode: s.countrycode || "",
          language: s.language || "",
          codec: s.codec || "",
          bitrate: s.bitrate || 0,
          votes: s.votes || 0,
          clickcount: s.clickcount || 0,
          clicktrend: s.clicktrend || 0,
          homepage: s.homepage || "",
        }))

      return NextResponse.json(
        { stations, count: stations.length },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      )
    }

    // For tags/countries, return as-is with basic transformation
    return NextResponse.json(
      { items: data.slice(0, 100) },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    )
  } catch (error) {
    console.error("Error fetching from Radio Browser:", error)
    return NextResponse.json(
      { error: "Failed to fetch radio stations" },
      { status: 500 }
    )
  }
}

// Record a station click (for popularity tracking)
export async function POST(request: NextRequest) {
  try {
    const { stationuuid } = await request.json()

    if (!stationuuid) {
      return NextResponse.json({ error: "Station UUID required" }, { status: 400 })
    }

    const server = getRandomServer()
    const response = await fetch(`${server}/json/url/${stationuuid}`, {
      method: "POST",
      headers: {
        "User-Agent": "PersonalHomepage/1.0",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to record click" }, { status: 500 })
    }

    const data = await response.json()
    return NextResponse.json({ success: true, url: data.url })
  } catch (error) {
    console.error("Error recording station click:", error)
    return NextResponse.json({ error: "Failed to record click" }, { status: 500 })
  }
}
