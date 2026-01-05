'use client'

/**
 * useBeadsIssues Hook
 * Fetches beads issues and maps them to kanban columns
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { BeadsIssue, BeadsStatus, BeadsListResponse, BeadsUpdatePayload, BeadsShowResponse } from '../lib/beads/types'
import type { Task, Column } from '../types'
import {
  groupIssuesByColumn,
  mapColumnToBeadsStatus,
  mapKanbanPriorityToBeads,
  isBeadsTask,
} from '../lib/beads/mappers'

// API wrappers for beads operations (replaces direct client import)
async function fetchBeadsStatus(workspace?: string): Promise<{ available: boolean }> {
  try {
    const params = workspace ? `?workspace=${encodeURIComponent(workspace)}` : ''
    const res = await fetch(`/api/beads/health${params}`)
    if (!res.ok) return { available: false }
    return res.json()
  } catch {
    return { available: false }
  }
}

async function fetchBeadsIssues(workspace?: string): Promise<BeadsListResponse> {
  const params = workspace ? `?workspace=${encodeURIComponent(workspace)}` : ''
  const res = await fetch(`/api/beads/issues${params}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch issues')
  }
  return res.json()
}

async function updateBeadsIssue(id: string, updates: BeadsUpdatePayload, workspace?: string): Promise<BeadsShowResponse> {
  const res = await fetch(`/api/beads/issues/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...updates, workspace }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update issue')
  }
  return res.json()
}

export interface UseBeadsIssuesOptions {
  /** Columns to map issues to */
  columns: Column[]
  /** Workspace path (project directory with .beads) */
  workspace?: string
  /** Custom status to column mapping */
  statusColumnMap?: Record<BeadsStatus, string>
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number
  /** Whether to enable beads integration */
  enabled?: boolean
}

export interface UseBeadsIssuesResult {
  /** Issues grouped by column ID */
  tasksByColumn: Map<string, Task[]>
  /** All issues as flat array */
  allTasks: Task[]
  /** Raw beads issues */
  rawIssues: BeadsIssue[]
  /** Loading state */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Whether beads CLI is available */
  isAvailable: boolean
  /** Refresh issues from beads */
  refresh: () => Promise<void>
  /** Update issue status on column change */
  syncTaskColumn: (taskId: string, newColumn: Column) => Promise<boolean>
  /** Sync task details (title, description, priority, etc.) to beads */
  syncTaskDetails: (taskId: string, updates: Partial<Task>) => Promise<boolean>
}

/**
 * Hook to fetch and manage beads issues as kanban tasks
 */
