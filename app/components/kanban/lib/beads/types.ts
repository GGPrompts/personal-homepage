/**
 * Beads CLI Type Definitions
 * Types for the beads issue tracker JSONL format
 */

/**
 * Issue priority levels (1 = highest, 4 = lowest)
 */
export type BeadsPriority = 1 | 2 | 3 | 4 | 'low' | 'medium' | 'high' | 'critical'

/**
 * Issue status values
 * Note: beads uses 'open' and 'closed' as primary statuses
 */
export type BeadsStatus = 'open' | 'closed' | 'in_progress' | 'blocked' | 'ready' | 'done' | 'in-progress'

/**
 * Issue type classification
 */
export type BeadsType = 'feature' | 'bug' | 'chore' | 'docs' | 'test' | 'refactor'

/**
 * Main beads issue interface
 * Matches the JSONL format from `bd list --json`
 */
export interface BeadsIssue {
  /** Unique issue identifier (e.g., 'kanban-mo4') */
  id: string

  /** Issue title/summary */
  title: string

  /** Detailed description (markdown supported) */
  description?: string

  /** Current status */
  status: BeadsStatus

  /** Priority level */
  priority: BeadsPriority

  /** Issue type */
  type?: BeadsType

  /** Labels/tags for categorization */
  labels?: string[]

  /** Issues this depends on (blocked by) */
  blockedBy?: string[]

  /** Issues that depend on this */
  blocks?: string[]

  /** Assigned worker/agent */
  assignee?: string

  /** Associated git branch */
  branch?: string

  /** Associated PR number */
  pr?: number

  /** Estimated effort (e.g., '2h', '1d') */
  estimate?: string

  /** Creation timestamp (ISO 8601) */
  createdAt?: string

  /** Last update timestamp (ISO 8601) */
  updatedAt?: string

  /** Closure reason when status is 'closed' */
  closeReason?: string
}

/**
 * Beads daemon health status
 */
export interface BeadsDaemonHealth {
  /** Whether the daemon is running */
  running: boolean

  /** Daemon version */
  version?: string

  /** Number of tracked issues */
  issueCount?: number

  /** Path to beads data directory */
  dataDir?: string

  /** Last sync timestamp */
  lastSync?: string
}

/**
 * Response from `bd list --json`
 */
export interface BeadsListResponse {
  issues: BeadsIssue[]
  total: number
}

/**
 * Response from `bd ready --json`
 */
export interface BeadsReadyResponse {
  issues: BeadsIssue[]
  total: number
}

/**
 * Response from `bd blocked --json`
 */
export interface BeadsBlockedResponse {
  issues: BeadsIssue[]
  blockers: Record<string, string[]>
}

/**
 * Response from `bd show <id> --json`
 */
export interface BeadsShowResponse {
  issue: BeadsIssue
}

/**
 * Update payload for `bd update`
 */
export interface BeadsUpdatePayload {
  title?: string
  description?: string
  status?: BeadsStatus
  priority?: BeadsPriority
  type?: BeadsType
  labels?: string[]
  blockedBy?: string[]
  assignee?: string
  branch?: string
  pr?: number
  estimate?: string
}

/**
 * Error response from bd CLI
 */
export interface BeadsError {
  error: string
  code?: string
  details?: string
}

/**
 * Generic bd command result
 */
export type BeadsResult<T> =
  | { success: true; data: T }
  | { success: false; error: BeadsError }

// ============================================================================
// Real-time Sync Types
// ============================================================================

/**
 * SSE event types for beads sync
 */
export type BeadsSyncEventType = 'connected' | 'update' | 'heartbeat' | 'error'

/**
 * SSE event payload for beads sync
 */
export interface BeadsSyncEvent {
  type: BeadsSyncEventType
  timestamp: string
  issues?: BeadsIssue[]
  error?: string
}

/**
 * Connection state for beads sync
 */
export type BeadsSyncConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * Beads sync hook state
 */
export interface BeadsSyncState {
  /** Current issues from beads */
  issues: BeadsIssue[]
  /** Loading state (true during initial fetch) */
  isLoading: boolean
  /** Connection state */
  connectionState: BeadsSyncConnectionState
  /** Last error message */
  error: string | null
  /** Timestamp of last successful sync */
  lastSync: Date | null
  /** Reconnect attempt count */
  reconnectAttempts: number
}

/**
 * Beads sync hook return type
 */
export interface UseBeadsSyncReturn extends BeadsSyncState {
  /** Manually trigger a refresh */
  refresh: () => Promise<void>
  /** Disconnect from SSE stream */
  disconnect: () => void
  /** Reconnect to SSE stream */
  reconnect: () => void
}
