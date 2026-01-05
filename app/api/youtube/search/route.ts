import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// YouTube API types
interface YouTubeSearchItem {
  id: {
    kind: string
    videoId: string
  }
  snippet: {
    publishedAt: string
    channelId: string
    title: string
    description: string
    thumbnails: {
      default: { url: string; width: number; height: number }
      medium: { url: string; width: number; height: number }
      high: { url: string; width: number; height: number }
    }
    channelTitle: string
    liveBroadcastContent: string
  }
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[]
  nextPageToken?: string
  pageInfo: {
    totalResults: number
    resultsPerPage: number
  }
}

export interface SearchResult {
  videoId: string
  title: string
  description: string
  thumbnail: string
  channelId: string
  channelTitle: string
  publishedAt: string
  liveBroadcastContent: string
}

export interface SearchResponse {
  results: SearchResult[]
  nextPageToken?: string
  totalResults: number
  error?: string
}

function getApiKey(request: NextRequest): string | null {
  // Check for client-provided API key in header
  const clientKey = request.headers.get("x-youtube-api-key")
  if (clientKey) return clientKey

  // Fall back to environment variable
  return process.env.YOUTUBE_API_KEY || null
}

export async function GET(request: NextRequest) {
  const apiKey = getApiKey(request)

  if (!apiKey) {
    return NextResponse.json<SearchResponse>(
      {
        results: [],
        totalResults: 0,
        error: "YouTube API key not configured. Add it in Settings → API Keys"
      },
      { status: 400 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const maxResults = Math.min(parseInt(searchParams.get("maxResults") || "25"), 50)
  const pageToken = searchParams.get("pageToken")
  const order = searchParams.get("order") || "relevance" // relevance, date, viewCount, rating
  const videoDuration = searchParams.get("videoDuration") // any, short (<4min), medium (4-20min), long (>20min)
  const publishedAfter = searchParams.get("publishedAfter") // ISO date string
  const publishedBefore = searchParams.get("publishedBefore") // ISO date string

  if (!query) {
    return NextResponse.json<SearchResponse>(
      { results: [], totalResults: 0, error: "Search query is required" },
      { status: 400 }
    )
  }

  try {
    // Build the API URL
    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      q: query,
      maxResults: maxResults.toString(),
      order,
      key: apiKey,
    })

    if (pageToken) params.set("pageToken", pageToken)
    if (videoDuration && videoDuration !== "any") params.set("videoDuration", videoDuration)
    if (publishedAfter) params.set("publishedAfter", publishedAfter)
    if (publishedBefore) params.set("publishedBefore", publishedBefore)

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    )

    if (!response.ok) {
      const errorData = await response.json()
      const errorMessage = errorData.error?.message || "YouTube API error"
      console.error("YouTube search error:", errorMessage)
      return NextResponse.json<SearchResponse>(
        { results: [], totalResults: 0, error: errorMessage },
        { status: response.status }
      )
    }

    const data: YouTubeSearchResponse = await response.json()

    const results: SearchResult[] = data.items
      .filter(item => item.id.videoId) // Only include videos (not channels/playlists)
      .map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        liveBroadcastContent: item.snippet.liveBroadcastContent,
      }))

    return NextResponse.json<SearchResponse>({
      results,
      nextPageToken: data.nextPageToken,
      totalResults: data.pageInfo.totalResults,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    })
  } catch (error) {
    console.error("YouTube search error:", error)
    return NextResponse.json<SearchResponse>(
      { results: [], totalResults: 0, error: "Failed to search YouTube" },
      { status: 500 }
    )
  }
}