export function useBeadsIssues({
  columns,
  workspace,
  statusColumnMap,
  refreshInterval = 0,
  enabled = true,
}: UseBeadsIssuesOptions): UseBeadsIssuesResult {
  const [tasksByColumn, setTasksByColumn] = useState<Map<string, Task[]>>(
    new Map()
  )
  const [rawIssues, setRawIssues] = useState<BeadsIssue[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState(false)

  const columnsRef = useRef(columns)

  // Keep columnsRef in sync with columns prop
  useEffect(() => {
    columnsRef.current = columns
  }, [columns])

  // Check if beads CLI is available
  useEffect(() => {
    if (!enabled) {
      setIsAvailable(false)
      return
    }

    fetchBeadsStatus(workspace).then(({ available }) => setIsAvailable(available))
  }, [enabled, workspace])

  // Fetch issues from beads
  const refresh = useCallback(async () => {
    if (!enabled || !isAvailable) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchBeadsIssues(workspace)
      const issues = result.issues
      setRawIssues(issues)

      // Group by column
      const grouped = groupIssuesByColumn(
        issues,
        columnsRef.current,
        statusColumnMap
      )
      setTasksByColumn(grouped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch issues')
    }

    setIsLoading(false)
  }, [enabled, isAvailable, statusColumnMap, workspace])

  // Initial fetch and refresh interval
  useEffect(() => {
    if (!enabled || !isAvailable) return

    refresh()

    if (refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [enabled, isAvailable, refresh, refreshInterval])

  // Re-group when columns change
  useEffect(() => {
    if (rawIssues.length > 0) {
      const grouped = groupIssuesByColumn(rawIssues, columns, statusColumnMap)
      setTasksByColumn(grouped)
    }
  }, [columns, rawIssues, statusColumnMap])

  // Sync task column change to beads
  const syncTaskColumn = useCallback(
    async (taskId: string, newColumn: Column): Promise<boolean> => {
      // Only sync tasks that came from beads
      const task = Array.from(tasksByColumn.values())
        .flat()
        .find((t) => t.id === taskId)

      if (!task || !isBeadsTask(task)) {
        return false
      }

      const newStatus = mapColumnToBeadsStatus(newColumn)

      try {
        await updateBeadsIssue(taskId, { status: newStatus }, workspace)
        // Optimistically update local state
        await refresh()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update issue')
        return false
      }
    },
    [tasksByColumn, refresh, workspace]
  )

  // Sync task details (title, description, priority, etc.) to beads
  const syncTaskDetails = useCallback(
    async (taskId: string, updates: Partial<Task>): Promise<boolean> => {
      // Only sync tasks that came from beads (check by ID format)
      if (!isBeadsTask({ id: taskId } as Task)) {
        return false
      }

      // Build beads update payload from task updates
      const payload: BeadsUpdatePayload = {}

      if (updates.title !== undefined) {
        payload.title = updates.title
      }
      if (updates.description !== undefined) {
        payload.description = updates.description
      }
      if (updates.priority !== undefined) {
        payload.priority = mapKanbanPriorityToBeads(updates.priority)
      }
      if (updates.labels !== undefined) {
        payload.labels = updates.labels
      }
      if (updates.estimate !== undefined) {
        payload.estimate = updates.estimate
      }
      if (updates.assignee !== undefined) {
        payload.assignee = updates.assignee
      }

      // Only sync if there are beads-relevant fields to update
      if (Object.keys(payload).length === 0) {
        return false
      }

      try {
        await updateBeadsIssue(taskId, payload, workspace)
        // Don't refresh here as it would cause flicker during typing
        // The local state is already updated by the store
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to sync task to beads')
        return false
      }
    },
    [workspace]
  )

  // Compute flat list of all tasks
  const allTasks = Array.from(tasksByColumn.values()).flat()

  return {
    tasksByColumn,
    allTasks,
    rawIssues,
    isLoading,
    error,
    isAvailable,
    refresh,
    syncTaskColumn,
    syncTaskDetails,
  }
}

/**
 * Simple hook to check beads availability
 */
export function useBeadsAvailable(): boolean {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    fetchBeadsStatus().then(({ available }) => setAvailable(available))
  }, [])

  return available
}

/**
 * Simple hook to sync task details to beads
 * Use this when you need to sync task edits without the full useBeadsIssues setup
 */
export function useSyncBeadsTask(): {
  syncTaskDetails: (taskId: string, updates: Partial<Task>) => Promise<boolean>
  isAvailable: boolean
} {
  const [isAvailable, setIsAvailable] = useState(false)

  useEffect(() => {
    fetchBeadsStatus().then(({ available }) => setIsAvailable(available))
  }, [])

  const syncTaskDetails = useCallback(
    async (taskId: string, updates: Partial<Task>): Promise<boolean> => {
      // Only sync if beads is available
      if (!isAvailable) {
        return false
      }

      // Only sync tasks that came from beads (check by ID format)
      if (!isBeadsTask({ id: taskId } as Task)) {
        return false
      }

      // Build beads update payload from task updates
      const payload: BeadsUpdatePayload = {}

      if (updates.title !== undefined) {
        payload.title = updates.title
      }
      if (updates.description !== undefined) {
        payload.description = updates.description
      }
      if (updates.priority !== undefined) {
        payload.priority = mapKanbanPriorityToBeads(updates.priority)
      }
      if (updates.labels !== undefined) {
        payload.labels = updates.labels
      }
      if (updates.estimate !== undefined) {
        payload.estimate = updates.estimate
      }
      if (updates.assignee !== undefined) {
        payload.assignee = updates.assignee
      }

      // Only sync if there are beads-relevant fields to update
      if (Object.keys(payload).length === 0) {
        return false
      }

      try {
        await updateBeadsIssue(taskId, payload)
        return true
      } catch (err) {
        console.error('Failed to sync task to beads:', err)
        return false
      }
    },
    [isAvailable]
  )

  return { syncTaskDetails, isAvailable }
}
