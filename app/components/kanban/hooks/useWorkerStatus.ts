'use client'

/**
 * useWorkerStatus Hook
 * Fetches live Claude worker status from state tracker files.
 * Polls every 5 seconds for real-time updates.
 */

import { useState, useCallback, useEffect, useRef } from 'react'

/**
 * Worker state from state tracker files
 */
export interface WorkerState {
  session_id: string
  status: 'idle' | 'tool_use' | 'awaiting_input' | 'unknown'
  current_tool?: string
  subagent_count: number
  working_dir: string
  last_updated: string
  tmux_pane?: string
  pid?: number
  hook_type?: string
  details?: {
    event?: string
    tool?: string
    args?: Record<string, unknown>
  }
  permission_mode?: string
  claude_session_id?: string
  isStale: boolean
  matchedIssueId?: string
  contextPercent?: number
}

/**
 * API response format
 */
interface WorkerStatusResponse {
  workers: WorkerState[]
  total: number
  active: number
  timestamp: string
}

export interface UseWorkerStatusOptions {
  /** Polling interval in ms (default: 5000) */
  pollInterval?: number
  /** Whether to enable polling (default: true) */
  enabled?: boolean
}

export interface UseWorkerStatusResult {
  /** All workers */
  workers: WorkerState[]
  /** Map of issue ID to worker (for quick lookup) */
  workersByIssue: Map<string, WorkerState>
  /** Total worker count */
  total: number
  /** Active (non-stale) worker count */
  active: number
  /** Loading state */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Last fetch timestamp */
  lastUpdated: string | null
  /** Manual refresh trigger */
  refresh: () => Promise<void>
  /** Get worker for a specific issue ID */
  getWorkerForIssue: (issueId: string) => WorkerState | undefined
}

async function fetchWorkerStatus(): Promise<WorkerStatusResponse> {
  const res = await fetch('/api/workers/status')
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch worker status')
  }
  return res.json()
}

/**
 * Hook to fetch and poll Claude worker status
 */
export function useWorkerStatus({
  pollInterval = 5000,
  enabled = true,
}: UseWorkerStatusOptions = {}): UseWorkerStatusResult {
  const [workers, setWorkers] = useState<WorkerState[]>([])
  const [workersByIssue, setWorkersByIssue] = useState<Map<string, WorkerState>>(new Map())
  const [total, setTotal] = useState(0)
  const [active, setActive] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const refresh = useCallback(async () => {
    if (!enabledRef.current) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchWorkerStatus()

      setWorkers(data.workers)
      setTotal(data.total)
      setActive(data.active)
      setLastUpdated(data.timestamp)

      // Build issue lookup map
      const issueMap = new Map<string, WorkerState>()
      for (const worker of data.workers) {
        if (worker.matchedIssueId && !worker.isStale) {
          // Only map non-stale workers to issues
          issueMap.set(worker.matchedIssueId, worker)
        }
      }
      setWorkersByIssue(issueMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch worker status')
    }

    setIsLoading(false)
  }, [])

  // Initial fetch and polling
  useEffect(() => {
    if (!enabled) return

    refresh()

    if (pollInterval > 0) {
      const interval = setInterval(refresh, pollInterval)
      return () => clearInterval(interval)
    }
  }, [enabled, pollInterval, refresh])

  // Get worker for specific issue
  const getWorkerForIssue = useCallback(
    (issueId: string): WorkerState | undefined => {
      return workersByIssue.get(issueId)
    },
    [workersByIssue]
  )

  return {
    workers,
    workersByIssue,
    total,
    active,
    isLoading,
    error,
    lastUpdated,
    refresh,
    getWorkerForIssue,
  }
}
