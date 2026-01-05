import { useQuery } from "@tanstack/react-query"
import { useState, useCallback } from "react"

// Types from API routes
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

export interface VideoDetails {
  id: string
  title: string
  description: string
  thumbnail: string
  thumbnailHigh?: string
  channelId: string
  channelTitle: string
  publishedAt: string
  duration: number
  durationFormatted: string
  viewCount: number
  likeCount?: number
  commentCount?: number
  tags?: string[]
  definition: string
  hasCaption: boolean
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

// Search filters
export interface SearchFilters {
  order?: "relevance" | "date" | "viewCount" | "rating"
  videoDuration?: "any" | "short" | "medium" | "long"
  publishedAfter?: string
}

// Get API key from localStorage
function getYouTubeApiKey(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("youtube-api-key") || null
}

// Hook for searching YouTube
export function useYouTubeSearch(query: string, filters: SearchFilters = {}, enabled = true) {
  const apiKey = getYouTubeApiKey()

  return useQuery({
    queryKey: ["youtube-search", query, filters],
    queryFn: async () => {
      if (!query.trim()) return { results: [], totalResults: 0 }

      const params = new URLSearchParams({ q: query, maxResults: "24" })
      if (filters.order) params.set("order", filters.order)
      if (filters.videoDuration && filters.videoDuration !== "any") {
        params.set("videoDuration", filters.videoDuration)
      }
      if (filters.publishedAfter) params.set("publishedAfter", filters.publishedAfter)

      const response = await fetch(`/api/youtube/search?${params.toString()}`, {
        headers: apiKey ? { "x-youtube-api-key": apiKey } : {},
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to search YouTube")
      }

      return response.json() as Promise<{
        results: SearchResult[]
        nextPageToken?: string
        totalResults: number
      }>
    },
    enabled: enabled && !!query.trim(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook for getting video details
export function useVideoDetails(videoIds: string[], enabled = true) {
  const apiKey = getYouTubeApiKey()

  return useQuery({
    queryKey: ["youtube-videos", videoIds],
    queryFn: async () => {
      if (videoIds.length === 0) return { videos: [] }

      const response = await fetch(`/api/youtube/video?ids=${videoIds.join(",")}`, {
        headers: apiKey ? { "x-youtube-api-key": apiKey } : {},
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to fetch video details")
      }

      return response.json() as Promise<{ videos: VideoDetails[] }>
    },
    enabled: enabled && videoIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })
}

// Hook for loading playlist
export function usePlaylist(playlistId: string | null, enabled = true) {
  const apiKey = getYouTubeApiKey()

  return useQuery({
    queryKey: ["youtube-playlist", playlistId],
    queryFn: async () => {
      if (!playlistId) return { items: [], totalResults: 0 }

      const response = await fetch(`/api/youtube/playlist?id=${encodeURIComponent(playlistId)}&info=true`, {
        headers: apiKey ? { "x-youtube-api-key": apiKey } : {},
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to load playlist")
      }

      return response.json() as Promise<{
        playlist?: PlaylistInfo
        items: PlaylistItem[]
        nextPageToken?: string
        totalResults: number
      }>
    },
    enabled: enabled && !!playlistId,
    staleTime: 5 * 60 * 1000,
  })
}

// Hook for enriching search results with video details (duration, views)
export function useEnrichedSearch(query: string, filters: SearchFilters = {}, enabled = true) {
  const searchQuery = useYouTubeSearch(query, filters, enabled)

  const videoIds = searchQuery.data?.results.map(r => r.videoId) || []
  const detailsQuery = useVideoDetails(videoIds, searchQuery.isSuccess && videoIds.length > 0)

  // Merge search results with video details
  const enrichedResults = searchQuery.data?.results.map(result => {
    const details = detailsQuery.data?.videos.find(v => v.id === result.videoId)
    return {
      ...result,
      duration: details?.duration || 0,
      durationFormatted: details?.durationFormatted || "",
      viewCount: details?.viewCount || 0,
      likeCount: details?.likeCount,
    }
  })

  return {
    data: enrichedResults,
    isLoading: searchQuery.isLoading || (searchQuery.isSuccess && detailsQuery.isLoading),
    isError: searchQuery.isError || detailsQuery.isError,
    error: searchQuery.error || detailsQuery.error,
    totalResults: searchQuery.data?.totalResults || 0,
    refetch: searchQuery.refetch,
  }
}

// Hook for enriching playlist with video durations
export function useEnrichedPlaylist(playlistId: string | null, enabled = true) {
  const playlistQuery = usePlaylist(playlistId, enabled)

  const videoIds = playlistQuery.data?.items.map(item => item.videoId) || []
  const detailsQuery = useVideoDetails(videoIds, playlistQuery.isSuccess && videoIds.length > 0)

  // Merge playlist items with video details
  const enrichedItems = playlistQuery.data?.items.map(item => {
    const details = detailsQuery.data?.videos.find(v => v.id === item.videoId)
    return {
      ...item,
      duration: details?.duration || 0,
      durationFormatted: details?.durationFormatted || "",
      viewCount: details?.viewCount || 0,
    }
  })

  return {
    playlist: playlistQuery.data?.playlist,
    items: enrichedItems || [],
    isLoading: playlistQuery.isLoading || (playlistQuery.isSuccess && detailsQuery.isLoading),
    isError: playlistQuery.isError || detailsQuery.isError,
    error: playlistQuery.error || detailsQuery.error,
    totalResults: playlistQuery.data?.totalResults || 0,
    refetch: playlistQuery.refetch,
  }
}

// Check if YouTube API key is configured
export function useYouTubeApiStatus() {
  const [hasApiKey, setHasApiKey] = useState(() => !!getYouTubeApiKey())

  // Re-check when component mounts or localStorage changes
  const checkApiKey = useCallback(() => {
    setHasApiKey(!!getYouTubeApiKey())
  }, [])

  return { hasApiKey, checkApiKey }
}

// Extract playlist ID from URL or direct ID
export function extractPlaylistId(input: string): string | null {
  if (!input) return null

  // Direct ID (starts with PL or similar)
  if (/^(PL|UU|LL|FL|RD)[a-zA-Z0-9_-]+$/.test(input)) {
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
