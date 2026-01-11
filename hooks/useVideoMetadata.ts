"use client"

import { useQuery, useQueries } from "@tanstack/react-query"
import type { VideoMetadata } from "@/lib/video-utils"

// Get thumbnail URL for a video
export function getVideoThumbnailUrl(videoPath: string): string {
  return `/api/video/thumbnail?path=${encodeURIComponent(videoPath)}`
}

// Get metadata URL for a video
export function getVideoMetadataUrl(videoPath: string): string {
  return `/api/video/metadata?path=${encodeURIComponent(videoPath)}`
}

// Fetch metadata for a single video
async function fetchVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  const res = await fetch(getVideoMetadataUrl(videoPath))
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(error.error || "Failed to fetch metadata")
  }
  const data = await res.json()
  return data.metadata
}

// Fetch metadata for multiple videos in batch
async function fetchBatchMetadata(
  videoPaths: string[]
): Promise<Record<string, VideoMetadata | null>> {
  const res = await fetch("/api/video/metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths: videoPaths }),
  })

  if (!res.ok) {
    throw new Error("Failed to fetch batch metadata")
  }

  const data = await res.json()
  const results: Record<string, VideoMetadata | null> = {}

  for (const path of videoPaths) {
    const result = data.results?.[path]
    if (result && !result.error) {
      results[path] = result
    } else {
      results[path] = null
    }
  }

  return results
}

// Hook to get metadata for a single video
export function useVideoMetadata(videoPath: string | null) {
  return useQuery({
    queryKey: ["video-metadata", videoPath],
    queryFn: () => fetchVideoMetadata(videoPath!),
    enabled: !!videoPath,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: 1,
  })
}

// Hook to get metadata for multiple videos
export function useVideosMetadata(videoPaths: string[]) {
  return useQuery({
    queryKey: ["videos-metadata-batch", videoPaths],
    queryFn: () => fetchBatchMetadata(videoPaths),
    enabled: videoPaths.length > 0,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: 1,
  })
}

// Hook to get metadata for multiple videos with individual queries
// (better for progressive loading)
export function useVideosMetadataProgressive(videoPaths: string[]) {
  const queries = useQueries({
    queries: videoPaths.map((path) => ({
      queryKey: ["video-metadata", path],
      queryFn: () => fetchVideoMetadata(path),
      staleTime: 1000 * 60 * 60,
      retry: 1,
    })),
  })

  const metadataMap: Record<string, VideoMetadata | undefined> = {}
  const loadingMap: Record<string, boolean> = {}
  const errorMap: Record<string, Error | null> = {}

  queries.forEach((query, index) => {
    const path = videoPaths[index]
    metadataMap[path] = query.data
    loadingMap[path] = query.isLoading
    errorMap[path] = query.error
  })

  return {
    metadata: metadataMap,
    isLoading: loadingMap,
    errors: errorMap,
    isAnyLoading: queries.some((q) => q.isLoading),
    allLoaded: queries.every((q) => !q.isLoading),
  }
}

// Pre-generate thumbnails for videos (fire and forget)
export function prefetchThumbnails(videoPaths: string[]): void {
  videoPaths.forEach((path) => {
    const img = new Image()
    img.src = getVideoThumbnailUrl(path)
  })
}
