/**
 * Chart Utilities
 * Shared utilities for beads visualization charts
 */

import type { BeadsIssue, BeadsPriority, BeadsStatus } from '../lib/beads/types'

// Terminal color scheme (emerald/cyan palette)
export const CHART_COLORS = {
  primary: '#10b981',      // emerald-500
  secondary: '#06b6d4',    // cyan-500
  accent: '#f59e0b',       // amber-500
  danger: '#ef4444',       // red-500
  muted: '#6b7280',        // gray-500

  // Priority colors
  critical: '#ef4444',     // red-500
  high: '#f97316',         // orange-500
  medium: '#f59e0b',       // amber-500
  low: '#10b981',          // emerald-500

  // Status colors
  open: '#06b6d4',         // cyan-500
  ready: '#22d3ee',        // cyan-400
  inProgress: '#f59e0b',   // amber-500
  blocked: '#ef4444',      // red-500
  done: '#10b981',         // emerald-500
  closed: '#6b7280',       // gray-500
}

// Chart color palette for multiple series
export const CHART_PALETTE = [
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#a855f7', // purple
  '#f43f5e', // rose
  '#3b82f6', // blue
]

/**
 * Common tooltip styling for glass effect
 */
export const tooltipStyle = {
  backgroundColor: 'rgba(24, 24, 27, 0.95)',
  border: '1px solid rgba(63, 63, 70, 0.5)',
  borderRadius: '8px',
  color: '#e4e4e7',
  backdropFilter: 'blur(8px)',
}

/**
 * Get priority color
 */
export function getPriorityColor(priority: BeadsPriority): string {
  if (typeof priority === 'number') {
    switch (priority) {
      case 1: return CHART_COLORS.critical
      case 2: return CHART_COLORS.high
      case 3: return CHART_COLORS.medium
      case 4: return CHART_COLORS.low
      default: return CHART_COLORS.muted
    }
  }
  switch (priority) {
    case 'critical': return CHART_COLORS.critical
    case 'high': return CHART_COLORS.high
    case 'medium': return CHART_COLORS.medium
    case 'low': return CHART_COLORS.low
    default: return CHART_COLORS.muted
  }
}

/**
 * Get status color
 */
export function getStatusColor(status: BeadsStatus): string {
  switch (status) {
    case 'open': return CHART_COLORS.open
    case 'ready': return CHART_COLORS.ready
    case 'in_progress':
    case 'in-progress': return CHART_COLORS.inProgress
    case 'blocked': return CHART_COLORS.blocked
    case 'done':
    case 'closed': return CHART_COLORS.done
    default: return CHART_COLORS.muted
  }
}

/**
 * Get priority label
 */
export function getPriorityLabel(priority: BeadsPriority): string {
  if (typeof priority === 'number') {
    switch (priority) {
      case 1: return 'Critical'
      case 2: return 'High'
      case 3: return 'Medium'
      case 4: return 'Low'
      default: return 'Unknown'
    }
  }
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}

/**
 * Get status label
 */
export function getStatusLabel(status: BeadsStatus): string {
  switch (status) {
    case 'open': return 'Open'
    case 'ready': return 'Ready'
    case 'in_progress':
    case 'in-progress': return 'In Progress'
    case 'blocked': return 'Blocked'
    case 'done': return 'Done'
    case 'closed': return 'Closed'
    default: return status
  }
}

/**
 * Group issues by status
 */
export function groupByStatus(issues: BeadsIssue[]): Record<string, number> {
  return issues.reduce((acc, issue) => {
    const status = getStatusLabel(issue.status)
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

/**
 * Group issues by priority
 */
export function groupByPriority(issues: BeadsIssue[]): Record<string, number> {
  return issues.reduce((acc, issue) => {
    const priority = getPriorityLabel(issue.priority)
    acc[priority] = (acc[priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

/**
 * Group issues by type
 */
export function groupByType(issues: BeadsIssue[]): Record<string, number> {
  return issues.reduce((acc, issue) => {
    const type = issue.type || 'other'
    const label = type.charAt(0).toUpperCase() + type.slice(1)
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

/**
 * Calculate sprint health metrics
 */
export interface SprintHealthMetrics {
  velocity: number        // % of issues completed
  throughput: number      // Issues per day (normalized 0-100)
  blockedRatio: number    // % blocked
  readyRatio: number      // % ready for work
  priorityBalance: number // Score based on priority distribution
  dependencyHealth: number // Issues without blockers %
}

export function calculateSprintHealth(issues: BeadsIssue[]): SprintHealthMetrics {
  if (issues.length === 0) {
    return {
      velocity: 0,
      throughput: 0,
      blockedRatio: 0,
      readyRatio: 0,
      priorityBalance: 0,
      dependencyHealth: 0,
    }
  }

  const total = issues.length
  const completed = issues.filter(i => i.status === 'done' || i.status === 'closed').length
  const blocked = issues.filter(i => i.status === 'blocked').length
  const ready = issues.filter(i => i.status === 'ready' || i.status === 'open').length
  const withBlockers = issues.filter(i => (i.blockedBy?.length ?? 0) > 0).length

  // Priority balance: better if work is evenly distributed
  const byPriority = groupByPriority(issues)
  const priorityValues = Object.values(byPriority)
  const avgPriority = priorityValues.reduce((a, b) => a + b, 0) / priorityValues.length
  const priorityVariance = priorityValues.reduce((sum, v) => sum + Math.pow(v - avgPriority, 2), 0) / priorityValues.length
  const priorityBalance = Math.max(0, 100 - (priorityVariance * 5))

  return {
    velocity: Math.round((completed / total) * 100),
    throughput: Math.min(100, Math.round((completed / Math.max(1, total)) * 100)),
    blockedRatio: Math.round(100 - (blocked / total) * 100), // Inverted so higher = better
    readyRatio: Math.round((ready / total) * 100),
    priorityBalance: Math.round(priorityBalance),
    dependencyHealth: Math.round(100 - (withBlockers / total) * 100),
  }
}

/**
 * Parse date from beads issue
 */
export function parseIssueDate(dateStr?: string): Date | null {
  if (!dateStr) return null
  try {
    return new Date(dateStr)
  } catch {
    return null
  }
}

/**
 * Generate timeline data from issues
 */
export interface TimelineDataPoint {
  date: string
  created: number
  completed: number
  cumulative: number
}

export function generateTimelineData(issues: BeadsIssue[]): TimelineDataPoint[] {
  const dateMap = new Map<string, { created: number; completed: number }>()

  // Group by date
  issues.forEach(issue => {
    const createdDate = parseIssueDate(issue.createdAt)
    const completedDate = (issue.status === 'done' || issue.status === 'closed')
      ? parseIssueDate(issue.updatedAt)
      : null

    if (createdDate) {
      const key = createdDate.toISOString().split('T')[0]
      const existing = dateMap.get(key) || { created: 0, completed: 0 }
      existing.created++
      dateMap.set(key, existing)
    }

    if (completedDate) {
      const key = completedDate.toISOString().split('T')[0]
      const existing = dateMap.get(key) || { created: 0, completed: 0 }
      existing.completed++
      dateMap.set(key, existing)
    }
  })

  // Sort by date and calculate cumulative
  const sorted = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b))
  let cumulative = 0

  return sorted.map(([date, { created, completed }]) => {
    cumulative += created - completed
    return {
      date,
      created,
      completed,
      cumulative,
    }
  })
}
