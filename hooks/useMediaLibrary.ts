"use client"

import { useState, useCallback, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

// Types
export interface MediaFile {
  name: string
  path: string
  type: "image" | "audio" | "video" | "directory"
  size: number
  modified: string
  extension: string
}

export interface BrowseResponse {
  path: string
  files: MediaFile[]
  total: number
  hasMore: boolean
}

export interface MediaDirectories {
  photos: string
  music: string
  videos: string
}

const STORAGE_KEY = "media-directories"

const DEFAULT_DIRECTORIES: MediaDirectories = {
  photos: "~/Pictures",
  music: "~/Music",
  videos: "~/Videos",
}

// Get stored directories
function getStoredDirectories(): MediaDirectories {
  if (typeof window === "undefined") return DEFAULT_DIRECTORIES
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_DIRECTORIES, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_DIRECTORIES
}

// Save directories
function saveDirectories(dirs: MediaDirectories): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dirs))
}

// Hook for managing media directory preferences
export function useMediaDirectories() {
  const [directories, setDirectoriesState] = useState<MediaDirectories>(DEFAULT_DIRECTORIES)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setDirectoriesState(getStoredDirectories())
    setLoaded(true)
  }, [])

  const setDirectories = useCallback((newDirs: Partial<MediaDirectories>) => {
    setDirectoriesState((prev) => {
      const updated = { ...prev, ...newDirs }
      saveDirectories(updated)
      return updated
    })
  }, [])

  const resetToDefaults = useCallback(() => {
    setDirectoriesState(DEFAULT_DIRECTORIES)
    saveDirectories(DEFAULT_DIRECTORIES)
  }, [])

  return {
    directories,
    setDirectories,
    resetToDefaults,
    loaded,
  }
}

// Hook for browsing a directory
export function useMediaBrowser(
  initialPath: string,
  mediaType?: "image" | "audio" | "video"
) {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [recursive, setRecursive] = useState(false)
  const queryClient = useQueryClient()

  // Update path when initialPath changes
  useEffect(() => {
    setCurrentPath(initialPath)
  }, [initialPath])

  const queryKey = ["media-browse", currentPath, mediaType, recursive]

  const { data, isLoading, error, refetch } = useQuery<BrowseResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        path: currentPath,
        recursive: String(recursive),
        limit: "100",
      })
      if (mediaType) {
        params.set("type", mediaType)
      }
      const res = await fetch(`/api/media/browse?${params}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to browse directory")
      }
      return res.json()
    },
    staleTime: 30000, // Cache for 30 seconds
    retry: 1,
    enabled: !!currentPath,
  })

  const navigateTo = useCallback((path: string) => {
    setCurrentPath(path)
  }, [])

  const navigateUp = useCallback(() => {
    const parentPath = currentPath.replace(/\/[^/]+$/, "") || "/"
    setCurrentPath(parentPath)
  }, [currentPath])

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["media-browse", currentPath] })
    refetch()
  }, [queryClient, currentPath, refetch])

  return {
    currentPath,
    setCurrentPath: navigateTo,
    navigateUp,
    files: data?.files || [],
    total: data?.total || 0,
    hasMore: data?.hasMore || false,
    isLoading,
    error: error?.message || null,
    refresh,
    recursive,
    setRecursive,
  }
}

// Hook for checking if a directory exists
export function useDirectoryExists(path: string) {
  return useQuery({
    queryKey: ["directory-exists", path],
    queryFn: async () => {
      const res = await fetch("/api/media/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "exists", path }),
      })
      if (!res.ok) return { exists: false }
      const data = await res.json()
      return { exists: data.exists }
    },
    staleTime: 60000, // Cache for 1 minute
    enabled: !!path,
  })
}

// Build URL for serving a media file
export function getMediaUrl(filePath: string): string {
  return `/api/media/serve?path=${encodeURIComponent(filePath)}`
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
