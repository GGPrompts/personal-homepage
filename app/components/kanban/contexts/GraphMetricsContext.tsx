'use client'

/**
 * React Context for Graph Metrics
 *
 * Provides graph-based task metrics to all components in the tree.
 * Metrics are computed at the board level and shared via context
 * to avoid redundant computation and prop drilling.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react'
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
 * Context value shape
 */
interface GraphMetricsContextValue {
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
}

const GraphMetricsContext = createContext<GraphMetricsContextValue | null>(null)

interface GraphMetricsProviderProps {
  /** All tasks to compute metrics for */
  tasks: Task[]
  /** Child components */
  children: ReactNode
}

/**
 * Provider component that computes and provides graph metrics
 */
export function GraphMetricsProvider({
  tasks,
  children,
}: GraphMetricsProviderProps) {
  // Create stable key for memoization based on task structure
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

  // Compute metrics when tasks change
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

  const value = useMemo(
    () => ({
      metrics,
      getMetrics,
      sortByImpact,
      formatUnblock: formatUnblockBadge,
      getImpactLevel,
      isReady: metrics !== null,
    }),
    [metrics, getMetrics, sortByImpact]
  )

  return (
    <GraphMetricsContext.Provider value={value}>
      {children}
    </GraphMetricsContext.Provider>
  )
}

/**
 * Hook to access graph metrics from context
 * Throws if used outside of GraphMetricsProvider
 */
export function useGraphMetricsContext(): GraphMetricsContextValue {
  const context = useContext(GraphMetricsContext)
  if (!context) {
    throw new Error(
      'useGraphMetricsContext must be used within a GraphMetricsProvider'
    )
  }
  return context
}

/**
 * Hook to safely access graph metrics (returns null if not in provider)
 */
export function useGraphMetricsContextSafe(): GraphMetricsContextValue | null {
  return useContext(GraphMetricsContext)
}

/**
 * Hook to get metrics for a specific task
 */
export function useTaskGraphMetrics(taskId: string): TaskMetrics | null {
  const context = useContext(GraphMetricsContext)
  return context?.getMetrics(taskId) ?? null
}
