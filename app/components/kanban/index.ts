/**
 * Kanban Board Module
 *
 * Zustand stores, types, and hooks for AI-powered kanban task management.
 * Migrated from ai-kanban-board project.
 */

// Re-export types
export * from './types'
export * from './types/monitoring'

// Re-export stores
export { useBoardStore } from './lib/store'
export { useAgentProfileStore } from './lib/agent-store'

// Re-export board templates and constants
export { BOARD_TEMPLATES, type BoardTemplate, type BoardTemplateKey, type BoardTemplateColumn } from './lib/constants'

// Re-export beads integration
export * from './lib/beads'

// Re-export BQL (Beads Query Language)
export * from './lib/bql'

// Re-export AI types
export * from './lib/ai'

// Re-export graph metrics
export {
  computeGraphMetrics,
  getTaskMetrics,
  sortTasksByImpact,
  formatUnblockBadge,
  getImpactLevel,
  buildDependencyGraph,
  type TaskMetrics,
  type GraphMetrics,
} from './lib/graph-metrics'

// Re-export hooks
export { useClaudeChat, CONTEXT_LIMIT, type TokenUsage } from './hooks/useClaudeChat'
export { useBQLFilter, useColumnTasks } from './hooks/useBQLFilter'
export {
  useGraphMetrics,
  useTaskMetrics,
  useSortedByImpact,
  type UseGraphMetricsOptions,
  type UseGraphMetricsReturn,
} from './hooks/useGraphMetrics'

// Re-export visualization components
export * from './visualization'
