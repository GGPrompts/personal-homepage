'use client'

/**
 * WorkerStatusContext
 * Provides live Claude worker status to Kanban board components.
 */

import * as React from 'react'
import { useWorkerStatus, WorkerState } from '../hooks/useWorkerStatus'

interface WorkerStatusContextValue {
  /** Get worker for a specific issue ID */
  getWorkerForIssue: (issueId: string) => WorkerState | undefined
  /** All workers */
  workers: WorkerState[]
  /** Active worker count */
  activeCount: number
  /** Total worker count */
  totalCount: number
  /** Loading state */
  isLoading: boolean
  /** Last updated timestamp */
  lastUpdated: string | null
  /** Manual refresh */
  refresh: () => Promise<void>
}

const WorkerStatusContext = React.createContext<WorkerStatusContextValue | null>(null)

interface WorkerStatusProviderProps {
  children: React.ReactNode
  /** Whether to enable polling (default: true) */
  enabled?: boolean
  /** Polling interval in ms (default: 5000) */
  pollInterval?: number
}

/**
 * Provider component that polls for worker status
 */
export function WorkerStatusProvider({
  children,
  enabled = true,
  pollInterval = 5000,
}: WorkerStatusProviderProps) {
  const {
    workers,
    total,
    active,
    isLoading,
    lastUpdated,
    refresh,
    getWorkerForIssue,
  } = useWorkerStatus({
    enabled,
    pollInterval,
  })

  const value = React.useMemo<WorkerStatusContextValue>(
    () => ({
      getWorkerForIssue,
      workers,
      activeCount: active,
      totalCount: total,
      isLoading,
      lastUpdated,
      refresh,
    }),
    [getWorkerForIssue, workers, active, total, isLoading, lastUpdated, refresh]
  )

  return (
    <WorkerStatusContext.Provider value={value}>
      {children}
    </WorkerStatusContext.Provider>
  )
}

/**
 * Hook to access worker status context
 * @throws if used outside of WorkerStatusProvider
 */
export function useWorkerStatusContext(): WorkerStatusContextValue {
  const context = React.useContext(WorkerStatusContext)
  if (!context) {
    throw new Error('useWorkerStatusContext must be used within a WorkerStatusProvider')
  }
  return context
}

/**
 * Safe version that returns null if context is not available
 */
export function useWorkerStatusContextSafe(): WorkerStatusContextValue | null {
  return React.useContext(WorkerStatusContext)
}
