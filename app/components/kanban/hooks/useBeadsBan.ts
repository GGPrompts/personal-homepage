'use client'

/**
 * useBeadsBan Hook
 * Fetches beads issues and organizes them into fixed BeadsBan columns:
 * - Backlog: open issues without prepared.prompt
 * - Ready: open issues with prepared.prompt, no blockers (from bd ready)
 * - In Progress: in_progress issues
 * - Blocked: blocked issues
 * - Done: closed issues
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { BeadsIssue, BeadsStatus } from '../lib/beads/types'
import type { Task, BeadsTaskMetadata } from '../types'
import { mapBeadsPriorityToKanban, isBeadsTask } from '../lib/beads/mappers'

// Fixed column definitions for BeadsBan
export type BeadsBanColumnId = 'backlog' | 'ready' | 'in-progress' | 'blocked' | 'done'

export interface BeadsBanColumn {
  id: BeadsBanColumnId
  title: string
  color: string
  description: string
}

export const BEADSBAN_COLUMNS: BeadsBanColumn[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    color: 'border-t-slate-500',
    description: 'Open issues not yet prepared for work',
  },
  {
    id: 'ready',
    title: 'Ready',
    color: 'border-t-cyan-500',
    description: 'Issues ready to work (no blockers)',
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    color: 'border-t-amber-500',
    description: 'Currently being worked on',
  },
  {
    id: 'blocked',
    title: 'Blocked',
    color: 'border-t-red-500',
    description: 'Waiting on dependencies',
  },
  {
    id: 'done',
    title: 'Done',
    color: 'border-t-green-500',
    description: 'Completed issues',
  },
]

// API response types
interface BeadsApiIssue {
  id: string
  title: string
  description?: string
  status: string
  priority: number
  type?: string
  labels?: string[]
  assignee?: string
  estimate?: string
  branch?: string
  pr?: number
  blockedBy?: string[]
  blocks?: string[]
  createdAt?: string
  updatedAt?: string
  closedAt?: string
  closeReason?: string
}

interface BeadsListResponse {
  issues: BeadsApiIssue[]
  total: number
}

// API wrappers
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

async function fetchIssues(
  workspace?: string,
  status?: string
): Promise<BeadsListResponse> {
  let url = '/api/beads/issues?all=true&limit=200'
  if (workspace) {
    url += `&workspace=${encodeURIComponent(workspace)}`
  }
  if (status) {
    url += `&status=${encodeURIComponent(status)}`
  }
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch issues')
  }
  return res.json()
}

async function checkTranscriptExists(
  issueId: string,
  workspace?: string
): Promise<boolean> {
  if (!workspace) return false
  try {
    const params = `?workspace=${encodeURIComponent(workspace)}`
    const res = await fetch(`/api/beads/issues/${issueId}/transcript${params}`)
    if (!res.ok) return false
    const data = await res.json()
    return data.exists === true
  } catch {
    return false
  }
}

async function updateIssueStatus(
  id: string,
  status: BeadsStatus,
  workspace?: string
): Promise<void> {
  const res = await fetch(`/api/beads/issues/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, workspace }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update issue')
  }
}

/**
 * Map a beads API issue to a kanban Task
 */
function mapIssueToTask(
  issue: BeadsApiIssue,
  columnId: BeadsBanColumnId,
  order: number,
  hasTranscript: boolean = false
): Task {
  const hasBlockers = issue.blockedBy && issue.blockedBy.length > 0
  const isReady = !hasBlockers && issue.status === 'open'

  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    columnId,
    order,
    priority: mapBeadsPriorityToKanban(issue.priority as 1 | 2 | 3 | 4),
    labels: issue.labels ?? [],
    blockedBy: issue.blockedBy,
    blocking: issue.blocks,
    isReady,
    criticalPath:
      (issue.priority === 1 || issue.priority === 2) &&
      issue.blocks &&
      issue.blocks.length > 0,
    estimate: issue.estimate,
    assignee: issue.assignee,
    git:
      issue.branch || issue.pr
        ? {
            branch: issue.branch,
            prNumber: issue.pr,
          }
        : undefined,
    beadsMetadata: {
      isBeadsTask: true,
      type: issue.type as BeadsTaskMetadata['type'],
      closeReason: issue.closeReason,
      beadsStatus: issue.status,
    },
    // Store extra data for Done column
    ...(columnId === 'done' && {
      // Store transcript availability in a custom field
      // We'll check this in the card component
    }),
    createdAt: issue.createdAt ? new Date(issue.createdAt) : new Date(),
    updatedAt: issue.updatedAt ? new Date(issue.updatedAt) : new Date(),
  }
}

/**
 * Determine which BeadsBan column an issue belongs to
 */
function getColumnForIssue(issue: BeadsApiIssue): BeadsBanColumnId {
  const status = issue.status?.toLowerCase()
  const hasBlockers = issue.blockedBy && issue.blockedBy.length > 0

  if (status === 'closed' || status === 'done') {
    return 'done'
  }

  if (status === 'blocked' || (status === 'open' && hasBlockers)) {
    return 'blocked'
  }

  if (status === 'in_progress' || status === 'in-progress') {
    return 'in-progress'
  }

  // Open issues: check if they're "ready" (have description/prepared prompt)
  // For now, we consider issues with a description as "ready"
  // and those without as "backlog"
  if (issue.description && issue.description.trim().length > 0) {
    return 'ready'
  }

  return 'backlog'
}

