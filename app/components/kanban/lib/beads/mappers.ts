/**
 * Beads to Kanban Mappers
 * Bidirectional mapping between beads issues and kanban tasks
 */

import type { BeadsIssue, BeadsStatus, BeadsPriority } from './types'
import type { Task, Priority, Column, BeadsStatusType } from '../../types'

/**
 * Map beads priority to kanban priority
 * 1 -> urgent, 2 -> high, 3 -> medium, 4 -> low
 * Also supports string values: critical -> urgent, high -> high, etc.
 */
export function mapBeadsPriorityToKanban(priority: BeadsPriority): Priority {
  // Handle numeric priorities (1-4)
  if (typeof priority === 'number') {
    const numMapping: Record<number, Priority> = {
      1: 'urgent',
      2: 'high',
      3: 'medium',
      4: 'low',
    }
    return numMapping[priority] ?? 'medium'
  }
  // Handle string priorities
  const strMapping: Record<string, Priority> = {
    critical: 'urgent',
    high: 'high',
    medium: 'medium',
    low: 'low',
  }
  return strMapping[priority] ?? 'medium'
}

/**
 * Map kanban priority to beads priority (numeric)
 * urgent -> 1, high -> 2, medium -> 3, low -> 4
 */
export function mapKanbanPriorityToBeads(priority: Priority): 1 | 2 | 3 | 4 {
  const mapping: Record<Priority, 1 | 2 | 3 | 4> = {
    urgent: 1,
    high: 2,
    medium: 3,
    low: 4,
  }
  return mapping[priority] ?? 3
}

/**
 * Default status to column mapping
 * Can be overridden with custom column configuration
 */
export const DEFAULT_STATUS_COLUMN_MAP: Record<BeadsStatus, string> = {
  open: 'Ready',
  ready: 'Ready',
  blocked: 'Blocked',
  in_progress: 'In Progress',
  'in-progress': 'In Progress',
  done: 'Done',
  closed: 'Done',
}

/**
 * Find the best matching column for a beads status
 * Tries exact match first, then falls back to default mapping
 */
export function findColumnForStatus(
  status: BeadsStatus,
  columns: Column[],
  customMapping?: Record<BeadsStatus, string>
): Column | undefined {
  const mapping = customMapping ?? DEFAULT_STATUS_COLUMN_MAP
  const targetTitle = mapping[status] ?? 'Ready' // Default to Ready for unknown statuses

  // Try exact title match (case-insensitive)
  let column = columns.find(
    (c) => c.title?.toLowerCase() === targetTitle.toLowerCase()
  )

  // Fallback: try partial match
  if (!column) {
    column = columns.find((c) =>
      c.title?.toLowerCase().includes(targetTitle.toLowerCase())
    )
  }

  // Last resort: return first column
  return column ?? columns[0]
}

/**
 * Map column title to beads status
 */
export function mapColumnToBeadsStatus(column: Column): BeadsStatus {
  const title = (column.title ?? '').toLowerCase()

  if (title.includes('done') || title.includes('complete') || title.includes('closed')) {
    return 'closed'
  }
  if (title.includes('progress') || title.includes('working') || title.includes('active')) {
    return 'in_progress'
  }
  if (title.includes('blocked') || title.includes('stuck')) {
    return 'blocked'
  }
  if (title.includes('ready') || title.includes('todo') || title.includes('backlog')) {
    return 'open'
  }

  // Default to open for unknown columns
  return 'open'
}

/**
 * Convert a beads issue to a kanban Task
 */
export function mapBeadsToTask(
  issue: BeadsIssue,
  columnId: string,
  order: number = 0
): Task {
  // Determine if task is ready (no blockers or status is explicitly 'ready')
  const hasBlockers = issue.blockedBy && issue.blockedBy.length > 0
  const isReady = issue.status === 'ready' || (!hasBlockers && issue.status === 'open')

  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    columnId,
    order,
    priority: mapBeadsPriorityToKanban(issue.priority),
    labels: issue.labels ?? [],
    // Dependency graph
    blockedBy: issue.blockedBy,
    blocking: issue.blocks,
    isReady,
    // Critical path: high/urgent priority + blocks other tasks
    criticalPath: (issue.priority === 1 || issue.priority === 'critical' || issue.priority === 2 || issue.priority === 'high')
      && issue.blocks && issue.blocks.length > 0,
    estimate: issue.estimate,
    assignee: issue.assignee,
    // Map git info if available
    git: issue.branch || issue.pr
      ? {
          branch: issue.branch,
          prNumber: issue.pr,
        }
      : undefined,
    // Beads-specific metadata
    beadsMetadata: {
      isBeadsTask: true,
      type: issue.type,
      closeReason: issue.closeReason,
      beadsStatus: issue.status,
    },
    createdAt: issue.createdAt ? new Date(issue.createdAt) : new Date(),
    updatedAt: issue.updatedAt ? new Date(issue.updatedAt) : new Date(),
  }
}

