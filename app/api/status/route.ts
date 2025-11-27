import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export interface ApiStatus {
  finnhub: boolean
  github: boolean
}

export interface StatusResponse {
  apis: ApiStatus
  timestamp: string
}

export async function GET() {
  const status: StatusResponse = {
    apis: {
      finnhub: !!process.env.FINNHUB_API_KEY,
      github: !!process.env.GITHUB_TOKEN,
    },
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(status)
}