export interface UseBeadsBanOptions {
  /** Workspace path (project directory with .beads) */
  workspace?: string
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number
}

export interface UseBeadsBanResult {
  /** Fixed columns for BeadsBan */
  columns: BeadsBanColumn[]
  /** Tasks organized by column ID */
  tasksByColumn: Map<BeadsBanColumnId, Task[]>
  /** All tasks as flat array */
  allTasks: Task[]
  /** Loading state */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Whether beads CLI is available */
  isAvailable: boolean
  /** Refresh issues from beads */
  refresh: () => Promise<void>
  /** Move a task to a different column (syncs to beads) */
  moveTask: (taskId: string, targetColumn: BeadsBanColumnId) => Promise<boolean>
  /** Check if a task has a transcript */
  hasTranscript: (taskId: string) => boolean
  /** Transcript existence map for done tasks */
  transcripts: Map<string, boolean>
}

/**
 * Hook to fetch and manage beads issues in BeadsBan format
 */
export function useBeadsBan({
  workspace,
  refreshInterval = 30000,
}: UseBeadsBanOptions = {}): UseBeadsBanResult {
  const [tasksByColumn, setTasksByColumn] = useState<Map<BeadsBanColumnId, Task[]>>(
    new Map()
  )
  const [transcripts, setTranscripts] = useState<Map<string, boolean>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState(false)

  const workspaceRef = useRef(workspace)
  workspaceRef.current = workspace

  // Check if beads CLI is available
  useEffect(() => {
    fetchBeadsStatus(workspace).then(({ available }) => setIsAvailable(available))
  }, [workspace])

  // Fetch and organize issues
  const refresh = useCallback(async () => {
    if (!isAvailable) return

    setIsLoading(true)
    setError(null)

    try {
      const { issues } = await fetchIssues(workspaceRef.current)

      // Initialize column map
      const grouped = new Map<BeadsBanColumnId, Task[]>([
        ['backlog', []],
        ['ready', []],
        ['in-progress', []],
        ['blocked', []],
        ['done', []],
      ])

      // Track done issue IDs for transcript checking
      const doneIssueIds: string[] = []

      // Group issues by column
      for (const issue of issues) {
        const columnId = getColumnForIssue(issue)
        const tasks = grouped.get(columnId) ?? []
        const task = mapIssueToTask(issue, columnId, tasks.length)
        tasks.push(task)
        grouped.set(columnId, tasks)

        if (columnId === 'done') {
          doneIssueIds.push(issue.id)
        }
      }

      // Sort by priority within each column
      for (const [columnId, tasks] of grouped) {
        tasks.sort((a, b) => {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        })
        // Update order after sorting
        tasks.forEach((task, index) => {
          task.order = index
        })
        grouped.set(columnId, tasks)
      }

      setTasksByColumn(grouped)

      // Check transcripts for done issues (in background)
      if (doneIssueIds.length > 0 && workspaceRef.current) {
        const newTranscripts = new Map<string, boolean>()
        // Check first 20 done issues to avoid too many requests
        const idsToCheck = doneIssueIds.slice(0, 20)
        await Promise.all(
          idsToCheck.map(async (id) => {
            const exists = await checkTranscriptExists(id, workspaceRef.current)
            newTranscripts.set(id, exists)
          })
        )
        setTranscripts(newTranscripts)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch issues')
    }

    setIsLoading(false)
  }, [isAvailable])

  // Initial fetch and refresh interval
  useEffect(() => {
    if (!isAvailable) return

    refresh()

    if (refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [isAvailable, refresh, refreshInterval])

  // Move task to a different column
  const moveTask = useCallback(
    async (taskId: string, targetColumn: BeadsBanColumnId): Promise<boolean> => {
      // Find the task
      let task: Task | undefined
      for (const tasks of tasksByColumn.values()) {
        task = tasks.find((t) => t.id === taskId)
        if (task) break
      }

      if (!task || !isBeadsTask(task)) {
        return false
      }

      // Map column to beads status
      const statusMap: Record<BeadsBanColumnId, BeadsStatus> = {
        backlog: 'open',
        ready: 'open',
        'in-progress': 'in_progress',
        blocked: 'blocked',
        done: 'closed',
      }

      const newStatus = statusMap[targetColumn]

      try {
        await updateIssueStatus(taskId, newStatus, workspaceRef.current)
        // Refresh to get updated state
        await refresh()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to move task')
        return false
      }
    },
    [tasksByColumn, refresh]
  )

  // Check if a task has a transcript
  const hasTranscript = useCallback(
    (taskId: string): boolean => {
      return transcripts.get(taskId) === true
    },
    [transcripts]
  )

  // Compute flat list of all tasks
  const allTasks = Array.from(tasksByColumn.values()).flat()

  return {
    columns: BEADSBAN_COLUMNS,
    tasksByColumn,
    allTasks,
    isLoading,
    error,
    isAvailable,
    refresh,
    moveTask,
    hasTranscript,
    transcripts,
  }
}
