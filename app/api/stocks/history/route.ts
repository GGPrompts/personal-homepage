import { NextRequest, NextResponse } from "next/server"
import { StockCandle, HistoryResponse } from "../types"

export const dynamic = "force-dynamic"

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1"

// Resolution mapping
type Resolution = "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M"

interface TimeframeConfig {
  resolution: Resolution
  daysBack: number
}

const TIMEFRAME_CONFIG: Record<string, TimeframeConfig> = {
  "1D": { resolution: "5", daysBack: 1 },      // 5-minute candles for 1 day
  "5D": { resolution: "15", daysBack: 5 },     // 15-minute candles for 5 days
  "1M": { resolution: "60", daysBack: 30 },    // 1-hour candles for 1 month
  "6M": { resolution: "D", daysBack: 180 },    // Daily candles for 6 months
  "1Y": { resolution: "D", daysBack: 365 },    // Daily candles for 1 year
  "5Y": { resolution: "W", daysBack: 1825 },   // Weekly candles for 5 years
}

export async function GET(request: NextRequest) {
  if (!FINNHUB_API_KEY) {
    return NextResponse.json(
      { error: "Finnhub API key not configured" },
      { status: 500 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get("symbol")?.toUpperCase()
  const timeframe = searchParams.get("timeframe") || "1D"

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
  }

  const config = TIMEFRAME_CONFIG[timeframe]
  if (!config) {
    return NextResponse.json(
      { error: `Invalid timeframe. Valid options: ${Object.keys(TIMEFRAME_CONFIG).join(", ")}` },
      { status: 400 }
    )
  }

  const now = Math.floor(Date.now() / 1000)
  const from = now - config.daysBack * 24 * 60 * 60

  try {
    const response = await fetch(
      `${FINNHUB_BASE_URL}/stock/candle?symbol=${symbol}&resolution=${config.resolution}&from=${from}&to=${now}&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: timeframe === "1D" ? 60 : 300 } } // Cache based on timeframe
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch historical data" },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Finnhub returns "no_data" status for invalid symbols or no data
    if (data.s === "no_data" || !data.c) {
      return NextResponse.json(
        { error: "No data available for this symbol" },
        { status: 404 }
      )
    }

    // Transform Finnhub candle format to our format
    const candles: StockCandle[] = data.t.map((timestamp: number, i: number) => ({
      time: formatTime(timestamp * 1000, config.resolution),
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i],
    }))

    const historyResponse: HistoryResponse = {
      symbol,
      candles,
      fetchedAt: new Date().toISOString(),
    }

    return NextResponse.json(historyResponse, {
      headers: {
        "Cache-Control": `public, s-maxage=${timeframe === "1D" ? 60 : 300}, stale-while-revalidate=600`,
      },
    })
  } catch (error) {
    console.error("Error fetching stock history:", error)
    return NextResponse.json(
      { error: "Failed to fetch historical data" },
      { status: 500 }
    )
  }
}

function formatTime(timestamp: number, resolution: Resolution): string {
  const date = new Date(timestamp)

  switch (resolution) {
    case "1":
    case "5":
    case "15":
    case "30":
    case "60":
      // Intraday: show time
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    case "D":
      // Daily: show date
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    case "W":
    case "M":
      // Weekly/Monthly: show month and year
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      })
    default:
      return date.toISOString()
  }
}