/**
 * Convert a kanban Task to a partial beads issue update
 * Only includes fields that should be synced back to beads
 */
export function mapTaskToBeadsUpdate(
  task: Task,
  column: Column
): Partial<BeadsIssue> {
  return {
    title: task.title,
    description: task.description,
    status: mapColumnToBeadsStatus(column),
    priority: mapKanbanPriorityToBeads(task.priority),
    labels: task.labels.length > 0 ? task.labels : undefined,
    assignee: task.assignee,
    branch: task.git?.branch,
    pr: task.git?.prNumber,
    estimate: task.estimate,
  }
}

/**
 * Group beads issues by their mapped column
 */
export function groupIssuesByColumn(
  issues: BeadsIssue[],
  columns: Column[],
  customMapping?: Record<BeadsStatus, string>
): Map<string, Task[]> {
  const grouped = new Map<string, Task[]>()

  // Initialize all columns with empty arrays
  for (const column of columns) {
    grouped.set(column.id, [])
  }

  // Map and group issues
  for (const issue of issues) {
    const column = findColumnForStatus(issue.status, columns, customMapping)
    if (column) {
      const tasks = grouped.get(column.id) ?? []
      const task = mapBeadsToTask(issue, column.id, tasks.length)
      tasks.push(task)
      grouped.set(column.id, tasks)
    }
  }

  return grouped
}

/**
 * Check if a task originated from beads
 * First checks beadsMetadata flag, then falls back to ID pattern matching
 * Beads IDs typically follow pattern: project-xxx (e.g., kanban-mo4)
 */
export function isBeadsTask(task: Task): boolean {
  // Check metadata first if available
  if (task.beadsMetadata?.isBeadsTask !== undefined) {
    return task.beadsMetadata.isBeadsTask
  }
  // Fallback to ID pattern matching for backwards compatibility
  return /^[a-z]+-[a-z0-9]+$/i.test(task.id)
}

/**
 * Beads status metadata for display
 */
export const BEADS_STATUS_META: Record<BeadsStatusType, {
  label: string
  shortLabel: string
  color: string
  bgColor: string
  borderColor: string
  description: string
}> = {
  open: {
    label: 'Open',
    shortLabel: 'Open',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/50',
    description: 'Not started - in backlog or ready to work',
  },
  in_progress: {
    label: 'In Progress',
    shortLabel: 'Working',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/50',
    description: 'Currently being worked on',
  },
  blocked: {
    label: 'Blocked',
    shortLabel: 'Blocked',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    description: 'Waiting on dependencies or external factors',
  },
  closed: {
    label: 'Closed',
    shortLabel: 'Done',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
    description: 'Completed or resolved',
  },
}

/**
 * Get the beads status for a column.
 * Uses explicit beadsStatus if set, otherwise infers from column title.
 */
export function getColumnBeadsStatus(column: Column): BeadsStatusType {
  // Use explicit beads status if set
  if (column.beadsStatus) {
    return column.beadsStatus
  }

  // Otherwise infer from column title
  const title = (column.title ?? '').toLowerCase()

  if (title.includes('done') || title.includes('complete') || title.includes('closed') || title.includes('deployed')) {
    return 'closed'
  }
  if (title.includes('progress') || title.includes('working') || title.includes('active') || title.includes('review') || title.includes('ai ') || title.includes('test')) {
    return 'in_progress'
  }
  if (title.includes('blocked') || title.includes('stuck')) {
    return 'blocked'
  }
  // Default: backlog, ready, ideas, triage, spec, etc. are all "open"
  return 'open'
}

/**
 * Group columns by their beads status for visual grouping
 */
export function groupColumnsByBeadsStatus(columns: Column[]): Map<BeadsStatusType, Column[]> {
  const groups = new Map<BeadsStatusType, Column[]>([
    ['open', []],
    ['in_progress', []],
    ['blocked', []],
    ['closed', []],
  ])

  for (const column of columns) {
    const status = getColumnBeadsStatus(column)
    const group = groups.get(status) ?? []
    group.push(column)
    groups.set(status, group)
  }

  return groups
}

/**
 * Check if two columns map to the same beads status
 */
export function columnsSameBeadsStatus(a: Column, b: Column): boolean {
  return getColumnBeadsStatus(a) === getColumnBeadsStatus(b)
}
