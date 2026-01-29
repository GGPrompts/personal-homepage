"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { motion } from "framer-motion"
import {
  GripVertical,
  GitBranch,
  GitPullRequest,
  AlertTriangle,
  Unlock,
  CheckCircle2,
  Link,
  Zap,
  FileText,
  Calendar,
  MessageSquare,
  Clock,
  TestTube2,
  Eye,
  Code2,
  FileCheck,
  Hammer,
  Shield,
  FolderGit2,
} from "lucide-react"
import { Task, PRIORITY_COLORS } from "../types"
import { useBoardStore } from "../lib/store"
import { useGraphMetricsContextSafe } from "../contexts/GraphMetricsContext"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { extractPromptFromNotes } from "@/hooks/usePromptGeneration"
import { useWorkerStatusContextSafe } from "../contexts/WorkerStatusContext"
import { WorkerStatusBadge } from "./WorkerStatusBadge"

/**
 * Extract project prefix from issue ID (e.g., "TabzChrome-rsd9" -> "TabzChrome")
 */
function getProjectFromId(id: string): string | null {
  const lastDashIndex = id.lastIndexOf('-')
  if (lastDashIndex === -1) return null
  return id.substring(0, lastDashIndex)
}

/**
 * Generate a consistent color for a project name
 */
const PROJECT_COLORS: Record<string, string> = {
  'TabzChrome': 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  'TabzBeads': 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  'TabzTemplates': 'bg-teal-500/20 border-teal-500/40 text-teal-300',
  'BeadsHive': 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  'V4V': 'bg-rose-500/20 border-rose-500/40 text-rose-300',
  'PD': 'bg-violet-500/20 border-violet-500/40 text-violet-300',
  'personal': 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
  'tmuxplexer': 'bg-orange-500/20 border-orange-500/40 text-orange-300',
  'ThumbCommand': 'bg-pink-500/20 border-pink-500/40 text-pink-300',
  'ai': 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300',
}

function getProjectColor(project: string): string {
  return PROJECT_COLORS[project] || 'bg-zinc-500/20 border-zinc-500/40 text-zinc-300'
}

/**
 * Gate label configuration - maps gate: prefixed labels to icons and display names
 */
