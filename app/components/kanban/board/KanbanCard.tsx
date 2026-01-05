"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { motion, AnimatePresence } from "framer-motion"
import {
  GripVertical,
  Bot,
  GitBranch,
  GitPullRequest,
  Sparkles,
  Gem,
  Code2,
  Github,
  Zap,
  MousePointer2,
  FileText,
  Pencil,
  Terminal,
  Search,
  MessageSquare,
  AlertTriangle,
  Unlock,
  CheckCircle2,
  Link,
  Server,
  Users,
  Puzzle,
} from "lucide-react"
import { Task, AgentType, PRIORITY_COLORS, AGENT_META, AGENT_STATUS_META, TaskActiveCapabilities, AgentActivity } from "../types"
import { useBoardStore } from "../lib/store"
import { useGraphMetricsContextSafe } from "../contexts/GraphMetricsContext"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const PR_STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500",
  open: "bg-emerald-500",
  merged: "bg-purple-500",
  closed: "bg-red-500",
}

// Icon mapping for agent types
const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Gem,
  Code2,
  Github,
  Zap,
  MousePointer2,
  Bot,
}

// Tool icons for activity display
const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Read: FileText,
  Edit: Pencil,
  Bash: Terminal,
  Grep: Search,
  Glob: Search,
  Write: Pencil,
  default: Terminal,
}

interface KanbanCardProps {
  task: Task
  isOverlay?: boolean
  columnAgent?: AgentType // Agent assigned to the parent column
  isDoneColumn?: boolean // Whether task is in a "Done" column (closed tasks)
}

export function KanbanCard({ task, isOverlay = false, columnAgent, isDoneColumn = false }: KanbanCardProps) {
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
    // Don't open modal if dragging
    if (isDragging) return
    // Don't open if clicking on the drag handle
    if ((e.target as HTMLElement).closest("[data-drag-handle]")) return
    setSelectedTask(task.id)
  }

  // Check if PR is ready for review (open status)
  const hasPRReadyForReview = task.git?.prStatus === "open"

  // Determine effective agent (task agent or inherited from column)
  const effectiveAgent = task.agent?.type || columnAgent
  const agentMeta = effectiveAgent ? AGENT_META[effectiveAgent] : null
  const AgentIcon = agentMeta ? AGENT_ICONS[agentMeta.icon] || Bot : null
  const isAgentRunning = task.agent?.status === "running"

  // Get last activity info
  const lastActivity = task.agent?.lastActivity
  const ToolIcon = lastActivity?.tool
    ? TOOL_ICONS[lastActivity.tool] || TOOL_ICONS.default
    : null

  // Dependency state - prefer graph metrics when available
  const hasBlockers = taskMetrics ? taskMetrics.inDegree > 0 : (task.blockedBy && task.blockedBy.length > 0)
  const blocksOthers = taskMetrics ? taskMetrics.outDegree > 0 : (task.blocking && task.blocking.length > 0)
  // Don't show "Ready" status for tasks in Done column - they're already completed
  const isReady = isDoneColumn ? false : (taskMetrics ? taskMetrics.inDegree === 0 : task.isReady)
  const isCriticalPath = taskMetrics?.isCriticalPath ?? task.criticalPath

  // Graph-computed metrics for enhanced badges
  const unblockCount = taskMetrics?.unblockCount ?? 0
  const impactScore = taskMetrics?.impactScore ?? 0

  // Get accent color for the card
  const cardAccent = agentMeta
    ? `hsl(var(--agent-${effectiveAgent === 'claude-code' ? 'claude' : effectiveAgent}))`
    : undefined

  // Render overlay version (shown during drag)
  if (isOverlay) {
    return (
      <div
        className="kanban-card p-3 border-glow opacity-90 rotate-3"
        style={{ '--card-accent': cardAccent } as React.CSSProperties}
        data-has-agent={!!effectiveAgent}
      >
        <CardContent task={task} agentMeta={agentMeta} AgentIcon={AgentIcon} />
      </div>
    )
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        ...style,
        '--card-accent': cardAccent,
      } as React.CSSProperties}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      data-has-agent={!!effectiveAgent}
      data-critical-path={isCriticalPath}
      data-blocked={hasBlockers}
      data-ready={isReady && !hasBlockers}
      className={cn(
        "kanban-card group relative p-3",
        isDragging && "opacity-50 scale-[1.02] border-glow",
        hasPRReadyForReview && "ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/10",
        isAgentRunning && "agent-active",
        hasBlockers && "ring-1 ring-red-500/30 border-red-500/20",
        isCriticalPath && "critical-path-glow",
        isReady && !hasBlockers && "ring-1 ring-cyan-500/20 border-cyan-500/10"
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
        <CardContent
          task={task}
          agentMeta={agentMeta}
          AgentIcon={AgentIcon}
          isRunning={isAgentRunning}
          lastActivity={lastActivity}
          ToolIcon={ToolIcon}
          columnAgent={columnAgent}
          hasBlockers={hasBlockers}
          blocksOthers={blocksOthers}
          isReady={isReady}
          isCriticalPath={isCriticalPath}
          unblockCount={unblockCount}
          impactScore={impactScore}
        />
      </div>
    </motion.div>
  )
}

