/**
 * Graph Metrics for Task Prioritization
 *
 * Uses graphology library to compute graph-based metrics for intelligent
 * task prioritization. Metrics help identify:
 * - PageRank: Recursive importance (tasks depended on by important tasks)
 * - Betweenness: Bottleneck identification (tasks on many critical paths)
 * - Critical Path: Zero-slack keystone tasks that block the most work
 * - Degree: Direct blocker/blocking counts
 */

import Graph from 'graphology'
import pagerank from 'graphology-metrics/centrality/pagerank'
import betweenness from 'graphology-metrics/centrality/betweenness'
import * as degreeCentrality from 'graphology-metrics/centrality/degree'
import type { Task } from '../types'

/**
 * Metrics computed for a single task
 */
export interface TaskMetrics {
  /** PageRank score (0-1, higher = more important) */
  pageRank: number

  /** Betweenness centrality (higher = more of a bottleneck) */
  betweenness: number

  /** In-degree: number of tasks blocking this one */
  inDegree: number

  /** Out-degree: number of tasks this blocks */
  outDegree: number

  /** Total degree (in + out) */
  degree: number

  /** Total tasks unblocked downstream (recursive) */
  unblockCount: number

  /** Depth in dependency chain (0 = no blockers) */
  depth: number

  /** True if this task is on the critical path */
  isCriticalPath: boolean

  /** Critical path score (combines priority + blocking count) */
  criticalScore: number

  /** Normalized impact score (0-100, for sorting) */
  impactScore: number
}

/**
 * Complete graph analysis result
 */
export interface GraphMetrics {
  /** Per-task metrics indexed by task ID */
  taskMetrics: Map<string, TaskMetrics>

  /** Tasks sorted by impact score (highest first) */
  rankedTasks: string[]

  /** Total number of tasks in graph */
  totalTasks: number

  /** Number of tasks on critical path */
  criticalPathCount: number

  /** Tasks with no blockers (ready to work) */
  readyTasks: string[]

  /** Tasks that are blocked */
  blockedTasks: string[]
}

/**
 * Build a directed graph from tasks using dependency relationships
 * Edge direction: blocker -> blocked (A -> B means A blocks B)
 */
export function buildDependencyGraph(tasks: Task[]): Graph {
  const graph = new Graph({ type: 'directed', allowSelfLoops: false })

  // Add all tasks as nodes
  for (const task of tasks) {
    if (!graph.hasNode(task.id)) {
      graph.addNode(task.id, {
        priority: task.priority,
        title: task.title,
        columnId: task.columnId,
      })
    }
  }

  // Create task ID set for validation
  const taskIds = new Set(tasks.map((t) => t.id))

  // Add edges based on blockedBy relationships
  // If task A is blockedBy task B, then B -> A (B blocks A)
  for (const task of tasks) {
    if (task.blockedBy && task.blockedBy.length > 0) {
      for (const blockerId of task.blockedBy) {
        if (taskIds.has(blockerId) && !graph.hasEdge(blockerId, task.id)) {
          graph.addEdge(blockerId, task.id)
        }
      }
    }

    // Also handle 'blocking' for bidirectional consistency
    if (task.blocking && task.blocking.length > 0) {
      for (const blockedId of task.blocking) {
        if (taskIds.has(blockedId) && !graph.hasEdge(task.id, blockedId)) {
          graph.addEdge(task.id, blockedId)
        }
      }
    }
  }

  return graph
}

/**
 * Count total tasks unblocked downstream (recursive DFS)
 */
function countUnblocked(
  graph: Graph,
  nodeId: string,
  visited: Set<string> = new Set()
): number {
  if (visited.has(nodeId)) return 0
  visited.add(nodeId)

  let count = 0
  graph.forEachOutNeighbor(nodeId, (neighbor) => {
    count += 1 + countUnblocked(graph, neighbor, visited)
  })

  return count
}

/**
 * Calculate depth in dependency chain (max distance from a root)
 */
function calculateDepth(
  graph: Graph,
  nodeId: string,
  memo: Map<string, number> = new Map()
): number {
  if (memo.has(nodeId)) return memo.get(nodeId)!

  const inNeighbors = graph.inNeighbors(nodeId)
  if (inNeighbors.length === 0) {
    memo.set(nodeId, 0)
    return 0
  }

  let maxDepth = 0
  for (const neighbor of inNeighbors) {
    const neighborDepth = calculateDepth(graph, neighbor, memo)
    maxDepth = Math.max(maxDepth, neighborDepth + 1)
  }

  memo.set(nodeId, maxDepth)
  return maxDepth
}

/**
 * Priority weight for critical path scoring
 */
const PRIORITY_WEIGHTS: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
}

/**
 * Compute all graph metrics for a set of tasks
 */
