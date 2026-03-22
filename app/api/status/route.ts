import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export interface ApiStatus {
  finnhub: boolean
  alphaVantage: boolean
  github: boolean
  samGov: boolean
}

export interface StatusResponse {
  apis: ApiStatus
  projectRoot: string
  timestamp: string
}

export async function GET() {
  const status: StatusResponse = {
    apis: {
      finnhub: !!process.env.FINNHUB_API_KEY,
      alphaVantage: !!process.env.ALPHA_VANTAGE_API_KEY,
      github: !!process.env.GITHUB_TOKEN,
      samGov: !!process.env.SAM_GOV_API_KEY,
    },
    projectRoot: process.cwd(),
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(status)
}