interface CardContentProps {
  task: Task
  agentMeta: typeof AGENT_META[keyof typeof AGENT_META] | null
  AgentIcon: React.ComponentType<{ className?: string }> | null
  isRunning?: boolean
  lastActivity?: AgentActivity
  ToolIcon?: React.ComponentType<{ className?: string }> | null
  columnAgent?: AgentType
  hasBlockers?: boolean
  blocksOthers?: boolean
  isReady?: boolean
  isCriticalPath?: boolean
  /** Total downstream tasks unblocked (from graph metrics) */
  unblockCount?: number
  /** Impact score (from graph metrics, 0-100) */
  impactScore?: number
}

function CardContent({
  task,
  agentMeta,
  AgentIcon,
  isRunning,
  lastActivity,
  ToolIcon,
  columnAgent,
  hasBlockers,
  blocksOthers,
  isReady,
  isCriticalPath,
  unblockCount = 0,
  impactScore = 0,
}: CardContentProps) {
  const hasTaskAgent = !!task.agent
  const inheritedFromColumn = !hasTaskAgent && !!columnAgent
  const blockerCount = task.blockedBy?.length ?? 0
  const blockingCount = task.blocking?.length ?? 0

  // Use graph-computed unblock count if available, otherwise fall back to direct count
  const effectiveUnblockCount = unblockCount > 0 ? unblockCount : blockingCount

  // Impact level for high-impact tasks
  const showHighImpact = impactScore >= 25

  return (
    <>
      {/* Dependency indicators row */}
      {(hasBlockers || effectiveUnblockCount > 0 || isCriticalPath || isReady || showHighImpact) && (
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {/* Blocked by indicator */}
          {hasBlockers && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30">
              <AlertTriangle className="h-3 w-3 text-red-400" />
              <span className="text-[10px] font-medium text-red-400 mono">
                Blocked by {blockerCount}
              </span>
            </div>
          )}

          {/* Blocks others indicator - shows recursive unblock count */}
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
                Unblocks {effectiveUnblockCount} task{effectiveUnblockCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Critical path indicator */}
          {isCriticalPath && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30">
              <Link className="h-3 w-3 text-purple-400" />
              <span className="text-[10px] font-medium text-purple-400 mono">
                Critical
              </span>
            </div>
          )}

          {/* Ready indicator (only show if not blocked) */}
          {isReady && !hasBlockers && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30">
              <CheckCircle2 className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] font-medium text-cyan-400 mono">
                Ready
              </span>
            </div>
          )}

          {/* High Impact indicator (when impact score is significant) */}
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

      {/* Agent Status - Enhanced */}
      {agentMeta && AgentIcon && (
        <div className={cn(
          "flex items-center gap-2 mt-2.5 p-2 rounded-md",
          isRunning
            ? "bg-emerald-500/10 border border-emerald-500/20"
            : "bg-zinc-800/50"
        )}>
          <div className={cn(
            "size-6 rounded flex items-center justify-center",
            agentMeta.bgColor
          )}>
            <AgentIcon className={cn("h-3.5 w-3.5", agentMeta.color)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={cn("text-xs font-medium", agentMeta.color)}>
                {agentMeta.shortLabel}
              </span>
              {inheritedFromColumn && (
                <span className="text-[9px] text-zinc-600 mono">(station)</span>
              )}
              {task.agent && (
                <span
                  className={cn(
                    "size-1.5 rounded-full ml-auto",
                    AGENT_STATUS_META[task.agent.status].bgColor,
                    isRunning && "animate-pulse"
                  )}
                  title={task.agent.status}
                />
              )}
            </div>

            {/* Activity preview when running */}
            <AnimatePresence>
              {isRunning && lastActivity && ToolIcon && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1.5 mt-1"
                >
                  <ToolIcon className="h-2.5 w-2.5 text-zinc-500" />
                  <span className="text-[10px] text-zinc-500 truncate mono">
                    {lastActivity.summary}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Running indicator without specific activity */}
            {isRunning && !lastActivity && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex gap-0.5">
                  <span className="size-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="size-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="size-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[10px] text-zinc-500 mono">processing</span>
              </div>
            )}
          </div>

          {/* Chat indicator */}
          {task.messages && task.messages.length > 0 && (
            <div className="flex items-center gap-1 text-zinc-600">
              <MessageSquare className="h-3 w-3" />
              <span className="text-[10px] mono">{task.messages.length}</span>
            </div>
          )}
        </div>
      )}

      {/* Active Capabilities indicator - shown when agent is running with configured capabilities */}
      {isRunning && task.activeCapabilities?.isConfigured && (
        <ActiveCapabilitiesBadges capabilities={task.activeCapabilities} />
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
              {task.git.prStatus && (
                <span
                  className={cn(
                    "size-2 rounded-full",
                    PR_STATUS_COLORS[task.git.prStatus]
                  )}
                  title={task.git.prStatus}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Estimate */}
      {task.estimate && (
        <div className="text-[10px] text-zinc-600 mt-1.5 mono">
          Est: {task.estimate}
        </div>
      )}
    </>
  )
}

/**
 * Compact badges showing active capabilities for a running task
 */
function ActiveCapabilitiesBadges({ capabilities }: { capabilities: TaskActiveCapabilities }) {
  const skillCount = capabilities.skills?.length || 0
  const mcpCount = capabilities.mcpServers?.length || 0
  const subagentCount = capabilities.subagents?.length || 0

  // Only show if there are any list-type capabilities active
  if (skillCount === 0 && mcpCount === 0 && subagentCount === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-zinc-800/50"
    >
      {skillCount > 0 && (
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20"
          title={capabilities.skills?.join(', ')}
        >
          <Puzzle className="h-2.5 w-2.5 text-cyan-400" />
          <span className="text-[9px] font-medium text-cyan-400 mono">
            {skillCount} skill{skillCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      {mcpCount > 0 && (
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20"
          title={capabilities.mcpServers?.join(', ')}
        >
          <Server className="h-2.5 w-2.5 text-purple-400" />
          <span className="text-[9px] font-medium text-purple-400 mono">
            {mcpCount} MCP{mcpCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      {subagentCount > 0 && (
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20"
          title={capabilities.subagents?.join(', ')}
        >
          <Users className="h-2.5 w-2.5 text-amber-400" />
          <span className="text-[9px] font-medium text-amber-400 mono">
            {subagentCount}
          </span>
        </div>
      )}
    </motion.div>
  )
}
