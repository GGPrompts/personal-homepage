/**
 * Hook for managing video downloads with yt-dlp
 *
 * Handles download state, progress tracking via SSE, and download history
 */

import { useState, useCallback, useEffect, useRef } from "react"

export type AudioFormat = "mp3" | "m4a" | "opus" | "flac" | "best"
export type VideoFormat = "mp4" | "webm" | "best"
export type VideoQuality = "2160" | "1440" | "1080" | "720" | "480" | "best"
export type DownloadType = "audio" | "video"

export interface DownloadOptions {
  url: string
  type: DownloadType
  audioFormat?: AudioFormat
  videoFormat?: VideoFormat
  videoQuality?: VideoQuality
}

export interface DownloadProgress {
  id: string
  url: string
  status: "pending" | "downloading" | "processing" | "complete" | "error"
  progress: number
  speed?: string
  eta?: string
  filename?: string
  filesize?: string
  error?: string
  outputPath?: string
}

// Persist download history in localStorage
const HISTORY_KEY = "video-download-history"
const MAX_HISTORY = 50

function loadHistory(): DownloadProgress[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveHistory(history: DownloadProgress[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
  } catch {
    // Ignore storage errors
  }
}

export function useVideoDownload() {
  const [downloads, setDownloads] = useState<Map<string, DownloadProgress>>(new Map())
  const [history, setHistory] = useState<DownloadProgress[]>([])
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map())

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  // Start a new download
  const startDownload = useCallback(async (options: DownloadOptions): Promise<string | null> => {
    try {
      const response = await fetch("/api/video/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to start download")
      }

      const { id } = await response.json()

      // Add to active downloads
      const newProgress: DownloadProgress = {
        id,
        url: options.url,
        status: "pending",
        progress: 0,
      }
      setDownloads(prev => new Map(prev).set(id, newProgress))

      // Start SSE for progress updates
      const eventSource = new EventSource(`/api/video/download?id=${id}&stream=true`)
      eventSourcesRef.current.set(id, eventSource)

      eventSource.onmessage = (event) => {
        try {
          const progress: DownloadProgress = JSON.parse(event.data)

          setDownloads(prev => {
            const updated = new Map(prev)
            updated.set(id, progress)
            return updated
          })

          // If complete or error, close SSE and add to history
          if (progress.status === "complete" || progress.status === "error") {
            eventSource.close()
            eventSourcesRef.current.delete(id)

            // Add to history
            setHistory(prev => {
              const newHistory = [progress, ...prev.filter(h => h.id !== id)].slice(0, MAX_HISTORY)
              saveHistory(newHistory)
              return newHistory
            })

            // Remove from active downloads after a delay
            setTimeout(() => {
              setDownloads(prev => {
                const updated = new Map(prev)
                updated.delete(id)
                return updated
              })
            }, 5000)
          }
        } catch {
          // Ignore parse errors
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        eventSourcesRef.current.delete(id)
      }

      return id
    } catch (error) {
      console.error("Download error:", error)
      return null
    }
  }, [])

  // Cancel a download
  const cancelDownload = useCallback(async (id: string) => {
    try {
      // Close SSE if active
      const eventSource = eventSourcesRef.current.get(id)
      if (eventSource) {
        eventSource.close()
        eventSourcesRef.current.delete(id)
      }

      await fetch(`/api/video/download?id=${id}`, {
        method: "DELETE",
      })

      setDownloads(prev => {
        const updated = new Map(prev)
        updated.delete(id)
        return updated
      })
    } catch (error) {
      console.error("Cancel error:", error)
    }
  }, [])

  // Clear download history
  const clearHistory = useCallback(() => {
    setHistory([])
    saveHistory([])
  }, [])

  // Remove item from history
  const removeFromHistory = useCallback((id: string) => {
    setHistory(prev => {
      const newHistory = prev.filter(h => h.id !== id)
      saveHistory(newHistory)
      return newHistory
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourcesRef.current.forEach(es => es.close())
      eventSourcesRef.current.clear()
    }
  }, [])

  // Get active downloads as array
  const activeDownloads = Array.from(downloads.values())

  // Check if any downloads are active
  const hasActiveDownloads = activeDownloads.length > 0

  return {
    startDownload,
    cancelDownload,
    activeDownloads,
    hasActiveDownloads,
    history,
    clearHistory,
    removeFromHistory,
  }
}

// Quality preset helpers
export interface QualityPreset {
  id: string
  label: string
  description: string
  type: DownloadType
  audioFormat?: AudioFormat
  videoFormat?: VideoFormat
  videoQuality?: VideoQuality
}

export const AUDIO_PRESETS: QualityPreset[] = [
  {
    id: "audio-best-mp3",
    label: "Best Quality MP3",
    description: "320kbps MP3 - Most compatible",
    type: "audio",
    audioFormat: "mp3",
  },
  {
    id: "audio-best-m4a",
    label: "Best Quality M4A",
    description: "AAC in M4A container - Apple compatible",
    type: "audio",
    audioFormat: "m4a",
  },
  {
    id: "audio-best-opus",
    label: "Best Quality OPUS",
    description: "Smaller file size, excellent quality",
    type: "audio",
    audioFormat: "opus",
  },
  {
    id: "audio-best-flac",
    label: "Lossless FLAC",
    description: "Lossless audio - Largest file size",
    type: "audio",
    audioFormat: "flac",
  },
]

export const VIDEO_PRESETS: QualityPreset[] = [
  {
    id: "video-best",
    label: "Best Quality",
    description: "Best available quality",
    type: "video",
    videoFormat: "mp4",
    videoQuality: "best",
  },
  {
    id: "video-1080p",
    label: "1080p Full HD",
    description: "Great quality, reasonable size",
    type: "video",
    videoFormat: "mp4",
    videoQuality: "1080",
  },
  {
    id: "video-720p",
    label: "720p HD",
    description: "Good quality, smaller file",
    type: "video",
    videoFormat: "mp4",
    videoQuality: "720",
  },
  {
    id: "video-480p",
    label: "480p SD",
    description: "Smallest file size",
    type: "video",
    videoFormat: "mp4",
    videoQuality: "480",
  },
]
