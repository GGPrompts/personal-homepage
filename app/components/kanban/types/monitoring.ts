// Worker Monitoring Types - AI Agent Dashboard Integration

import { AgentType } from './index'

/**
 * Worker session status for real-time monitoring
 */
export type WorkerStatus = 'idle' | 'busy' | 'error' | 'offline'

/**
 * Extended worker session info with monitoring metrics
 */
export interface WorkerInfo {
  /** Unique session identifier */
  id: string
  /** Display name for the worker */
  name: string
  /** Agent type running in this worker */
  agentType: AgentType
  /** Current status */
  status: WorkerStatus
  /** Beads issue ID this worker is assigned to */
  beadsIssueId?: string
  /** When the session was spawned */
  spawnedAt: string
  /** Last activity timestamp */
  lastActivity?: string
  /** Health percentage (0-100) */
  health: number
  /** Tasks in queue */
  tasksQueued: number
  /** Tasks completed this session */
  tasksCompleted: number
  /** Success rate (0-1) */
  successRate: number
  /** Average task duration in seconds */
  avgDuration: number
  /** Context window usage percentage */
  contextPercent?: number
  /** Token usage metrics */
  tokenUsage?: WorkerTokenUsage
}

/**
 * Token usage tracking for cost monitoring
 */
export interface WorkerTokenUsage {
  input: number
  output: number
  cacheRead?: number
  cacheCreation?: number
  totalCost: number
}

/**
 * Activity event for live feed
 */
export interface ActivityEvent {
  id: string
  type: 'task_started' | 'task_completed' | 'task_failed' | 'tool_use' | 'context_refresh' | 'worker_spawn' | 'worker_kill'
  workerId?: string
  workerName?: string
  beadsIssueId?: string
  summary: string
  timestamp: string
  metadata?: Record<string, unknown>
}

/**
 * Connection between workers for dependency visualization
 */
export interface WorkerConnection {
  from: string
  to: string
  messages: number
  strength: number // 0-1, connection strength
}

/**
 * Performance metrics for charts
 */
export interface PerformanceMetric {
  timestamp: string
  tasksCompleted: number
  avgDuration: number
  successRate: number
  activeWorkers: number
}

/**
 * Cost breakdown by worker
 */
export interface CostBreakdown {
  workerId: string
  workerName: string
  totalCost: number
  apiCalls: number
  avgCostPerTask: number
}

/**
 * Aggregate metrics for the overview cards
 */
export interface FleetMetrics {
  totalWorkers: number
  activeWorkers: number
  totalTasksCompleted: number
  avgSuccessRate: number
  totalCost: number
  avgCostPerTask: number
}
