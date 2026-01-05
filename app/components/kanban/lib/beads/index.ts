/**
 * Beads CLI Integration
 *
 * Provides TypeScript bindings for the beads issue tracker CLI.
 *
 * @example
 * ```ts
 * import { mapBeadsToTask, isBeadsTask } from './beads'
 *
 * // Map beads issue to kanban task
 * const task = mapBeadsToTask(issue, columnId)
 *
 * // Check if task is from beads
 * if (isBeadsTask(task)) {
 *   // sync back to beads
 * }
 * ```
 *
 * @packageDocumentation
 */

// Re-export all types
export type {
  BeadsIssue,
  BeadsPriority,
  BeadsStatus,
  BeadsType,
  BeadsDaemonHealth,
  BeadsListResponse,
  BeadsReadyResponse,
  BeadsBlockedResponse,
  BeadsShowResponse,
  BeadsUpdatePayload,
  BeadsError,
  BeadsResult,
  BeadsSyncEventType,
  BeadsSyncEvent,
  BeadsSyncConnectionState,
  BeadsSyncState,
  UseBeadsSyncReturn,
} from './types'

// Re-export mappers
export {
  mapBeadsPriorityToKanban,
  mapKanbanPriorityToBeads,
  mapBeadsToTask,
  mapTaskToBeadsUpdate,
  mapColumnToBeadsStatus,
  findColumnForStatus,
  groupIssuesByColumn,
  isBeadsTask,
  DEFAULT_STATUS_COLUMN_MAP,
  BEADS_STATUS_META,
  getColumnBeadsStatus,
  groupColumnsByBeadsStatus,
  columnsSameBeadsStatus,
} from './mappers'
