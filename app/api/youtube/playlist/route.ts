import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// YouTube API types
interface YouTubePlaylistItem {
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
    }
    channelTitle: string
    playlistId: string
    position: number
    resourceId: {
      kind: string
      videoId: string
    }
    videoOwnerChannelTitle?: string
    videoOwnerChannelId?: string
  }
  contentDetails: {
    videoId: string
    videoPublishedAt?: string
  }
  status?: {
    privacyStatus: string
  }
}

interface YouTubePlaylistResponse {
  items: YouTubePlaylistItem[]
  nextPageToken?: string
  pageInfo: {
    totalResults: number
    resultsPerPage: number
  }
}

interface YouTubePlaylistDetailsResponse {
  items: Array<{
    id: string
    snippet: {
      title: string
      description: string
      channelId: string
      channelTitle: string
      thumbnails: {
        default: { url: string; width: number; height: number }
        medium: { url: string; width: number; height: number }
        high: { url: string; width: number; height: number }
      }
      publishedAt: string
    }
    contentDetails: {
      itemCount: number
    }
  }>
}

export interface PlaylistItem {
  videoId: string
  title: string
  description: string
  thumbnail: string
  channelTitle: string
  position: number
  publishedAt?: string
}

export interface PlaylistInfo {
  id: string
  title: string
  description: string
  thumbnail: string
  channelTitle: string
  channelId: string
  itemCount: number
  publishedAt: string
}

export interface PlaylistResponse {
  playlist?: PlaylistInfo
  items: PlaylistItem[]
  nextPageToken?: string
  totalResults: number
  error?: string
}

function getApiKey(request: NextRequest): string | null {
  const clientKey = request.headers.get("x-youtube-api-key")
  if (clientKey) return clientKey
  return process.env.YOUTUBE_API_KEY || null
}

// Extract playlist ID from various URL formats
function extractPlaylistId(input: string): string | null {
  // Direct ID
  if (/^PL[a-zA-Z0-9_-]{32}$/.test(input) || /^[a-zA-Z0-9_-]{34}$/.test(input)) {
    return input
  }

  // URL formats
  const patterns = [
    /[?&]list=([a-zA-Z0-9_-]+)/,
    /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
  ]

  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match) return match[1]
  }

  return null
}

export async function GET(request: NextRequest) {
  const apiKey = getApiKey(request)

  if (!apiKey) {
    return NextResponse.json<PlaylistResponse>(
      { items: [], totalResults: 0, error: "YouTube API key not configured" },
      { status: 400 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const playlistInput = searchParams.get("id") || searchParams.get("url")
  const maxResults = Math.min(parseInt(searchParams.get("maxResults") || "50"), 50)
  const pageToken = searchParams.get("pageToken")
  const includePlaylistInfo = searchParams.get("info") !== "false"

  if (!playlistInput) {
    return NextResponse.json<PlaylistResponse>(
      { items: [], totalResults: 0, error: "Playlist ID or URL is required" },
      { status: 400 }
    )
  }

  const playlistId = extractPlaylistId(playlistInput)
  if (!playlistId) {
    return NextResponse.json<PlaylistResponse>(
      { items: [], totalResults: 0, error: "Invalid playlist ID or URL" },
      { status: 400 }
    )
  }

  try {
    // Fetch playlist info if requested (only on first page)
    let playlistInfo: PlaylistInfo | undefined
    if (includePlaylistInfo && !pageToken) {
      const playlistParams = new URLSearchParams({
        part: "snippet,contentDetails",
        id: playlistId,
        key: apiKey,
      })

      const playlistResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?${playlistParams.toString()}`,
        { next: { revalidate: 600 } }
      )

      if (playlistResponse.ok) {
        const playlistData: YouTubePlaylistDetailsResponse = await playlistResponse.json()
        if (playlistData.items.length > 0) {
          const pl = playlistData.items[0]
          playlistInfo = {
            id: pl.id,
            title: pl.snippet.title,
            description: pl.snippet.description,
            thumbnail: pl.snippet.thumbnails.medium?.url || pl.snippet.thumbnails.default?.url,
            channelTitle: pl.snippet.channelTitle,
            channelId: pl.snippet.channelId,
            itemCount: pl.contentDetails.itemCount,
            publishedAt: pl.snippet.publishedAt,
          }
        }
      }
    }

    // Fetch playlist items
    const itemsParams = new URLSearchParams({
      part: "snippet,contentDetails,status",
      playlistId: playlistId,
      maxResults: maxResults.toString(),
      key: apiKey,
    })

    if (pageToken) itemsParams.set("pageToken", pageToken)

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?${itemsParams.toString()}`,
      { next: { revalidate: 300 } }
    )

    if (!response.ok) {
      const errorData = await response.json()
      const errorMessage = errorData.error?.message || "YouTube API error"
      return NextResponse.json<PlaylistResponse>(
        { items: [], totalResults: 0, error: errorMessage },
        { status: response.status }
      )
    }

    const data: YouTubePlaylistResponse = await response.json()

    const items: PlaylistItem[] = data.items
      .filter(item => {
        // Filter out deleted/private videos
        if (item.status?.privacyStatus === "private") return false
        if (item.snippet.title === "Deleted video") return false
        if (item.snippet.title === "Private video") return false
        return true
      })
      .map(item => ({
        videoId: item.contentDetails.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        channelTitle: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
        position: item.snippet.position,
        publishedAt: item.contentDetails.videoPublishedAt,
      }))

    return NextResponse.json<PlaylistResponse>({
      playlist: playlistInfo,
      items,
      nextPageToken: data.nextPageToken,
      totalResults: data.pageInfo.totalResults,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    })
  } catch (error) {
    console.error("YouTube playlist error:", error)
    return NextResponse.json<PlaylistResponse>(
      { items: [], totalResults: 0, error: "Failed to fetch playlist" },
      { status: 500 }
    )
  }
}
