/**
 * React hook for graph-based task prioritization metrics
 *
 * Provides memoized graph analysis for:
 * - PageRank: Recursive importance scores
 * - Betweenness: Bottleneck identification
 * - Critical Path: Zero-slack keystone tasks
 * - Impact scoring: Combined metric for prioritization
 */

import { useMemo } from 'react'
import type { Task } from '../types'
import {
  computeGraphMetrics,
  getTaskMetrics,
  sortTasksByImpact,
  formatUnblockBadge,
  getImpactLevel,
  type GraphMetrics,
  type TaskMetrics,
} from '../lib/graph-metrics'

/**
 * Hook options
 */
export interface UseGraphMetricsOptions {
  /** Enable auto-sorting of ready tasks by impact */
  autoSortReady?: boolean
}

/**
 * Return type for useGraphMetrics hook
 */
export interface UseGraphMetricsReturn {
  /** Full graph metrics object */
  metrics: GraphMetrics | null

  /** Get metrics for a specific task */
  getMetrics: (taskId: string) => TaskMetrics | null

  /** Sort tasks by impact score */
  sortByImpact: (tasks: Task[]) => Task[]

  /** Format unblock badge text */
  formatUnblock: (count: number) => string | null

  /** Get impact level label */
  getImpactLevel: (score: number) => 'critical' | 'high' | 'medium' | 'low'

  /** True if metrics have been computed */
  isReady: boolean

  /** Total tasks in dependency graph */
  totalTasks: number

  /** Number of critical path tasks */
  criticalCount: number
}

/**
 * Hook for computing and accessing graph-based task metrics
 *
 * @param tasks - Array of tasks to analyze
 * @param options - Hook configuration options
 * @returns Graph metrics and helper functions
 *
 * @example
 * ```tsx
 * const { metrics, getMetrics, sortByImpact } = useGraphMetrics(tasks)
 *
 * // Get metrics for a specific task
 * const taskMetrics = getMetrics(task.id)
 * if (taskMetrics?.isCriticalPath) {
 *   // Show critical path styling
 * }
 *
 * // Sort ready tasks by impact
 * const sortedReady = sortByImpact(readyTasks)
 * ```
 */
export function useGraphMetrics(
  tasks: Task[],
  _options?: UseGraphMetricsOptions
): UseGraphMetricsReturn {
  // Compute graph metrics, memoized on task changes
  // We create a stable key from task IDs and their dependency arrays
  const metricsKey = useMemo(() => {
    return tasks
      .map((t) => {
        const blockedBy = t.blockedBy?.sort().join(',') ?? ''
        const blocking = t.blocking?.sort().join(',') ?? ''
        return `${t.id}:${t.priority}:${blockedBy}:${blocking}`
      })
      .sort()
      .join('|')
  }, [tasks])

  const metrics = useMemo(() => {
    if (tasks.length === 0) return null
    return computeGraphMetrics(tasks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricsKey])

  // Memoized helper functions
  const getMetrics = useMemo(
    () => (taskId: string) => getTaskMetrics(metrics, taskId),
    [metrics]
  )

  const sortByImpact = useMemo(
    () => (tasksToSort: Task[]) => sortTasksByImpact(tasksToSort, metrics),
    [metrics]
  )

  return {
    metrics,
    getMetrics,
    sortByImpact,
    formatUnblock: formatUnblockBadge,
    getImpactLevel,
    isReady: metrics !== null,
    totalTasks: metrics?.totalTasks ?? 0,
    criticalCount: metrics?.criticalPathCount ?? 0,
  }
}

/**
 * Hook for getting metrics for a single task
 * More focused than useGraphMetrics when you only need one task's data
 *
 * @param tasks - All tasks (for graph context)
 * @param taskId - ID of task to get metrics for
 */
export function useTaskMetrics(
  tasks: Task[],
  taskId: string
): TaskMetrics | null {
  const { getMetrics } = useGraphMetrics(tasks)
  return useMemo(() => getMetrics(taskId), [getMetrics, taskId])
}

/**
 * Hook for sorting tasks by impact score
 * Useful for the Ready column auto-sort feature
 *
 * @param tasks - Tasks to sort
 * @param allTasks - All tasks (for graph context)
 * @param enabled - Whether to enable impact sorting
 */
export function useSortedByImpact(
  tasks: Task[],
  allTasks: Task[],
  enabled = true
): Task[] {
  const { sortByImpact } = useGraphMetrics(allTasks)

  return useMemo(() => {
    if (!enabled) return tasks
    return sortByImpact(tasks)
  }, [tasks, sortByImpact, enabled])
}