export function computeGraphMetrics(tasks: Task[]): GraphMetrics {
  // Handle empty or single task case
  if (tasks.length === 0) {
    return {
      taskMetrics: new Map(),
      rankedTasks: [],
      totalTasks: 0,
      criticalPathCount: 0,
      readyTasks: [],
      blockedTasks: [],
    }
  }

  const graph = buildDependencyGraph(tasks)
  const taskMetrics = new Map<string, TaskMetrics>()

  // Compute centrality metrics (only if graph has edges)
  let pageRankScores: Record<string, number> = {}
  let betweennessScores: Record<string, number> = {}
  let degreeScores: Record<string, number> = {}
  let inDegreeScores: Record<string, number> = {}
  let outDegreeScores: Record<string, number> = {}

  if (graph.size > 0) {
    // PageRank with dampening factor
    pageRankScores = pagerank(graph, {
      alpha: 0.85,
      maxIterations: 100,
      tolerance: 1e-6,
      getEdgeWeight: () => 1,
    })

    // Betweenness centrality (normalized)
    betweennessScores = betweenness(graph, { normalized: true })

    // Degree centrality variants
    degreeScores = degreeCentrality.degreeCentrality(graph)
    inDegreeScores = degreeCentrality.inDegreeCentrality(graph)
    outDegreeScores = degreeCentrality.outDegreeCentrality(graph)
  } else {
    // Initialize with zeros for all nodes
    for (const task of tasks) {
      pageRankScores[task.id] = 0
      betweennessScores[task.id] = 0
      degreeScores[task.id] = 0
      inDegreeScores[task.id] = 0
      outDegreeScores[task.id] = 0
    }
  }

  // Memoization for depth calculation
  const depthMemo = new Map<string, number>()

  // Calculate per-task metrics
  const readyTasks: string[] = []
  const blockedTasks: string[] = []

  for (const task of tasks) {
    const nodeId = task.id

    const inDeg = inDegreeScores[nodeId] ?? 0
    const outDeg = outDegreeScores[nodeId] ?? 0
    const unblockCount = countUnblocked(graph, nodeId, new Set())
    const depth = calculateDepth(graph, nodeId, depthMemo)

    // Priority weight
    const priorityWeight = PRIORITY_WEIGHTS[task.priority] ?? 2

    // Critical path: high priority + blocks others
    const isCriticalPath = priorityWeight >= 3 && outDeg > 0

    // Critical score combines priority and downstream impact
    const criticalScore = priorityWeight * (1 + outDeg) * (1 + unblockCount * 0.5)

    // Impact score: normalized 0-100 combining all metrics
    // Weights: PageRank (30%), Betweenness (20%), OutDegree (25%), UnblockCount (25%)
    const prNorm = (pageRankScores[nodeId] ?? 0) * 100
    const beNorm = (betweennessScores[nodeId] ?? 0) * 100
    const outNorm = Math.min(outDeg * 10, 100) // Cap at 10 direct dependencies
    const unbNorm = Math.min(unblockCount * 5, 100) // Cap at 20 recursive deps

    const impactScore = prNorm * 0.3 + beNorm * 0.2 + outNorm * 0.25 + unbNorm * 0.25

    // Track ready vs blocked
    if (inDeg === 0) {
      readyTasks.push(nodeId)
    } else {
      blockedTasks.push(nodeId)
    }

    taskMetrics.set(nodeId, {
      pageRank: pageRankScores[nodeId] ?? 0,
      betweenness: betweennessScores[nodeId] ?? 0,
      inDegree: inDeg,
      outDegree: outDeg,
      degree: degreeScores[nodeId] ?? 0,
      unblockCount,
      depth,
      isCriticalPath,
      criticalScore,
      impactScore,
    })
  }

  // Rank tasks by impact score
  const rankedTasks = [...tasks]
    .sort((a, b) => {
      const metricsA = taskMetrics.get(a.id)!
      const metricsB = taskMetrics.get(b.id)!
      return metricsB.impactScore - metricsA.impactScore
    })
    .map((t) => t.id)

  const criticalPathCount = [...taskMetrics.values()].filter(
    (m) => m.isCriticalPath
  ).length

  return {
    taskMetrics,
    rankedTasks,
    totalTasks: tasks.length,
    criticalPathCount,
    readyTasks,
    blockedTasks,
  }
}

/**
 * Get metrics for a specific task, returning default values if not computed
 */
export function getTaskMetrics(
  metrics: GraphMetrics | null,
  taskId: string
): TaskMetrics | null {
  return metrics?.taskMetrics.get(taskId) ?? null
}

/**
 * Sort tasks by impact for "Ready" column prioritization
 * Returns task IDs in order of highest impact (tasks that unblock the most work)
 */
export function sortTasksByImpact(
  tasks: Task[],
  metrics: GraphMetrics | null
): Task[] {
  if (!metrics) return tasks

  return [...tasks].sort((a, b) => {
    const metricsA = metrics.taskMetrics.get(a.id)
    const metricsB = metrics.taskMetrics.get(b.id)

    if (!metricsA && !metricsB) return 0
    if (!metricsA) return 1
    if (!metricsB) return -1

    // Primary sort: impact score (higher first)
    if (metricsA.impactScore !== metricsB.impactScore) {
      return metricsB.impactScore - metricsA.impactScore
    }

    // Secondary sort: unblock count (higher first)
    if (metricsA.unblockCount !== metricsB.unblockCount) {
      return metricsB.unblockCount - metricsA.unblockCount
    }

    // Tertiary sort: critical path tasks first
    if (metricsA.isCriticalPath !== metricsB.isCriticalPath) {
      return metricsA.isCriticalPath ? -1 : 1
    }

    return 0
  })
}

/**
 * Format unblock count for display
 */
export function formatUnblockBadge(unblockCount: number): string | null {
  if (unblockCount === 0) return null
  if (unblockCount === 1) return 'Unblocks 1 task'
  return `Unblocks ${unblockCount} tasks`
}

/**
 * Get impact level label based on score
 */
export function getImpactLevel(
  impactScore: number
): 'critical' | 'high' | 'medium' | 'low' {
  if (impactScore >= 50) return 'critical'
  if (impactScore >= 25) return 'high'
  if (impactScore >= 10) return 'medium'
  return 'low'
}
