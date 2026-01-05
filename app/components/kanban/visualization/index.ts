/**
 * Beads Visualization Components
 *
 * Chart components for visualizing beads issue data:
 * - DependencyNetworkGraph: Force-directed graph of issue dependencies
 * - IssueTimelineChart: Area/composed chart of issue creation/completion
 * - SprintHealthRadar: Radar chart of sprint health metrics
 * - IssueDistributionChart: Bar/pie charts for status/priority distribution
 * - BeadsVisualization: Container component with tabbed navigation
 */

export { BeadsVisualization } from './BeadsVisualization'
export type { BeadsVisualizationProps } from './BeadsVisualization'

export { DependencyNetworkGraph } from './DependencyNetworkGraph'
export type { DependencyNetworkGraphProps } from './DependencyNetworkGraph'

export { IssueTimelineChart } from './IssueTimelineChart'
export type { IssueTimelineChartProps } from './IssueTimelineChart'

export { SprintHealthRadar } from './SprintHealthRadar'
export type { SprintHealthRadarProps } from './SprintHealthRadar'

export { IssueDistributionChart } from './IssueDistributionChart'
export type { IssueDistributionChartProps } from './IssueDistributionChart'

// Chart utilities
export {
  CHART_COLORS,
  CHART_PALETTE,
  tooltipStyle,
  getPriorityColor,
  getStatusColor,
  getPriorityLabel,
  getStatusLabel,
  groupByStatus,
  groupByPriority,
  groupByType,
  calculateSprintHealth,
  generateTimelineData,
} from './chartUtils'

export type {
  SprintHealthMetrics,
  TimelineDataPoint,
} from './chartUtils'
