'use client'

/**
 * useTranscript Hook
 * Fetches worker session transcript for a beads issue
 */

import { useState, useEffect, useCallback } from 'react'

export interface TranscriptResult {
  /** Whether the transcript exists */
  exists: boolean
  /** The transcript content (markdown) */
  content: string | null
  /** The file path of the transcript */
  path: string | null
}

export interface UseTranscriptOptions {
  /** Issue ID to fetch transcript for */
  issueId: string
  /** Workspace path (project directory with .beads) */
  workspace: string | null
  /** Whether to enable fetching */
  enabled?: boolean
}

export interface UseTranscriptResult {
  /** Transcript data */
  transcript: TranscriptResult | null
  /** Loading state */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Refresh transcript */
  refresh: () => Promise<void>
}

/**
 * Hook to fetch worker session transcript for a beads issue
 */
export function useTranscript({
  issueId,
  workspace,
  enabled = true,
}: UseTranscriptOptions): UseTranscriptResult {
  const [transcript, setTranscript] = useState<TranscriptResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTranscript = useCallback(async () => {
    if (!enabled || !workspace || !issueId) {
      setTranscript(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ workspace })
      const res = await fetch(`/api/beads/issues/${issueId}/transcript?${params}`)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch transcript')
      }

      const data = await res.json()
      setTranscript({
        exists: data.exists,
        content: data.content || null,
        path: data.path || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transcript')
      setTranscript(null)
    } finally {
      setIsLoading(false)
    }
  }, [issueId, workspace, enabled])

  useEffect(() => {
    fetchTranscript()
  }, [fetchTranscript])

  return {
    transcript,
    isLoading,
    error,
    refresh: fetchTranscript,
  }
}

// Storage key for workspace (same as used in KanbanSection)
const STORAGE_KEY_WORKSPACE = 'kanban-workspace'

/**
 * Get the current workspace from localStorage
 */
export function getStoredWorkspace(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(STORAGE_KEY_WORKSPACE)
  } catch {
    return null
  }
}
