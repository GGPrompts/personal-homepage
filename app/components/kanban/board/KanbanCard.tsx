"use client"

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
} from "lucide-react"
import { Task, PRIORITY_COLORS } from "../types"
import { useBoardStore } from "../lib/store"
import { useGraphMetricsContextSafe } from "../contexts/GraphMetricsContext"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Format duration between two dates in a human-readable format
 */
function formatDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime()
  if (ms < 0) return ''

  const minutes = Math.floor(ms / (1000 * 60))
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))

  if (days > 0) {
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }
  if (hours > 0) {
    const remainingMins = minutes % 60
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
  }
  return `${minutes}m`
}

interface KanbanCardProps {
  task: Task
  isOverlay?: boolean
  /** Whether task is in the Done column (closed tasks) */
  isDoneColumn?: boolean
  /** Whether this task has a transcript available */
  hasTranscript?: boolean
}

export function KanbanCard({ task, isOverlay = false, isDoneColumn = false, hasTranscript = false }: KanbanCardProps) {
  const setSelectedTask = useBoardStore((state) => state.setSelectedTask)
  const graphMetrics = useGraphMetricsContextSafe()

  // Get graph-computed metrics for this task
  const taskMetrics = graphMetrics?.getMetrics(task.id)

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
  const isReady = isDoneColumn ? false : (taskMetrics ? taskMetrics.inDegree === 0 : task.isReady)
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
  const duration = closedAt && task.createdAt ? formatDuration(task.createdAt, closedAt) : null

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
      data-ready={isReady && !hasBlockers}
      className={cn(
        "kanban-card group relative p-3",
        isDragging && "opacity-50 scale-[1.02] border-glow",
        hasBlockers && "ring-1 ring-red-500/30 border-red-500/20",
        isCriticalPath && "critical-path-glow",
        isReady && !hasBlockers && !isDoneColumn && "ring-1 ring-cyan-500/20 border-cyan-500/10",
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
        {!isDoneColumn && (hasBlockers || effectiveUnblockCount > 0 || isCriticalPath || isReady || showHighImpact) && (
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

            {isReady && !hasBlockers && (
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

        {/* Done column: completed badge with metadata */}
        {isDoneColumn && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/15 border border-green-500/30">
              <CheckCircle2 className="h-3 w-3 text-green-400" />
              <span className="text-[10px] font-medium text-green-400 mono">Completed</span>
            </div>
            {duration && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/30">
                <Clock className="h-3 w-3 text-blue-400" />
                <span className="text-[10px] font-medium text-blue-400 mono">{duration}</span>
              </div>
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

          {/* Labels */}
          {task.labels.slice(0, 2).map((label) => (
            <Badge
              key={label}
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5 bg-white/5 border-white/10 text-zinc-400"
            >
              {label}
            </Badge>
          ))}
          {task.labels.length > 2 && (
            <span className="text-[10px] text-zinc-500">
              +{task.labels.length - 2}
            </span>
          )}
        </div>

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
              <MessageSquare className="h-3 w-3 text-zinc-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-zinc-500 line-clamp-2">{closeReason}</p>
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
      </div>
    </motion.div>
  )
}