const GATE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>, label: string, color: string }> = {
  'test-runner': { icon: TestTube2, label: 'Tests', color: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' },
  'visual-qa': { icon: Eye, label: 'Visual', color: 'bg-violet-500/15 border-violet-500/30 text-violet-400' },
  'codex-review': { icon: Code2, label: 'Review', color: 'bg-amber-500/15 border-amber-500/30 text-amber-400' },
  'docs-check': { icon: FileCheck, label: 'Docs', color: 'bg-purple-500/15 border-purple-500/30 text-purple-400' },
  'build': { icon: Hammer, label: 'Build', color: 'bg-orange-500/15 border-orange-500/30 text-orange-400' },
  'security': { icon: Shield, label: 'Security', color: 'bg-red-500/15 border-red-500/30 text-red-400' },
}

/**
 * Format relative time since a date (e.g., "just now", "5m ago", "2h ago")
 */
function formatTimeAgo(date: Date): string {
  const ms = Date.now() - date.getTime()
  if (ms < 0) return 'just now'

  const minutes = Math.floor(ms / (1000 * 60))
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'just now'
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return `${minutes}m ago`
}

interface KanbanCardProps {
  task: Task
  isOverlay?: boolean
  /** Whether task is in the Done column (closed tasks) */
  isDoneColumn?: boolean
  /** Whether to show worker status badge (for in-progress column) */
  showWorkerStatus?: boolean
  /** Whether this task has a transcript available */
  hasTranscript?: boolean
  /** Workspace path for beads API calls */
  workspace?: string
  /** Initial notes from beads (for detecting existing prompts) */
  initialNotes?: string
}

export function KanbanCard({
  task,
  isOverlay = false,
  isDoneColumn = false,
  showWorkerStatus = false,
  hasTranscript = false,
  workspace,
  initialNotes,
}: KanbanCardProps) {
  const setSelectedTask = useBoardStore((state) => state.setSelectedTask)
  const graphMetrics = useGraphMetricsContextSafe()
  const workerStatusContext = useWorkerStatusContextSafe()

  // Get worker for this task if showing worker status
  const worker = showWorkerStatus && workerStatusContext
    ? workerStatusContext.getWorkerForIssue(task.id)
    : undefined

  // Get graph-computed metrics for this task
  const taskMetrics = graphMetrics?.getMetrics(task.id)

  // Check if task has a saved prompt (extracted from notes)
  const hasPrompt = extractPromptFromNotes(initialNotes) !== null

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return
    if ((e.target as HTMLElement).closest("[data-drag-handle]")) return
    setSelectedTask(task.id)
  }

  // Dependency state - prefer graph metrics when available
  const hasBlockers = taskMetrics ? taskMetrics.inDegree > 0 : (task.blockedBy && task.blockedBy.length > 0)
  const blocksOthers = taskMetrics ? taskMetrics.outDegree > 0 : (task.blocking && task.blocking.length > 0)
  const hasReadyLabel = task.labels?.includes('ready') ?? false
  const isCriticalPath = taskMetrics?.isCriticalPath ?? task.criticalPath

  // Graph-computed metrics for enhanced badges
  const unblockCount = taskMetrics?.unblockCount ?? 0
  const impactScore = taskMetrics?.impactScore ?? 0
  const blockerCount = task.blockedBy?.length ?? 0
  const effectiveUnblockCount = unblockCount > 0 ? unblockCount : (task.blocking?.length ?? 0)
  const showHighImpact = impactScore >= 25

  // Done column metadata
  const closeReason = task.beadsMetadata?.closeReason
  const closedAt = task.beadsMetadata?.closedAt ?? task.updatedAt
  const timeAgo = closedAt ? formatTimeAgo(closedAt) : null

  // Gate labels - filter labels starting with "gate:" and map to config
  const gateLabels = (task.labels ?? [])
    .filter(label => label.startsWith('gate:'))
    .map(label => {
      const gateName = label.replace('gate:', '')
      return { name: gateName, config: GATE_CONFIG[gateName] }
    })
    .filter(gate => gate.config) // Only show gates with known config

  // Non-gate labels for regular display
  const regularLabels = (task.labels ?? []).filter(label => !label.startsWith('gate:'))

  // Extract project from issue ID for multi-project boards
  const project = getProjectFromId(task.id)

  // Render overlay version (shown during drag)
  if (isOverlay) {
    return (
      <div className="kanban-card p-3 border-glow opacity-90 rotate-3">
        <h4 className="text-sm font-medium text-zinc-100 leading-tight mb-2 line-clamp-2">
          {task.title}
        </h4>
      </div>
    )
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      data-tabz-item={`task-${task.id}`}
      data-critical-path={isCriticalPath}
      data-blocked={hasBlockers}
      data-ready={hasReadyLabel}
      className={cn(
        "kanban-card group relative p-3",
        isDragging && "opacity-50 scale-[1.02] border-glow",
        hasBlockers && "ring-1 ring-red-500/30 border-red-500/20",
        isCriticalPath && "critical-path-glow",
        hasReadyLabel && !hasBlockers && !isDoneColumn && "ring-1 ring-cyan-500/20 border-cyan-500/10",
        isDoneColumn && "opacity-80"
      )}
      onClick={handleClick}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        data-drag-handle
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-zinc-400" />
      </div>

      <div className="pl-4">
        {/* Dependency indicators row */}
        {!isDoneColumn && (hasBlockers || effectiveUnblockCount > 0 || isCriticalPath || hasReadyLabel || showHighImpact) && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {hasBlockers && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30">
                <AlertTriangle className="h-3 w-3 text-red-400" />
                <span className="text-[10px] font-medium text-red-400 mono">
                  Blocked by {blockerCount}
                </span>
              </div>
            )}

            {effectiveUnblockCount > 0 && (
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded border",
                effectiveUnblockCount >= 3
                  ? "bg-orange-500/15 border-orange-500/30"
                  : "bg-amber-500/15 border-amber-500/30"
              )}>
                <Unlock className={cn(
                  "h-3 w-3",
                  effectiveUnblockCount >= 3 ? "text-orange-400" : "text-amber-400"
                )} />
                <span className={cn(
                  "text-[10px] font-medium mono",
                  effectiveUnblockCount >= 3 ? "text-orange-400" : "text-amber-400"
                )}>
                  Unblocks {effectiveUnblockCount}
                </span>
              </div>
            )}

            {isCriticalPath && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30">
                <Link className="h-3 w-3 text-purple-400" />
                <span className="text-[10px] font-medium text-purple-400 mono">Critical</span>
              </div>
            )}

            {hasReadyLabel && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30">
                <CheckCircle2 className="h-3 w-3 text-cyan-400" />
                <span className="text-[10px] font-medium text-cyan-400 mono">Ready</span>
              </div>
            )}

            {showHighImpact && (
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded border",
                impactScore >= 50
                  ? "bg-rose-500/15 border-rose-500/30"
                  : "bg-pink-500/15 border-pink-500/30"
              )}>
                <Zap className={cn(
                  "h-3 w-3",
                  impactScore >= 50 ? "text-rose-400" : "text-pink-400"
                )} />
                <span className={cn(
                  "text-[10px] font-medium mono",
                  impactScore >= 50 ? "text-rose-400" : "text-pink-400"
                )}>
                  {impactScore >= 50 ? 'Critical Impact' : 'High Impact'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Worker status badge for in-progress tasks */}
        {showWorkerStatus && worker && (
          <div className="mb-2">
            <WorkerStatusBadge worker={worker} />
          </div>
        )}

        {/* No worker indicator for in-progress tasks without active worker */}
        {showWorkerStatus && !worker && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-500/15 border border-zinc-500/30">
              <Clock className="h-3 w-3 text-zinc-400" />
              <span className="text-[10px] font-medium text-zinc-400 mono">
                No worker
              </span>
            </div>
          </div>
        )}

        {/* Done column: completed badge with metadata */}
        {isDoneColumn && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/15 border border-green-500/30">
              <CheckCircle2 className="h-3 w-3 text-green-400" />
              <span className="text-[10px] font-medium text-green-400 mono">Completed</span>
            </div>
            {timeAgo && (
              <span className="text-[10px] text-zinc-500 mono">{timeAgo}</span>
            )}
            {hasTranscript && (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/30 cursor-pointer hover:bg-violet-500/25 transition-colors"
                title="View transcript in task details"
              >
                <FileText className="h-3 w-3 text-violet-400" />
                <span className="text-[10px] font-medium text-violet-400 mono">Transcript</span>
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <h4 className="text-sm font-medium text-zinc-100 leading-tight mb-2 line-clamp-2">
          {task.title}
        </h4>

        {/* Metadata row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Project badge - for multi-project boards */}
          {project && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border mono",
                getProjectColor(project)
              )}
              title={`Project: ${project}`}
            >
              <FolderGit2 className="h-3 w-3" />
              {project}
            </span>
          )}

          {/* Priority badge */}
          <span
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded text-white uppercase tracking-wide mono",
              PRIORITY_COLORS[task.priority]
            )}
          >
            {task.priority}
          </span>

          {/* Issue type badge */}
          {task.beadsMetadata?.type && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5 bg-white/5 border-white/10 text-zinc-400"
            >
              {task.beadsMetadata.type}
            </Badge>
          )}

          {/* Labels (excluding gate: labels) */}
          {regularLabels.slice(0, 2).map((label) => (
            <Badge
              key={label}
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5 bg-white/5 border-white/10 text-zinc-400"
            >
              {label}
            </Badge>
          ))}
          {regularLabels.length > 2 && (
            <span className="text-[10px] text-zinc-500">
              +{regularLabels.length - 2}
            </span>
          )}
        </div>

        {/* Gate labels */}
        {gateLabels.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {gateLabels.map(({ name, config }) => {
              const IconComponent = config.icon
              return (
                <div
                  key={name}
                  className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded border",
                    config.color
                  )}
                  title={`Gate: ${name}`}
                >
                  <IconComponent className="h-3 w-3" />
                  <span className="text-[10px] font-medium mono">{config.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Git indicator */}
        {task.git?.branch && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
            <GitBranch className="h-3 w-3" />
            <span className="truncate max-w-24 mono text-[10px]">{task.git.branch}</span>
            {task.git.prNumber && (
              <div className="flex items-center gap-1 ml-auto">
                <GitPullRequest className="h-3 w-3" />
                <span className="text-zinc-400 mono text-[10px]">#{task.git.prNumber}</span>
              </div>
            )}
          </div>
        )}

        {/* Close reason for done tasks */}
        {isDoneColumn && closeReason && (
          <div className="mt-2 pt-2 border-t border-zinc-800/50">
            <div className="flex items-start gap-1.5">
              <MessageSquare className="h-3 w-3 text-zinc-300 mt-0.5 shrink-0" />
              <p className="text-xs text-zinc-300 line-clamp-2">{closeReason}</p>
            </div>
          </div>
        )}

        {/* Completion date for done tasks */}
        {isDoneColumn && closedAt && (
          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-zinc-600">
            <Calendar className="h-3 w-3" />
            <span className="mono" suppressHydrationWarning>
              {closedAt.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: closedAt.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
              })}
            </span>
          </div>
        )}

        {/* Estimate */}
        {task.estimate && !isDoneColumn && (
          <div className="text-[10px] text-zinc-600 mt-1.5 mono">
            Est: {task.estimate}
          </div>
        )}

        {/* Has Prompt indicator - just show badge, editing moved to modal */}
        {!isDoneColumn && !isOverlay && hasPrompt && (
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30">
              <FileText className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] font-medium text-cyan-400 mono">
                Has Prompt
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
