import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// YouTube API types for channels
interface YouTubeChannelSnippet {
  title: string
  description: string
  customUrl?: string
  thumbnails: {
    default: { url: string; width: number; height: number }
    medium: { url: string; width: number; height: number }
    high: { url: string; width: number; height: number }
  }
  publishedAt: string
  country?: string
}

interface YouTubeChannelStatistics {
  viewCount: string
  subscriberCount: string
  hiddenSubscriberCount: boolean
  videoCount: string
}

interface YouTubeChannelBrandingSettings {
  channel: {
    title: string
    description?: string
    keywords?: string
    unsubscribedTrailer?: string
  }
  image?: {
    bannerExternalUrl?: string
  }
}

interface YouTubeChannelContentDetails {
  relatedPlaylists: {
    likes?: string
    uploads: string
  }
}

interface YouTubeChannelItem {
  id: string
  snippet: YouTubeChannelSnippet
  statistics: YouTubeChannelStatistics
  brandingSettings?: YouTubeChannelBrandingSettings
  contentDetails: YouTubeChannelContentDetails
}

interface YouTubeChannelResponse {
  items: YouTubeChannelItem[]
}

// Simplified channel type for the frontend
export interface ChannelData {
  id: string
  name: string
  handle?: string
  description: string
  avatar: string
  avatarHigh?: string
  bannerUrl?: string
  subscriberCount: number
  subscriberCountFormatted: string
  videoCount: number
  viewCount: number
  uploadsPlaylistId: string
  publishedAt: string
  country?: string
}

export interface ChannelResponse {
  channels: ChannelData[]
  error?: string
}

function getApiKey(request: NextRequest): string | null {
  const clientKey = request.headers.get("x-youtube-api-key")
  if (clientKey) return clientKey
  return process.env.YOUTUBE_API_KEY || null
}

// Format subscriber count
function formatSubscriberCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(2)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}K`
  }
  return count.toString()
}

export async function GET(request: NextRequest) {
  const apiKey = getApiKey(request)

  if (!apiKey) {
    return NextResponse.json<ChannelResponse>(
      { channels: [], error: "YouTube API key not configured" },
      { status: 400 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const idsParam = searchParams.get("ids")

  if (!idsParam) {
    return NextResponse.json<ChannelResponse>(
      { channels: [], error: "Channel IDs are required" },
      { status: 400 }
    )
  }

  // Parse channel IDs (comma-separated), limit to 50 per request
  const ids = idsParam.split(",").map(id => id.trim()).filter(Boolean).slice(0, 50)

  if (ids.length === 0) {
    return NextResponse.json<ChannelResponse>(
      { channels: [], error: "No valid channel IDs provided" },
      { status: 400 }
    )
  }

  try {
    const params = new URLSearchParams({
      part: "snippet,statistics,brandingSettings,contentDetails",
      id: ids.join(","),
      key: apiKey,
    })

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour since channel info changes less frequently
    )

    if (!response.ok) {
      const errorData = await response.json()
      const errorMessage = errorData.error?.message || "YouTube API error"
      return NextResponse.json<ChannelResponse>(
        { channels: [], error: errorMessage },
        { status: response.status }
      )
    }

    const data: YouTubeChannelResponse = await response.json()

    const channels: ChannelData[] = data.items.map((item) => {
      const subscriberCount = item.statistics.hiddenSubscriberCount
        ? 0
        : parseInt(item.statistics.subscriberCount || "0")

      return {
        id: item.id,
        name: item.snippet.title,
        handle: item.snippet.customUrl,
        description: item.snippet.description,
        avatar: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        avatarHigh: item.snippet.thumbnails.high?.url,
        bannerUrl: item.brandingSettings?.image?.bannerExternalUrl,
        subscriberCount,
        subscriberCountFormatted: item.statistics.hiddenSubscriberCount
          ? "Hidden"
          : formatSubscriberCount(subscriberCount),
        videoCount: parseInt(item.statistics.videoCount || "0"),
        viewCount: parseInt(item.statistics.viewCount || "0"),
        uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
        publishedAt: item.snippet.publishedAt,
        country: item.snippet.country,
      }
    })

    return NextResponse.json<ChannelResponse>({ channels }, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    })
  } catch (error) {
    console.error("YouTube channel error:", error)
    return NextResponse.json<ChannelResponse>(
      { channels: [], error: "Failed to fetch channel info" },
      { status: 500 }
    )
  }
}
