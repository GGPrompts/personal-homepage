import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// YouTube API types
interface YouTubeVideoItem {
  id: string
  snippet: {
    publishedAt: string
    channelId: string
    title: string
    description: string
    thumbnails: {
      default: { url: string; width: number; height: number }
      medium: { url: string; width: number; height: number }
      high: { url: string; width: number; height: number }
      standard?: { url: string; width: number; height: number }
      maxres?: { url: string; width: number; height: number }
    }
    channelTitle: string
    tags?: string[]
    categoryId: string
    liveBroadcastContent: string
  }
  contentDetails: {
    duration: string // ISO 8601 duration (PT#H#M#S)
    dimension: string
    definition: string
    caption: string
    licensedContent: boolean
    projection: string
  }
  statistics: {
    viewCount: string
    likeCount?: string
    commentCount?: string
  }
}

interface YouTubeVideoResponse {
  items: YouTubeVideoItem[]
}

export interface VideoDetails {
  id: string
  title: string
  description: string
  thumbnail: string
  thumbnailHigh?: string
  channelId: string
  channelTitle: string
  publishedAt: string
  duration: number // in seconds
  durationFormatted: string
  viewCount: number
  likeCount?: number
  commentCount?: number
  tags?: string[]
  definition: string
  hasCaption: boolean
}

export interface VideoResponse {
  videos: VideoDetails[]
  error?: string
}

function getApiKey(request: NextRequest): string | null {
  const clientKey = request.headers.get("x-youtube-api-key")
  if (clientKey) return clientKey
  return process.env.YOUTUBE_API_KEY || null
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0

  const hours = parseInt(match[1] || "0")
  const minutes = parseInt(match[2] || "0")
  const seconds = parseInt(match[3] || "0")

  return hours * 3600 + minutes * 60 + seconds
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

export async function GET(request: NextRequest) {
  const apiKey = getApiKey(request)

  if (!apiKey) {
    return NextResponse.json<VideoResponse>(
      { videos: [], error: "YouTube API key not configured" },
      { status: 400 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const idsParam = searchParams.get("ids")

  if (!idsParam) {
    return NextResponse.json<VideoResponse>(
      { videos: [], error: "Video IDs are required" },
      { status: 400 }
    )
  }

  // Parse video IDs (comma-separated), limit to 50 per request
  const ids = idsParam.split(",").map(id => id.trim()).filter(Boolean).slice(0, 50)

  if (ids.length === 0) {
    return NextResponse.json<VideoResponse>(
      { videos: [], error: "No valid video IDs provided" },
      { status: 400 }
    )
  }

  try {
    const params = new URLSearchParams({
      part: "snippet,contentDetails,statistics",
      id: ids.join(","),
      key: apiKey,
    })

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`,
      { next: { revalidate: 300 } }
    )

    if (!response.ok) {
      const errorData = await response.json()
      const errorMessage = errorData.error?.message || "YouTube API error"
      return NextResponse.json<VideoResponse>(
        { videos: [], error: errorMessage },
        { status: response.status }
      )
    }

    const data: YouTubeVideoResponse = await response.json()

    const videos: VideoDetails[] = data.items.map(item => {
      const durationSeconds = parseDuration(item.contentDetails.duration)

      return {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        thumbnailHigh: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        duration: durationSeconds,
        durationFormatted: formatDuration(durationSeconds),
        viewCount: parseInt(item.statistics.viewCount || "0"),
        likeCount: item.statistics.likeCount ? parseInt(item.statistics.likeCount) : undefined,
        commentCount: item.statistics.commentCount ? parseInt(item.statistics.commentCount) : undefined,
        tags: item.snippet.tags,
        definition: item.contentDetails.definition,
        hasCaption: item.contentDetails.caption === "true",
      }
    })

    return NextResponse.json<VideoResponse>({ videos }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    })
  } catch (error) {
    console.error("YouTube video details error:", error)
    return NextResponse.json<VideoResponse>(
      { videos: [], error: "Failed to fetch video details" },
      { status: 500 }
    )
  }
}
